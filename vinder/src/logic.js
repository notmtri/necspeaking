/* Vinder core logic: pure functions shared by the app (window.Logic) and the tests (require). */
(function (root) {
  'use strict';

  // ---------- dates, age, star sign ----------
  // Each sign runs up to and including [month, day].
  const SIGNS = [
    ['Capricorn', 1, 19], ['Aquarius', 2, 18], ['Pisces', 3, 20], ['Aries', 4, 19],
    ['Taurus', 5, 20], ['Gemini', 6, 20], ['Cancer', 7, 22], ['Leo', 8, 22],
    ['Virgo', 9, 22], ['Libra', 10, 22], ['Scorpio', 11, 21], ['Sagittarius', 12, 21],
    ['Capricorn', 12, 31],
  ];

  function parseDob(dob) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob || ''));
    if (!m) return null;
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { y, m: mo, d };
  }

  function zodiac(dob) {
    const p = parseDob(dob);
    if (!p) return '';
    return SIGNS.find(([, mo, d]) => p.m < mo || (p.m === mo && p.d <= d))[0];
  }

  function age(dob, today = new Date()) {
    const p = parseDob(dob);
    if (!p) return NaN;
    let a = today.getFullYear() - p.y;
    const tm = today.getMonth() + 1, td = today.getDate();
    if (tm < p.m || (tm === p.m && td < p.d)) a--;
    return a;
  }

  const MIN_AGE = 18;
  const isAdult = (dob, today = new Date()) => age(dob, today) >= MIN_AGE;

  function dayKey(date = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
  }

  function msUntilMidnight(now = new Date()) {
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return next - now;
  }

  // ---------- matching ----------
  const wants = (a, b) => a.interestedIn === 'everyone' || a.interestedIn === b.gender;
  const compatible = (a, b) => wants(a, b) && wants(b, a);

  function compat(me, u) {
    const mine = new Set((me.favorites || []).map(f => f.toLowerCase()));
    const shared = (u.favorites || []).filter(f => mine.has(f.toLowerCase()));
    const reasons = [];
    if (shared.length) reasons.push(`You both like ${shared.slice(0, 2).join(' and ')}`);
    if (u.college === me.college) reasons.push(`Both in ${u.college}`);
    if (u.goal === me.goal) reasons.push(`Both looking for ${u.goal.toLowerCase()}`);
    const pct = Math.min(98, 52 + shared.length * 12 + (u.college === me.college ? 9 : 0) + (u.goal === me.goal ? 14 : 0));
    return { pct, shared, reasons };
  }

  // The deck: same pool (students with students, faculty with faculty), mutual interest, not swiped yet.
  function buildDeck(me, users, swiped = {}) {
    return users
      .filter(u => u.id !== me.id && u.mode === me.mode && compatible(me, u) && !swiped[u.id])
      .map((u, i) => ({ u, i, s: compat(me, u).pct }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map(x => x.u);
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  // A right swipe matches when the mock user already likes you, or with a seeded 35% chance.
  const likesBack = (u, meId) => !!u.likesYou || hash(u.id + '|' + meId) % 100 < 35;

  // ---------- free tier vs premium ----------
  const FREE = { clearPhotos: 2, swipesPerDay: 10 };

  function swipesLeft(counter, premium, now = new Date()) {
    if (premium) return Infinity;
    if (!counter || counter.day !== dayKey(now)) return FREE.swipesPerDay;
    return Math.max(0, FREE.swipesPerDay - counter.count);
  }

  function countSwipe(counter, now = new Date()) {
    const day = dayKey(now);
    return { day, count: counter && counter.day === day ? counter.count + 1 : 1 };
  }

  const photoLocked = (i, premium, own) => !own && !premium && i >= FREE.clearPhotos;
  const canRewind = (premium, history) => !!premium && history.length > 0;

  // ---------- VinCupid offline rules ----------
  const SEVERITY = { ok: 0, coach: 1, warn: 2, block: 3 };

  const RULES = [
    {
      verdict: 'block', category: 'harassment',
      re: /\b(nudes?|n00ds|sext(ing)?|horny|dtf|sl[u*]t|wh[o0]re|b[i*]tch|fuck (you|u|me)|hook ?up tonight|sleep with me|sexy body|show me (your|ur) (body|boobs|tits)|send (me )?(nudes|a pic of (your|ur) body|pics of (your|ur) body)|boobs|tits|dick pic|nứng|địt)\b/i,
      reason: 'This message is sexual or harassing, so VinCupid stopped it before it was sent.',
      suggestion: 'Keep it respectful. Repeated attempts get an account reviewed by Trust & Safety.',
    },
    {
      verdict: 'warn', category: 'scam',
      re: /(telegram|whats ?app|crypto|bitcoin|\busdt\b|binance|forex|gift ?cards?|bank account|deposit|wire (me )?money|send (me )?money|transfer (me )?(money|\$|\d)|lend me|borrow (some )?money|passport|\bid card\b|cccd|căn cước|modell?ing (job|gig|contract|campaign)|job offer|paid (job|gig|trip)|work abroad|travel abroad|free (trip|ticket|flight)|invest(ment)? (opportunity|with me)|sugar (daddy|baby)|casino)/i,
      reason: 'Possible scam or trafficking signal: money, ID documents, job or travel offers, or moving the chat off Vinder.',
      suggestion: 'Never send money, codes or ID photos. Keep the chat on Vinder and report it if it continues.',
    },
    {
      verdict: 'warn', category: 'ill-intent',
      re: /(you owe me|if you (don'?t|do not)|or else|i('| a)?m your (teacher|lecturer|ta|professor)|your grades?|extra credit|pass (the|my|your) (class|course|exam)|you have no choice|nobody will believe you|age is just a number|don'?t tell (anyone|your friends)|keep (this|it) (a )?secret|meet (me )?alone|come (to|over to) my (room|place|hotel|apartment)|my hotel room)/i,
      reason: 'Pressure, secrecy or status leverage. Healthy dating has none of these.',
      suggestion: 'Both people see this note. Meet in public places on campus and say no to anything that feels off.',
    },
  ];

  const BORING = /^(hi+|hey+|hello+|helo|heyy+|yo+|sup|wassup|chào|chao|xin chào|alo|ok(ay)?|k+|lol|haha+|hehe+|hm+|wyd|hru|u up\??)[\s!.?~]*$/i;

  // Openers built from the partner's profile, preferring something you share.
  function openers(partner, me) {
    const f = (partner && partner.favorites) || [];
    const mine = new Set(((me && me.favorites) || []).map(x => x.toLowerCase()));
    const shared = f.find(x => mine.has(x.toLowerCase()));
    const ideas = [];
    if (shared) ideas.push(`We both put ${shared} in our top 5. Best memory with it?`);
    if (f[0] && f[0] !== shared) ideas.push(`${f[0]} made your top 5. What's the story there?`);
    if (f[1] && f[2]) ideas.push(`${f[1]} or ${f[2]}: if you could only keep one, which wins?`);
    if (partner && partner.greenFlags && partner.greenFlags[0]) ideas.push(`"${partner.greenFlags[0]}" is a bold green flag. I'll be the judge of that 😄`);
    return ideas.slice(0, 3);
  }

  function heuristic(text, ctx = {}) {
    const t = String(text || '').trim();
    for (const r of RULES) {
      if (r.re.test(t)) return { verdict: r.verdict, category: r.category, reason: r.reason, suggestion: r.suggestion, source: 'rules' };
    }
    const words = t.split(/\s+/).filter(Boolean);
    if (t && (BORING.test(t) || (words.length === 1 && t.length <= 6))) {
      return {
        verdict: 'coach', category: 'boring', source: 'rules',
        reason: '"Hi" is easy to ignore. Open with something from their profile instead.',
        suggestion: '', openers: openers(ctx.partner, ctx.me),
      };
    }
    return { verdict: 'ok', category: 'ok', reason: '', suggestion: '', source: 'rules' };
  }

  // Combine rules and AI: safety always takes the more severe verdict.
  function mergeVerdicts(a, b) {
    if (!b || !(b.verdict in SEVERITY)) return a;
    return SEVERITY[b.verdict] > SEVERITY[a.verdict] ? b : a;
  }

  // Ghosting / "burning the process": the last message is more than 48 hours old.
  const COLD_MS = 48 * 3600 * 1000;
  function coldStatus(messages, meId, now = Date.now()) {
    const real = (messages || []).filter(m => m.from !== 'vincupid');
    const last = real[real.length - 1];
    if (!last || now - last.t <= COLD_MS) return null;
    return { since: last.t, waitingOn: last.from === meId ? 'them' : 'you' };
  }

  // ---------- vouch links ----------
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(s) {
    let t = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    const bin = atob(t);
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }

  const makeVouchToken = (o) => b64urlEncode(JSON.stringify({ u: o.u, n: o.n, r: o.r, by: o.by || '', t: o.t || Date.now() }));

  function readVouchToken(tok) {
    try {
      const o = JSON.parse(b64urlDecode(tok));
      if (!o || typeof o.u !== 'string' || typeof o.n !== 'string' || typeof o.r !== 'string') return null;
      return o;
    } catch (e) {
      return null;
    }
  }

  function vouchSummary(list) {
    if (!list || !list.length) return null;
    const avg = list.reduce((s, v) => s + v.rating, 0) / list.length;
    return { avg: Math.round(avg * 10) / 10, count: list.length, rel: list[list.length - 1].rel };
  }

  // ---------- sign-in and LinkedIn ----------
  const isVinUniEmail = (s) => /^[a-z0-9._%+-]+@vinuni\.edu\.vn$/i.test(String(s || '').trim());

  function linkedInSlug(url) {
    const m = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9\-_%]{3,100})\/?(?:[?#].*)?$/i.exec(String(url || '').trim());
    return m ? m[1] : null;
  }

  // LinkedIn has no public API for reading profiles, so the import is simulated from what the user already told us.
  function mockLinkedIn(p, slug) {
    const role = p.mode === 'faculty'
      ? `${p.facultyRole || 'Faculty'}, ${p.major} · VinUniversity`
      : `${p.major} student · VinUniversity`;
    return {
      url: `linkedin.com/in/${slug}`,
      headline: role,
      experience: p.mode === 'faculty'
        ? [`${p.facultyRole || 'Faculty'}, ${p.college} · VinUniversity`, `Research assistant · previous university`]
        : [`Student club member · VinUniversity`, `Summer intern · ${p.major}`],
      education: p.mode === 'faculty' ? [`Graduate degree · ${p.major}`] : [`VinUniversity · B.S. ${p.major}`],
      demo: true,
    };
  }

  const api = {
    SIGNS, MIN_AGE, FREE, SEVERITY, COLD_MS,
    parseDob, zodiac, age, isAdult, dayKey, msUntilMidnight,
    wants, compatible, compat, buildDeck, hash, likesBack,
    swipesLeft, countSwipe, photoLocked, canRewind,
    heuristic, openers, mergeVerdicts, coldStatus,
    makeVouchToken, readVouchToken, vouchSummary, b64urlEncode, b64urlDecode,
    isVinUniEmail, linkedInSlug, mockLinkedIn,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
