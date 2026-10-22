#!/usr/bin/env python3
"""Build vinder.html: one self-contained file with the CSS, JS, fonts and images inlined.

Run from anywhere:  python3 vinder/build.py
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'}
ASSET = re.compile(r'(?:\.\./)?assets/[\w./-]+\.(?:webp|png|jpg|woff2)')


def data_uri(match):
    path = ROOT / match.group(0).replace('../', '', 1)
    return f'data:{MIME[path.suffix]};base64,{base64.b64encode(path.read_bytes()).decode()}'


def main():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    css = (ROOT / 'src' / 'styles.css').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="src/styles.css">', f'<style>\n{css}\n</style>')
    for name in ('logic', 'data', 'app'):
        js = (ROOT / 'src' / f'{name}.js').read_text(encoding='utf-8')
        if '</script' in js:
            sys.exit(f'src/{name}.js contains "</script", which would end the inline script early')
        html = html.replace(f'<script src="src/{name}.js"></script>', f'<script>\n{js}\n</script>')

    seen = {}
    for m in ASSET.finditer(html):
        key = m.group(0).replace('../', '', 1)
        seen[key] = seen.get(key, 0) + 1
    for key, n in seen.items():
        if n > 1:
            print(f'warning: {key} is referenced {n} times and will be embedded {n} times', file=sys.stderr)
        if not (ROOT / key).exists():
            sys.exit(f'missing asset: {key}')

    html = ASSET.sub(data_uri, html)
    if 'src="src/' in html or 'href="src/' in html:
        sys.exit('an external src/ reference was left in the output')
    out = ROOT / 'vinder.html'
    out.write_text(html, encoding='utf-8')
    print(f'wrote {out.relative_to(ROOT.parent)} ({out.stat().st_size / 1024:.0f} KB, {len(seen)} assets inlined)')


if __name__ == '__main__':
    main()
