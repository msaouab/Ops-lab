"""Schema migration, run as a Kubernetes Job (Argo CD PreSync hook) before the
new API/worker pods roll out. Idempotent: safe to run on every deploy."""

import os
import sys
import time

import psycopg

SCHEMA = """
create table if not exists jobs (
    id          bigserial primary key,
    rounds      integer     not null,
    status      text        not null default 'queued',
    result      text,
    worker      text,
    created_at  timestamptz not null default now(),
    finished_at timestamptz
);
create index if not exists jobs_status_idx on jobs (status);
"""


def main() -> int:
    url = os.environ["DATABASE_URL"]
    for attempt in range(1, 31):
        try:
            with psycopg.connect(url, connect_timeout=3) as conn:
                conn.execute(SCHEMA)
            print("migration applied")
            return 0
        except psycopg.OperationalError as exc:
            print(f"database not reachable yet (attempt {attempt}/30): {exc}")
            time.sleep(2)
    return 1


if __name__ == "__main__":
    sys.exit(main())
