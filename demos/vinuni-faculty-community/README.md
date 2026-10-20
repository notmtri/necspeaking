# VinUniversity International Faculty Community: concept demo

Clickable mock-ups of the International Faculty Community Platform proposal
(Marc Kramer, Sept 2026). Open either file directly in a browser; no server
or build step is needed.

| File | What it shows |
| --- | --- |
| `proposal-as-written.html` | The proposal exactly as written. Purple `§` labels point to proposal sections, and **Proposal map** in the top bar links every section and each §14 MVP criterion to the screen that shows it. |
| `with-suggested-changes.html` | The same platform with our eight suggested changes. Teal **Change** labels mark each one, and **What changed?** lists them with a “Show me” link. |
| `compare.html` | Presenter view for meetings: both versions side by side, moved through an 11-step tour with **Next**/**Back** or the arrow keys. On a phone, a toggle switches between the two. |

**Present** in either page's top bar runs the same tour inside that one page.
Keep all three files in the same folder; the side-by-side view loads the
other two.

Everything, including fonts, logo and photos, is embedded, so the pages work
without an internet connection. Starting the tour resets the demo to a clean
state. Chrome or Edge is recommended.

Switch persona from the top bar: a new faculty member (Sofia), an
established one (James), a partner (Erik) and the administrator (Linh).
Actions carry across personas. For example, request a buddy as Sofia,
confirm it as Linh, then see the introduction as Sofia. Changes are kept in
the browser; **Reset** clears them.

All people, schools and providers are fictional. This is not an official
VinUniversity system.

## Editing

All three pages are generated from `src/`. The two demos share one
codebase (`MODE` selects the version), and `src/tour.js` holds the tour steps. After editing anything in `src/`, run:

    python3 build.py
