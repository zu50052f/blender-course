FROM rust:bookworm AS builder
WORKDIR /app

COPY Cargo.toml ./
COPY src ./src
COPY site ./site

RUN cargo build --release

FROM debian:bookworm-slim AS runtime
RUN useradd --system --uid 10001 --create-home appuser

COPY --from=builder /app/target/release/blender-course /usr/local/bin/blender-course

USER appuser
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/blender-course"]
