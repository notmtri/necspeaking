/* Vinder: a dating app prototype for the VinUni community. VinCupid is its AI agent. */
(function () {
  'use strict';
  const L = window.Logic, D = window.VinderData;
  const A = { mascot: 'assets/vincupid.webp', face: 'assets/vincupid-face.webp', mark: 'assets/mark.png', logo: 'assets/logo.png' };
  const MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const KEY = 'vinder.v1';
  const H = 3600e3;

  // ---------- icons (Lucide-style, inline) ----------
  const ICONS = {
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    undo: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    shieldcheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    crown: '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.29l4.27-3.66a.5.5 0 0 1 .8.52l-2.83 10.25a1 1 0 0 1-.96.73H5.81a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .8-.52l4.28 3.66a1 1 0 0 0 1.51-.29z"/><path d="M5 21h14"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    send: '<path d="M14.54 21.69a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.64-.63l-19 6.5a.5.5 0 0 0-.02.93l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    star: '<path d="M11.53 2.3a.53.53 0 0 1 .95 0l2.31 4.68a2.12 2.12 0 0 0 1.6 1.16l5.16.76a.53.53 0 0 1 .3.9l-3.74 3.64a2.12 2.12 0 0 0-.61 1.88l.88 5.14a.53.53 0 0 1-.77.56l-4.62-2.43a2.12 2.12 0 0 0-1.97 0L6.4 21.01a.53.53 0 0 1-.77-.56l.88-5.14a2.12 2.12 0 0 0-.61-1.88L2.16 9.8a.53.53 0 0 1 .3-.9l5.16-.76a2.12 2.12 0 0 0 1.6-1.16z"/>',
    pin: '<path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
    cap: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect x="2" y="6" width="20" height="14" rx="2"/>',
    key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    eye: '<path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M10.73 5.08a10.74 10.74 0 0 1 11.2 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.44 2.49M14.08 14.16a3 3 0 0 1-4.24-4.24M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14M2 2l20 20"/>',
    copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    snow: '<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    coffee: '<path d="M10 2v2M14 2v2M6 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  };
  const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
  const VHEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  const vlogo = () => `<span class="vlogo">${VHEART}</span>`;
  const wordmark = () => `<span class="word">Vin<b>der</b></span>`;

  // ---------- helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clone = o => JSON.parse(JSON.stringify(o));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function ago(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'now';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 7 * 86400) return Math.floor(s / 86400) + 'd';
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  function agoLong(t) {
    const s = (Date.now() - t) / 1000;
    if (s < 3600) return 'just now';
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    const d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  }
  const clock = t => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  function dayLabel(t) {
    const n = new Date(), k = L.dayKey(new Date(t));
    if (k === L.dayKey(n)) return 'Today';
    if (k === L.dayKey(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1))) return 'Yesterday';
    return new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // ---------- state ----------
  const blank = () => ({ v: 1, me: null, theme: 'system', gemKey: '', gemModel: MODELS[0], custom: {}, vouches: clone(D.VOUCHES), acc: {}, draft: null });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return Object.assign(blank(), s);
    } catch (e) { /* private mode or corrupt data: start fresh */ }
    return blank();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) {
      toast('This browser blocked storage, so changes will not survive a reload.');
      return false;
    }
  }

  const byId = id => (S.custom[id] || D.users.find(u => u.id === id));
  const allUsers = () => D.users.filter(u => !S.custom[u.id]).concat(Object.values(S.custom));
  const me = () => byId(S.me);
  function acc() {
    if (!S.acc[S.me]) S.acc[S.me] = { swipes: {}, history: [], matches: {}, chats: {}, seen: {}, counter: null, premium: false, reports: [], blocked: {}, seeded: false };
    return S.acc[S.me];
  }
  const premium = () => !!(S.me && acc().premium);

  function seed() {
    const a = acc(), m = me(), sd = D.SEEDS[m.mode], now = Date.now();
    if (a.seeded) return;
    const add = (uid, chat) => {
      if (!byId(uid) || uid === m.id || a.blocked[uid]) return;
      a.swipes[uid] = 'like';
      a.matches[uid] = { at: now + (chat[0][1] - 2) * H };
      a.chats[uid] = chat.map(([who, h, text], i) => ({ id: `${uid}-${i}`, from: who === 'me' ? m.id : uid, t: now + h * H, text, flag: who === 'them' ? flagOf(text) : null }));
    };
    add(sd.ongoing, sd.ongoingChat);
    add(sd.cold, sd.coldChat);
    add(sd.scam, sd.scamChat);
    a.seen[sd.ongoing] = now - 1.6 * H;
    a.seeded = true;
    save();
  }
  function flagOf(text) {
    const v = L.heuristic(text);
    return v.verdict === 'warn' || v.verdict === 'block' ? v.category : null;
  }

  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === 'light' || S.theme === 'dark') r.dataset.theme = S.theme; else delete r.dataset.theme;
  }

  // ---------- photos ----------
  const PALETTES = [['#F0517A', '#7A1E48'], ['#5B7FD0', '#122A57'], ['#E2B24A', '#B4462E'], ['#2BA38C', '#123E57'], ['#9B6BE0', '#3B2470'], ['#FF8F6B', '#C72027']];
  function initials(u) {
    const w = String(u.short || u.name || '?').replace(/^Dr\.\s*/, '').trim().split(/\s+/);
    return (w[0][0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }
  function ph(u, i = 0, label = true) {
    const [c1, c2] = PALETTES[(L.hash(u.id) + i) % PALETTES.length];
    return `<div class="phd" style="background:radial-gradient(circle at 28% 18%,rgba(255,255,255,.3),transparent 52%),linear-gradient(${140 + i * 25}deg,${c1},${c2})" role="img" aria-label="${esc(u.short)}: no photo yet"><span class="ini">${esc(initials(u))}</span>${label ? '<small>Photo coming soon</small>' : ''}</div>`;
  }
  function photo(u, i = 0, locked = false) {
    const src = u.photos && u.photos[i];
    if (!src) return ph(u, i);
    return `<img class="pimg${locked ? ' locked' : ''}" src="${esc(src)}" alt="${locked ? 'Locked photo' : esc(u.short) + ', photo ' + (i + 1)}" draggable="false" data-u="${esc(u.id)}" data-i="${i}">`;
  }
  const avatar = (u, cls = '') => `<span class="av ${cls}">${u.photos && u.photos[0] ? photo(u, 0) : ph(u, 0, false)}</span>`;
  // A missing photo file falls back to the placeholder.
  document.addEventListener('error', e => {
    const t = e.target;
    if (t.tagName === 'IMG' && t.dataset && t.dataset.u) {
      const u = byId(t.dataset.u);
      if (u) t.outerHTML = ph(u, +t.dataset.i || 0, !t.closest('.av'));
    }
  }, true);
  const PHOTO_PAGES = 5;

  // ---------- facts ----------
  const roleLine = u => u.mode === 'faculty' ? `${u.facultyRole || 'Faculty'} · ${u.college}` : `${u.college} · ${u.major}`;
  const heightTxt = u => u.heightCm ? `${u.heightCm} cm` : 'Prefers not to say';
  const intoTxt = u => ({ male: 'Into men', female: 'Into women', everyone: 'Into everyone' }[u.interestedIn] || '');
  const goalIcon = g => ({ 'Long-term': 'heart', 'Casual dating': 'coffee', 'New friends': 'smile', 'Study buddy': 'book' }[g] || 'target');
  function vouchChip(u, dark) {
    const v = L.vouchSummary(S.vouches[u.id]);
    if (!v) return '';
    return `<span class="chip ${dark ? 'gold' : 'green'}">${ic('shieldcheck', 'sm')} Vouched by ${esc(v.rel)} ★${v.avg}</span>`;
  }
  const starRow = n => `<span class="stars" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map(i => ic('star', 'fill ' + (i <= Math.round(n) ? '' : 'off'))).join('')}</span>`;

  // ---------- VinCupid: Gemini with offline fallback ----------
  function safeJson(t) {
    try { return JSON.parse(String(t).replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { return null; }
  }
  async function gemini(prompt, { json = true, timeout = 15000 } = {}) {
    if (!S.gemKey) throw new Error('No API key set');
    const models = [S.gemModel].concat(MODELS.filter(m => m !== S.gemModel));
    let lastErr = null;
    for (const model of models) {
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), timeout);
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST', signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': S.gemKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: Object.assign({ temperature: json ? 0.2 : 0.9 }, json ? { responseMimeType: 'application/json' } : {}),
          }),
        });
        if (!res.ok) {
          const body = safeJson(await res.text().catch(() => '')) || {};
          const err = new Error(`${res.status}: ${(body.error && body.error.message) || res.statusText}`.slice(0, 180));
          err.status = res.status;
          if ([404, 429, 500, 502, 503, 504].includes(res.status)) { lastErr = err; continue; }
          throw err;
        }
        const d = await res.json();
        const text = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
        if (!text) { lastErr = new Error('Empty response'); continue; }
        return { model, text, json: json ? safeJson(text) : null };
      } catch (e) {
        if (e.name === 'AbortError') { lastErr = new Error('Timed out'); continue; }
        if (e.status) throw e;
        throw new Error('Network error: ' + e.message);
      } finally {
        clearTimeout(tm);
      }
    }
    throw lastErr || new Error('Gemini unavailable');
  }

  async function analyze(text, ctx = {}) {
    const h = L.heuristic(text, ctx);
    if (h.verdict === 'block' || !S.gemKey) return h;
    const p = ctx.partner;
    try {
      const r = await gemini(`You are VinCupid, the safety and coaching agent inside Vinder, a dating app for the VinUniversity community (students and faculty match in separate pools).
Classify ONE ${ctx.kind || 'chat message'}${p ? ` that the user is about to send to ${p.short}` : ''}.
Return JSON only: {"verdict":"ok|coach|warn|block","category":"ok|boring|harassment|scam|ill-intent","reason":"one short sentence shown to the user","suggestion":"one short sentence","openers":["..."]}
- block: sexual content or harassment.
- warn: scam or trafficking signals (money, gift cards, crypto, job/modelling/travel offers, passport or ID requests, moving to Telegram/WhatsApp, meeting alone off campus) or manipulation, coercion, secrecy or status pressure.
- coach: a low-effort opener such as "hi" or "hey". Give 2 or 3 specific openers${p ? ` using their favourites: ${p.favorites.join(', ')}` : ''}.
- ok: everything else, with an empty openers list.
Text: ${JSON.stringify(text)}`);
      const g = r.json;
      if (!g || !(g.verdict in L.SEVERITY)) return h;
      const ai = {
        verdict: g.verdict, category: String(g.category || 'ok'), source: 'gemini',
        reason: String(g.reason || ''), suggestion: String(g.suggestion || ''),
        openers: Array.isArray(g.openers) ? g.openers.slice(0, 3).map(String) : [],
      };
      // The AI can raise a verdict but never lower what the rules caught.
      const out = L.SEVERITY[ai.verdict] >= L.SEVERITY[h.verdict] ? ai : h;
      if (out.verdict === 'coach' && !(out.openers && out.openers.length)) out.openers = L.openers(p, ctx.me);
      if (!out.reason) out.reason = h.reason;
      return out;
    } catch (e) {
      return h;
    }
  }

  // ---------- shell ----------
  const root = { view: null, layer: null, toasts: null };
  let timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.push(id); return id; };
  function clearTimers() { timers.forEach(id => { clearTimeout(id); clearInterval(id); }); timers = []; }

  function toast(msg, face) {
    if (!root.toasts) return;
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = (face ? `<img src="${A.face}" alt="">` : '') + `<span>${esc(msg)}</span>`;
    root.toasts.append(d);
    while (root.toasts.children.length > 2) root.toasts.firstElementChild.remove();
    setTimeout(() => d.remove(), 2800);
  }

  function route() {
    const m = /^#\/([\w-]+)(?:\/(.*))?$/.exec(location.hash);
    return { page: m ? m[1] : '', arg: m && m[2] ? decodeURIComponent(m[2]) : '' };
  }
  const go = p => { if (location.hash === '#/' + p) render(); else location.hash = '#/' + p; };
  // Back inside the app only; a profile opened from a shared link goes to Discover instead of leaving.
  let navDepth = 0;
  const back = () => (navDepth > 0 ? history.back() : go('discover'));

  function unreadCount() {
    if (!S.me) return 0;
    const a = acc();
    return Object.keys(a.matches).filter(id => (a.chats[id] || []).some(m => m.from === id && m.t > (a.seen[id] || 0))).length;
  }

  function topBar(view) {
    const ai = S.gemKey ? 'AI on' : 'AI off';
    return `<header class="top">
      <a class="brand" href="#/discover" aria-label="Vinder, go to Discover">${vlogo()}${wordmark()}</a>
      <span class="spacer"></span>${view.tools || ''}
      <a class="pill ${S.gemKey ? 'on' : ''}" href="#/settings" title="VinCupid AI settings"><img src="${A.face}" alt=""><span class="dot"></span>${ai}</a>
      ${premium() ? `<a class="pill gold" href="#/premium">${ic('crown', 'sm')} Premium</a>` : `<a class="pill plain" href="#/premium" aria-label="Get Premium">${ic('crown', 'sm')}</a>`}
    </header>`;
  }

  function tabBar(page) {
    const n = unreadCount();
    const on = r => page === r || (r === 'me' && ['edit', 'settings', 'premium'].includes(page)) || (r === 'matches' && page === 'chat');
    const t = [['discover', 'flame', 'Discover'], ['matches', 'chat', 'Matches', n], ['vincupid', '', 'VinCupid'], ['me', 'user', 'Me']];
    return `<nav class="tabs" aria-label="Main">${t.map(([r, i, l, b]) => `<a class="tab ${on(r) ? 'on' : ''}" href="#/${r}" ${on(r) ? 'aria-current="page"' : ''}>${i ? ic(i, 'lg') : `<img class="face" src="${A.face}" alt="">`}${l}${b ? `<span class="badge" aria-label="${b} unread">${b}</span>` : ''}</a>`).join('')}</nav>`;
  }

  const P = {};
  let current = '';
  function render() {
    clearTimers();
    closeLayer();
    applyTheme();
    let { page, arg } = route();
    if (page !== 'vouch' && page !== 'onboarding') {
      if (!S.me && page !== 'welcome') { if (location.hash !== '#/welcome') { history.replaceState(null, '', '#/welcome'); } page = 'welcome'; }
      if (S.me && (!page || page === 'welcome')) { history.replaceState(null, '', '#/discover'); page = 'discover'; }
    }
    if (!P[page]) page = S.me ? 'discover' : 'welcome';
    if (page === 'onboarding' && !S.draft) page = S.me ? 'discover' : 'welcome';
    const view = P[page].render(arg) || {};
    current = page;
    root.view.innerHTML = (view.head !== undefined ? view.head : topBar(view)) +
      `<main class="main ${view.fill ? 'fill' : ''}" id="main">${view.body || ''}</main>` +
      (view.foot || '') + (S.me && view.nav !== false ? tabBar(page) : '');
    document.title = (view.title ? view.title + ' · ' : '') + 'Vinder';
    if (P[page].bind) P[page].bind(arg);
  }

  // ---------- overlays ----------
  let layerKeys = null;
  function openLayer(html, bind) {
    root.layer.innerHTML = `<div class="layer">${html}</div>`;
    const el = root.layer.firstElementChild;
    $$('[data-close]', el).forEach(b => b.addEventListener('click', closeLayer));
    layerKeys = e => { if (e.key === 'Escape') closeLayer(); };
    document.addEventListener('keydown', layerKeys);
    if (bind) bind(el);
    const f = $('[autofocus], .sheet button, .match button', el);
    if (f) f.focus({ preventScroll: true });
    return el;
  }
  function closeLayer() {
    if (root.layer) root.layer.innerHTML = '';
    if (layerKeys) document.removeEventListener('keydown', layerKeys);
    layerKeys = null;
  }
  const layerOpen = () => !!(root.layer && root.layer.firstElementChild);
  const sheet = (html, bind) => openLayer(`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`, bind);

  function cupid(kind, who, html) {
    return `<div class="vc ${kind}"><img class="face" src="${A.face}" alt=""><div class="grow"><b class="who">${esc(who)}</b>${html}</div></div>`;
  }

  function confirmSheet(title, text, okLabel, onOk, danger) {
    sheet(`<h3 class="t">${esc(title)}</h3><p class="muted" style="margin:6px 0 16px">${text}</p>
      <div class="row"><button class="btn ghost grow" data-close>Cancel</button><button class="btn ${danger ? 'danger' : ''} grow" id="ok">${esc(okLabel)}</button></div>`,
      el => { $('#ok', el).onclick = () => { closeLayer(); onOk(); }; });
  }

  // ---------- desktop pitch ----------
  function renderPitch() {
    const el = document.getElementById('pitch');
    if (!el) return;
    el.innerHTML = `<span class="chip-white"><span class="mk"><img src="${A.mark}" alt="VinUniversity"></span>For the VinUni community</span>
      <h1>Find your <em>person</em> on campus.</h1>
      <p>Vinder is a dating app for VinUni students and faculty, with VinCupid, an AI wingmate that keeps creeps out and conversations interesting.</p>
      <ul>
        <li><span class="ic">${ic('flag')}</span>Every profile shows 3 green flags and 3 red flags</li>
        <li><span class="ic">${ic('shieldcheck')}</span>Friends and exes can vouch for a match</li>
        <li><span class="ic">${ic('users')}</span>Students and faculty match in separate pools</li>
        <li><span class="ic">${ic('sparkles')}</span>VinCupid blocks harassment and flags scams</li>
      </ul>
      <div class="vc-mini"><img src="${A.mascot}" alt="VinCupid, the Vinder mascot"><div><b>Hi, I'm VinCupid.</b><br><span style="color:#C9D3E8">I read the room so you can be yourself.</span></div></div>
      <p class="fine">Student prototype. Not an official VinUniversity service. Data stays in this browser.</p>`;
  }

  // =====================================================================
  // Welcome / sign-in
  // =====================================================================
  const signin = { email: '', code: null, entered: '' };
  P.welcome = {
    render() {
      const mt = byId('minh-tri'), tn = byId('thanh-ngan');
      return {
        head: '', nav: false, title: 'Welcome',
        body: `<div class="welcome">
          <div class="topline"><span class="mk"><img src="${A.mark}" alt="VinUniversity"></span>For the VinUni community</div>
          <div class="hero">
            <div class="logo-xl">${vlogo()}${wordmark()}</div>
            <p class="tagline">Dating for VinUni, with an AI wingmate that has your back.</p>
            <div class="cupid-say"><img src="${A.mascot}" alt="VinCupid"><div class="bubble">Hi, I'm <b>VinCupid</b>! I block creeps, flag scams and help you open with something better than "hi".</div></div>
          </div>
          <form class="signin" id="sf" novalidate>
            ${signin.code ? `<h2>Check your inbox</h2>
              <p class="muted small" style="margin-top:4px">We sent a 6-digit code to <b>${esc(signin.email)}</b>.</p>
              <div class="field"><label class="lbl" for="code">Verification code</label><input class="input otp" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="${esc(signin.entered)}"></div>
              <p class="hint">Prototype: no email is sent. Your code is <b>${signin.code}</b>.</p>
              <p class="err" id="err" role="alert"></p>
              <button class="btn block" id="go">Verify and continue</button>
              <p class="center small" style="margin-top:10px"><button type="button" class="link" id="chg">Use a different email</button></p>`
            : `<h2>Sign in with your VinUni email</h2>
              <div class="field"><label class="lbl" for="em">VinUni email</label><input class="input" id="em" type="email" inputmode="email" autocomplete="email" placeholder="name@vinuni.edu.vn" value="${esc(signin.email)}"></div>
              <p class="err" id="err" role="alert"></p>
              <button class="btn block" id="go">${ic('mail')} Send code</button>`}
            <div class="or">or try a demo account</div>
            <div class="opts two">
              <button type="button" class="demo-btn" data-demo="minh-tri">${avatar(mt, 'sm')}<div><b>Minh Tri</b><span>Student · CECS</span></div></button>
              <button type="button" class="demo-btn" data-demo="thanh-ngan">${avatar(tn, 'sm')}<div><b>Thanh Ngan</b><span>Faculty · TA</span></div></button>
            </div>
          </form>
          <p class="disclaimer"><img src="${A.logo}" alt="VinUniversity"><br>Student prototype for a VinUni design class. Not an official VinUniversity service.</p>
        </div>`,
      };
    },
    bind() {
      $$('[data-demo]').forEach(b => b.onclick = () => login(b.dataset.demo));
      const err = m => { $('#err').textContent = m; $('#sf').classList.remove('shake'); void $('#sf').offsetWidth; $('#sf').classList.add('shake'); };
      $('#sf').onsubmit = e => {
        e.preventDefault();
        if (!signin.code) {
          const em = $('#em').value.trim();
          if (!L.isVinUniEmail(em)) return err('Use your @vinuni.edu.vn email address.');
          signin.email = em.toLowerCase();
          signin.code = String(100000 + (L.hash(em + Date.now()) % 900000));
          signin.entered = '';
          render();
          $('#code').focus();
          return;
        }
        const c = $('#code').value.trim();
        if (c !== signin.code) { signin.entered = ''; return err('That code does not match. Check the hint above.'); }
        const known = Object.values(S.custom).find(u => u.email === signin.email);
        const email = signin.email;
        signin.code = null; signin.entered = ''; signin.email = '';
        if (known) return login(known.id);
        S.draft = newDraft(email);
        save();
        go('onboarding/1');
      };
      const code = $('#code');
      if (code) code.oninput = () => { code.value = code.value.replace(/\D/g, '').slice(0, 6); signin.entered = code.value; };
      const chg = $('#chg');
      if (chg) chg.onclick = () => { signin.code = null; render(); };
    },
  };
  function login(id) {
    if (root.toasts) root.toasts.innerHTML = '';
    S.me = id;
    seed();
    save();
    go('discover');
    toast(`Welcome, ${me().short}!`, true);
  }

  // =====================================================================
  // Discover
  // =====================================================================
  let deckPhoto = 0, busy = false;
  const deckNow = () => L.buildDeck(me(), allUsers().filter(u => !acc().blocked[u.id]), acc().swipes);

  function cardPanel(u, i) {
    const m = me();
    if (i === 0) {
      const c = L.compat(m, u);
      return `<div class="chips"><span class="chip rose">${ic('sparkles', 'sm')} ${c.pct}% match</span><span class="chip">${ic(goalIcon(u.goal), 'sm')} ${esc(u.goal)}</span>${vouchChip(u, true)}</div>
        ${c.reasons.length ? `<p class="small" style="margin-top:8px;opacity:.85">${esc(c.reasons[0])}</p>` : ''}`;
    }
    if (i === 1) return `<div class="kick">${ic('check', 'sm')} 3 green flags</div><div class="chips">${u.greenFlags.map(f => `<span class="chip green">${esc(f)}</span>`).join('')}</div>`;
    if (i === 2) return `<div class="kick">${ic('flag', 'sm')} 3 red flags</div><div class="chips">${u.redFlags.map(f => `<span class="chip red">${esc(f)}</span>`).join('')}</div>`;
    if (i === 3) return `<div class="kick">${ic('heart', 'sm')} Top 5 favourites</div><div class="chips">${u.favorites.map(f => `<span class="chip">${esc(f)}</span>`).join('')}</div>`;
    return `<div class="kick">${ic('chat', 'sm')} In their words</div><p class="bio">${esc(u.bio)}</p>`;
  }

  function cardInner(u, i) {
    const locked = L.photoLocked(i, premium(), false);
    return `${photo(u, i, locked)}<div class="shade-top"></div><div class="shade"></div>
      <div class="bars" aria-hidden="true">${Array.from({ length: PHOTO_PAGES }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      ${locked ? `<a class="lockpill" href="#/premium">${ic('lock', 'sm')} Photos 3–5 are Premium</a>` : ''}
      <button class="tapz l" data-step="-1" aria-label="Previous photo"></button><button class="tapz r" data-step="1" aria-label="Next photo"></button>
      <span class="stamp like" aria-hidden="true">LIKE</span><span class="stamp nope" aria-hidden="true">NOPE</span>
      <div class="info">
        <div class="nm">${esc(u.short)} <span>${L.age(u.dob)}</span></div>
        <div class="sub"><span>${ic('cap', 'sm')} ${esc(roleLine(u))}</span><span>${ic('star', 'sm')} ${esc(L.zodiac(u.dob))}</span><span>${ic('ruler', 'sm')} ${heightTxt(u)}</span></div>
        <div class="panel">${cardPanel(u, i)}</div>
      </div>
      <button class="more" data-info aria-label="Open ${esc(u.short)}'s full profile">${ic('up')}</button>`;
  }

  P.discover = {
    render() {
      const a = acc(), m = me(), left = L.swipesLeft(a.counter, a.premium), deck = deckNow();
      const head = `<div class="dbar"><span class="grow">${ic(m.mode === 'faculty' ? 'briefcase' : 'cap', 'sm')} ${m.mode === 'faculty' ? 'Faculty & staff' : 'Student'} pool</span>
        ${a.premium ? `<span class="pill gold">${ic('sparkles', 'sm')} Unlimited</span>` : `<span class="pill plain" title="Free swipes reset at midnight">${left} of ${L.FREE.swipesPerDay} swipes left</span>`}</div>`;
      const rw = `<button class="act small rw" id="rw" aria-label="${a.premium ? 'Rewind last swipe' : 'Rewind (Premium)'}" ${a.premium && !a.history.length ? 'disabled' : ''}>${ic('undo')}${a.premium ? '' : `<span class="lk">${ic('lock')}</span>`}</button>`;
      if (!a.premium && left <= 0) {
        return {
          title: 'Discover', fill: true,
          body: head + `<div class="empty"><img class="mascot" src="${A.mascot}" alt="">
            <h2>That's your 10 for today</h2><p>Free swipes reset at midnight. Spend the time on the matches you already have.</p>
            <div class="countdown" id="cd" aria-live="off">--:--:--</div>
            <a class="btn gold" href="#/premium">${ic('crown')} Unlimited swipes with Premium</a>
            <a class="btn ghost sm" href="#/matches">Go to Matches</a></div>`,
        };
      }
      if (!deck.length) {
        return {
          title: 'Discover', fill: true,
          body: head + `<div class="empty"><img class="mascot" src="${A.mascot}" alt="">
            <h2>You've seen everyone</h2><p>That's the whole ${m.mode === 'faculty' ? 'faculty & staff' : 'student'} pool for now. New people join every week.</p>
            ${a.premium && a.history.length ? `<button class="btn ghost" id="rw">${ic('undo')} Rewind last swipe</button>` : ''}
            <a class="btn" href="#/matches">${ic('chat')} Talk to your matches</a></div>`,
        };
      }
      const [u, next] = deck;
      if (deckPhoto >= PHOTO_PAGES) deckPhoto = 0;
      return {
        title: 'Discover', fill: true,
        body: head + `<div class="deck" id="deck">
            ${next ? `<div class="sc behind" aria-hidden="true">${cardInner(next, 0)}</div>` : ''}
            <article class="sc" id="top" aria-label="${esc(u.short)}, ${L.age(u.dob)}" tabindex="-1">${cardInner(u, deckPhoto)}</article>
          </div>
          <div class="actions">
            ${rw}
            <button class="act pass" id="no" aria-label="Pass on ${esc(u.short)}">${ic('x')}</button>
            <button class="act like" id="yes" aria-label="Like ${esc(u.short)}">${ic('heart', 'fill')}</button>
            <button class="act small info" data-info aria-label="Full profile">${ic('info')}</button>
          </div>
          <div class="kbd"><kbd>←</kbd> pass · <kbd>→</kbd> like · <kbd>Space</kbd> next photo · <kbd>Z</kbd> rewind</div>`,
      };
    },
    bind() {
      const a = acc();
      const cd = $('#cd');
      if (cd) {
        const tick = () => {
          const ms = L.msUntilMidnight(), s = Math.floor(ms / 1000);
          cd.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':');
          if (ms < 1000) later(render, 1200);
        };
        tick(); every(tick, 1000);
      }
      const rw = $('#rw');
      if (rw) rw.onclick = rewind;
      const card = $('#top');
      if (!card) return;
      const u = deckNow()[0];
      $('#no').onclick = () => decide('pass');
      $('#yes').onclick = () => decide('like');
      $$('[data-info]').forEach(b => b.onclick = () => go('profile/' + u.id));
      card.addEventListener('click', e => {
        if (card.dataset.dragged) { e.preventDefault(); e.stopPropagation(); delete card.dataset.dragged; return; }
        const st = e.target.closest('[data-step]');
        if (st) { e.preventDefault(); flip(+st.dataset.step); }
      }, true);
      // drag to swipe
      let sx = 0, sy = 0, dx = 0, dy = 0, down = false, moved = false;
      const stamp = x => {
        const k = Math.min(1, Math.abs(x) / 110);
        $('.stamp.like', card).style.opacity = x > 0 ? k : 0;
        $('.stamp.nope', card).style.opacity = x < 0 ? k : 0;
      };
      card.addEventListener('pointerdown', e => {
        if (busy || e.button !== 0 || e.target.closest('a, .more')) return;
        down = true; moved = false; sx = e.clientX; sy = e.clientY; dx = dy = 0;
        card.classList.remove('settle');
      });
      card.addEventListener('pointermove', e => {
        if (!down) return;
        dx = e.clientX - sx; dy = e.clientY - sy;
        if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { moved = true; try { card.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ } }
        if (!moved) return;
        card.style.transform = `translate(${dx}px, ${dy * 0.2}px) rotate(${dx / 16}deg)`;
        stamp(dx);
      });
      const end = () => {
        if (!down) return;
        down = false;
        if (!moved) return;
        card.dataset.dragged = '1';
        setTimeout(() => delete card.dataset.dragged, 50);
        if (Math.abs(dx) > 110) decide(dx > 0 ? 'like' : 'pass', dx);
        else { card.classList.add('settle'); card.style.transform = ''; stamp(0); }
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
    },
  };

  function flip(step) {
    const u = deckNow()[0], card = $('#top');
    if (!u || !card) return;
    deckPhoto = (deckPhoto + step + PHOTO_PAGES) % PHOTO_PAGES;
    card.innerHTML = cardInner(u, deckPhoto);
    $$('[data-info]', card).forEach(b => b.onclick = () => go('profile/' + u.id));
  }

  function decide(dir, fromX) {
    const a = acc(), u = deckNow()[0], card = $('#top');
    if (busy || !u || !card) return;
    if (L.swipesLeft(a.counter, a.premium) <= 0) return render();
    busy = true;
    const x = dir === 'like' ? 1 : -1;
    $('.stamp.' + (dir === 'like' ? 'like' : 'nope'), card).style.opacity = 1;
    card.classList.remove('settle');
    card.classList.add('fly');
    card.style.transform = `translate(${x * 560}px, ${fromX ? 30 : 60}px) rotate(${x * 30}deg)`;
    const behind = $('.sc.behind');
    if (behind) { behind.style.transition = 'transform .35s ease, filter .35s'; behind.style.transform = 'none'; behind.style.filter = 'none'; }
    setTimeout(() => { busy = false; commitSwipe(u, dir); }, 320);
  }

  function commitSwipe(u, dir, opts = {}) {
    const a = acc();
    a.swipes[u.id] = dir;
    a.history.push(u.id);
    if (!opts.free) a.counter = L.countSwipe(a.counter);
    let matched = false;
    if (dir === 'like' && L.likesBack(u, S.me)) {
      a.matches[u.id] = { at: Date.now() };
      a.chats[u.id] = a.chats[u.id] || [];
      matched = true;
    }
    deckPhoto = 0;
    save();
    render();
    if (matched) showMatch(u);
  }

  function rewind() {
    const a = acc();
    if (!a.premium) { toast('Rewind is a Premium feature.', true); return go('premium'); }
    const id = a.history.pop();
    if (!id) return;
    const hadChat = (a.chats[id] || []).length;
    delete a.swipes[id];
    if (!hadChat) { delete a.matches[id]; delete a.chats[id]; }
    deckPhoto = 0;
    save();
    render();
    toast(`Rewound: ${byId(id).short} is back.`);
  }

  function showMatch(u) {
    const m = me(), op = L.openers(u, m)[0] || `Hi ${u.short}! What's your favourite spot on campus?`;
    const hearts = Array.from({ length: 14 }, (_, i) => {
      const s = 14 + (L.hash(u.id + i) % 22);
      return `<i style="left:${(L.hash(i + u.id) % 100)}%;width:${s}px;height:${s}px;animation-delay:${(i * 0.23).toFixed(2)}s">${ic('heart', 'fill')}</i>`;
    }).join('');
    openLayer(`<div class="match" role="dialog" aria-modal="true" aria-labelledby="mh"><div class="hearts" aria-hidden="true">${hearts}</div>
      <div class="pair">${avatar(m)}<span class="heart">${ic('heart', 'fill lg')}</span>${avatar(u)}</div>
      <h2 id="mh">It's a match!</h2>
      <p class="lead">You and ${esc(u.short)} liked each other.</p>
      <div style="margin:18px 0 10px;width:100%;display:flex;justify-content:center">${cupid('', 'VinCupid', `<p>Skip "hi". Try this opener:</p><p style="color:var(--ink);font-weight:700;margin-top:4px">“${esc(op)}”</p>`)}</div>
      <div class="btns"><button class="btn white" id="say">${ic('send')} Send that opener</button><button class="btn" id="chat">Write my own</button><button class="btn ghost" data-close style="background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">Keep swiping</button></div>
    </div>`, el => {
      $('#say', el).onclick = () => { closeLayer(); go('chat/' + u.id); setTimeout(() => sendMessage(u, op), 80); };
      $('#chat', el).onclick = () => { closeLayer(); go('chat/' + u.id); };
    });
  }

  document.addEventListener('keydown', e => {
    if (current !== 'discover' || layerOpen() || e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); decide('like'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); decide('pass'); }
    else if (e.key === ' ') { e.preventDefault(); flip(1); }
    else if (e.key === 'ArrowUp') { const u = deckNow()[0]; if (u) { e.preventDefault(); go('profile/' + u.id); } }
    else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') { e.preventDefault(); rewind(); }
  });

  // =====================================================================
  // Matches
  // =====================================================================
  function lastActivity(id) {
    const c = (acc().chats[id] || []).filter(m => m.from !== 'vincupid');
    return c.length ? c[c.length - 1].t : acc().matches[id].at;
  }
  P.matches = {
    render() {
      const a = acc(), m = me();
      const ids = Object.keys(a.matches).filter(id => byId(id) && !a.blocked[id]);
      const fresh = ids.filter(id => !(a.chats[id] || []).some(x => x.from !== 'vincupid')).sort((x, y) => a.matches[y].at - a.matches[x].at);
      const convos = ids.filter(id => !fresh.includes(id)).sort((x, y) => lastActivity(y) - lastActivity(x));
      const likers = allUsers().filter(u => u.likesYou && u.mode === m.mode && u.id !== m.id && L.compatible(m, u) && !a.swipes[u.id] && !a.blocked[u.id]);
      const likesBlock = !likers.length ? '' : a.premium
        ? `<section class="sec" style="margin-top:4px"><div class="sec-h"><h3>Likes you</h3><span class="chip gold">${ic('crown', 'sm')} ${likers.length}</span></div>
            <div class="lgrid">${likers.map(u => `<div class="lcard">${photo(u, 0)}<div class="cap"><b>${esc(u.short)}, ${L.age(u.dob)}</b><span class="small" style="opacity:.85">${esc(roleLine(u))}</span>
              <div class="row"><button style="background:#fff;color:#E5484D" data-lb="pass" data-id="${u.id}" aria-label="Pass on ${esc(u.short)}">${ic('x', 'sm')}</button><button style="background:var(--grad);color:#fff" data-lb="like" data-id="${u.id}" aria-label="Like ${esc(u.short)} back">${ic('heart', 'sm fill')}</button></div></div></div>`).join('')}</div></section>`
        : `<a class="likes-card" href="#/premium"><span class="likes-stack">${likers.slice(0, 3).map(u => `<span class="av">${u.photos && u.photos[0] ? photo(u, 0, true) : `<div class="locked" style="width:100%;height:100%">${ph(u, 0, false)}</div>`}</span>`).join('')}</span>
            <span class="grow"><b style="display:block;color:var(--ink)">${likers.length} ${likers.length === 1 ? 'person likes' : 'people like'} you</b><span class="small muted">See who with Premium and match instantly.</span></span>${ic('crown')}</a>`;
      return {
        title: 'Matches',
        body: `<div class="page">${likesBlock}
          ${fresh.length ? `<section class="sec"><div class="sec-h"><h3>New matches</h3><span class="muted small">${fresh.length}</span></div>
            <div class="newrow">${fresh.map(id => { const u = byId(id); return `<a href="#/chat/${id}">${avatar(u, 'ring')}<span class="ellipsis" style="max-width:66px">${esc(u.short)}</span></a>`; }).join('')}</div></section>` : ''}
          <section class="sec"><div class="sec-h"><h3>Messages</h3></div>
          ${convos.length ? `<div class="card" style="padding:0 12px">${convos.map(id => convoRow(byId(id))).join('')}</div>`
            : `<div class="empty" style="padding:30px 10px"><img class="mascot" src="${A.mascot}" alt="" style="width:110px"><h2 style="font-size:22px">No conversations yet</h2><p>Match with someone on Discover, then open with something from their profile.</p><a class="btn" href="#/discover">${ic('flame')} Start swiping</a></div>`}
          </section></div>`,
      };
    },
    bind() {
      $$('[data-lb]').forEach(b => b.onclick = () => {
        const u = byId(b.dataset.id);
        commitSwipe(u, b.dataset.lb, { free: true });
        if (b.dataset.lb === 'pass') toast(`Passed on ${u.short}.`);
      });
    },
  };
  function convoRow(u) {
    const a = acc(), c = (a.chats[u.id] || []).filter(m => m.from !== 'vincupid'), last = c[c.length - 1];
    const unread = c.some(m => m.from === u.id && m.t > (a.seen[u.id] || 0));
    const flagged = c.some(m => m.from === u.id && m.flag);
    const cold = L.coldStatus(c, S.me);
    return `<a class="convo ${unread ? 'unread' : ''}" href="#/chat/${u.id}">${avatar(u)}
      <span class="grow"><span class="nm">${esc(u.short)}${flagged ? `<span class="tag red">${ic('alert')} Safety</span>` : cold ? `<span class="tag cold">${ic('snow')} Gone cold</span>` : ''}</span>
      <span class="last ellipsis" style="display:block">${last ? (last.from === S.me ? 'You: ' : '') + esc(last.text) : ''}</span></span>
      <span class="when">${last ? ago(last.t) : ''}</span>${unread ? '<span class="udot" aria-label="Unread"></span>' : ''}</a>`;
  }

  // =====================================================================
  // Chat
  // =====================================================================
  const typing = {};
  const SPOTS = [
    ['ph-fountain', 'Fountain plaza', 'Busy, bright, easy to find', 'Want to grab a drink and walk by the fountain plaza after class?'],
    ['ph-lawn', 'The central lawn', 'Picnics, sunsets, lots of people', 'Picnic on the central lawn this weekend? I bring snacks, you bring a playlist.'],
    ['ph-facade', 'Main building steps', 'Meet here, then pick a café', 'Let\'s meet at the main building steps and go find coffee from there?'],
  ];
  const spotsHtml = () => `<div class="spots">${SPOTS.map(([cls, t, s, msg]) => `<button class="spot ${cls}" data-say="${esc(msg)}"><b>${t}</b><span>${s}</span></button>`).join('')}</div>`;

  function msgsHtml(u) {
    const a = acc(), c = a.chats[u.id] || [], meId = S.me;
    const real = c.filter(m => m.from !== 'vincupid');
    let out = '', lastDay = '';
    if (!real.length) {
      const ops = L.openers(u, me());
      out += `<div class="chat-empty"><div class="pair-sm">${avatar(me())}${avatar(u)}</div>
        <h3 class="t">You matched with ${esc(u.short)}</h3><p class="muted small">${agoLong(a.matches[u.id].at)}</p></div>
        ${cupid('', 'VinCupid · openers', `<p>Open with something from their profile. Tap one to use it:</p><div class="chips">${ops.map(o => `<button class="chip" data-fill="${esc(o)}">${esc(o)}</button>`).join('')}</div>`)}
        ${cupid('', 'VinCupid · safe first dates', `<p>First dates go best somewhere public on campus.</p><div style="margin-top:10px">${spotsHtml()}</div>`)}`;
    }
    c.forEach((m, i) => {
      const dl = dayLabel(m.t);
      if (dl !== lastDay) { out += `<div class="day">${dl}</div>`; lastDay = dl; }
      if (m.from === 'vincupid') {
        const ops = m.openers && m.openers.length ? `<div class="chips">${m.openers.map(o => `<button class="chip" data-fill="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : '';
        out += cupid(m.kind === 'coach' ? '' : m.kind, 'VinCupid · ' + m.title, `<p>${esc(m.text)}</p>${m.sub ? `<p class="small" style="margin-top:4px">${esc(m.sub)}</p>` : ''}${m.quote ? `<p class="small muted" style="margin-top:6px">Not sent: “${esc(m.quote.slice(0, 80))}${m.quote.length > 80 ? '…' : ''}”</p>` : ''}${ops}`);
        return;
      }
      const mine = m.from === meId, nx = c[i + 1];
      out += `<div class="b ${mine ? 'me' : 'them'} ${m.flag ? 'flagged' : ''}">${esc(m.text)}</div>`;
      if (!nx || nx.from !== m.from || nx.t - m.t > 10 * 60e3) out += `<div class="mt ${mine ? 'me' : 'them'}">${clock(m.t)}${mine && m === real[real.length - 1] && nx === undefined ? ' · Delivered' : ''}</div>`;
    });
    const cold = L.coldStatus(c, meId);
    if (cold && !typing[u.id]) {
      out += cupid('cold', 'VinCupid · gone cold', cold.waitingOn === 'them'
        ? `<p>No reply from ${esc(u.short)} in ${Math.floor((Date.now() - cold.since) / 864e5)} days. One light follow-up is fine; more than that starts to feel like pressure.</p><div class="chips"><button class="chip" data-fill="No pressure, but the bún chả offer still stands 😄">Send a light follow-up</button><button class="chip" data-unmatch>Let it go and unmatch</button></div>`
        : `<p>${esc(u.short)} has been waiting ${Math.floor((Date.now() - cold.since) / 864e5)} days for your reply. Don't burn the process: answer, or close it kindly.</p><div class="chips"><button class="chip" data-fill="Sorry for the slow reply! Exams ate me alive. ">Reply now</button><button class="chip" data-fill="Hey, I don't think I have the time to date right now, but it was really nice talking to you. Good luck with everything!">Close it kindly</button></div>`);
    }
    if (typing[u.id]) out += `<div class="typing" aria-label="${esc(u.short)} is typing"><i></i><i></i><i></i></div>`;
    return out;
  }

  P.chat = {
    render(id) {
      const a = acc(), u = byId(id);
      if (!u || !a.matches[id]) {
        return { title: 'Chat', body: `<div class="empty"><img class="mascot" src="${A.mascot}" alt=""><h2>This chat isn't available</h2><p>You may have unmatched or blocked this person.</p><a class="btn" href="#/matches">Back to Matches</a></div>`, fill: true };
      }
      a.seen[id] = Date.now();
      save();
      const flagged = (a.chats[id] || []).find(m => m.from === id && m.flag);
      return {
        title: u.short, nav: false,
        head: `<header class="chat-head"><a class="icon-btn" href="#/matches" aria-label="Back to Matches">${ic('left')}</a>
          <a class="who" href="#/profile/${id}">${avatar(u, 'sm')}<span class="grow"><b class="ellipsis">${esc(u.short)}</b><small class="ellipsis">${ic('shieldcheck', 'sm')} VinCupid is looking out for you</small></span></a>
          <button class="icon-btn" id="menu" aria-label="Chat options">${ic('more')}</button></header>
          ${flagged ? `<div class="safety" role="alert"><div class="row">${ic('shield', 'lg')}<div class="grow"><b>VinCupid safety alert</b><p>${flagged.flag === 'scam' ? `${esc(u.short)} asked about money, ID or moving off Vinder. These are common scam and trafficking signs. Never send money, codes or ID photos.` : flagged.flag === 'harassment' ? `${esc(u.short)} sent something sexual or harassing. You don't have to reply.` : `${esc(u.short)} is using pressure or secrecy. You can stop talking at any time.`}</p>
            <div class="acts"><button class="btn danger sm" data-report>${ic('flag', 'sm')} Report</button><button class="btn ghost sm" data-block>${ic('ban', 'sm')} Block</button></div></div></div></div>` : ''}`,
        body: `<div class="msgs" id="msgs">${msgsHtml(u)}</div>`,
        foot: `<form class="composer" id="cf"><button type="button" class="ideas" id="ideas" aria-label="Opener ideas from VinCupid">${ic('sparkles')}</button>
          <label class="sr" for="msg">Message ${esc(u.short)}</label><input class="input" id="msg" placeholder="Message ${esc(u.short)}…" autocomplete="off" maxlength="500">
          <button class="send" id="send" aria-label="Send">${ic('send')}</button></form>`,
      };
    },
    bind(id) {
      const u = byId(id);
      if (!u || !acc().matches[id]) return;
      bindMsgs(u);
      scrollEnd();
      $('#cf').onsubmit = e => { e.preventDefault(); sendMessage(u, $('#msg').value); };
      $('#ideas').onclick = () => openersSheet(u);
      $('#menu').onclick = () => chatMenu(u);
      $$('[data-report]').forEach(b => b.onclick = () => reportSheet(u));
      $$('[data-block]').forEach(b => b.onclick = () => blockUser(u));
    },
  };
  function scrollEnd() { const m = $('#main'); if (m) m.scrollTop = m.scrollHeight; }
  function drawMsgs(u) {
    const box = $('#msgs');
    if (!box || current !== 'chat' || route().arg !== u.id) return false;
    box.innerHTML = msgsHtml(u);
    bindMsgs(u);
    scrollEnd();
    return true;
  }
  function bindMsgs(u) {
    $$('#msgs [data-fill]').forEach(b => b.onclick = () => { const i = $('#msg'); i.value = b.dataset.fill; i.focus(); });
    $$('#msgs [data-say]').forEach(b => b.onclick = () => { const i = $('#msg'); i.value = b.dataset.say; i.focus(); });
    $$('#msgs [data-unmatch]').forEach(b => b.onclick = () => unmatch(u));
  }
  function push(uid, msg) {
    const a = acc();
    (a.chats[uid] = a.chats[uid] || []).push(Object.assign({ id: uid + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: Date.now() }, msg));
    save();
  }

  async function sendMessage(u, raw) {
    const text = String(raw || '').trim(), input = $('#msg'), btn = $('#send');
    if (!text || !acc().matches[u.id]) return;
    if (input) { input.value = ''; input.placeholder = 'VinCupid is checking…'; input.disabled = true; }
    if (btn) btn.disabled = true;
    const v = await analyze(text, { partner: u, me: me() });
    if (input) { input.disabled = false; input.placeholder = `Message ${u.short}…`; input.focus(); }
    if (btn) btn.disabled = false;
    if (v.verdict === 'block') {
      push(u.id, { from: 'vincupid', kind: 'block', title: 'message blocked', text: v.reason, sub: v.suggestion, quote: text });
      drawMsgs(u);
      return;
    }
    push(u.id, { from: S.me, text });
    if (v.verdict === 'warn') push(u.id, { from: 'vincupid', kind: 'warn', title: v.category === 'scam' ? 'scam pattern' : 'heads up', text: v.reason, sub: v.suggestion });
    if (v.verdict === 'coach') push(u.id, { from: 'vincupid', kind: 'coach', title: 'coaching tip', text: v.reason, openers: v.openers && v.openers.length ? v.openers : L.openers(u, me()) });
    drawMsgs(u);
    reply(u);
  }

  function scriptedReply(u) {
    const theirs = (acc().chats[u.id] || []).filter(m => m.from === u.id).length;
    if (u.scripted === 'scam') {
      const s = [
        "Hurry, the spots close tonight ⏰ Just send the deposit and a passport photo and you're in.",
        "Why so serious? Add me on Telegram, it's easier to talk there 😘",
        'Loads of VinUni students already joined. 2 million VND deposit, fully refundable, trust me.',
      ];
      return s[theirs % s.length];
    }
    const shared = L.compat(me(), u).shared[0];
    const s = [
      "Haha okay, you have my attention. What's your week looking like?",
      shared ? `Wait, you're into ${shared} too? Okay, this is promising.` : "Tell me one thing about you that isn't on your profile.",
      `Honest question: ${u.favorites[0]} or ${u.favorites[1]}, if you had to pick one forever?`,
      "I'm free after class on Thursday. Fountain plaza at 5? 🙂",
      "Lol, you're funnier than your bio suggests.",
    ];
    return s[theirs % s.length];
  }

  async function aiReply(u) {
    const m = me(), hist = (acc().chats[u.id] || []).filter(x => x.from !== 'vincupid').slice(-10)
      .map(x => `${x.from === u.id ? u.short : m.short}: ${x.text}`).join('\n');
    const r = await gemini(`Role-play ${u.name} (${D.PRONOUNS[u.gender] || ''}), ${L.age(u.dob)}, ${u.mode === 'faculty' ? u.facultyRole + ' in ' + u.major : u.major + ' student'} at VinUniversity, chatting on the dating app Vinder with ${m.short}.
Your bio: ${u.bio}
Favourites: ${u.favorites.join(', ')}. Green flags: ${u.greenFlags.join(', ')}. Red flags: ${u.redFlags.join(', ')}.
Reply to the latest message in one or two short, casual sentences, in the language ${m.short} writes in. Be warm and a little playful. Never ask for money, ID or to move off the app.
Conversation:
${hist}
${u.short}:`, { json: false });
    return r.text.replace(/^["“]|["”]$/g, '').replace(new RegExp('^' + u.short + ':\\s*'), '').slice(0, 280);
  }

  async function reply(u) {
    if (typing[u.id]) return;
    typing[u.id] = true;
    drawMsgs(u);
    const job = (u.scripted || !S.gemKey) ? Promise.resolve(scriptedReply(u)) : aiReply(u).catch(() => scriptedReply(u));
    const [text] = await Promise.all([job, wait(1100 + Math.random() * 900)]);
    typing[u.id] = false;
    if (!S.me || !acc().matches[u.id]) return;
    push(u.id, { from: u.id, text, flag: flagOf(text) });
    const onIt = drawMsgs(u);
    if (onIt) acc().seen[u.id] = Date.now();
    save();
    if (flagOf(text) && onIt) render();
    if (!onIt) toast(`New message from ${u.short}`);
  }

  function openersSheet(u) {
    const ops = L.openers(u, me());
    sheet(`<h3 class="t">Openers for ${esc(u.short)}</h3><p class="muted small" style="margin:4px 0 12px">VinCupid wrote these from ${esc(u.short)}'s favourites and flags.</p>
      <div class="stack" id="ops">${ops.map(o => `<button class="opt" data-op="${esc(o)}"><span class="oi">${ic('sparkles')}</span><span class="grow" style="color:var(--ink);font-weight:600">${esc(o)}</span></button>`).join('')}</div>
      ${S.gemKey ? `<button class="btn ghost block" id="more" style="margin-top:12px">${ic('refresh')} Ask Gemini for fresh ideas</button>` : `<p class="hint">Add a Gemini key in Settings and VinCupid writes fresh openers each time.</p>`}
      <h3 class="t" style="margin-top:20px">Suggest a safe first date</h3><div style="margin-top:10px">${spotsHtml()}</div>`, el => {
      const bindOps = () => $$('[data-op], [data-say]', el).forEach(b => b.onclick = () => { closeLayer(); const i = $('#msg'); i.value = b.dataset.op || b.dataset.say; i.focus(); });
      bindOps();
      const more = $('#more', el);
      if (more) more.onclick = async () => {
        more.disabled = true; more.textContent = 'Thinking…';
        try {
          const r = await gemini(`Write 3 short, specific, playful dating-app openers for ${u.short} (${u.major}). Use their favourites (${u.favorites.join(', ')}) or green flags (${u.greenFlags.join(', ')}). No pickup lines, nothing sexual. Return JSON: {"openers":["...","...","..."]}`);
          const list = (r.json && r.json.openers) || [];
          if (!list.length) throw new Error('No ideas returned');
          $('#ops', el).innerHTML = list.slice(0, 3).map(o => `<button class="opt" data-op="${esc(o)}"><span class="oi">${ic('sparkles')}</span><span class="grow" style="color:var(--ink);font-weight:600">${esc(o)}</span></button>`).join('');
          bindOps();
          more.textContent = 'Fresh from Gemini ✓';
        } catch (e) { more.disabled = false; more.textContent = 'Gemini failed. Try again'; toast(e.message); }
      };
    });
  }

  function chatMenu(u) {
    sheet(`<h3 class="t">${esc(u.short)}</h3><div class="menu" style="margin-top:12px">
      <a href="#/profile/${u.id}" data-close><span class="mi">${ic('user')}</span>View profile<span class="chev">${ic('right', 'sm')}</span></a>
      ${u.vouchContacts && u.vouchContacts.length ? `<button id="vq"><span class="mi">${ic('shieldcheck')}</span>Ask a friend of ${esc(u.short)} to vouch<span class="chev">${ic('right', 'sm')}</span></button>` : ''}
      <button id="rp"><span class="mi" style="background:var(--red-50);color:var(--red)">${ic('flag')}</span>Report ${esc(u.short)}</button>
      <button id="um"><span class="mi" style="background:var(--navy-50);color:var(--navy-700)">${ic('x')}</span>Unmatch</button>
      <button id="bl"><span class="mi" style="background:var(--red-50);color:var(--red)">${ic('ban')}</span>Block</button></div>`, el => {
      const vq = $('#vq', el);
      if (vq) vq.onclick = () => vouchRequestSheet(u);
      $('#rp', el).onclick = () => reportSheet(u);
      $('#um', el).onclick = () => { closeLayer(); unmatch(u); };
      $('#bl', el).onclick = () => { closeLayer(); blockUser(u); };
    });
  }

  function reportSheet(u) {
    const reasons = [['scam', 'Asked for money, ID or to move off Vinder'], ['harassment', 'Sexual or harassing messages'], ['ill-intent', 'Pressure, threats or manipulation'], ['fake', 'Fake profile or not a VinUni member'], ['underage', 'Might be under 18'], ['other', 'Something else']];
    sheet(`<h3 class="t">Report ${esc(u.short)}</h3><p class="muted small" style="margin:4px 0 8px">Reports go to the Vinder Trust & Safety team. ${esc(u.short)} won't know who reported them.</p>
      <div role="radiogroup">${reasons.map(([k, t], i) => `<label class="check"><input type="radio" name="rr" value="${k}" ${i === 0 ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
      <div class="field"><label class="lbl" for="rn">Anything else? (optional)</label><textarea class="input" id="rn" maxlength="300" style="min-height:70px"></textarea></div>
      <label class="check" style="border:0"><input type="checkbox" id="rb" checked><span>Also block ${esc(u.short)}</span></label>
      <button class="btn danger block" id="rs">${ic('flag')} Send report</button>`, el => {
      $('#rs', el).onclick = () => {
        const a = acc();
        a.reports.push({ uid: u.id, reason: $('input[name=rr]:checked', el).value, note: $('#rn', el).value.trim(), t: Date.now() });
        save();
        const alsoBlock = $('#rb', el).checked;
        closeLayer();
        if (alsoBlock) blockUser(u, true);
        toast('Report sent. Thank you for keeping Vinder safe.', true);
      };
    });
  }
  function blockUser(u, silent) {
    const go2 = () => {
      const a = acc();
      a.blocked[u.id] = true; a.swipes[u.id] = 'blocked';
      delete a.matches[u.id]; delete a.chats[u.id];
      save();
      go('matches');
      if (!silent) toast(`${u.short} is blocked. They can't see or message you.`);
    };
    if (silent) return go2();
    confirmSheet(`Block ${u.short}?`, `${esc(u.short)} won't be able to see your profile or message you. This also removes your chat.`, 'Block', go2, true);
  }
  function unmatch(u) {
    confirmSheet(`Unmatch ${u.short}?`, 'The chat disappears for both of you. You can still be kind about it: VinCupid suggests sending a short goodbye first.', 'Unmatch', () => {
      const a = acc();
      delete a.matches[u.id]; delete a.chats[u.id];
      save();
      go('matches');
      toast(`Unmatched ${u.short}.`);
    });
  }

  // =====================================================================
  // Profile (anyone) and vouches
  // =====================================================================
  let profPhoto = 0, profId = '';
  function profHero(u, own) {
    const locked = L.photoLocked(profPhoto, premium(), own);
    return `${photo(u, profPhoto, locked)}<div class="shade-top"></div>
      <div class="bars" aria-hidden="true">${Array.from({ length: PHOTO_PAGES }, (_, k) => `<i class="${k === profPhoto ? 'on' : ''}"></i>`).join('')}</div>
      ${locked ? `<a class="lockpill" href="#/premium">${ic('lock', 'sm')} Photos 3–5 are Premium</a>` : ''}
      <button class="tapz l" data-pstep="-1" aria-label="Previous photo" style="bottom:0"></button><button class="tapz r" data-pstep="1" aria-label="Next photo" style="bottom:0"></button>`;
  }
  P.profile = {
    render(id) {
      const u = byId(id || S.me);
      if (!u) return { body: `<div class="empty"><h2>Profile not found</h2><a class="btn" href="#/discover">Back</a></div>`, fill: true };
      const a = acc(), own = u.id === S.me, matched = !!a.matches[u.id];
      const inDeck = !own && !a.swipes[u.id] && deckNow().some(x => x.id === u.id);
      if (profId !== u.id) { profId = u.id; profPhoto = 0; }
      const vs = S.vouches[u.id] || [], sum = L.vouchSummary(vs);
      const c = own ? null : L.compat(me(), u);
      const socials = (u.socials || []).filter(s => s.url);
      return {
        title: u.short, head: '', nav: !inDeck,
        body: `<div class="hero-photo" id="hero">${profHero(u, own)}
            <button class="float-btn l" id="back" aria-label="Back">${ic('left')}</button>
            ${own ? `<a class="float-btn r" href="#/edit" aria-label="Edit profile">${ic('sliders')}</a>` : ''}</div>
          <div class="pbody">
            ${own ? `<div class="chip navy" style="margin-bottom:10px">${ic('eye', 'sm')} This is how others see you</div>` : ''}
            <h1 class="pname">${esc(u.short)} <span>${L.age(u.dob)}</span></h1>
            <p class="muted" style="margin-top:4px">${esc(u.name)}${D.PRONOUNS[u.gender] ? ' · ' + D.PRONOUNS[u.gender] : ''}</p>
            <div class="chips" style="margin-top:10px">${c ? `<span class="chip rose">${ic('sparkles', 'sm')} ${c.pct}% match</span>` : ''}${vouchChip(u)}${matched ? `<span class="chip navy">${ic('heart', 'sm')} Matched</span>` : ''}</div>
            ${c && c.reasons.length ? `<p class="small muted" style="margin-top:8px">${c.reasons.map(esc).join(' · ')}</p>` : ''}
            <div class="facts">
              <div class="fact">${ic(u.mode === 'faculty' ? 'briefcase' : 'cap', 'sm')}<span>${u.mode === 'faculty' ? esc(u.facultyRole) + ' · ' : ''}${esc(u.college)}</span></div>
              <div class="fact">${ic('book', 'sm')}<span>${esc(u.major)}</span></div>
              <div class="fact">${ic('star', 'sm')}<span>${esc(L.zodiac(u.dob))}</span></div>
              <div class="fact">${ic('ruler', 'sm')}<span>${heightTxt(u)}</span></div>
              <div class="fact">${ic(goalIcon(u.goal), 'sm')}<span>${esc(u.goal)}</span></div>
              <div class="fact">${ic('heart', 'sm')}<span>${intoTxt(u)}</span></div>
            </div>
            <section class="sec"><div class="sec-h"><h3>About</h3></div><p class="bio-q">${esc(u.bio)}</p></section>
            <section class="sec"><div class="sec-h"><h3>3 green flags</h3></div><div class="flags">${u.greenFlags.map(f => `<div class="flag g"><span class="fi">${ic('check')}</span>${esc(f)}</div>`).join('')}</div></section>
            <section class="sec"><div class="sec-h"><h3>3 red flags</h3><span class="muted small">the honest kind</span></div><div class="flags">${u.redFlags.map(f => `<div class="flag r"><span class="fi">${ic('flag')}</span>${esc(f)}</div>`).join('')}</div></section>
            <section class="sec"><div class="sec-h"><h3>Top 5 favourites</h3></div><div class="chips">${u.favorites.map(f => `<span class="chip ${c && c.shared.includes(f) ? 'rose' : ''}">${c && c.shared.includes(f) ? ic('heart', 'sm fill') : ''}${esc(f)}</span>`).join('')}</div></section>
            ${socials.length || u.linkedin ? `<section class="sec"><div class="sec-h"><h3>Find ${own ? 'me' : esc(u.short)} online</h3></div>
              ${socials.length ? `<div class="chips" style="margin-bottom:10px">${socials.map(s => `<a class="chip" href="https://${esc(s.url)}" target="_blank" rel="noopener noreferrer">${ic('globe', 'sm')} ${esc(s.url)}</a>`).join('')}</div>` : ''}
              ${u.linkedin ? `<a class="li-card" href="https://${esc(u.linkedin.url)}" target="_blank" rel="noopener noreferrer" style="color:inherit"><span class="li-logo">in</span><span class="grow"><b>${esc(u.linkedin.headline)}</b>${u.linkedin.demo ? ' <span class="chip gold" style="padding:2px 7px;font-size:11px">Demo import</span>' : ''}
                ${(u.linkedin.experience || []).concat(u.linkedin.education || []).length ? `<ul>${(u.linkedin.experience || []).concat(u.linkedin.education || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<span class="small muted" style="display:block">${esc(u.linkedin.url)}</span>`}</span></a>` : ''}
            </section>` : ''}
            <section class="sec"><div class="sec-h"><h3>Vouches</h3>${sum ? starRow(sum.avg) : ''}</div>
              ${sum ? `<div class="vsum"><span class="big">★${sum.avg}</span><span class="grow"><b style="display:block">Vouched by ${sum.count === 1 ? 'their ' + esc(sum.rel) : sum.count + ' people'}</b><span class="small">Reviews are screened by VinCupid before they show.</span></span></div>` : ''}
              ${vs.map(v => `<div class="vouch"><div class="row"><b class="grow">${esc(cap(v.rel))}${v.by ? ' · ' + esc(v.by) : ''}</b>${starRow(v.rating)}</div>
                <q>${esc(v.note)}</q>${v.disputed && v.disputed.length ? `<p class="small muted" style="margin-top:6px">Disputes: ${v.disputed.map(esc).join(', ')}</p>` : `<p class="small" style="margin-top:6px;color:var(--green)">${ic('check', 'sm')} Confirms all 6 flags</p>`}</div>`).join('') || `<p class="muted small">No vouches yet.</p>`}
              ${(own || matched) && u.vouchContacts && u.vouchContacts.length ? `<button class="btn ghost block" id="vreq" style="margin-top:12px">${ic('shieldcheck')} ${own ? 'Ask a friend to vouch for you' : `Ask ${esc(u.short)}'s ${esc(u.vouchContacts[0].rel)} for a review`}</button>`
                : !own && !matched ? `<p class="hint">Match with ${esc(u.short)} to ask their friends for a review.</p>` : own ? `<p class="hint">Add a best friend or ex on the Me tab so matches can ask them about you.</p>` : `<p class="hint">${esc(u.short)} hasn't added anyone who can vouch yet.</p>`}
            </section>
            ${own ? '' : `<section class="sec"><div class="row" style="gap:8px">${matched ? `<a class="btn grow" href="#/chat/${u.id}">${ic('chat')} Message</a>` : ''}<button class="btn ghost sm" id="prep">${ic('flag', 'sm')} Report</button><button class="btn ghost sm" id="pblk">${ic('ban', 'sm')} Block</button></div></section>`}
          </div>
          ${inDeck ? `<div class="sticky-acts"><button class="act pass" id="ppass" aria-label="Pass">${ic('x')}</button><button class="act like" id="plike" aria-label="Like">${ic('heart', 'fill')}</button></div>` : ''}`,
      };
    },
    bind(id) {
      const u = byId(id || S.me);
      if (!u) return;
      const own = u.id === S.me;
      $('#back').onclick = back;
      $('#hero').addEventListener('click', e => {
        const st = e.target.closest('[data-pstep]');
        if (!st) return;
        profPhoto = (profPhoto + +st.dataset.pstep + PHOTO_PAGES) % PHOTO_PAGES;
        const hero = $('#hero'), keep = $$('.float-btn', hero).map(b => b.outerHTML).join('');
        hero.innerHTML = profHero(u, own) + keep;
        $('#back').onclick = back;
      });
      const vreq = $('#vreq');
      if (vreq) vreq.onclick = () => vouchRequestSheet(u);
      const rp = $('#prep'); if (rp) rp.onclick = () => reportSheet(u);
      const bl = $('#pblk'); if (bl) bl.onclick = () => blockUser(u);
      const like = $('#plike'), pass = $('#ppass');
      const swipeHere = dir => {
        const a = acc();
        if (L.swipesLeft(a.counter, a.premium) <= 0) { toast('Out of free swipes for today.', true); return go('discover'); }
        history.replaceState(null, '', '#/discover');
        commitSwipe(u, dir);
      };
      if (like) like.onclick = () => swipeHere('like');
      if (pass) pass.onclick = () => swipeHere('pass');
    },
  };

  function vouchRequestSheet(u) {
    const own = u.id === S.me;
    sheet(`<h3 class="t">${own ? 'Ask a friend to vouch for you' : `Ask about ${esc(u.short)}`}</h3>
      <p class="muted small" style="margin:4px 0 12px">${own ? 'Send this link to someone who knows you well.' : `${esc(u.short)} opted in these people. They get a link to rate ${esc(u.short)} and confirm or dispute their flags.`}</p>
      <div class="opts" id="vcs">${u.vouchContacts.map((c, i) => `<button class="opt ${i === 0 ? 'on' : ''}" data-i="${i}"><span class="oi">${ic(c.rel === 'ex' ? 'heart' : 'users')}</span><span class="grow"><b>${esc(c.name)}</b><span>${esc(cap(c.rel))}</span></span></button>`).join('')}</div>
      <button class="btn block" id="mk" style="margin-top:14px">${ic('link')} Create review link</button><div id="out"></div>`, el => {
      let pick = 0;
      $$('#vcs .opt', el).forEach(b => b.onclick = () => { pick = +b.dataset.i; $$('#vcs .opt', el).forEach(x => x.classList.toggle('on', x === b)); });
      $('#mk', el).onclick = () => {
        const c = u.vouchContacts[pick];
        const tok = L.makeVouchToken({ u: u.id, n: c.name, r: c.rel, by: S.me });
        const url = location.href.split('#')[0] + '#/vouch/' + tok;
        const msg = own
          ? `Hi ${c.name}! I'm trying Vinder, VinUni's dating app. Could you leave me a quick, honest review? It takes a minute: ${url}`
          : `Hi ${c.name}! I matched with ${u.short} on Vinder and they listed you as their ${c.rel}. Would you leave a quick, honest review? ${url}`;
        $('#out', el).innerHTML = `<div class="field"><label class="lbl" for="vm">Message to send</label><textarea class="input" id="vm" readonly rows="5">${esc(msg)}</textarea></div>
          <div class="row" style="margin-top:10px"><button class="btn grow sm" id="cp">${ic('copy', 'sm')} Copy message</button><a class="btn ghost grow sm" href="#/vouch/${tok}">${ic('eye', 'sm')} Open as ${esc(c.name)}</a></div>
          <p class="hint">Prototype: everything is stored in this browser, so open the link here to try it.</p>`;
        $('#cp', el).onclick = async () => {
          try { await navigator.clipboard.writeText(msg); toast('Copied'); } catch (e) { $('#vm', el).select(); toast('Press Ctrl+C to copy'); }
        };
        $('#mk', el).remove();
      };
    });
  }

  // =====================================================================
  // Vouch page (opened by the friend)
  // =====================================================================
  const vouchForm = { tok: '', rating: 0, disputed: {}, note: '', done: false };
  P.vouch = {
    render(tok) {
      const d = L.readVouchToken(tok), u = d && byId(d.u);
      if (vouchForm.tok !== tok) Object.assign(vouchForm, { tok, rating: 0, disputed: {}, note: '', done: false });
      if (!u) return { head: '', nav: false, title: 'Review', fill: true, body: `<div class="empty"><img class="mascot" src="${A.mascot}" alt=""><h2>This review link doesn't work</h2><p>It may be incomplete. Ask for a new link.</p><a class="btn" href="#/welcome">Open Vinder</a></div>` };
      const head = `<div class="vouch-top"><div class="row"><span class="brand" style="color:#fff">${vlogo()}${wordmark()}</span></div>
        <div class="row" style="margin-top:16px">${avatar(u, 'lg')}<div class="grow"><h2 style="margin:0">Vouch for ${esc(u.short)}</h2><p style="color:#D3DBEE;font-size:14px">as their ${esc(d.r)}, ${esc(d.n)}</p></div></div></div>`;
      if (vouchForm.done) {
        return { head: '', nav: false, title: 'Thanks', fill: true, body: head + `<div class="empty"><img class="mascot" src="${A.mascot}" alt=""><h2>Thank you, ${esc(d.n)}!</h2><p>Your review is live on ${esc(u.short)}'s profile as “Vouched by ${esc(d.r)}”.</p><a class="btn" href="#/${S.me ? 'profile/' + u.id : 'welcome'}">${S.me ? 'See the profile' : 'Open Vinder'}</a></div>` };
      }
      const flags = u.greenFlags.map(f => ['g', f]).concat(u.redFlags.map(f => ['r', f]));
      return {
        head: '', nav: false, title: 'Review ' + u.short,
        body: head + `<div class="page">
          ${cupid('', 'VinCupid', `<p>Be honest and kind. I screen every note before it's shown. Your stars, note, name and relationship appear on ${esc(u.short)}'s profile.</p>`)}
          <div class="card pad" style="margin-top:12px"><span class="lbl">How would you rate ${esc(u.short)} as a partner?</span>
            <div class="starpick" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(i => `<button type="button" role="radio" aria-checked="${vouchForm.rating === i}" aria-label="${i} star${i > 1 ? 's' : ''}" data-s="${i}" class="${i <= vouchForm.rating ? 'on' : ''}">${ic('star', 'fill')}</button>`).join('')}</div></div>
          <div class="card pad" style="margin-top:12px"><span class="lbl">Are their flags accurate?</span>
            ${flags.map(([k, f], i) => `<div class="fcheck"><span class="flag-in ${k}" style="margin:0"><span class="fi">${ic(k === 'g' ? 'check' : 'flag')}</span></span><span class="grow">${esc(f)}</span>
              <div class="seg"><button type="button" data-f="${i}" data-v="0" class="${vouchForm.disputed[i] ? '' : 'on'}" aria-label="Yes, accurate">Yes</button><button type="button" data-f="${i}" data-v="1" class="${vouchForm.disputed[i] ? 'on' : ''}" aria-label="No, not accurate">No</button></div></div>`).join('')}</div>
          <div class="card pad" style="margin-top:12px"><label class="lbl" for="vn">One line about ${esc(u.short)}</label><input class="input" id="vn" maxlength="140" placeholder="e.g. Loyal friend, terrible at karaoke" value="${esc(vouchForm.note)}"><p class="err" id="verr" role="alert"></p></div>
          <button class="btn block" id="vsub" style="margin-top:14px">${ic('shieldcheck')} Submit review</button>
        </div>`,
      };
    },
    bind(tok) {
      const d = L.readVouchToken(tok), u = d && byId(d.u);
      if (!u || vouchForm.done) return;
      $$('[data-s]').forEach(b => b.onclick = () => {
        vouchForm.rating = +b.dataset.s;
        $$('[data-s]').forEach(x => { const on = +x.dataset.s <= vouchForm.rating; x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.dataset.s === vouchForm.rating); });
      });
      $$('[data-f]').forEach(b => b.onclick = () => {
        vouchForm.disputed[b.dataset.f] = b.dataset.v === '1';
        $$(`[data-f="${b.dataset.f}"]`).forEach(x => x.classList.toggle('on', x === b));
      });
      $('#vn').oninput = e => { vouchForm.note = e.target.value; };
      $('#vsub').onclick = async () => {
        const err = $('#verr'), note = vouchForm.note.trim();
        if (!vouchForm.rating) return (err.textContent = 'Pick a star rating first.');
        if (note.length < 4) return (err.textContent = 'Write a short note (a few words is fine).');
        const btn = $('#vsub'); btn.disabled = true; btn.textContent = 'VinCupid is reading…';
        const v = await analyze(note, { kind: 'review note about a friend' });
        btn.disabled = false; btn.innerHTML = `${ic('shieldcheck')} Submit review`;
        if (v.verdict === 'block' || v.verdict === 'warn') return (err.textContent = `VinCupid can't publish this: ${v.reason}`);
        const flags = u.greenFlags.concat(u.redFlags);
        (S.vouches[u.id] = S.vouches[u.id] || []).push({ rating: vouchForm.rating, rel: d.r, by: d.n, note, disputed: flags.filter((_, i) => vouchForm.disputed[i]), t: Date.now() });
        vouchForm.done = true;
        save();
        render();
      };
    },
  };

  // =====================================================================
  // Me
  // =====================================================================
  function completeness(u) {
    const checks = [(u.photos || []).length >= 2, (u.bio || '').length >= 40, (u.favorites || []).length === 5, (u.greenFlags || []).every(Boolean) && (u.redFlags || []).every(Boolean), (u.socials || []).length > 0 || !!u.linkedin, (u.vouchContacts || []).length > 0];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }
  P.me = {
    render() {
      const u = me(), a = acc(), pct = completeness(u);
      return {
        title: 'Me',
        body: `<div class="page">
          <div class="card pad"><div class="me-head">${avatar(u)}<div class="grow"><h2 class="serif" style="font-size:24px;line-height:1.1">${esc(u.short)}, ${L.age(u.dob)}</h2><p class="muted small">${u.mode === 'faculty' ? esc(u.facultyRole) + ' · ' : 'Student · '}${esc(u.college)} · ${esc(u.major)}</p>
            <div class="meter" aria-label="Profile ${pct}% complete"><i style="width:${pct}%"></i></div><p class="small muted" style="margin-top:4px">Profile ${pct}% complete</p></div></div>
            <div class="row" style="margin-top:14px"><a class="btn grow sm" href="#/edit">${ic('sliders', 'sm')} Edit profile</a><a class="btn ghost grow sm" href="#/profile/${u.id}">${ic('eye', 'sm')} Preview</a></div></div>
          ${a.premium ? `<a class="card pad row" href="#/premium" style="margin-top:12px;color:inherit;background:var(--gold-50);border-color:transparent"><span class="crown" style="width:40px;height:40px;border-radius:12px;background:var(--grad-gold);color:#fff;display:grid;place-items:center">${ic('crown')}</span><span class="grow"><b>Premium is on</b><span class="small muted" style="display:block">All photos, unlimited swipes, rewind, likes.</span></span>${ic('right', 'sm')}</a>`
            : `<a class="card pad row" href="#/premium" style="margin-top:12px;color:#fff;background:linear-gradient(135deg,var(--navy-950),var(--navy-800));border:0"><span style="width:40px;height:40px;border-radius:12px;background:var(--grad-gold);display:grid;place-items:center">${ic('crown')}</span><span class="grow"><b>Get Vinder Premium</b><span class="small" style="display:block;color:#C9D3E8">See who likes you, unblur photos, rewind.</span></span>${ic('right', 'sm')}</a>`}
          <section class="sec"><div class="sec-h"><h3>People who can vouch for you</h3></div>
            <p class="muted small" style="margin-bottom:8px">Only people you add here can be asked to review you. Matches see the relationship, never their contact details.</p>
            <div class="card pad" style="padding-top:4px;padding-bottom:4px">${(u.vouchContacts || []).map((c, i) => `<div class="contact"><span class="av sm" style="display:grid;place-items:center;background:var(--rose-50);color:var(--rose)">${ic(c.rel === 'ex' ? 'heart' : 'users', 'sm')}</span><span class="grow"><b>${esc(c.name)}</b><span class="small muted" style="display:block">${esc(cap(c.rel))}</span></span><button class="icon-btn" data-rm="${i}" aria-label="Remove ${esc(c.name)}">${ic('trash', 'sm')}</button></div>`).join('') || '<p class="muted small" style="padding:10px 0">Nobody yet.</p>'}
              <form id="addc" class="row" style="padding:10px 0;gap:8px"><label class="sr" for="cn">Name</label><input class="input grow" id="cn" placeholder="Add a name" maxlength="30" style="min-width:0"><label class="sr" for="cr">Relationship</label><select class="input" id="cr" style="width:auto;flex:none;padding-right:8px"><option>best friend</option><option>ex</option><option>close friend</option><option>roommate</option><option>sibling</option></select><button class="send" aria-label="Add person">${ic('plus')}</button></form></div>
            ${(u.vouchContacts || []).length ? `<button class="btn ghost block" id="askv" style="margin-top:10px">${ic('shieldcheck')} Ask for a review</button>` : ''}
          </section>
          <section class="sec"><div class="menu">
            <a href="#/vincupid"><span class="mi">${ic('shield')}</span>Safety center<span class="chev">${ic('right', 'sm')}</span></a>
            <a href="#/settings"><span class="mi">${ic('key')}</span>VinCupid AI and appearance<span class="chev">${ic('right', 'sm')}</span></a>
            <button id="out"><span class="mi" style="background:var(--navy-50);color:var(--navy-700)">${ic('logout')}</span>Sign out or switch account</button>
          </div></section>
          <p class="disclaimer" style="color:var(--ink-3);margin-top:22px"><img src="${A.logo}" alt="VinUniversity"><br>Vinder is a student prototype. Not an official VinUniversity service.</p>
        </div>`,
      };
    },
    bind() {
      const u = me();
      const edit = fn => { const p = S.custom[u.id] ? S.custom[u.id] : clone(u); fn(p); S.custom[u.id] = p; save(); render(); };
      $$('[data-rm]').forEach(b => b.onclick = () => edit(p => p.vouchContacts.splice(+b.dataset.rm, 1)));
      $('#addc').onsubmit = e => {
        e.preventDefault();
        const name = $('#cn').value.trim();
        if (!name) return $('#cn').focus();
        edit(p => { p.vouchContacts = (p.vouchContacts || []).concat({ name, rel: $('#cr').value }); });
        toast(`${name} can now vouch for you.`);
      };
      const ask = $('#askv'); if (ask) ask.onclick = () => vouchRequestSheet(me());
      $('#out').onclick = () => { S.me = null; save(); go('welcome'); };
    },
  };

  // =====================================================================
  // Onboarding and Edit profile (shared field steps)
  // =====================================================================
  function newDraft(email) {
    return { email, mode: '', facultyRole: '', college: '', major: '', goal: '', name: '', short: '', dob: '', gender: '', interestedIn: '', heightCm: '', heightPrivate: false,
      favorites: [], bio: '', greenFlags: ['', '', ''], redFlags: ['', '', ''], photos: [], photosSkipped: false, instagram: '', facebook: '', liUrl: '', linkedin: null, cv: '',
      pledge: {}, vcName: '', vcRel: 'best friend' };
  }
  function toDraft(u) {
    const d = newDraft(u.email || '');
    Object.assign(d, clone({ mode: u.mode, facultyRole: u.facultyRole || '', college: u.college, major: u.major, goal: u.goal, name: u.name, short: u.short, dob: u.dob, gender: u.gender, interestedIn: u.interestedIn,
      heightCm: u.heightCm || '', heightPrivate: !u.heightCm, favorites: u.favorites, bio: u.bio, greenFlags: u.greenFlags, redFlags: u.redFlags, photos: u.photos || [], linkedin: u.linkedin || null }));
    const s = k => ((u.socials || []).find(x => x.kind === k) || {}).url || '';
    d.instagram = s('instagram'); d.facebook = s('facebook'); d.liUrl = u.linkedin ? u.linkedin.url : '';
    return d;
  }
  const normSocial = (v, host) => {
    const t = String(v || '').trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/^@/, '');
    if (!t) return '';
    return t.toLowerCase().startsWith(host) ? t : `${host}/${t}`;
  };
  function toProfile(d, base) {
    const socials = [];
    if (d.instagram.trim()) socials.push({ kind: 'instagram', url: normSocial(d.instagram, 'instagram.com') });
    if (d.facebook.trim()) socials.push({ kind: 'facebook', url: normSocial(d.facebook, 'facebook.com') });
    return Object.assign({}, base, {
      name: d.name.trim(), short: d.short.trim() || d.name.trim().split(/\s+/).slice(-1)[0], gender: d.gender, mode: d.mode, facultyRole: d.mode === 'faculty' ? d.facultyRole : null,
      dob: d.dob, college: d.college, major: d.major.trim(), heightCm: d.heightPrivate || !d.heightCm ? null : +d.heightCm, interestedIn: d.interestedIn, goal: d.goal,
      photos: d.photos.filter(Boolean), favorites: d.favorites.slice(0, 5), bio: d.bio.trim(), greenFlags: d.greenFlags.map(s => s.trim()), redFlags: d.redFlags.map(s => s.trim()),
      socials, linkedin: d.linkedin,
    });
  }

  const opt = (key, val, icon, title, sub, cur) => `<button type="button" class="opt ${cur === val ? 'on' : ''}" data-set="${key}" data-val="${esc(val)}" aria-pressed="${cur === val}"><span class="oi">${ic(icon)}</span><span class="grow"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</span></button>`;
  const seg = (key, pairs, cur) => `<div class="seg" role="radiogroup">${pairs.map(([v, l]) => `<button type="button" role="radio" aria-checked="${cur === v}" class="${cur === v ? 'on' : ''}" data-set="${key}" data-val="${esc(v)}">${l}</button>`).join('')}</div>`;
  const FAV_IDEAS = ['Bún chả', 'Badminton', 'Studio Ghibli', 'Lo-fi beats', 'Matcha latte', 'Hot pot', 'Board games', 'Karaoke', 'Hiking', 'K-dramas', 'Film photography', 'Bánh mì', 'Pilates', 'Football', 'Night markets', 'Kaggle competitions', 'Bookstores', 'Cà phê muối'];
  const GREEN_IDEAS = ['Replies within the hour', 'Remembers small details', 'Kind to waiters', 'Plans thoughtful dates', 'Shares lecture notes', 'Great listener', 'Always on time'];
  const RED_IDEAS = ['Overthinks emoji choice', 'Asleep by 10:30', 'Spoils movie endings', 'Too many houseplants', 'Talks about stocks', 'Always 5 minutes late', 'Karaoke every week'];
  function ageBox(d) {
    const ok = !!L.parseDob(d.dob), a = ok ? L.age(d.dob) : null;
    return `<div><span>Age</span><b>${ok ? a : '—'}</b></div><div><span>Star sign</span><b>${ok ? L.zodiac(d.dob) : '—'}</b></div>`;
  }
  function liCard(li) {
    return `<div class="li-card" style="margin-top:10px"><span class="li-logo">in</span><span class="grow"><b>${esc(li.headline)}</b> <span class="chip gold" style="padding:2px 7px;font-size:11px">${li.demo ? 'Demo import' : 'Imported'}</span>
      <ul>${(li.experience || []).concat(li.education || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></span></div>`;
  }

  const STEPS = [
    {
      key: 'role', title: 'Student or faculty?', tip: 'Students and faculty match in <b>separate pools</b>. You only ever see people from your own pool, which keeps things comfortable for everyone.',
      body: d => `<div class="opts">${opt('mode', 'student', 'cap', 'Student', 'Undergraduate or graduate student', d.mode)}${opt('mode', 'faculty', 'briefcase', 'Faculty & staff', 'Lecturers, TAs, researchers and staff', d.mode)}</div>
        ${d.mode === 'faculty' ? `<div class="field"><span class="lbl">Your role</span>${seg('facultyRole', D.ROLES.map(r => [r, r]), d.facultyRole)}</div>` : ''}`,
      check: d => !d.mode ? 'Choose student or faculty to continue.' : d.mode === 'faculty' && !d.facultyRole ? 'Choose your role.' : '',
    },
    {
      key: 'college', title: 'Your college', tip: 'A shared college nudges your match score up a little. Opposites still attract.',
      body: d => `<div class="opts">${Object.keys(D.COLLEGES).map(k => opt('college', k, { CECS: 'monitor', CBM: 'briefcase', CHS: 'heart', CAS: 'book' }[k], k, D.COLLEGES[k], d.college)).join('')}</div>
        ${d.college ? `<div class="field"><label class="lbl" for="major">${d.mode === 'faculty' ? 'Department or subject' : 'Major'}</label><input class="input" id="major" list="majors" data-bind="major" value="${esc(d.major)}" placeholder="Start typing…"><datalist id="majors">${D.MAJORS[d.college].map(m => `<option value="${esc(m)}">`).join('')}</datalist></div>` : ''}`,
      check: d => !d.college ? 'Choose your college.' : d.major.trim().length < 2 ? 'Add your major or department.' : '',
    },
    {
      key: 'goal', title: 'What are you looking for?', tip: 'Be honest here. Matching goals is the biggest single boost to compatibility.',
      body: d => `<div class="opts">${[['Long-term', 'heart', 'Someone to build something with'], ['Casual dating', 'coffee', 'Fun dates, see where it goes'], ['New friends', 'smile', 'Expand your circle on campus'], ['Study buddy', 'book', 'Library dates count']].map(([g, i, s]) => opt('goal', g, i, g, s, d.goal)).join('')}</div>`,
      check: d => !d.goal ? 'Choose one. You can change it later.' : '',
    },
    {
      key: 'basics', title: 'The basics', tip: 'Your age and star sign come from your birthday, so they can never contradict each other. Vinder is <b>18+ only</b>.',
      body: d => {
        const t = new Date(), max = `${t.getFullYear() - 18}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        return `<div class="field"><label class="lbl" for="nm">Full name</label><input class="input" id="nm" data-bind="name" value="${esc(d.name)}" autocomplete="name" placeholder="Nguyen Van A"></div>
        <div class="field"><label class="lbl" for="sh">What should people call you?</label><input class="input" id="sh" data-bind="short" value="${esc(d.short)}" placeholder="e.g. Minh Tri"></div>
        <div class="field"><label class="lbl" for="dob">Birthday</label><input class="input" id="dob" type="date" data-bind="dob" data-live max="${max}" min="1940-01-01" value="${esc(d.dob)}"></div>
        <div class="agebox" id="agebox">${ageBox(d)}</div>
        <div class="field"><span class="lbl">I am a</span>${seg('gender', [['male', 'Man'], ['female', 'Woman'], ['nonbinary', 'Non-binary']], d.gender)}</div>
        <div class="field"><span class="lbl">Show me</span>${seg('interestedIn', [['male', 'Men'], ['female', 'Women'], ['everyone', 'Everyone']], d.interestedIn)}</div>
        <div class="field"><label class="lbl" for="ht">Height (cm)</label><div class="with-btn"><input class="input" id="ht" type="number" inputmode="numeric" min="120" max="230" data-bind="heightCm" value="${esc(d.heightCm)}" ${d.heightPrivate ? 'disabled' : ''} placeholder="e.g. 168"></div>
          <label class="check" style="border:0;padding-bottom:0"><input type="checkbox" data-bind="heightPrivate" ${d.heightPrivate ? 'checked' : ''}><span>Prefer not to say</span></label></div>`;
      },
      live: d => { const b = $('#agebox'); if (b) b.innerHTML = ageBox(d); },
      check: d => {
        if (d.name.trim().length < 2) return 'Add your name.';
        if (!L.parseDob(d.dob)) return 'Add your birthday.';
        if (!L.isAdult(d.dob)) return 'Vinder is only for people who are 18 or older.';
        if (!d.gender) return 'Tell us how you identify.';
        if (!d.interestedIn) return 'Choose who you want to see.';
        if (!d.heightPrivate && d.heightCm !== '' && (+d.heightCm < 120 || +d.heightCm > 230)) return 'Height should be between 120 and 230 cm, or choose "Prefer not to say".';
        return '';
      },
    },
    {
      key: 'favorites', title: 'Your top 5 favourites', tip: 'I use these to write openers for your matches. Specific beats generic: <b>“Bún chả on Hàng Mành”</b> beats “food”.',
      body: d => `<div class="tags" id="tags">${d.favorites.map((f, i) => `<span class="chip rose">${esc(f)}<button type="button" data-rmfav="${i}" aria-label="Remove ${esc(f)}">${ic('x', 'sm')}</button></span>`).join('')}
          ${d.favorites.length < 5 ? `<input id="favin" placeholder="${d.favorites.length ? 'Add another' : 'Type a favourite, press Enter'}" maxlength="30" aria-label="Add a favourite">` : ''}</div>
        <p class="hint">${d.favorites.length}/5 added</p>
        <span class="lbl" style="margin-top:14px">Ideas</span><div class="chips">${FAV_IDEAS.filter(f => !d.favorites.includes(f)).slice(0, 12).map(f => `<button type="button" class="chip" data-addfav="${esc(f)}">${ic('plus', 'sm')} ${esc(f)}</button>`).join('')}</div>`,
      check: d => d.favorites.length !== 5 ? `Add ${5 - d.favorites.length} more.` : '',
    },
    {
      key: 'bio', title: 'Write your bio', tip: 'Two or three sentences. End with a question and you hand people an easy opener.',
      body: d => `<div class="field"><label class="lbl" for="bio">About you</label><textarea class="input" id="bio" data-bind="bio" data-live maxlength="240" rows="5" placeholder="Data Science kid who strikes a pose in every lecture hall…">${esc(d.bio)}</textarea><p class="hint" id="bioc">${d.bio.length}/240</p></div>`,
      live: d => { const c = $('#bioc'); if (c) c.textContent = `${d.bio.length}/240`; },
      check: d => {
        const v = L.heuristic(d.bio);
        if (v.verdict === 'block' || v.verdict === 'warn') return `VinCupid flagged this bio: ${v.reason}`;
        return d.bio.trim().length < 20 ? 'Write at least a sentence or two (20+ characters).' : '';
      },
    },
    {
      key: 'flags', title: '3 green flags, 3 red flags', tip: 'Red flags here are the fun, honest kind (“overthinks emoji choice”). The real red flags are my job. 🛡️',
      body: d => `<span class="lbl">Green flags</span>${d.greenFlags.map((f, i) => `<div class="flag-in g"><span class="fi">${ic('check')}</span><input class="input" data-arr="greenFlags" data-idx="${i}" maxlength="40" value="${esc(f)}" placeholder="Green flag ${i + 1}" aria-label="Green flag ${i + 1}"></div>`).join('')}
        <div class="chips" style="margin-top:8px">${GREEN_IDEAS.filter(x => !d.greenFlags.includes(x)).slice(0, 5).map(x => `<button type="button" class="chip green" data-fillflag="greenFlags" data-v="${esc(x)}">${ic('plus', 'sm')} ${esc(x)}</button>`).join('')}</div>
        <span class="lbl" style="margin-top:18px">Red flags</span>${d.redFlags.map((f, i) => `<div class="flag-in r"><span class="fi">${ic('flag')}</span><input class="input" data-arr="redFlags" data-idx="${i}" maxlength="40" value="${esc(f)}" placeholder="Red flag ${i + 1}" aria-label="Red flag ${i + 1}"></div>`).join('')}
        <div class="chips" style="margin-top:8px">${RED_IDEAS.filter(x => !d.redFlags.includes(x)).slice(0, 5).map(x => `<button type="button" class="chip red" data-fillflag="redFlags" data-v="${esc(x)}">${ic('plus', 'sm')} ${esc(x)}</button>`).join('')}</div>`,
      check: d => {
        if (d.greenFlags.some(f => !f.trim()) || d.redFlags.some(f => !f.trim())) return 'Fill in all three of each.';
        const bad = d.greenFlags.concat(d.redFlags).map(f => L.heuristic(f)).find(v => v.verdict === 'block' || v.verdict === 'warn');
        return bad ? `VinCupid flagged one of these: ${bad.reason}` : '';
      },
    },
    {
      key: 'photos', title: 'Add 5 photos', tip: 'Photos 1 and 2 are clear for everyone; 3 to 5 are clear for Premium members. A clear solo face in photo 1, please. If friends are in a shot, ask them first.',
      body: d => `<div class="slots">${Array.from({ length: 5 }, (_, i) => d.photos[i]
          ? `<div class="slot has"><img class="pimg" src="${esc(d.photos[i])}" alt="Your photo ${i + 1}"><span class="n">${i + 1}</span><button type="button" class="x" data-rmph="${i}" aria-label="Remove photo ${i + 1}">${ic('x', 'sm')}</button></div>`
          : `<button type="button" class="slot" data-addph="${i}" aria-label="Add photo ${i + 1}">${ic(i === 0 ? 'camera' : 'plus', i === 0 ? 'xl' : '')}</button>`).join('')}</div>
        <input type="file" id="phfile" accept="image/*" hidden>
        <p class="hint">${d.photos.filter(Boolean).length}/5 added. Photos are resized and stay in this browser.</p>`,
      check: d => d.photos.filter(Boolean).length || d.photosSkipped ? '' : 'Add at least one photo.',
      extra: d => d.photos.filter(Boolean).length ? '' : `<button type="button" class="link" id="skipph" style="margin-top:10px">Skip for now and use a placeholder</button>`,
    },
    {
      key: 'socials', title: 'Socials and LinkedIn', tip: 'LinkedIn has no public API for reading profiles, so this import is a <b>demo</b>: I fill a sample from what you told me. Paste your CV text and, with a Gemini key, I summarise it for real.',
      body: d => `<div class="field"><label class="lbl" for="ig">Instagram</label><input class="input" id="ig" data-bind="instagram" value="${esc(d.instagram)}" placeholder="@handle"></div>
        <div class="field"><label class="lbl" for="fb">Facebook</label><input class="input" id="fb" data-bind="facebook" value="${esc(d.facebook)}" placeholder="facebook.com/you"></div>
        <div class="field"><label class="lbl" for="li">LinkedIn profile URL</label><div class="with-btn"><input class="input" id="li" data-bind="liUrl" value="${esc(d.liUrl)}" placeholder="linkedin.com/in/your-name"><button type="button" class="btn sm navy" id="liimp">Import</button></div><p class="err" id="lierr"></p></div>
        <div id="liout">${d.linkedin ? liCard(d.linkedin) : ''}</div>
        <details style="margin-top:12px"><summary class="lbl" style="cursor:pointer">Or paste CV text</summary>
          <textarea class="input" data-bind="cv" rows="5" placeholder="Paste your CV or LinkedIn 'About' and experience here">${esc(d.cv)}</textarea>
          <button type="button" class="btn ghost sm" id="cvsum" style="margin-top:8px">${ic('sparkles', 'sm')} Summarise with VinCupid</button></details>`,
      check: d => d.liUrl.trim() && !L.linkedInSlug(d.liUrl) ? 'That LinkedIn URL looks off. It should look like linkedin.com/in/your-name.' : '',
    },
    {
      key: 'safety', title: 'The Vinder pledge', tip: 'I block harassment before it is sent and warn you about scams. You can report or block from any chat, any time.',
      body: d => `${[['adult', 'I am 18 or older and a current VinUni student, faculty or staff member.'], ['respect', 'I will treat matches with respect: no harassment or explicit content.'], ['money', 'I will never ask anyone for money, codes or ID documents.'], ['public', 'First dates happen in public places, and I tell a friend where I am.']]
          .map(([k, t]) => `<label class="check"><input type="checkbox" data-pledge="${k}" ${d.pledge[k] ? 'checked' : ''}><span>${t}</span></label>`).join('')}
        <span class="lbl" style="margin-top:20px">Someone who can vouch for you (optional)</span>
        <p class="hint" style="margin:0 0 8px">A best friend or an ex. Matches can ask them for an honest review.</p>
        <div class="with-btn"><input class="input" data-bind="vcName" value="${esc(d.vcName)}" placeholder="Their name" maxlength="30" aria-label="Their name"><select class="input" data-bind="vcRel" style="width:auto" aria-label="Relationship">${['best friend', 'ex', 'close friend', 'roommate', 'sibling'].map(r => `<option ${d.vcRel === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>`,
      check: d => ['adult', 'respect', 'money', 'public'].every(k => d.pledge[k]) ? '' : 'Tick all four to join.',
    },
  ];

  function bindStep(step, d, rerender) {
    const scope = $('#main');
    const clearErr = () => { const e = $('#oberr') || $('#eerr'); if (e && e.textContent) { e.textContent = ''; obErr = ''; } };
    scope.addEventListener('input', clearErr);
    scope.addEventListener('change', clearErr);
    $$('[data-set]', scope).forEach(b => b.onclick = () => {
      d[b.dataset.set] = b.dataset.val;
      if (b.dataset.set === 'college') d.major = '';
      rerender();
    });
    $$('[data-bind]', scope).forEach(el => {
      const k = el.dataset.bind, ev = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        d[k] = el.type === 'checkbox' ? el.checked : el.value;
        if (k === 'heightPrivate') { const h = $('#ht'); if (h) h.disabled = el.checked; }
        if (el.hasAttribute('data-live') && step.live) step.live(d);
        persistDraft();
      });
    });
    $$('[data-arr]', scope).forEach(el => el.addEventListener('input', () => { d[el.dataset.arr][+el.dataset.idx] = el.value; persistDraft(); }));
    $$('[data-fillflag]', scope).forEach(b => b.onclick = () => {
      const arr = d[b.dataset.fillflag], i = arr.findIndex(x => !x.trim());
      if (i < 0) return toast('All three are filled. Clear one to swap it.');
      arr[i] = b.dataset.v;
      rerender();
    });
    $$('[data-pledge]', scope).forEach(el => el.onchange = () => { d.pledge[el.dataset.pledge] = el.checked; persistDraft(); });
    // favourites
    const favin = $('#favin', scope);
    const addFav = v => {
      v = String(v || '').trim().replace(/,$/, '');
      if (!v || d.favorites.length >= 5) return;
      if (d.favorites.some(f => f.toLowerCase() === v.toLowerCase())) return toast('Already added.');
      d.favorites.push(v);
      rerender();
      const n = $('#favin'); if (n) n.focus();
    };
    if (favin) favin.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); const v = favin.value; favin.value = ''; addFav(v); }
      else if (e.key === 'Backspace' && !favin.value && d.favorites.length) { d.favorites.pop(); rerender(); const n = $('#favin'); if (n) n.focus(); }
    };
    if (favin) favin.onblur = () => { if (favin.isConnected && favin.value.trim()) { const v = favin.value; favin.value = ''; addFav(v); } };
    $$('[data-addfav]', scope).forEach(b => b.onclick = () => addFav(b.dataset.addfav));
    $$('[data-rmfav]', scope).forEach(b => b.onclick = () => { d.favorites.splice(+b.dataset.rmfav, 1); rerender(); });
    // photos
    const file = $('#phfile', scope);
    let slot = 0;
    $$('[data-addph]', scope).forEach(b => b.onclick = () => { slot = +b.dataset.addph; file.click(); });
    $$('[data-rmph]', scope).forEach(b => b.onclick = () => { d.photos.splice(+b.dataset.rmph, 1); rerender(); });
    if (file) file.onchange = async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      try {
        const url = await readPhoto(f);
        const at = Math.min(slot, d.photos.filter(Boolean).length);
        d.photos.splice(at, 0, url);
        d.photos = d.photos.filter(Boolean).slice(0, 5);
        rerender();
      } catch (e) { toast(e.message); }
    };
    const skip = $('#skipph', scope);
    if (skip) skip.onclick = () => { d.photosSkipped = true; nextStep(); };
    // LinkedIn demo import
    const imp = $('#liimp', scope);
    if (imp) imp.onclick = async () => {
      const slug = L.linkedInSlug(d.liUrl), err = $('#lierr');
      err.textContent = '';
      if (!slug) { err.textContent = 'Paste a profile URL like linkedin.com/in/your-name.'; return; }
      imp.disabled = true; imp.textContent = 'Importing…';
      await wait(900);
      d.linkedin = L.mockLinkedIn(Object.assign({ major: d.major || 'your major', college: d.college || 'VinUni' }, d), slug);
      imp.disabled = false; imp.textContent = 'Import';
      $('#liout').innerHTML = liCard(d.linkedin);
      persistDraft();
      toast('Demo import done. LinkedIn has no public API.', true);
    };
    const cv = $('#cvsum', scope);
    if (cv) cv.onclick = async () => {
      const text = d.cv.trim();
      if (text.length < 30) return toast('Paste a bit more CV text first.');
      cv.disabled = true; cv.textContent = 'Reading…';
      let li = null;
      if (S.gemKey) {
        try {
          const r = await gemini(`Summarise this CV for a dating profile. Return JSON {"headline":"max 70 chars","experience":["up to 2 items, max 60 chars each"],"education":["up to 1 item"]}. CV:\n${text.slice(0, 4000)}`);
          if (r.json && r.json.headline) li = { url: L.linkedInSlug(d.liUrl) ? 'linkedin.com/in/' + L.linkedInSlug(d.liUrl) : 'linkedin.com', headline: String(r.json.headline), experience: (r.json.experience || []).slice(0, 2).map(String), education: (r.json.education || []).slice(0, 1).map(String), demo: false };
        } catch (e) { toast('Gemini failed, using the offline summary.'); }
      }
      if (!li) {
        const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
        li = { url: 'linkedin.com', headline: lines[0].slice(0, 70), experience: lines.slice(1, 3).map(s => s.slice(0, 60)), education: [], demo: true };
      }
      d.linkedin = li;
      cv.disabled = false; cv.innerHTML = `${ic('sparkles', 'sm')} Summarise with VinCupid`;
      $('#liout').innerHTML = liCard(li);
      persistDraft();
    };
  }
  function readPhoto(file) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error('Please choose an image file.'));
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, 720 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image.')); };
      img.src = url;
    });
  }
  let draftTimer = null;
  function persistDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(save, 300); }

  let obErr = '';
  function nextStep() {
    const n = Math.max(1, Math.min(STEPS.length, parseInt(route().arg, 10) || 1));
    const e = STEPS[n - 1].check(S.draft);
    if (e) { obErr = e; const el = $('#oberr'); if (el) { el.textContent = e; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); } return; }
    obErr = '';
    save();
    if (n < STEPS.length) return go('onboarding/' + (n + 1));
    finishOnboarding();
  }
  function finishOnboarding() {
    const d = S.draft, id = 'u-' + Date.now().toString(36);
    const p = toProfile(d, { id, email: d.email, custom: true, vouchContacts: d.vcName.trim() ? [{ name: d.vcName.trim(), rel: d.vcRel }] : [] });
    S.custom[id] = p;
    S.draft = null;
    S.me = id;
    seed();
    save();
    go('discover');
    toast(`You're in, ${p.short}! VinCupid has your back.`, true);
  }
  P.onboarding = {
    render(arg) {
      const n = Math.max(1, Math.min(STEPS.length, parseInt(arg, 10) || 1)), st = STEPS[n - 1], d = S.draft;
      return {
        head: `<div class="ob-top"><div class="row"><button class="icon-btn" id="obx" aria-label="${n === 1 ? 'Cancel sign-up' : 'Back'}">${ic(n === 1 ? 'x' : 'left')}</button><div class="grow prog" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${n}"><i style="width:${n / STEPS.length * 100}%"></i></div><span class="small muted" style="font-weight:700">${n}/${STEPS.length}</span></div></div>`,
        nav: false, title: 'Sign up',
        body: `<div class="page" style="padding-top:4px"><p class="ob-step">Step ${n} of ${STEPS.length}</p><h1 class="ob-title">${st.title}</h1>
          <div class="tip"><img src="${A.face}" alt="VinCupid"><span>${st.tip}</span></div>
          ${st.body(d)}${st.extra ? st.extra(d) : ''}<p class="err" id="oberr" role="alert">${esc(obErr)}</p></div>`,
        foot: `<div class="ob-foot">${n > 1 ? `<button class="btn ghost" id="obb">${ic('left', 'sm')} Back</button>` : ''}<button class="btn" id="obn">${n === STEPS.length ? `${ic('heart', 'sm fill')} Join Vinder` : `Continue ${ic('arrow', 'sm')}`}</button></div>`,
      };
    },
    bind(arg) {
      const n = Math.max(1, Math.min(STEPS.length, parseInt(arg, 10) || 1)), st = STEPS[n - 1];
      obErr = '';
      const rerender = () => { const top = $('#main').scrollTop; save(); render(); $('#main').scrollTop = top; };
      bindStep(st, S.draft, rerender);
      $('#obn').onclick = nextStep;
      const back = () => n > 1 ? go('onboarding/' + (n - 1)) : confirmSheet('Leave sign-up?', 'Your answers so far will be discarded.', 'Leave', () => { S.draft = null; save(); go('welcome'); });
      $('#obx').onclick = back;
      const b = $('#obb'); if (b) b.onclick = back;
      $$('#main input:not([type=checkbox]):not([type=file])').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter' && i.id !== 'favin') { e.preventDefault(); nextStep(); } }));
    },
  };

  let editDraft = null;
  const EDIT_KEYS = ['college', 'goal', 'basics', 'favorites', 'bio', 'flags', 'photos', 'socials'];
  P.edit = {
    render() {
      const u = me();
      if (!editDraft || editDraft._id !== u.id) { editDraft = toDraft(u); editDraft._id = u.id; }
      const d = editDraft;
      return {
        title: 'Edit profile', nav: false,
        head: `<header class="top"><a class="icon-btn" href="#/me" id="ecancel" aria-label="Cancel">${ic('x')}</a><b class="grow serif" style="font-size:20px">Edit profile</b><button class="btn sm" id="esave">Save</button></header>`,
        body: `<div class="page">${cupid('', 'VinCupid', `<p>You're in the <b>${d.mode === 'faculty' ? 'faculty & staff' : 'student'}</b> pool${d.mode === 'faculty' ? ` as ${esc(d.facultyRole)}` : ''}. Your pool comes from your verified VinUni role, so it can't be changed here.</p>`)}
          ${STEPS.filter(s => EDIT_KEYS.includes(s.key)).map(s => `<section class="sec" data-sec="${s.key}"><div class="sec-h"><h3>${s.title}</h3></div>${s.body(d)}</section>`).join('')}
          <p class="err" id="eerr" role="alert"></p><button class="btn block" id="esave2" style="margin-top:8px">Save changes</button></div>`,
      };
    },
    bind() {
      const d = editDraft;
      const rerender = () => { const top = $('#main').scrollTop; render(); $('#main').scrollTop = top; };
      STEPS.filter(s => EDIT_KEYS.includes(s.key)).forEach(s => s.live && s.live(d));
      bindStep({ live: dd => STEPS.forEach(s => s.live && s.live(dd)) }, d, rerender);
      const saveIt = () => {
        for (const s of STEPS.filter(x => EDIT_KEYS.includes(x.key))) {
          if (s.key === 'photos' && !d.photos.filter(Boolean).length) continue;
          const e = s.check(d);
          if (e) {
            $('#eerr').textContent = `${s.title}: ${e}`;
            const sec = $(`[data-sec="${s.key}"]`); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
        const u = me();
        S.custom[u.id] = toProfile(d, Object.assign({}, u, { custom: true }));
        editDraft = null;
        save();
        go('me');
        toast('Profile saved.', true);
      };
      $('#esave').onclick = saveIt; $('#esave2').onclick = saveIt;
      $('#ecancel').onclick = () => { editDraft = null; };
    },
  };

  // =====================================================================
  // VinCupid hub (safety center)
  // =====================================================================
  const SAMPLES = ['hi', 'send nudes', 'add my telegram, I have a paid modeling job for you', 'come to my room, don\'t tell anyone', 'Want to get bánh mì after the Data Structures lecture?'];
  let tryText = '';
  P.vincupid = {
    render() {
      const a = acc();
      return {
        title: 'VinCupid',
        body: `<div class="page">
          <div class="vhero"><img src="${A.mascot}" alt="VinCupid, a pink winged mascot with a golden bow"><h2>Hi, I'm VinCupid</h2>
            <p>Your AI wingmate on Vinder. I keep creeps out and conversations interesting.</p>
            <a class="pill ${S.gemKey ? 'on' : ''}" href="#/settings"><span class="dot"></span>${S.gemKey ? 'Gemini · ' + esc(S.gemModel) : 'Offline rules · add a Gemini key'}</a></div>
          <section class="sec"><div class="sec-h"><h3>Try me</h3><span class="muted small">Nothing is sent</span></div>
            <div class="card pad"><label class="lbl" for="try">Type a message and I'll tell you what I'd do with it</label>
              <div class="with-btn"><input class="input" id="try" value="${esc(tryText)}" placeholder="e.g. hey"><button class="btn sm" id="tryb">Check</button></div>
              <div class="chips" style="margin-top:10px">${SAMPLES.map(s => `<button class="chip" data-sample="${esc(s)}">${esc(s.length > 26 ? s.slice(0, 24) + '…' : s)}</button>`).join('')}</div>
              <div class="verdict" id="verdict" aria-live="polite"></div></div></section>
          <section class="sec"><div class="sec-h"><h3>What I watch for</h3></div><div class="card pad" style="padding-top:4px;padding-bottom:4px">
            <div class="watch"><span class="wi red">${ic('ban')}</span><div><b>Harassment and explicit messages</b><p>Blocked before they're sent. The sender gets a warning.</p></div></div>
            <div class="watch"><span class="wi red">${ic('alert')}</span><div><b>Scams and trafficking</b><p>Money, gift cards, crypto, job or travel offers, passport requests, “add my Telegram”. You see a red banner with Report and Block.</p></div></div>
            <div class="watch"><span class="wi amber">${ic('shield')}</span><div><b>Pressure and manipulation</b><p>Secrecy, guilt, threats, or using a title or grades as leverage. Both people get a note.</p></div></div>
            <div class="watch"><span class="wi navy">${ic('snow')}</span><div><b>Burning the process</b><p>No reply for 48 hours? I nudge, gently. Ghosting is a choice; closing kindly is better.</p></div></div>
            <div class="watch"><span class="wi rose">${ic('sparkles')}</span><div><b>Boring openers</b><p>“Hi” gets ignored. I suggest openers built from their favourites.</p></div></div>
          </div></section>
          <section class="sec"><div class="sec-h"><h3>Safe first dates on campus</h3></div>${spotsHtml()}</section>
          <section class="sec"><div class="sec-h"><h3>Before you meet</h3></div><div class="card pad stack small">
            <p class="row" style="align-items:flex-start">${ic('users', 'sm')}<span>Tell a friend where you're going and who with.</span></p>
            <p class="row" style="align-items:flex-start">${ic('pin', 'sm')}<span>Meet somewhere public on campus first. Get yourself there and back.</span></p>
            <p class="row" style="align-items:flex-start">${ic('ban', 'sm')}<span>Never send money, codes or ID photos to someone you met here.</span></p>
            <p class="row" style="align-items:flex-start;color:var(--red)">${ic('phone', 'sm')}<span><b>In danger?</b> Call 113 (police) or 115 (ambulance), then campus security.</span></p>
          </div></section>
          <section class="sec"><div class="row"><div class="card pad grow center"><b class="serif" style="font-size:28px">${a.reports.length}</b><p class="small muted">Reports sent</p></div><div class="card pad grow center"><b class="serif" style="font-size:28px">${Object.keys(a.blocked).length}</b><p class="small muted">People blocked</p></div></div></section>
        </div>`,
      };
    },
    bind() {
      const run = async () => {
        const t = $('#try').value.trim(), out = $('#verdict');
        tryText = t;
        if (!t) return;
        out.innerHTML = `<p class="muted small">Checking…</p>`;
        const v = await analyze(t, { partner: byId('mai') && me().mode === 'student' ? byId('mai') : byId('bao') });
        const label = { ok: 'Looks good', coach: 'Coaching tip', warn: 'Safety warning', block: 'Blocked, not sent' }[v.verdict];
        out.innerHTML = cupid(v.verdict === 'ok' || v.verdict === 'coach' ? '' : v.verdict, label,
          `<p>${esc(v.reason || 'Nothing worrying here. Go for it!')}</p><span class="chip navy" style="margin-top:8px;padding:3px 9px;font-size:11.5px">${v.source === 'gemini' ? 'Checked by Gemini' : 'Checked by offline rules'}</span>${v.suggestion ? `<p class="small" style="margin-top:4px">${esc(v.suggestion)}</p>` : ''}${v.openers && v.openers.length ? `<div class="chips">${v.openers.map(o => `<span class="chip">${esc(o)}</span>`).join('')}</div>` : ''}`);
      };
      $('#tryb').onclick = run;
      $('#try').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
      $$('[data-sample]').forEach(b => b.onclick = () => { $('#try').value = b.dataset.sample; run(); });
      $$('#main [data-say]').forEach(b => b.onclick = () => toast('Suggest this spot from any chat with the ✨ button.', true));
    },
  };

  // =====================================================================
  // Premium
  // =====================================================================
  P.premium = {
    render() {
      const on = premium();
      return {
        title: 'Premium',
        body: `<div class="page">
          <div class="prem-hero"><img src="${A.mascot}" alt=""><span class="crown">${ic('crown', 'lg')}</span><h2>Vinder Premium</h2><p>See everyone clearly, swipe without limits, undo a mistake.</p></div>
          <div class="card" style="margin-top:14px;padding:4px 12px"><table class="cmp"><thead><tr><th>Feature</th><th>Free</th><th>Premium</th></tr></thead><tbody>
            <tr><td>Clear photos</td><td>1–2</td><td>All 5</td></tr>
            <tr><td>Swipes per day</td><td>${L.FREE.swipesPerDay}</td><td>Unlimited</td></tr>
            <tr><td>See who likes you</td><td>Blurred</td><td>${ic('check')}</td></tr>
            <tr><td>Rewind a swipe</td><td>—</td><td>${ic('check')}</td></tr>
            <tr><td>VinCupid safety</td><td>${ic('check')}</td><td>${ic('check')}</td></tr></tbody></table></div>
          <p class="small muted" style="margin:10px 4px 0">Safety is never behind a paywall. VinCupid protects every account.</p>
          <button class="btn ${on ? 'ghost' : 'gold'} block" id="up" style="margin-top:16px">${on ? 'Turn Premium off (demo)' : `${ic('crown')} Upgrade, demo only`}</button>
          <p class="hint center">Prototype: no payment is taken. This just flips the switch.</p></div>`,
      };
    },
    bind() {
      $('#up').onclick = () => {
        const a = acc();
        a.premium = !a.premium;
        save();
        render();
        toast(a.premium ? 'Premium is on: photos unblurred, unlimited swipes.' : 'Back to the free plan.', true);
      };
    },
  };

  // =====================================================================
  // Settings
  // =====================================================================
  P.settings = {
    render() {
      return {
        title: 'Settings', nav: true,
        body: `<div class="page">
          <div class="row" style="margin-bottom:6px"><a class="icon-btn" href="#/me" aria-label="Back">${ic('left')}</a><h1 class="serif" style="font-size:26px">Settings</h1></div>
          <section class="card pad"><div class="row"><img src="${A.face}" alt="" style="width:44px;height:44px;border-radius:50%;background:var(--rose-50)"><div class="grow"><b>VinCupid AI</b><p class="small muted">${S.gemKey ? 'Gemini is on. Rules still run first.' : 'Running on offline rules.'}</p></div><span class="pill ${S.gemKey ? 'on' : ''}"><span class="dot"></span>${S.gemKey ? 'On' : 'Off'}</span></div>
            <div class="field"><label class="lbl" for="key">Gemini API key</label><div class="with-btn"><input class="input" id="key" type="password" autocomplete="off" spellcheck="false" placeholder="AIza…" value="${esc(S.gemKey)}"><button class="btn ghost sm" id="show" type="button" aria-label="Show key">${ic('eye', 'sm')}</button></div></div>
            <div class="field"><label class="lbl" for="model">Model</label><input class="input" id="model" list="models" value="${esc(S.gemModel)}"><datalist id="models">${MODELS.map(m => `<option value="${m}">`).join('')}</datalist>
              <p class="hint">If a model is busy or missing, VinCupid falls back to ${MODELS.filter(m => m !== S.gemModel).join(' then ')}.</p></div>
            <div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn sm" id="ksave">Save</button><button class="btn ghost sm" id="ktest">Test key</button><button class="btn ghost sm" id="kclear">Clear</button></div>
            <p class="small" id="kres" style="margin-top:10px" aria-live="polite"></p>
            <p class="hint">The key stays in this browser's storage and goes straight to Google. It's for prototype use only; don't use a production key.</p></section>
          <section class="sec"><div class="sec-h"><h3>Appearance</h3></div>${seg('theme', [['system', `${ic('monitor', 'sm')} System`], ['light', `${ic('sun', 'sm')} Light`], ['dark', `${ic('moon', 'sm')} Dark`]], S.theme)}</section>
          <section class="sec"><div class="sec-h"><h3>Demo data</h3></div><div class="card pad"><p class="small muted">Everything (accounts, chats, swipes, vouches, your key) lives in this browser.</p>
            <button class="btn ghost sm" id="reset" style="margin-top:10px">${ic('trash', 'sm')} Reset all demo data</button></div></section>
          <p class="disclaimer" style="color:var(--ink-3)"><img src="${A.logo}" alt="VinUniversity"><br>Vinder is a student prototype. Not an official VinUniversity service.</p>
        </div>`,
      };
    },
    bind() {
      const keep = () => { S.gemKey = $('#key').value.trim(); S.gemModel = $('#model').value.trim() || MODELS[0]; save(); };
      $('#show').onclick = () => { const k = $('#key'), hid = k.type === 'password'; k.type = hid ? 'text' : 'password'; $('#show').innerHTML = ic(hid ? 'eyeoff' : 'eye', 'sm'); $('#show').setAttribute('aria-label', hid ? 'Hide key' : 'Show key'); };
      $('#ksave').onclick = () => { keep(); render(); toast(S.gemKey ? 'Saved. VinCupid will use Gemini.' : 'Saved. VinCupid is on offline rules.', true); };
      $('#kclear').onclick = () => { S.gemKey = ''; save(); render(); toast('Key removed.'); };
      $('#ktest').onclick = async () => {
        keep();
        const r = $('#kres');
        if (!S.gemKey) { r.textContent = 'Paste a key first.'; return; }
        r.style.color = 'var(--ink-3)'; r.textContent = 'Testing…';
        let color, msg;
        try {
          const out = await gemini('Reply with the single word OK.', { json: false, timeout: 12000 });
          color = 'var(--green)'; msg = `✓ Connected. ${out.model} replied “${out.text.slice(0, 20)}”.`;
        } catch (e) {
          color = 'var(--red)'; msg = `✗ ${e.message}. VinCupid will keep using offline rules.`;
        }
        render();
        const r2 = $('#kres');
        if (r2) { r2.style.color = color; r2.textContent = msg; }
      };
      $$('[data-set="theme"]').forEach(b => b.onclick = () => { S.theme = b.dataset.val; save(); render(); });
      $('#reset').onclick = () => confirmSheet('Reset all demo data?', 'This signs you out and clears every account, chat, vouch and your API key from this browser.', 'Reset', () => {
        try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
        S = blank(); location.hash = '#/welcome'; render();
      }, true);
    },
  };

  // ---------- boot ----------
  function boot() {
    root.view = document.getElementById('view');
    root.layer = document.getElementById('layer');
    root.toasts = document.getElementById('toasts');
    applyTheme();
    renderPitch();
    window.addEventListener('hashchange', () => { navDepth++; render(); });
    window.addEventListener('storage', e => { if (e.key === KEY) { S = load(); render(); } });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
