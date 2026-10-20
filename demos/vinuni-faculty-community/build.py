"""Builds the self-contained demo pages from src/.

    python3 build.py

Both pages share the same code; MODE switches between the proposal as
written and the version with the suggested changes.
"""
import base64
import mimetypes
import re
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "src"

PAGES = {
    "proposal-as-written.html": ("proposal", "Faculty Community · Proposal Demo"),
    "with-suggested-changes.html": ("revised", "Faculty Community · Revised Demo"),
}


def embed_assets(text: str) -> str:
    """Replaces {{ASSET:name}} with a data URI so each page stays one file."""
    def data_uri(match: re.Match) -> str:
        path = SRC / "assets" / match.group(1)
        mime = mimetypes.guess_type(path.name)[0]
        return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()
    return re.sub(r"\{\{ASSET:([\w./-]+)\}\}", data_uri, text)


def main() -> None:
    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    css = (SRC / "fonts.css").read_text(encoding="utf-8") + (SRC / "styles.css").read_text(encoding="utf-8")
    data = (SRC / "data.js").read_text(encoding="utf-8")
    app = (SRC / "app.js").read_text(encoding="utf-8")
    tour = (SRC / "tour.js").read_text(encoding="utf-8")
    for filename, (mode, title) in PAGES.items():
        html = (shell.replace("{{TITLE}}", title).replace("{{MODE}}", mode)
                .replace("{{CSS}}", css).replace("{{DATA}}", data).replace("{{TOUR}}", tour)
                .replace("{{APP}}", app))
        html = embed_assets(html)
        (HERE / filename).write_text(html, encoding="utf-8")
        print(f"wrote {filename} ({len(html) // 1024} KB)")
    compare = (SRC / "compare.html").read_text(encoding="utf-8")
    compare = embed_assets(compare.replace("{{CSS}}", css).replace("{{TOUR}}", tour))
    (HERE / "compare.html").write_text(compare, encoding="utf-8")
    print("wrote compare.html")


if __name__ == "__main__":
    main()
