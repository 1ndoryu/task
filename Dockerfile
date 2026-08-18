# Imagen de producción: el único proceso web es Axum y sirve el dist de React.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

FROM rust:1-bookworm AS backend-build
WORKDIR /build
COPY Cargo.toml Cargo.lock rust-toolchain.toml ./
COPY src/ src/
COPY migrations/ migrations/
RUN cargo build --release --locked

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install --no-install-recommends --yes ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home --shell /usr/sbin/nologin glory
WORKDIR /app
COPY --from=backend-build /build/target/release/glory-backend /app/glory-backend
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist
RUN chown -R glory:glory /app
USER glory

ENV HOST=0.0.0.0 \
    PORT=3000 \
    FRONTEND_DIST=/app/frontend/dist \
    COOKIE_SECURE=true
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/app/glory-backend"]
