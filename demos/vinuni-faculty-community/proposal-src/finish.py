"""Pass 2 helper: read body.pdf bookmarks -> toc.json; or merge cover + body -> final PDF."""
import json, sys
from pypdf import PdfReader, PdfWriter
D = sys.argv[1]
if sys.argv[2] == 'toc':
    r = PdfReader(f'{D}/body.pdf'); entries = json.load(open(f'{D}/toc-entries.json'))
    found = {}
    def walk(items):
        for it in items:
            if isinstance(it, list): walk(it); continue
            title = ' '.join(it.title.split()); pg = r.get_destination_page_number(it) + 1
            for e in entries:
                if e['n'] not in found and title.replace(' ', '').startswith((e['n'] + e['t']).replace(' ', '')[:30]): found[e['n']] = pg
    walk(r.outline)
    missing = [e['n'] for e in entries if e['n'] not in found]
    json.dump(found, open(f'{D}/toc.json', 'w')); print('pages found', len(found), 'missing', missing)
else:
    w = PdfWriter(); w.append(f'{D}/cover.pdf'); w.append(f'{D}/body.pdf')
    w.add_metadata({'/Title': 'International Faculty Community Platform: Proposal for a One-Semester Pilot', '/Author': 'Nguyen Hoang Minh Tri', '/Subject': 'Pilot proposal for the School Council, VinUniversity'})
    w.write(sys.argv[3]); print('wrote', sys.argv[3], len(w.pages), 'pages')
