"""Unit tests that run without Postgres or Redis (CI's first gate)."""

from fastapi.testclient import TestClient

from app import main

client = TestClient(main.app)


def test_healthz_does_not_touch_dependencies():
    assert client.get("/healthz").json() == {"status": "ok"}


def test_readyz_reports_503_when_dependencies_are_down(monkeypatch):
    def boom():
        raise RuntimeError("db down")

    monkeypatch.setattr(main, "db", boom)
    r = client.get("/readyz")
    assert r.status_code == 503
    assert r.json()["status"] == "not ready"


def test_info_reports_version_and_pod():
    body = client.get("/api/info").json()
    assert set(body) == {"version", "pod"}


def test_burn_validates_input():
    assert client.get("/api/burn?ms=5").status_code == 200
    assert client.get("/api/burn?ms=999999").status_code == 422


def test_job_rounds_are_bounded():
    assert client.post("/api/jobs", json={"rounds": 0}).status_code == 422


def test_metrics_exposed():
    r = client.get("/metrics/")
    assert r.status_code == 200
    assert "shipit_jobs_created_total" in r.text


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "ShipIt" in r.text
