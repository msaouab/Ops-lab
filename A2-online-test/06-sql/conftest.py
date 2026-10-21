"""Runs your .sql files against a fresh copy of the practice database. Do not edit."""
import datetime
import decimal
import os
import pathlib
import re

import pytest

HERE = pathlib.Path(__file__).parent
URL = os.environ.get("DATABASE_URL", "postgresql://ops_lab:ops_lab@localhost:5433/ops_lab")


def _norm(v):
    if isinstance(v, decimal.Decimal):
        return float(v)
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    return v


@pytest.fixture(scope="session")
def conn():
    psycopg = pytest.importorskip("psycopg")
    try:
        c = psycopg.connect(URL, connect_timeout=3)
    except psycopg.OperationalError:
        pytest.skip("PostgreSQL is not running. Start it with: docker compose up -d db")
    with c.cursor() as cur:
        cur.execute((HERE / "schema.sql").read_text())
        cur.execute((HERE / "seed.sql").read_text())
    c.commit()
    yield c
    c.close()


@pytest.fixture
def run_query(conn):
    def run(name):
        sql = (HERE / f"{name}.sql").read_text()
        code = re.sub(r"--[^\n]*", "", sql).strip().strip(";").strip()
        if not code:
            pytest.fail(f"{name}.sql is still empty: write your query under the comments")
        try:
            with conn.cursor() as cur:
                cur.execute("SET search_path TO prep")
                cur.execute(sql)
                cols = [d.name for d in cur.description]
                rows = [[_norm(v) for v in r] for r in cur.fetchall()]
        finally:
            conn.rollback()
        return cols, rows
    return run
