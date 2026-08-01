import pytest
from fastapi import HTTPException

import ai.app as service


PAYLOAD = {
    "score": 86,
    "route_length_km": 12.5,
    "population_covered": 59780,
    "population_per_km": 4782.4,
    "overlap_pct": 18,
    "property_go_count": 167,
    "facility_count": 12,
    "facility_score": 80,
    "stop_count": 9,
    "buffer_meters": 500,
    "walking_minutes": 10,
    "catchment_method": "network_isochrone",
    "top_area": "Kecamatan Wates",
    "recommendation": {
        "direction": "north",
        "distance_meters": 500,
        "score_delta": 4.2,
        "population_delta": 3100,
        "population_per_km_delta": 248,
        "facility_delta": 2,
    },
}


def test_insight_guard_and_fallback(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN", "test-token")
    data = service.VerifiedAnalysis.model_validate(PAYLOAD)

    with pytest.raises(HTTPException, match="Invalid service token"):
        service.insight(data, "")

    monkeypatch.setattr(
        service,
        "generate",
        lambda _: service.NarrativeDraft(
            summary="Rute ini mendapat skor 999.",
            actions=["Bangun 3 halte baru."],
        ),
    )
    response = service.insight(data, "test-token")
    assert response.source == "template"
    assert "999" not in response.summary
    assert "12 fasilitas" in response.summary


def test_verified_narrative_is_accepted(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_TOKEN", "test-token")
    monkeypatch.setattr(
        service,
        "generate",
        lambda _: service.NarrativeDraft(
            summary="Skor 86 dengan overlap 18%.",
            actions=["Tinjau pergeseran 500 meter ke utara."],
        ),
    )
    response = service.insight(service.VerifiedAnalysis.model_validate(PAYLOAD), "test-token")
    assert response.source == "ai"
