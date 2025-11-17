FROM python:3.11-slim

ARG BUILD_SHA="dev"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    STT_STORAGE_BASE_DIR=/data \
    BUILD_SHA=${BUILD_SHA}

RUN groupadd --system malsori && useradd --system --gid malsori --home /app malsori

WORKDIR /app

COPY python_api/pyproject.toml ./pyproject.toml
COPY python_api/uv.lock ./uv.lock
COPY python_api/api_server ./api_server

RUN pip install --upgrade pip && pip install .

RUN mkdir -p "${STT_STORAGE_BASE_DIR}" && chown -R malsori:malsori "${STT_STORAGE_BASE_DIR}" /app

USER malsori

VOLUME ["/data"]

EXPOSE 8000

CMD ["uvicorn", "api_server.main:app", "--host", "0.0.0.0", "--port", "8000"]
