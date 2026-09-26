use axum::{
    body::Body,
    extract::Request,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use rust_embed::RustEmbed;
use std::env;

#[derive(RustEmbed)]
#[folder = "site/"]
struct Assets;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().init();

    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_owned());
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8080);

    let app = Router::new()
        .route("/healthz", get(healthz))
        .fallback(static_handler);

    let address = format!("{host}:{port}");
    let listener = tokio::net::TcpListener::bind(&address)
        .await
        .expect("failed to bind HTTP listener");

    tracing::info!(%address, "Blender Course server started");

    axum::serve(listener, app)
        .await
        .expect("HTTP server failed");
}

async fn healthz() -> &'static str {
    "ok"
}

async fn static_handler(request: Request) -> Response {
    let raw_path = request.uri().path().trim_start_matches('/');

    let mut candidates = Vec::with_capacity(3);

    if raw_path.is_empty() {
        candidates.push("index.html".to_owned());
    } else {
        candidates.push(raw_path.to_owned());

        if !raw_path.contains('.') {
            candidates.push(format!("{raw_path}.html"));
            candidates.push(format!("{raw_path}/index.html"));
        }
    }

    for path in candidates {
        if let Some(asset) = Assets::get(&path) {
            let mime = mime_guess::from_path(&path).first_or_octet_stream();

            return Response::builder()
                .status(StatusCode::OK)
                .header(header::CONTENT_TYPE, mime.as_ref())
                .header(header::CACHE_CONTROL, "public, max-age=300")
                .body(Body::from(asset.data.into_owned()))
                .expect("valid static response");
        }
    }

    (StatusCode::NOT_FOUND, "404 — такой страницы курса пока нет").into_response()
}
