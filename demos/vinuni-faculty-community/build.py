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


# The hosted preview leaves out the university's name, logo and campus photos.
PUBLIC_TEXT = [
    ('<b>VinUniversity</b><span>International Faculty Community</span>', '<b>International Faculty</b><span>Community · concept demo</span>'),
    ('aria-label="VinUniversity"', 'aria-label="International Faculty Community"'),
    ('Not an official VinUniversity system', 'Not an official university system'),
    ('Signed in with VinUniversity SSO', 'Signed in with university SSO'),
    ('Faculty sign in with VinUniversity single sign-on', 'Faculty sign in with university single sign-on'),
    ('with a VinUniversity Microsoft account', 'with a university Microsoft account'),
    ('in the VinUniversity directory. Only VinUniversity faculty', 'in the university directory. Only university faculty'),
    ('with a VinUniversity account', 'with a university account'),
    ('Your VinUniversity account', 'Your university account'),
    ('your VinUniversity account', 'your university account'),
    ('VinUni SSO takes over', 'University SSO takes over'),
    ('<label>VinUniversity email', '<label>University email'),
    ('to VinUniversity processing', 'to the university processing'),
    ('Sofia leaves VinUniversity', 'Sofia leaves the university'),
    ('official VinUniversity guidance', 'official university guidance'),
    ('official VinUniversity endorsements', 'official university endorsements'),
    ('a VinUniversity endorsement', 'a university endorsement'),
    ('Official · VinUniversity', 'Official · University'),
    ('their VinUni account starts', 'their university account starts'),
    ('licences does VinUniversity already have', 'licences does the university already have'),
    ('their VinUniversity identity', 'their university identity'),
    ('before a VinUni account exists', 'before a university account exists'),
    ('her VinUni account exists', 'her university account exists'),
    ('Has no VinUni account', 'Has no university account'),
    ('employed by VinUni', 'employed by the university'),
    ('VinUni can arrange', 'The university can arrange'),
    ('`<div class="banner ph-fountain mb16"><span>VinUniversity campus, Gia Lâm, Hanoi</span></div>`', "''"),
    ("'@vinuni.edu.vn'", "'@university.example'"),
    ('linh.tran@vinuni.example', 'linh.tran@university.example'),
    ("'vinuni-ifc-demo-'", "'ifc-demo-'"),
]
PUBLIC_CSS = """
/* Hosted preview: no university logo or campus photos */
:root { --img-lawn: none; --img-facade: none; --img-fountain: none; }
.brand-mark { background: var(--navy-700); display: grid; place-items: center; }
.brand-mark::after { content: "IF"; color: #fff; font-family: var(--serif); font-weight: 700; font-size: 17px; }
.logo-full { display: none; }
.av.official { background: var(--red); }
.av.official::after { content: "U"; color: #fff; }
.hero.ph { background: radial-gradient(1200px 400px at 90% -40%, rgba(199,32,39,.45), transparent 60%), linear-gradient(120deg, var(--navy-900), var(--navy-700)); }
.signin-art { background: radial-gradient(900px 500px at 100% 0%, rgba(199,32,39,.45), transparent 60%), linear-gradient(150deg, var(--navy-950), var(--navy-700)) !important; }
"""


def build_public(css: str, data: str, tour: str, app: str) -> None:
    """Writes public/international-faculty-community.html for the hosted preview."""
    css = re.sub(r"url\(\{\{ASSET:(?!fonts/)[\w./-]+\}\}\)", "none", css) + PUBLIC_CSS
    js = data + "\n" + tour + "\n" + app
    for old, new in PUBLIC_TEXT:
        assert old in js, old
        js = js.replace(old, new)
    assert "vinuni" not in js.lower(), "university name left in the hosted build"
    shell = (SRC / "shell-public.html").read_text(encoding="utf-8")
    page = embed_assets(shell.replace("{{CSS}}", css).replace("{{DATA}}\n{{TOUR}}\n{{APP}}", js))
    out = HERE / "public" / "international-faculty-community.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"wrote public/{out.name} ({len(page) // 1024} KB)")


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
        if mode == "revised":
            # site/ is what Vercel serves: just this page, kept out of search results
            site = HERE / "site"
            site.mkdir(exist_ok=True)
            (site / "index.html").write_text(html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex">', 1), encoding="utf-8")
            print("wrote site/index.html")
        print(f"wrote {filename} ({len(html) // 1024} KB)")
    build_public(css, data, tour, app)
    compare = (SRC / "compare.html").read_text(encoding="utf-8")
    compare = embed_assets(compare.replace("{{CSS}}", css).replace("{{TOUR}}", tour))
    (HERE / "compare.html").write_text(compare, encoding="utf-8")
    print("wrote compare.html")


if __name__ == "__main__":
    main()
