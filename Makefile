PY := .venv/bin/python

setup:            ## create the virtualenv and install pytest + psycopg
	python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt

db:               ## start PostgreSQL for the SQL exercises
	docker compose up -d db

test:             ## run every exercise test
	.venv/bin/pytest

a1:               ## run the Python fluency drills
	.venv/bin/pytest A1-python-fluency

a2:               ## run the online-test bank (algorithms + SQL)
	.venv/bin/pytest A2-online-test

progress:         ## update PROGRESS.md (run before committing)
	$(PY) scripts/progress.py

.PHONY: setup db test a1 a2 progress
