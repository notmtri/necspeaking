# Vinder

A clickable dating-app prototype for the VinUni community, built for a design class. **VinCupid** (the pink mascot) is the app's AI agent: it blocks harassment, flags scams and coaches conversations.

Student prototype. Not an official VinUniversity service. Everything is stored in the browser that opens it.

## Open it

- **One file:** open `vinder.html` in Chrome, Edge, Safari or Firefox. Fonts, logo and photos are embedded, so it works offline and can be emailed or uploaded as is.
- **From source:** serve this folder and open `index.html`, for example `python3 -m http.server` then <http://localhost:8000/>.

Sign in with any `@vinuni.edu.vn` address (the 6-digit code is shown on screen) or pick a demo account: **Minh Tri** (student) or **Thanh Ngan** (faculty, TA).

## What's in it

| Feature | Where |
| --- | --- |
| 3 green flags and 3 red flags on every profile | Discover cards (tap through the photos), profiles, sign-up step 7 |
| Students and faculty in separate pools; interest must match both ways | Discover |
| Age and star sign worked out from the birthday; under-18 sign-ups blocked | Sign-up step 4 |
| VinCupid: blocks harassment before it's sent, red banner for scam or trafficking signals, warnings for pressure, a nudge when a chat goes cold for 48 h, openers instead of "hi" | Any chat, and **VinCupid → Try me** |
| Vouches: request a review from a match's opted-in best friend or ex; the friend rates them and confirms or disputes each flag; VinCupid screens the note | Profile → *Ask … for a review*, Me → *People who can vouch for you* |
| Premium (mock, no payment): all 5 photos clear, unlimited swipes, see who likes you, rewind | Crown icon, Me |
| Gemini API key for live moderation, openers, CV summaries and mock replies | Settings (the **AI on/off** pill) |
| LinkedIn import (demo: LinkedIn has no public profile API) | Sign-up step 9, Edit profile |

The free tier allows 10 swipes a day and resets at local midnight. Keyboard on Discover: ← pass, → like, Space next photo, ↑ profile, Z rewind.

## Gemini

Paste a key in **Settings** and press **Test key**. Requests go straight from the browser to `generativelanguage.googleapis.com` with the `x-goog-api-key` header. The default model is `gemini-3.5-flash`, falling back to `gemini-3.6-flash` and `gemini-3.5-flash-lite`, the same order the necspeaking backend uses. The offline rules always run first, and the AI can raise a verdict but never lower one. Without a key, or if a call fails, the offline rules handle everything. Use a throwaway key: it is stored in the browser.

## Editing

```
index.html        page shell (loads src/)
src/logic.js      pure logic: age, star sign, matching, free-tier limits, VinCupid rules, vouch tokens
src/data.js       mock profiles and seeded chats
src/app.js        the UI
src/styles.css    styles, light and dark
assets/           mascot, VinUni logo and campus photos (from the faculty-platform demo), fonts, profile photos
build.py          inlines everything into vinder.html
test/             unit tests for src/logic.js
```

After changing anything in `src/` or `assets/`:

```sh
node --test vinder/test/*.test.js   # unit tests
python3 vinder/build.py              # rebuild vinder.html
```

## Photos

Minh Tri's photos are in `assets/photos/minh-tri/`, resized to 720 px with classmates in the background blurred. Every other profile uses a placeholder. To add photos for someone, put them in `assets/photos/<id>/` and list the paths in that profile's `photos` array in `src/data.js`. Only add someone's photos with their consent.
