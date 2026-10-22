/* Vinder core: state, storage, VinCupid (rules + Gemini) and every action the screens can take.
   No DOM here, so the web and mobile shells share it and the tests can drive it in Node. */
(function (root) {
  'use strict';
  const L = root.Logic, D = root.VinderData;
  const MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const KEY = 'vinder.v1';
  const H = 3600e3;
  // Mock partners "type" for a moment before replying; tests set this to [0, 0].
  const config = { replyDelay: [1100, 900] };

  const clone = o => JSON.parse(JSON.stringify(o));
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------- events ----------
  const listeners = {};
  const on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
  const emit = (evt, ...args) => (listeners[evt] || []).forEach(fn => {
    try { fn(...args); } catch (e) { if (root.console) console.error(e); }
  });

  // ---------- state ----------
  const blank = () => ({ v: 1, me: null, theme: 'system', haptics: true, gemKey: '', gemModel: MODELS[0], custom: {}, vouches: clone(D.VOUCHES), acc: {}, draft: null });
  function load() {
    try {
      const s = JSON.parse(root.localStorage.getItem(KEY));
      if (s && s.v === 1) return Object.assign(blank(), s);
    } catch (e) { /* private mode or corrupt data: start fresh */ }
    return blank();
  }
  let S = load();
  function save() {
    try { root.localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) {
      emit('error', 'This browser blocked storage, so changes will not survive a reload.');
      return false;
    }
  }
  function reset() {
    try { root.localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    S = blank();
  }
  const reload = () => { S = load(); };

  const byId = id => (S.custom[id] || D.users.find(u => u.id === id));
  const allUsers = () => D.users.filter(u => !S.custom[u.id]).concat(Object.values(S.custom));
  const me = () => byId(S.me);
  function acc() {
    if (!S.acc[S.me]) S.acc[S.me] = { swipes: {}, history: [], matches: {}, chats: {}, seen: {}, counter: null, premium: false, reports: [], blocked: {}, seeded: false };
    return S.acc[S.me];
  }
  const isPremium = () => !!(S.me && acc().premium);

  function flagOf(text) {
    const v = L.heuristic(text);
    return v.verdict === 'warn' || v.verdict === 'block' ? v.category : null;
  }

  // First sign-in: one normal chat, one gone-cold match and one scam attempt from the same pool.
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

  function login(id) {
    S.me = id;
    seed();
    save();
  }
  function logout() {
    S.me = null;
    save();
  }
  const findByEmail = email => Object.values(S.custom).find(u => u.email === email);

  // ---------- discover ----------
  const deck = () => L.buildDeck(me(), allUsers().filter(u => !acc().blocked[u.id]), acc().swipes);
  const swipesLeft = () => L.swipesLeft(acc().counter, acc().premium);

  // Records a like or pass. `free` skips the daily counter (liking back from the Likes grid).
  function swipe(u, dir, opts = {}) {
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
    save();
    return { matched };
  }

  function rewind() {
    const a = acc();
    if (!a.premium) return { ok: false, reason: 'premium' };
    const id = a.history.pop();
    if (!id) return { ok: false, reason: 'empty' };
    const hadChat = (a.chats[id] || []).length;
    delete a.swipes[id];
    if (!hadChat) { delete a.matches[id]; delete a.chats[id]; }
    save();
    return { ok: true, id };
  }

  function setPremium(on) {
    acc().premium = !!on;
    save();
  }

  // ---------- matches ----------
  function likers() {
    const a = acc(), m = me();
    return allUsers().filter(u => u.likesYou && u.mode === m.mode && u.id !== m.id && L.compatible(m, u) && !a.swipes[u.id] && !a.blocked[u.id]);
  }
  const realMessages = id => (acc().chats[id] || []).filter(m => m.from !== 'vincupid');
  function lastActivity(id) {
    const c = realMessages(id);
    return c.length ? c[c.length - 1].t : acc().matches[id].at;
  }
  function matchLists() {
    const a = acc();
    const ids = Object.keys(a.matches).filter(id => byId(id) && !a.blocked[id]);
    const fresh = ids.filter(id => !realMessages(id).length).sort((x, y) => a.matches[y].at - a.matches[x].at);
    const convos = ids.filter(id => !fresh.includes(id)).sort((x, y) => lastActivity(y) - lastActivity(x));
    return { fresh, convos };
  }
  const isUnread = id => (acc().chats[id] || []).some(m => m.from === id && m.t > (acc().seen[id] || 0));
  function unreadCount() {
    if (!S.me) return 0;
    return Object.keys(acc().matches).filter(isUnread).length;
  }
  function markSeen(id) {
    acc().seen[id] = Date.now();
    save();
  }

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
        const res = await root.fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
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

  async function freshOpeners(u) {
    const r = await gemini(`Write 3 short, specific, playful dating-app openers for ${u.short} (${u.major}). Use their favourites (${u.favorites.join(', ')}) or green flags (${u.greenFlags.join(', ')}). No pickup lines, nothing sexual. Return JSON: {"openers":["...","...","..."]}`);
    const list = ((r.json && r.json.openers) || []).slice(0, 3).map(String);
    if (!list.length) throw new Error('No ideas returned');
    return list;
  }

  // ---------- chat ----------
  const typing = {};
  function push(uid, msg) {
    const a = acc();
    const m = Object.assign({ id: uid + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: Date.now() }, msg);
    (a.chats[uid] = a.chats[uid] || []).push(m);
    save();
    return m;
  }

  // Runs VinCupid on an outgoing message, then stores it (or the block notice).
  async function send(u, raw) {
    const text = String(raw || '').trim();
    if (!text || !acc().matches[u.id]) return { status: 'skipped' };
    const v = await analyze(text, { partner: u, me: me() });
    if (!S.me || !acc().matches[u.id]) return { status: 'skipped' };
    if (v.verdict === 'block') {
      push(u.id, { from: 'vincupid', kind: 'block', title: 'message blocked', text: v.reason, sub: v.suggestion, quote: text });
      return { status: 'blocked', verdict: v };
    }
    push(u.id, { from: S.me, text });
    if (v.verdict === 'warn') push(u.id, { from: 'vincupid', kind: 'warn', title: v.category === 'scam' ? 'scam pattern' : 'heads up', text: v.reason, sub: v.suggestion });
    if (v.verdict === 'coach') push(u.id, { from: 'vincupid', kind: 'coach', title: 'coaching tip', text: v.reason, openers: v.openers && v.openers.length ? v.openers : L.openers(u, me()) });
    return { status: 'sent', verdict: v };
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
    const m = me(), hist = realMessages(u.id).slice(-10)
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

  // The mock partner answers: Gemini role-play when a key is set, a script otherwise.
  async function reply(u) {
    if (typing[u.id]) return null;
    const owner = S.me;
    typing[u.id] = true;
    emit('typing', u.id, true);
    const job = (u.scripted || !S.gemKey) ? Promise.resolve(scriptedReply(u)) : aiReply(u).catch(() => scriptedReply(u));
    const [d0, d1] = config.replyDelay;
    const [text] = await Promise.all([job, wait(d0 + Math.random() * d1)]);
    typing[u.id] = false;
    emit('typing', u.id, false);
    if (S.me !== owner || !acc().matches[u.id]) return null;
    const msg = push(u.id, { from: u.id, text, flag: flagOf(text) });
    emit('message', u.id, msg);
    return msg;
  }

  // ---------- safety actions ----------
  function report(u, reason, note) {
    acc().reports.push({ uid: u.id, reason, note: String(note || '').trim(), t: Date.now() });
    save();
  }
  function block(u) {
    const a = acc();
    a.blocked[u.id] = true;
    a.swipes[u.id] = 'blocked';
    delete a.matches[u.id];
    delete a.chats[u.id];
    save();
  }
  function unmatch(u) {
    const a = acc();
    delete a.matches[u.id];
    delete a.chats[u.id];
    save();
  }

  // ---------- vouches ----------
  async function submitVouch(tok, { rating, disputed, note }) {
    const d = L.readVouchToken(tok), u = d && byId(d.u);
    if (!u) return { ok: false, reason: "This review link doesn't work." };
    note = String(note || '').trim();
    if (!rating) return { ok: false, reason: 'Pick a star rating first.' };
    if (note.length < 4) return { ok: false, reason: 'Write a short note (a few words is fine).' };
    const v = await analyze(note, { kind: 'review note about a friend' });
    if (v.verdict === 'block' || v.verdict === 'warn') return { ok: false, reason: `VinCupid can't publish this: ${v.reason}` };
    const flags = u.greenFlags.concat(u.redFlags);
    (S.vouches[u.id] = S.vouches[u.id] || []).push({ rating, rel: d.r, by: d.n, note, disputed: flags.filter((_, i) => disputed[i]), t: Date.now() });
    save();
    return { ok: true };
  }

  // ---------- profiles ----------
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
  function completeness(u) {
    const checks = [(u.photos || []).length >= 2, (u.bio || '').length >= 40, (u.favorites || []).length === 5, (u.greenFlags || []).every(Boolean) && (u.redFlags || []).every(Boolean), (u.socials || []).length > 0 || !!u.linkedin, (u.vouchContacts || []).length > 0];
    return Math.round(checks.filter(Boolean).length / checks.length * 100);
  }

  function startSignup(email) {
    S.draft = newDraft(email);
    save();
  }
  function finishSignup() {
    const d = S.draft, id = 'u-' + Date.now().toString(36);
    const p = toProfile(d, { id, email: d.email, custom: true, vouchContacts: d.vcName.trim() ? [{ name: d.vcName.trim(), rel: d.vcRel }] : [] });
    S.custom[id] = p;
    S.draft = null;
    login(id);
    return p;
  }
  function saveProfile(d) {
    const u = me();
    S.custom[u.id] = toProfile(d, Object.assign({}, u, { custom: true }));
    save();
  }
  // Edits the signed-in profile in place; demo profiles get a local copy first.
  function updateMe(fn) {
    const u = me(), p = S.custom[u.id] ? S.custom[u.id] : clone(u);
    fn(p);
    S.custom[u.id] = p;
    save();
  }

  // ---------- settings ----------
  function setAI(key, model) {
    S.gemKey = String(key || '').trim();
    S.gemModel = String(model || '').trim() || MODELS[0];
    save();
  }
  function set(k, v) {
    S[k] = v;
    save();
  }

  const api = {
    L, D, MODELS, KEY, config, on, emit,
    get S() { return S; },
    save, reset, reload, byId, allUsers, me, acc, isPremium, flagOf, seed, login, logout, findByEmail,
    deck, swipesLeft, swipe, rewind, setPremium,
    likers, lastActivity, matchLists, realMessages, isUnread, unreadCount, markSeen,
    gemini, analyze, freshOpeners, typing, push, send, reply, scriptedReply,
    report, block, unmatch, submitVouch,
    newDraft, toDraft, toProfile, completeness, startSignup, finishSignup, saveProfile, updateMe,
    setAI, set,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VinderCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
