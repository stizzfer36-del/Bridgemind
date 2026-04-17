FROM python:3.12-slim AS base

# ── System packages ────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg2 \
    && rm -rf /var/lib/apt/lists/*

# ── Node 20 ───────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && node --version \
    && npm --version

# ── Python deps ───────────────────────────────────────────────────────────────
COPY apps/bench/pyproject.toml /bench/pyproject.toml
WORKDIR /bench
RUN pip install --no-cache-dir hatch && pip install --no-cache-dir -e .

# ── pytest ────────────────────────────────────────────────────────────────────
RUN pip install --no-cache-dir pytest pytest-timeout

# ── Jest ──────────────────────────────────────────────────────────────────────
RUN npm install -g jest

# ── Rust ──────────────────────────────────────────────────────────────────────
ENV CARGO_HOME=/usr/local/cargo
ENV RUSTUP_HOME=/usr/local/rustup
ENV PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --default-toolchain stable --no-modify-path \
    && . /usr/local/cargo/env \
    && rustc --version \
    && cargo --version

# ── Seccomp profile ───────────────────────────────────────────────────────────
# Applied at container start via docker run --security-opt seccomp=...
# The profile is embedded as a label so orchestrators can extract it.
LABEL forge.seccomp.preset="restricted-no-network"

# ── Workspace ─────────────────────────────────────────────────────────────────
RUN useradd --create-home --uid 1000 bench
USER bench
WORKDIR /workspace

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s CMD python3 -c "import sys; sys.exit(0)"

# Default: run a no-op so docker build --target=base works in tests.
CMD ["python", "-c", "print('sandbox ready')"]
