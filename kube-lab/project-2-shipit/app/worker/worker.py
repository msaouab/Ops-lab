"""ShipIt worker: pops job ids from Redis, does CPU work, stores the result.

Kubernetes lesson built in: graceful shutdown. On SIGTERM (pod deletion,
rollout, scale-down) the worker finishes the job in hand, then exits — so
terminationGracePeriodSeconds must be longer than the slowest job.
"""

import hashlib
import os
import signal
import socket
import sys
import time

import psycopg
import redis
from prometheus_client import Counter, Histogram, start_http_server

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
QUEUE = "shipit:jobs"
POD = socket.gethostname()

PROCESSED = Counter("shipit_jobs_processed_total", "Jobs finished", ["outcome"])
DURATION = Histogram("shipit_job_seconds", "Time to process one job")

stopping = False


def on_sigterm(signum, _frame):
    global stopping
    print(f"got signal {signum}: finishing current job, then exiting", flush=True)
    stopping = True


def work(rounds: int) -> str:
    digest = b"shipit"
    for _ in range(rounds):
        digest = hashlib.sha256(digest).digest()
    return digest.hex()


def connect():
    """Wait for the database instead of crash-looping while it starts up.
    A connection lost later (e.g. CNPG failover) still crashes the process, and
    Kubernetes restarts it — that's the intended recovery path."""
    for attempt in range(1, 61):
        try:
            return psycopg.connect(DATABASE_URL, autocommit=True, connect_timeout=3)
        except psycopg.OperationalError as exc:
            print(f"database not reachable yet (attempt {attempt}/60): {exc}", flush=True)
            time.sleep(2)
    raise SystemExit("database unreachable, giving up")


def main() -> int:
    signal.signal(signal.SIGTERM, on_sigterm)
    signal.signal(signal.SIGINT, on_sigterm)
    start_http_server(9100)  # /metrics for Prometheus
    q = redis.Redis.from_url(REDIS_URL)

    with connect() as conn:
        print(f"worker {POD} waiting for jobs on {QUEUE}", flush=True)
        while not stopping:
            item = q.brpop([QUEUE], timeout=2)  # short timeout so SIGTERM is noticed
            if item is None:
                continue
            job_id = int(item[1])
            row = conn.execute("select rounds from jobs where id = %s", (job_id,)).fetchone()
            if row is None:
                PROCESSED.labels("missing").inc()
                continue
            conn.execute("update jobs set status = 'running', worker = %s where id = %s", (POD, job_id))
            try:
                with DURATION.time():
                    result = work(row[0])
            except Exception as exc:  # noqa: BLE001 — record any failure on the job
                conn.execute("update jobs set status = 'failed', result = %s where id = %s", (str(exc), job_id))
                PROCESSED.labels("failed").inc()
                continue
            conn.execute(
                "update jobs set status = 'done', result = %s, finished_at = now() where id = %s",
                (result, job_id),
            )
            PROCESSED.labels("done").inc()
            print(f"job {job_id}: {row[0]} rounds done", flush=True)

    print("worker stopped cleanly", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
