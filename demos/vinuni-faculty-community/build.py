"""Builds the self-contained demo pages from src/.

    python3 build.py

Both pages share the same code; MODE switches between the proposal as
written and the version with the suggested changes.
"""
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "src"

PAGES = {
    "proposal-as-written.html": ("proposal", "Faculty Community · Proposal Demo"),
    "with-suggested-changes.html": ("revised", "Faculty Community · Revised Demo"),
}


def main() -> None:
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    data = (SRC / "data.js").read_text(encoding="utf-8")
    app = (SRC / "app.js").read_text(encoding="utf-8")
    tour = (SRC / "tour.js").read_text(encoding="utf-8")
    for filename, (mode, title) in PAGES.items():
        html = (shell.replace("{{TITLE}}", title).replace("{{MODE}}", mode)
                .replace("{{CSS}}", css).replace("{{DATA}}", data).replace("{{TOUR}}", tour)
                .replace("{{APP}}", app))
        (HERE / filename).write_text(html, encoding="utf-8")
        print(f"wrote {filename} ({len(html) // 1024} KB)")
    compare = (SRC / "compare.html").read_text(encoding="utf-8")
    (HERE / "compare.html").write_text(compare.replace("{{CSS}}", css).replace("{{TOUR}}", tour), encoding="utf-8")
    print("wrote compare.html")


if __name__ == "__main__":
    main()
