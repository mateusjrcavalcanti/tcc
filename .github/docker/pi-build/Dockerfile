# syntax=docker/dockerfile:1.4
FROM arm64v8/debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /src

# Instalar pacotes do sistema
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 python3-full python3-pip python3-venv build-essential pkg-config \
    libglib2.0-dev libgirepository1.0-dev gcc ca-certificates git \
    libcairo2-dev libpango1.0-dev libgdk-pixbuf2.0-dev libffi-dev libxml2-dev \
    libssl-dev python3-dev meson ninja-build pkg-config locales gobject-introspection \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Copiar requirements.txt primeiro (para cache)
COPY hub/requirements.txt .

# Criar virtualenv
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/python -m pip install --upgrade pip setuptools wheel

# Instalar dependências com cache pip
RUN --mount=type=cache,target=/root/.cache/pip \
  /opt/venv/bin/pip install -r requirements.txt \
  && /opt/venv/bin/pip install pyinstaller

# Copiar código
COPY . /src

# Criar diretório de saída
RUN mkdir -p /src/dist

# Gerar executável ARM64 para Pi Zero 2W 64-bit
RUN /opt/venv/bin/pyinstaller --clean --onefile hub/main.py \
    -n hub-pi-zero-2w \
    --add-data "hub/storage:storage" \
    --distpath /src/dist

# Executável final ficará em /src/dist/hub-pi-zero-2w
