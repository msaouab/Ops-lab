"""ShipIt API: enqueue jobs for the worker, list results, expose health + metrics.

Small on purpose — the point of the project is everything around it:
images, probes, scaling, CI/CD and GitOps.
"""

import os
import socket
import time
from pathlib import Path

import psycopg
import redis
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from prometheus_client import Counter, Histogram, make_asgi_app
from pydantic import BaseModel, Field

VERSION = os.getenv("APP_VERSION", "dev")
DATABASE_URL = os.getenv("DATABASE_URL", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE = "shipit:jobs"
STATIC = Path(__file__).parent / "static"

JOBS_CREATED = Counter("shipit_jobs_created_total", "Jobs enqueued by the API")
REQUEST_TIME = Histogram("shipit_burn_seconds", "Time spent in /api/burn")

app = FastAPI(title="ShipIt", version=VERSION)
# The static page can also be hosted on GitHub Pages / Vercel (an "external"
# frontend), so allow cross-origin calls. Tighten CORS_ORIGINS in prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.mount("/metrics", make_asgi_app())


def db():
    return psycopg.connect(DATABASE_URL, connect_timeout=3)


def queue():
    return redis.Redis.from_url(REDIS_URL, socket_timeout=3)


class JobIn(BaseModel):
    rounds: int = Field(100_000, ge=1, le=5_000_000)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC / "index.html")


@app.get("/healthz")
def healthz():
    """Liveness: the process is up. Never check dependencies here — a DB outage
    would make Kubernetes restart every healthy API pod."""
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    """Readiness: can this pod serve traffic right now?"""
    try:
        with db() as conn:
            conn.execute("select 1")
        queue().ping()
    except Exception as exc:  # noqa: BLE001 — report any dependency failure
        return JSONResponse({"status": "not ready", "error": str(exc)}, status_code=503)
    return {"status": "ready"}


@app.get("/api/info")
def info():
    """Hit this in a loop during a rollout to watch versions and pods change."""
    return {"version": VERSION, "pod": socket.gethostname()}


@app.post("/api/jobs", status_code=201)
def create_job(job: JobIn):
    with db() as conn:
        row = conn.execute(
            "insert into jobs (rounds, status) values (%s, 'queued') returning id",
            (job.rounds,),
        ).fetchone()
    job_id = row[0]
    queue().lpush(QUEUE, job_id)
    JOBS_CREATED.inc()
    return {"id": job_id, "status": "queued"}


@app.get("/api/jobs")
def list_jobs(limit: int = Query(20, ge=1, le=100)):
    with db() as conn:
        rows = conn.execute(
            "select id, rounds, status, result, worker, created_at, finished_at "
            "from jobs order by id desc limit %s",
            (limit,),
        ).fetchall()
    keys = ("id", "rounds", "status", "result", "worker", "created_at", "finished_at")
    return [dict(zip(keys, r)) for r in rows]


@app.get("/api/burn")
def burn(ms: int = Query(200, ge=1, le=2000)):
    """Burn CPU for `ms` milliseconds — drive load to watch the HPA scale out."""
    with REQUEST_TIME.time():
        end = time.perf_counter() + ms / 1000
        n = 0
        while time.perf_counter() < end:
            n += 1
    return {"burned_ms": ms, "loops": n, "pod": socket.gethostname()}
