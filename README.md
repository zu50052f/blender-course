# Blender Course

Interactive Russian-language Blender 5.2 LTS course for children and teenagers aged 10–14.

The course is designed around a simple progression:

**idea → shapes → model → materials → texture → light → camera → render**

## Status

- Course roadmap: **10 weeks**
- Week 1: **implemented as an interactive web lesson**
- Weeks 2–10: roadmap prepared, lesson pages to be added incrementally
- UI language: **Russian**
- Application/runtime: **Rust**

## Stack

- [Rust](https://www.rust-lang.org/)
- [Axum](https://github.com/tokio-rs/axum)
- \`rust-embed\` for embedding the static course site into the executable
- Plain HTML/CSS/JavaScript for the lesson UI
- Docker for deployment
- GitHub Actions for CI

There is deliberately no Node.js frontend build step. The current course does not need an entire JavaScript civilization just to display lessons and remember checkboxes.

## Run locally

Requirements: a recent stable Rust toolchain.

~~~bash
cargo run
~~~

Open:

~~~text
http://127.0.0.1:8080
~~~

Useful routes:

- \`/\` — course overview
- \`/week-01.html\` — complete Week 1
- \`/healthz\` — health check

Override bind address or port:

~~~bash
HOST=0.0.0.0 PORT=3000 cargo run
~~~

## Docker

Build:

~~~bash
docker build -t blender-course .
~~~

Run:

~~~bash
docker run --rm -p 8080:8080 blender-course
~~~

Then open \`http://localhost:8080\`.

## Project structure

~~~text
.
├── Cargo.toml
├── COURSE.md
├── Dockerfile
├── README.md
├── src/
│   └── main.rs
└── site/
    ├── index.html
    └── week-01.html
~~~

The \`site/\` directory is embedded into the Rust binary at compile time. This makes deployment simple: the runtime container only needs the executable.

## Course approach

The detailed course principles live in [COURSE.md](COURSE.md).

The important constraints are:

- 4 required lessons per week plus an optional creative/buffer lesson;
- usually 45–60 minutes per lesson;
- example → variation rather than blind repetition;
- reduce project scope when needed, but keep the key concept;
- evaluate independence by skill, not by a single total grade;
- keep the first course focused: no premature detours into rigging, simulations, Geometry Nodes, or advanced compositing.

Detailed web lessons should be checked against the current Blender 5.2 LTS interface and official/current documentation. The web lessons are not based on copied chapters from the Adonin book.

## Content roadmap

See [COURSE.md](COURSE.md) for all ten weeks, project outcomes, teaching method, assessment model, and technical habits.

## Deployment notes

The server reads:

- \`HOST\` (default \`0.0.0.0\`)
- \`PORT\` (default \`8080\`)

This makes the container suitable for common container platforms. A platform-specific manifest can be added later without changing the course content.

## Contributing

When adding a new week:

1. keep the lesson page self-contained where practical;
2. add it to the course overview;
3. preserve the Russian learner-facing language;
4. include expected results and visual checkpoints;
5. verify Blender UI instructions against Blender 5.2 LTS/current documentation;
6. keep external assets licensed and attributable.

