# Vinder

A clickable dating-app prototype for the VinUni community, built for a design class. **VinCupid** (the pink mascot) is the app's AI agent: it blocks harassment, flags scams and coaches conversations.

Student prototype. Not an official VinUniversity service. Everything is stored on the device that opens it.

## Two versions, one codebase

| | Web | Mobile |
| --- | --- | --- |
| Open | `vinder.html` | `vinder-mobile.html`, or host `mobile/` and install it |
| Layout | Phone frame on a campus backdrop on desktop; full screen on phones | Full screen, safe areas for notches and home bars, centred column on desktop |
| Discover | Buttons under the card, keyboard shortcuts | Edge-to-edge card with the buttons over it; swipe up for the full profile |
| Navigation | Links and the browser's back button | Push/pop transitions, swipe from the left edge to go back, sheets you drag down to close |
| Chat | Enter sends | Keyboard-aware layout, Enter sends, long-press a bubble to copy or report it |
| Phone features | Share sheet when the browser has one | Haptics (Android), camera or library for photos, native share sheet, tap-to-call emergency numbers |
| Extras | | Launch screen, status-bar colour per screen, install card, works offline once installed |

Both open with a VinUni email (the 6-digit code is shown on screen) or a demo account: **Minh Tri** (student) or **Thanh Ngan** (faculty, TA).

### Installing the mobile version on a phone

Host the `mobile/` folder on any static HTTPS host (GitHub Pages, Netlify, Vercel, a university server), open it on the phone, then:

- **iPhone:** Safari → Share → **Add to Home Screen**.
- **Android:** Chrome shows **Install app**, or use the **Add Vinder to your Home Screen** card on the Me tab.

Installed, it opens full screen with its own icon and keeps working offline (a service worker caches it). `vinder-mobile.html` is the same app as one file for sending around; it runs anywhere but can't be installed or cached offline, because a manifest and service worker need to be served over HTTP.

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

The free tier allows 10 swipes a day and resets at local midnight. Keyboard on Discover (web): ← pass, → like, Space next photo, ↑ profile, Z rewind.

## Gemini

Paste a key in **Settings** and press **Test key**. Requests go straight from the browser to `generativelanguage.googleapis.com` with the `x-goog-api-key` header. The default model is `gemini-3.5-flash`, falling back to `gemini-3.6-flash` and `gemini-3.5-flash-lite`, the same order the necspeaking backend uses. The offline rules always run first, and the AI can raise a verdict but never lower one. Without a key, offline, or if a call fails, the offline rules handle everything. Use a throwaway key: it is stored on the device.

## Code

```
index.html            web shell (phone frame + desktop pitch)
mobile.html           mobile shell (manifest, Apple meta tags, launch screen)
manifest.webmanifest  app name, colours and icons for installing
src/logic.js          pure rules: age, star sign, matching, free-tier limits, VinCupid rules, vouch tokens
src/data.js           mock profiles and seeded chats
src/core.js           state, storage, Gemini and every action (swipe, send, report, vouch, sign up); no DOM
src/kit.js            icons, formatting and photo helpers
src/app.js            the screens, shared by both versions
src/mobile.js         mobile-only behaviour: gestures, transitions, keyboard, install, offline
src/styles.css        styles, light and dark
src/mobile.css        mobile overrides
assets/               mascot, VinUni logo and campus photos, fonts, profile photos, app icons
build.py              builds vinder.html, vinder-mobile.html and mobile/
test/                 unit tests for logic.js and core.js
```

After changing anything in `src/`, `assets/` or the HTML shells:

```sh
node --test vinder/test/*.test.js   # unit tests
python3 vinder/build.py              # rebuild vinder.html, vinder-mobile.html and mobile/
```

To work on the source directly, serve this folder (`python3 -m http.server`) and open `index.html` or `mobile.html`.

## Photos

Minh Tri's photos are in `assets/photos/minh-tri/`, resized to 720 px with classmates in the background blurred. Every other profile uses a placeholder. To add photos for someone, put them in `assets/photos/<id>/` and list the paths in that profile's `photos` array in `src/data.js`. Only add someone's photos with their consent.
