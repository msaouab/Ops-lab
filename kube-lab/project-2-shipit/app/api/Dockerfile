# syntax=docker/dockerfile:1
# Multi-stage: build deps in a throwaway stage, ship only the venv + code.
FROM python:3.13-slim AS build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
COPY requirements.txt .
RUN /venv/bin/pip install -r requirements.txt

FROM python:3.13-slim
ARG APP_VERSION=dev
ENV PATH=/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    APP_VERSION=$APP_VERSION
# Numeric non-root user so Kubernetes can enforce runAsNonRoot.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin app
COPY --from=build /venv /venv
WORKDIR /srv
COPY app ./app
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
