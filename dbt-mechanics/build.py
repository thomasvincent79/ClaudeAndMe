"""Build the dbt mechanics site.

Each thematic is one HTML fragment in src/pages/ plus optional JS in src/js/.
This script wraps every fragment in src/layout.html, inlines the shared CSS/JS
and writes self-contained pages next to this file (so GitHub Pages can serve them).

    python build.py            # build all pages
    python build.py --serve    # build, then serve on http://localhost:8800

To add a thematic: write src/pages/<slug>.html (+ src/js/<slug>.js if needed)
and add an entry to THEMATICS below.
"""
import argparse
import functools
import http.server
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

VERSIONS = {"v18": "1.8.6", "v112": "1.12"}

THEMATICS = [
    {
        "slug": "snapshots",
        "nav": "Snapshots",
        "title": "Snapshots & hard deletes",
        "icon": "🕰️",
        "summary": "SCD type 2 with timestamp/check strategies. invalidate_hard_deletes (1.8) "
                   "vs hard_deletes: ignore / invalidate / new_record (1.9+).",
        "scripts": ["snapshots.js"],
    },
    {
        "slug": "incremental",
        "nav": "Incremental",
        "title": "Incremental strategies",
        "icon": "➕",
        "summary": "append, merge, delete+insert, insert_overwrite and microbatch (1.9+). "
                   "Same input, different outcomes, side by side.",
        "scripts": ["incremental.js"],
    },
    {
        "slug": "tests",
        "nav": "Tests",
        "title": "Data tests & unit tests",
        "icon": "✅",
        "summary": "Generic, singular and unit tests, severity thresholds, store_failures, "
                   "and what changed between 1.8 and 1.12.",
        "scripts": ["tests.js"],
    },
    {
        "slug": "flags",
        "nav": "Flags",
        "title": "CLI flags",
        "icon": "🚩",
        "summary": "--full-refresh, --empty, --select, --defer, --sample, --fail-fast… What each one does, "
                   "when to use it, and where you can set it (CLI, env var, dbt_project.yml, config).",
        "scripts": ["flags.js"],
    },
    {
        "slug": "selectors",
        "nav": "Selectors",
        "title": "Selectors & orchestration",
        "icon": "🎯",
        "summary": "How -s / --exclude / --selector are evaluated (animated), operators and methods, selectors.yml, "
                   "and a 3-level job → subjob → tag hierarchy to orchestrate runs.",
        "scripts": ["selectors.js"],
    },
    {
        "slug": "clone",
        "nav": "Clone",
        "title": "dbt clone",
        "icon": "🧬",
        "summary": "Zero-copy clones vs pointer views, --full-refresh on existing relations, clone vs --defer, "
                   "and the CI trick for incremental models.",
        "scripts": ["clone.js"],
    },
    {
        "slug": "freshness",
        "nav": "Freshness",
        "title": "Source freshness",
        "icon": "⏱️",
        "summary": "warn_after / error_after, loaded_at_field vs metadata vs loaded_at_query, YAML by version, "
                   "and source_status:fresher+ to build only what got new data.",
        "scripts": ["freshness.js"],
    },
    {
        "slug": "dbt-cloud",
        "nav": "dbt Cloud",
        "title": "dbt Cloud (dbt platform)",
        "icon": "☁️",
        "summary": "What the platform adds on top of Core: release tracks, CI with PR schemas, compare changes, "
                   "dbt State, Mesh cross-project ref, Semantic Layer, Catalog, IDE and Copilot.",
        "scripts": ["dbtcloud.js"],
    },
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def nav_html(active: str) -> str:
    links = ['<a href="index.html" class="{}">Home</a>'.format("on" if active == "index" else "")]
    for t in THEMATICS:
        cls = "on" if t["slug"] == active else ""
        links.append(f'<a href="{t["slug"]}.html" class="{cls}" title="{t["title"]}">{t["nav"]}</a>')
    return "\n".join(links)


def index_content() -> str:
    cards = "\n".join(
        f'''<a class="card theme-card" href="{t["slug"]}.html">
  <div class="theme-icon">{t["icon"]}</div>
  <h2>{t["title"]}</h2>
  <p>{t["summary"]}</p>
  <span class="go">Explore →</span>
</a>''' for t in THEMATICS)
    return read(SRC / "pages" / "index.html").replace("{{cards}}", cards)


def render(slug: str, title: str, content: str, scripts: list[str]) -> str:
    js = read(SRC / "js" / "common.js")
    for s in scripts:
        js += "\n" + read(SRC / "js" / s)
    page = read(SRC / "layout.html")
    for key, value in {
        "{{title}}": title,
        "{{css}}": read(SRC / "style.css"),
        "{{nav}}": nav_html(slug),
        "{{v18}}": VERSIONS["v18"],
        "{{v112}}": VERSIONS["v112"],
        "{{js}}": js,
        "{{content}}": content,  # last: content may legitimately contain "{{" (Jinja)
    }.items():
        page = page.replace(key, value)
    return page


def build() -> None:
    out = ROOT / "index.html"
    out.write_text(render("index", "dbt mechanics", index_content(), []), encoding="utf-8")
    print("wrote", out.name)
    for t in THEMATICS:
        content = read(SRC / "pages" / f'{t["slug"]}.html')
        out = ROOT / f'{t["slug"]}.html'
        out.write_text(render(t["slug"], t["title"], content, t["scripts"]), encoding="utf-8")
        print("wrote", out.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port", type=int, default=8800)
    args = parser.parse_args()
    build()
    if args.serve:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        print(f"serving on http://localhost:{args.port}")
        http.server.ThreadingHTTPServer(("", args.port), handler).serve_forever()
