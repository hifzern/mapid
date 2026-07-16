import os

from fastapi.testclient import TestClient

import ai.app as service


PAYLOAD = {
    "score": 86,
    "route_length_km": 12.5,
    "population_covered": 59780,
    "population_per_km": 4782.4,
    "overlap_pct": 18,
    "property_go_count": 167,
    "buffer_meters": 500,
    "recommendation": {
        "direction": "north",
        "distance_meters": 500,
        "score_delta": 4.2,
        "population_delta": 3100,
        "population_per_km_delta": 248,
    },
}


def test_insight_guard_and_fallback(monkeypatch):
    os.environ["AI_SERVICE_TOKEN"] = "test-token"
    client = TestClient(service.app)

    assert client.post("/insight", json=PAYLOAD).status_code == 401

    monkeypatch.setattr(
        service,
        "generate",
        lambda _: service.NarrativeDraft(
            summary="Rute ini mendapat skor 999.",
            actions=["Bangun 3 halte baru."],
        ),
    )
    response = client.post(
        "/insight",
        json=PAYLOAD,
        headers={"X-Internal-Token": "test-token"},
    )
    assert response.status_code == 200
    assert response.json()["source"] == "template"
    assert "999" not in response.text


def test_verified_narrative_is_accepted(monkeypatch):
    os.environ["AI_SERVICE_TOKEN"] = "test-token"
    monkeypatch.setattr(
        service,
        "generate",
        lambda _: service.NarrativeDraft(
            summary="Skor 86 dengan overlap 18%.",
            actions=["Tinjau pergeseran 500 meter ke utara."],
        ),
    )
    response = TestClient(service.app).post(
        "/insight",
        json=PAYLOAD,
        headers={"X-Internal-Token": "test-token"},
    )
    assert response.status_code == 200
    assert response.json()["source"] == "ai"
