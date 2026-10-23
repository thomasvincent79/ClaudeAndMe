"""Build the git mechanics site.

Each thematic is one HTML fragment in src/pages/ plus optional JS in src/js/.
This script wraps every fragment in src/layout.html, inlines the shared CSS/JS
and writes self-contained pages next to this file (so GitHub Pages can serve them).

    python build.py            # build all pages
    python build.py --serve    # build, then serve on http://localhost:8820

To add a thematic: write src/pages/<slug>.html (+ src/js/<slug>.js if needed)
and add an entry to THEMATICS below.
"""
import argparse
import functools
import http.server
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

THEMATICS = [
    {
        "slug": "basics",
        "nav": "Basics",
        "title": "How git works",
        "icon": "📦",
        "summary": "Working directory, staging area, local repository and remote. Watch your changes travel "
                   "with add, commit and push, and see what a commit really is (blobs, trees, SHA-1).",
        "scripts": ["basics.js"],
    },
    {
        "slug": "branches",
        "nav": "Branches",
        "title": "Branches, merge & rebase",
        "icon": "🌿",
        "summary": "A branch is just a pointer. Type commands into a live commit graph: switch, merge "
                   "(fast-forward vs 3-way), rebase, cherry-pick, reset.",
        "scripts": ["graph.js", "branches.js"],
    },
    {
        "slug": "remotes",
        "nav": "Remotes",
        "title": "Remotes: fetch, pull, push",
        "icon": "🔄",
        "summary": "origin, remote-tracking branches, fetch vs pull, why a push gets rejected, "
                   "pull --rebase and --force-with-lease, with you and a teammate on the same repo.",
        "scripts": ["graph.js", "remotes.js"],
    },
    {
        "slug": "undo",
        "nav": "Undo",
        "title": "Undoing things",
        "icon": "⏪",
        "summary": "restore, reset --soft / --mixed / --hard, revert, stash, amend and the reflog safety net. "
                   "Which of the three areas each command touches.",
        "scripts": ["undo.js"],
    },
    {
        "slug": "gitlab",
        "nav": "GitLab",
        "title": "GitLab workflow",
        "icon": "🦊",
        "summary": "Groups, projects, issues and merge requests. The life of an MR step by step, merge methods, "
                   "protected branches, approvals and branching strategies.",
        "scripts": ["graph.js", "gitlab.js"],
    },
    {
        "slug": "cicd",
        "nav": "CI/CD",
        "title": "GitLab CI/CD",
        "icon": "🚀",
        "summary": ".gitlab-ci.yml anatomy, stages, jobs, runners, rules, needs, artifacts vs cache, environments. "
                   "A pipeline simulator per trigger event, and a dbt slim-CI example.",
        "scripts": ["cicd.js"],
    },
    {
        "slug": "cheatsheet",
        "nav": "Cheat sheet",
        "title": "Command cheat sheet",
        "icon": "📋",
        "summary": "Every everyday git command in one searchable page, grouped by task, "
                   "with the risky ones flagged.",
        "scripts": ["cheatsheet.js"],
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
        "{{js}}": js,
        "{{content}}": content,  # last: content may legitimately contain "{{" (CI variables, templates)
    }.items():
        page = page.replace(key, value)
    return page


def build() -> None:
    out = ROOT / "index.html"
    out.write_text(render("index", "git mechanics", index_content(), []), encoding="utf-8")
    print("wrote", out.name)
    for t in THEMATICS:
        content = read(SRC / "pages" / f'{t["slug"]}.html')
        out = ROOT / f'{t["slug"]}.html'
        out.write_text(render(t["slug"], t["title"], content, t["scripts"]), encoding="utf-8")
        print("wrote", out.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port", type=int, default=8820)
    args = parser.parse_args()
    build()
    if args.serve:
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
        print(f"serving on http://localhost:{args.port}")
        http.server.ThreadingHTTPServer(("", args.port), handler).serve_forever()
