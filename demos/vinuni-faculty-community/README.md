# VinUniversity International Faculty Community: concept demo

Clickable mock-ups of the International Faculty Community Platform proposal
(Marc Kramer, Sept 2026). Open either file directly in a browser; no server
or build step is needed.

| File | What it shows |
| --- | --- |
| `proposal-as-written.html` | The proposal exactly as written. Purple `§` labels point to proposal sections, and **Proposal map** in the top bar links every section and each §14 MVP criterion to the screen that shows it. |
| `with-suggested-changes.html` | The same platform with our eight suggested changes. Teal **Change** labels mark each one, and **What changed?** lists them with a “Show me” link. |

Switch persona from the top bar: a new faculty member (Sofia), an
established one (James), a partner (Erik) and the administrator (Linh).
Actions carry across personas. For example, request a buddy as Sofia,
confirm it as Linh, then see the introduction as Sofia. Changes are kept in
the browser; **Reset** clears them.

All people, schools and providers are fictional. This is not an official
VinUniversity system.

## Editing

The two pages are generated from `src/` and share one codebase; `MODE`
selects the version. After editing anything in `src/`, run:

    python3 build.py
