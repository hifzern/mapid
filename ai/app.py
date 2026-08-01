import hmac
import json
import logging
import os
import re
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field


logger = logging.getLogger(__name__)


class RecommendationInput(BaseModel):
    direction: str
    distance_meters: int
    score_delta: float
    population_delta: int
    population_per_km_delta: float
    facility_delta: int


class VerifiedAnalysis(BaseModel):
    score: float = Field(ge=0, le=100)
    route_length_km: float = Field(gt=0)
    population_covered: int = Field(ge=0)
    population_per_km: float = Field(ge=0)
    overlap_pct: float = Field(ge=0, le=100)
    property_go_count: int = Field(ge=0)
    facility_count: int = Field(ge=0)
    facility_score: float = Field(ge=0, le=100)
    stop_count: int = Field(ge=2, le=30)
    buffer_meters: int = Field(gt=0)
    walking_minutes: int = Field(gt=0, le=60)
    catchment_method: Literal["network_isochrone", "stop_buffer"]
    top_area: str | None = Field(default=None, max_length=120)
    recommendation: RecommendationInput | None = None


class NarrativeDraft(BaseModel):
    summary: str = Field(min_length=1, max_length=360)
    actions: list[str] = Field(min_length=1, max_length=3)


class Narrative(NarrativeDraft):
    source: str


app = FastAPI(title="TAE AI Insight", docs_url=None, redoc_url=None)


def fallback(data: VerifiedAnalysis) -> Narrative:
    catchment = (
        f"isochrone berjalan kaki {data.walking_minutes} menit dari {data.stop_count} halte"
        if data.catchment_method == "network_isochrone"
        else f"buffer {data.buffer_meters} meter dari {data.stop_count} halte"
    )
    if data.recommendation:
        recommendation = data.recommendation
        summary = (
            f"Rute menjangkau {data.population_covered} warga dan "
            f"{data.facility_count} fasilitas publik melalui {catchment}, dengan overlap "
            f"{data.overlap_pct}%. Alternatif terbaik meningkatkan skor "
            f"sebesar {recommendation.score_delta}."
        )
        actions = [
            f"Tinjau pergeseran {recommendation.distance_meters} meter ke "
            f"{recommendation.direction}.",
            "Validasi alternatif terhadap kondisi jalan dan kebutuhan lokal.",
        ]
    else:
        summary = (
            f"Rute menjangkau {data.population_covered} warga dan "
            f"{data.facility_count} fasilitas publik melalui {catchment}, dengan overlap "
            f"{data.overlap_pct}%. Tidak ada pergeseran teruji yang memperbaiki skor."
        )
        actions = ["Pertahankan alignment untuk kajian awal dan lanjutkan validasi lapangan."]
    return Narrative(summary=summary, actions=actions, source="template")


def number_variants(value: int | float) -> set[str]:
    number = float(value)
    raw = f"{number:g}"
    variants = {raw, raw.replace(".", ",")}
    if number.is_integer():
        variants.add(f"{int(number):,}".replace(",", "."))
    return variants | {f"+{item}" for item in variants}


def has_only_verified_numbers(draft: NarrativeDraft, data: VerifiedAnalysis) -> bool:
    values: list[int | float] = [
        data.score,
        data.route_length_km,
        data.population_covered,
        data.population_per_km,
        data.overlap_pct,
        data.property_go_count,
        data.facility_count,
        data.facility_score,
        data.stop_count,
        data.buffer_meters,
        data.walking_minutes,
    ]
    if data.recommendation:
        values.extend([
            data.recommendation.distance_meters,
            data.recommendation.score_delta,
            data.recommendation.population_delta,
            data.recommendation.population_per_km_delta,
            data.recommendation.facility_delta,
        ])
    allowed = set().union(*(number_variants(value) for value in values))
    tokens = re.findall(r"[+-]?\d+(?:[.,]\d+)*", " ".join([draft.summary, *draft.actions]))
    return all(token in allowed for token in tokens)


def generate(data: VerifiedAnalysis) -> NarrativeDraft:
    response = OpenAI(
        api_key=os.environ["OPENAI_API_KEY"],
        timeout=12.0,
        max_retries=1,
    ).responses.parse(
        model=os.getenv("OPENAI_MODEL", "gpt-5.6-luna"),
        instructions=(
            "Anda membantu perencana kota membaca hasil evaluasi rute transit. "
            "Gunakan Bahasa Indonesia yang ringkas dan aktif. Hanya gunakan fakta dan "
            "angka yang ada di input. Jangan menghitung, memperkirakan, atau menambah "
            "statistik baru. Jangan memberi nomor pada daftar tindakan. Jika rekomendasi "
            "null, nyatakan bahwa kandidat yang diuji tidak meningkatkan skor. Jangan "
            "menyebut buffer halte sebagai isochrone jaringan."
        ),
        input=json.dumps(data.model_dump(), ensure_ascii=False),
        text_format=NarrativeDraft,
        max_output_tokens=220,
    )
    if not response.output_parsed:
        raise ValueError("OpenAI returned no parsed output")
    return response.output_parsed


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/insight", response_model=Narrative)
def insight(
    data: VerifiedAnalysis,
    internal_token: str = Header(default="", alias="X-Internal-Token"),
) -> Narrative:
    expected = os.getenv("AI_SERVICE_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="AI service token is not configured")
    if not hmac.compare_digest(internal_token, expected):
        raise HTTPException(status_code=401, detail="Invalid service token")

    try:
        draft = generate(data)
        if not has_only_verified_numbers(draft, data):
            raise ValueError("Narrative contains an unsupported number")
        return Narrative(**draft.model_dump(), source="ai")
    except Exception:
        logger.exception("AI narrative generation failed; using deterministic fallback")
        return fallback(data)
