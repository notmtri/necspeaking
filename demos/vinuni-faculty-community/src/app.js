/* ==================================================================
   International Faculty Community — clickable concept demo.
   One codebase, two builds: MODE = "proposal" | "revised".
================================================================== */
const REV = MODE === 'revised';
const KEY = 'vinuni-ifc-demo-' + MODE + '-v1';
const TODAY_ISO = '2026-10-15';
const SOFIA_ARRIVAL = '2026-11-09';
const EMBED = window.self !== window.top; // inside the side-by-side page

const $ = (s, r = document) => r.querySelector(s);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Math.random().toString(36).slice(2, 8);

/* ---------- Icons ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.7c2.4.6 4 2.4 4 5.3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  message: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  flag: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plane: '<path d="M2 16.5 22 9l-3-2-7 2.5L6 5 4 6l4 5-4 1.5-2-1.5-1 1z"/><path d="M3 21h18"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="m21 3-11 10"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- State ---------- */
function fresh() {
  const faculty = clone(FACULTY);
  if (REV) { const s = faculty.find(f => f.id === 'sofia'); s.preArrival = true; s.joined = SOFIA_ARRIVAL; s.consent = { family: '2026-09-23' }; }
  return {
    role: null, annotate: true,
    faculty,
    threads: clone(THREADS).filter(t => REV || !t.revOnly),
    events: clone(EVENTS), recs: clone(RECS), guides: clone(GUIDES),
    matches: clone(MATCHES), notifs: clone(NOTIFS).filter(n => REV || n.to !== 'erik'),
    forums: clone(FORUMS), reports: clone(REPORTS), audit: clone(AUDIT),
    flows: clone(FLOWS).filter(f => REV || !f.rev), tags: clone(INTEREST_TAGS),
    weights: Object.fromEntries(FACTORS.map(f => [f.key, f.w])),
    prefs: {}, read: {}, readGuides: [], feedback: [], plan: Object.fromEntries(ARRIVAL_PLAN.map(a => [a.id, a.done])),
    invites: clone(INVITES), consents: clone(CONSENTS), leavers: clone(USERS_EXTRA),
    dir: { q: '', college: '', topic: '', lang: '', interest: '', family: false, buddy: false },
    cal: { y: 2026, m: 9 }, evView: 'calendar', evCat: '', recCat: '', guideCat: '', qaTag: '', qaSort: 'latest',
    remind: 12, promote: 8, roles: {}, asked: false,
  };
}
function load() { try { const raw = localStorage.getItem(KEY); if (raw) return Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* storage unavailable */ } return fresh(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
let S = load();

/* ---------- People ---------- */
const person = id => S.faculty.find(f => f.id === id) || OTHERS.find(o => o.id === id) || { id, first: 'Unknown', last: '' };
const name = id => { const p = person(id); return `${p.first} ${p.last}`.trim(); };
const first = id => person(id).first;
const initials = p => p.official ? 'VU' : ((p.first || '?')[0] + ((p.last || '')[0] || '')).toUpperCase();
function tone(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_TONES[h % AVATAR_TONES.length]; }
function av(id, cls = '') {
  const p = person(id);
  if (p.guest) return `<span class="av guest ${cls}" title="${esc(name(id))} (guest)">${initials(p)}</span>`;
  if (p.official) return `<span class="av official ${cls}" title="${esc(name(id))}" role="img" aria-label="${esc(name(id))}"></span>`;
  return `<span class="av ${cls}" style="background:${tone(id)}" title="${esc(name(id))}">${initials(p)}</span>`;
}
const me = () => person(S.role);
const isAdmin = () => S.role === 'linh';
const isPartner = () => S.role === 'erik';
const isPre = () => REV && S.role === 'sofia' && person('sofia').preArrival;
const email = id => { const p = person(id); return p.email || `${p.first}.${p.last}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ'\s]/g, '') + '@vinuni.edu.vn'; };
const collegeName = c => COLLEGES[c] || c;

/* ---------- Dates ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const D = s => new Date(s.length === 10 ? s + 'T00:00:00' : s.replace(' ', 'T'));
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = s => { const d = D(s); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtShort = s => { const d = D(s); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const addDays = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return iso(d); };
const daysUntil = s => Math.ceil((D(s) - TODAY) / 864e5);
const monthsSince = s => (TODAY - D(s)) / (864e5 * 30.44);
function ago(s) {
  const days = Math.floor((TODAY - D(s)) / 864e5);
  if (days <= 0) return 'today'; if (days === 1) return 'yesterday'; if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.round(days / 7)} wk ago`; if (days < 365) return `${Math.round(days / 30.44)} mo ago`;
  return `${Math.round(days / 365)} yr ago`;
}
const freshness = s => { const m = monthsSince(s); return m <= 6 ? 'current' : m <= 12 ? 'due' : 'old'; };
const FRESH_LABEL = { current: 'Current', due: 'Review due', old: 'Outdated' };
const nowStamp = () => `${TODAY_ISO} ${new Date().toTimeString().slice(0, 5)}`;

/* ---------- Annotations ---------- */
const PHASE = { 1: 'Phase 1 · MVP', 2: 'Phase 2 · Automation', 3: 'Phase 3 · Expansion', 4: 'Phase 4 · AI assistance' };
const ref = (s, tip = '') => `<span class="ann" title="${esc(tip || 'Proposal section ' + s)}">§${s}${tip && tip.length < 26 ? ' · ' + esc(tip) : ''}</span>`;
const phase = n => `<span class="ann" title="${esc(PHASE[n])} (proposal §13)">${esc(PHASE[n])}</span>`;
const tech = t => `<span class="ann tech" title="Built with ${esc(t)} in the ${REV ? 'pilot' : 'proposed'} architecture">${ic('layers', 'sm')}${esc(t)}</span>`;
const CHANGES = [
  { n: 1, title: 'Pre-arrival access', who: 'sofia', go: 'home', why: 'Housing, schools and insurance are decided weeks before arrival, before a VinUni account exists. HR sends an invitation link as soon as the contract is signed.' },
  { n: 2, title: 'Guest accounts for partners and families', who: 'erik', go: 'home', why: 'Partners often do the school visits and house hunting, and are the most isolated. They get a guest account linked to the faculty member, with no directory access.' },
  { n: 3, title: 'One “Ask & Discuss” space with topic tags', who: 'james', go: 'qa', why: 'Eight separate forums split a small community too thin. One stream with tags stays lively; a topic gets its own space only once it is busy.' },
  { n: 4, title: 'Works with the existing WhatsApp / Zalo groups', who: 'james', go: 'home', why: 'Faculty already chat in these groups. Instead of competing, the platform posts a weekly digest there and moderators save good answers here so they can be searched later.' },
  { n: 5, title: 'Coordinator-led matching for the pilot', who: 'linh', go: 'admin/matching', why: 'With a few dozen buddies, a person picks better matches than a rules engine. The scores are suggestions; the coordinator decides.' },
  { n: 6, title: 'A lighter, cheaper stack for the pilot', who: 'linh', go: 'admin/architecture', why: 'Full Dataverse needs premium licences for each user. Dataverse for Teams or Microsoft Lists fits this scale and is usually already included.' },
  { n: 7, title: 'Explicit consent for personal data (PDPL / Decree 13)', who: 'sofia', go: 'profile', why: 'Family information needs recorded, withdrawable consent under Vietnam’s personal data rules. Consent is collected per field and kept in a register.' },
  { n: 8, title: 'Pilot success metrics', who: 'linh', go: 'admin/overview', why: 'The pilot is judged on outcomes, not page views: buddies before arrival, time to first answer, and whether new faculty feel settled.' },
];
const chg = (n, short = true) => REV ? `<span class="ann chg" title="${esc(CHANGES[n - 1].title)}: ${esc(CHANGES[n - 1].why)}">${ic('sparkle', 'sm')}Change ${n}${short ? '' : ' · ' + esc(CHANGES[n - 1].title)}</span>` : '';

/* ---------- Forums / topics ---------- */
const forum = id => id === 'partners' ? PARTNER_TAG : S.forums.find(f => f.id === id) || { id, name: id, short: id };
const activeForums = () => S.forums.filter(f => !f.future && !f.archived);
const TOPIC_FORUM = { Schools: 'schools', Housing: 'housing', Banking: 'banking', 'Health insurance': 'health', 'Medical care': 'health', 'Food markets': 'food', Sports: 'sports', Transportation: 'newto', 'Settling in Hanoi': 'newto' };
const FORUM_TOPICS = f => Object.keys(TOPIC_FORUM).filter(t => TOPIC_FORUM[t] === f);
const KEYWORDS = {
  schools: ['school', 'kid', 'child', 'children', 'daughter', 'son', 'kindergarten', 'curriculum', 'ib', 'admission', 'teacher', 'class'],
  housing: ['apartment', 'house', 'home', 'rent', 'lease', 'realtor', 'landlord', 'deposit', 'neighbourhood', 'neighborhood', 'flat', 'move'],
  health: ['insurance', 'doctor', 'hospital', 'clinic', 'dentist', 'medical', 'pharmacy', 'sick', 'health', 'vaccine', 'paediatric', 'pediatric'],
  food: ['food', 'grocery', 'groceries', 'market', 'ingredient', 'halal', 'cheese', 'bread', 'restaurant', 'cook', 'supermarket'],
  sports: ['run', 'running', 'tennis', 'football', 'gym', 'swim', 'pickleball', 'golf', 'yoga', 'sport', 'cycling', 'bike'],
  books: ['book', 'read', 'novel', 'library'],
  banking: ['bank', 'account', 'transfer', 'money', 'card', 'atm', 'tax', 'salary', 'payment'],
  weekend: ['weekend', 'trip', 'travel', 'hike', 'museum', 'beach', 'holiday', 'visit', 'tour'],
  partners: ['partner', 'spouse', 'husband', 'wife', 'language class', 'job'],
};
function routeQuestion(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  let best = 'newto', bestN = 0;
  for (const [f, words] of Object.entries(KEYWORDS)) {
    if (f === 'partners' && !REV) continue;
    const n = words.filter(w => t.includes(w)).length;
    if (n > bestN) { best = f; bestN = n; }
  }
  return { forum: best, confident: bestN > 0 };
}
const helpersFor = f => S.faculty.filter(p => p.helpTopics.some(t => TOPIC_FORUM[t] === f));
const threadCount = f => S.threads.filter(t => t.forum === f).length;
const lastActivity = t => t.replies.length ? t.replies[t.replies.length - 1].date : t.date;

/* ---------- Matching (§6) ---------- */
const ACTIVE_M = ['introduced', 'checkin_due', 'active'];
const load_ = id => person(id).buddy.base + S.matches.filter(m => m.buddy === id && ACTIVE_M.includes(m.status)).length;
const defaultPrefs = p => ({ imp: { college: 2, culture: 1, family: 2, hobbies: 1, help: 2, area: 1 }, hobbies: p.interests.slice(), help: p.wantsHelp.slice(), area: p.area });
const prefsFor = id => S.prefs[id] || defaultPrefs(person(id));
function factorScore(key, sk, c, pr) {
  switch (key) {
    case 'college': return sk.college === c.college ? [1, `Also in ${c.college}`] : [0, `Different college (${c.college})`];
    case 'culture': {
      const reg = c.regions.filter(r => sk.regions.includes(r)); if (reg.length) return [1, `Also familiar with ${reg[0]}`];
      const lang = c.languages.filter(l => l !== 'English' && sk.languages.includes(l)); if (lang.length) return [0.7, `Speaks ${lang[0]}`];
      return [0, 'No shared region or language'];
    }
    case 'family': {
      if (sk.family.vis === 'me' || (REV && sk.consent && !sk.consent.family)) return [0, 'You chose not to use family info'];
      if (c.family.vis === 'me') return [0, 'Family info not shared'];
      const k = c.family.kids.filter(x => sk.family.kids.includes(x)); if (k.length) return [1, `Children aged ${k[0]}`];
      if (c.family.kids.length && sk.family.kids.length) return [0.6, 'Also has children'];
      if (!c.family.kids.length && !sk.family.kids.length) return [0.5, 'Similar life stage'];
      return [0.1, 'Different life stage'];
    }
    case 'hobbies': { const h = c.interests.filter(x => pr.hobbies.includes(x)); return [Math.min(1, h.length / 2), h.length ? `Shares ${h.join(', ').toLowerCase()}` : 'No shared hobbies']; }
    case 'help': { if (!pr.help.length) return [0, 'No help topics chosen']; const h = c.helpTopics.filter(x => pr.help.includes(x)); return [h.length / pr.help.length, h.length ? `Can help with ${h.join(', ').toLowerCase()}` : 'Different help topics']; }
    case 'area': if (!pr.area || pr.area === 'Undecided') return [0.5, 'Area not decided yet']; return c.area === pr.area ? [1, `Also in ${c.area}`] : [0, `Lives in ${c.area}`];
  }
  return [0, ''];
}
function scoreFor(seekerId, c) {
  const sk = person(seekerId), pr = prefsFor(seekerId);
  const parts = FACTORS.map(f => { const [v, why] = factorScore(f.key, sk, c, pr); return { ...f, v, why, wt: (pr.imp[f.key] || 0) * (S.weights[f.key] || 0) }; });
  const tot = parts.reduce((a, p) => a + p.wt, 0) || 1;
  const raw = parts.reduce((a, p) => a + p.wt * p.v, 0) / tot;
  const ld = load_(c.id);
  return { id: c.id, pct: Math.round(raw * (1 - 0.1 * ld) * 100), raw: Math.round(raw * 100), parts, load: ld, max: c.buddy.max, full: ld >= c.buddy.max };
}
function suggestions(seekerId, exclude = []) {
  return S.faculty.filter(c => c.buddy.available && c.id !== seekerId && !c.isNew && !exclude.includes(c.id))
    .map(c => scoreFor(seekerId, c)).sort((a, b) => b.pct - a.pct);
}
const currentMatch = id => [...S.matches].reverse().find(m => m.seeker === id && !['rematch', 'declined'].includes(m.status));

/* ---------- Side effects ---------- */
function notify(to, text, go, auto = true) {
  S.notifs.unshift({ id: uid('n'), to, date: TODAY_ISO, auto, text, go });
  if (to === S.role) toast(text, auto);
}
function audit(what, who = S.role) { S.audit.unshift({ date: nowStamp(), who, what }); }
function toast(msg, auto = false) {
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `${ic(auto ? 'zap' : 'check', 'sm')}<span>${esc(msg)}</span>${auto ? `<span class="auto">${REV ? 'Automated' : 'Power Automate'}</span>` : ''}`;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3800);
}
function openModal(html) { $('#modal').innerHTML = html; $('#modal').classList.add('open'); $('#scrim').classList.add('open'); const f = $('#modal input:not([type=hidden]):not([readonly]), #modal textarea'); if (f) setTimeout(() => f.focus(), 60); }
function openDrawer(html) { $('#drawer').innerHTML = html; $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); }
function closeOverlays() { $('#modal').classList.remove('open'); $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); document.body.classList.remove('side-open'); }
function download(filename, text, type = 'application/json') {
  if (PUBLIC) {
    openModal(modalShell(esc(filename), `<p class="small muted">Downloads are turned off in this online preview. Copy the contents instead.</p><textarea class="input" id="dl-text" readonly style="min-height:260px;font-family:ui-monospace,monospace;font-size:12px">${esc(text)}</textarea>`, `<button class="btn" data-act="close">Close</button><button class="btn primary" data-act="copytext">${ic('check', 'sm')}Copy</button>`));
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
}
let pendingConfirm = null;
function askConfirm(title, msg, yes, onYes) {
  pendingConfirm = onYes;
  openModal(modalShell(esc(title), `<p>${esc(msg)}</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn red" data-act="confirmyes">${esc(yes)}</button>`));
}
const modalShell = (title, body, foot = '', sub = '') => `<div class="modal-h"><div><h2>${title}</h2>${sub ? `<div class="small muted mt8">${sub}</div>` : ''}</div><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div><div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}`;

/* ---------- Routing ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [page = 'home', ...rest] = h.split('/');
  return { page: page || 'home', arg: rest.length ? decodeURIComponent(rest.join('/')) : '' };
}
function go(path) { closeOverlays(); if (location.hash === '#/' + path) { render(); window.scrollTo(0, 0); } else location.hash = '#/' + path; }
function showMe(who, path) { S.role = who; save(); go(path); }

function redirect(page, arg) {
  if (REV) {
    if (page === 'forums' || page === 'ask') return ['qa', ''];
    if (page === 'forum') return ['qa', ''];
    if (page === 'recs') return ['living', 'recs'];
  } else {
    if (page === 'qa' || page === 'arrival' || (page === 'admin' && arg === 'consent')) return ['home', ''];
  }
  if (page === 'arrival' && !(S.role === 'sofia' || S.role === 'erik')) return ['home', ''];
  if (page === 'admin' && !isAdmin()) return ['home', ''];
  if (page === 'match' && isPartner()) return ['home', ''];
  if (page === 'match' && isAdmin()) return ['admin', 'matching'];
  return null;
}


/* ---------- Password gate (hosted review copy only) ---------- */
// GATE_HASH / GATE_SALT are defined only in the password-protected build.
const GATE = typeof GATE_HASH === 'string' && GATE_HASH ? { hash: GATE_HASH, salt: GATE_SALT } : null;
const GATE_KEY = GATE ? 'ifc-gate-' + GATE.hash.slice(0, 12) : '';
let gateOpenNow = false;
function sha256hex(msg) {
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const bytes = new TextEncoder().encode(msg), len = bytes.length, n = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(n); m.set(bytes); m[len] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 8, Math.floor(len / 0x20000000)); dv.setUint32(n - 4, (len * 8) >>> 0);
  const W = new Uint32Array(64), rot = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) W[i] = W[i - 16] + (rot(W[i - 15], 7) ^ rot(W[i - 15], 18) ^ (W[i - 15] >>> 3)) + W[i - 7] + (rot(W[i - 2], 17) ^ rot(W[i - 2], 19) ^ (W[i - 2] >>> 10));
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return [...H].map(x => x.toString(16).padStart(8, '0')).join('');
}
function gateOpen() {
  if (!GATE || gateOpenNow) return true;
  try { return localStorage.getItem(GATE_KEY) === '1'; } catch (e) { return false; }
}
function gateScreen() {
  return `<div class="gate"><form class="gate-card" data-form="gate">
    <div class="gate-mark" aria-hidden="true">${ic('lock', 'lg')}</div>
    <h1>International Faculty Community</h1>
    <p>A concept demo shared for review. Enter the password you were given to open it.</p>
    <label for="gate-pw">Demo password</label>
    <input class="input" id="gate-pw" name="pw" type="password" autocomplete="off" required autofocus>
    <div class="gate-err" id="gate-err" hidden>That password doesn’t match. Check it and try again.</div>
    <button class="btn primary block" type="submit">Open demo</button>
    <p class="gate-note">Concept demo with fictional data. Not an official university system.</p>
  </form></div>`;
}
function render() {
  document.body.classList.toggle('no-ann', !S.annotate);
  const app = $('#app');
  if (!gateOpen()) { app.innerHTML = gateScreen(); return; }
  if (!S.role) { app.innerHTML = demoBar() + signin(); after(); return; }
  if (isPartner() && !REV) { app.innerHTML = demoBar() + entraBlocked(); after(); return; }
  let { page, arg } = parseHash();
  const r = redirect(page, arg);
  if (r) { location.replace('#/' + r.join('/').replace(/\/$/, '')); return; }
  const fn = PAGES[page] || PAGES.home;
  app.innerHTML = demoBar() + `<div class="shell">${sidebar(page, arg)}<div class="main">${topbar()}<main class="content" id="content">${fn(arg)}</main></div></div>
    <button class="btn primary fab" data-act="feedback">${ic('flag', 'sm')} Feedback</button>`;
  after();
}
function after() {
  document.body.classList.toggle('embed', EMBED);
  const bar = $('#demobar'); if (bar) document.documentElement.style.setProperty('--bar', (EMBED ? 0 : bar.offsetHeight) + 'px');
  $('#tourbox').innerHTML = !EMBED && S.tour != null ? tourPanel() : '';
  save();
}

/* ---------- Presenter tour ---------- */
function applyStep(i) {
  const s = TOUR[i][REV ? 'R' : 'P'];
  if (i === 0) { const annotate = S.annotate; S = fresh(); S.annotate = annotate; }
  closeOverlays(); S.tour = EMBED ? null : i; S.role = s.who; save();
  if (!s.who) { if (location.hash) location.hash = ''; else render(); }
  else go(s.go || 'home');
  setTimeout(() => highlight(s.hl), 160);
}
function highlight(sel) {
  document.querySelectorAll('.tour-hl').forEach(e => e.classList.remove('tour-hl'));
  const el = sel && document.querySelector(sel); if (!el) return;
  el.classList.add('tour-hl'); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function tourPanel() {
  const i = S.tour, st = TOUR[i];
  return `<div class="tour" role="dialog" aria-label="Presenter tour"><div class="row between"><span class="tiny strong" style="letter-spacing:1px;text-transform:uppercase;color:var(--red)">Step ${i + 1} of ${TOUR.length}</span><button class="icon-btn" style="width:30px;height:30px" data-act="tourend" aria-label="End tour">${ic('x', 'sm')}</button></div>
    <h3>${esc(st.t)}</h3><p class="small">${esc(st.say)}</p>
    <div class="row between"><div class="tour-dots">${TOUR.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><div class="row"><button class="btn sm" data-act="tourstep" data-v="-1" ${i === 0 ? 'disabled' : ''}>${ic('back', 'sm')}Back</button><button class="btn primary sm" data-act="tourstep" data-v="1">${i === TOUR.length - 1 ? 'Finish' : 'Next'} ${i === TOUR.length - 1 ? '' : ic('chev', 'sm')}</button></div></div></div>`;
}
window.addEventListener('message', e => {
  const m = e.data || {};
  if (m.type === 'tour' && TOUR[m.i]) applyStep(m.i);
  if (m.type === 'annotate') { S.annotate = !!m.on; render(); }
});

/* ---------- Chrome ---------- */
function demoBar() {
  return `<div class="demo-bar" id="demobar">
    <b>Concept demo</b><span class="note" title="Not an official VinUniversity system. All people, schools and providers are fictional.">Not official · fictional data</span>
    <span class="pill mode-${MODE}">${REV ? ic('sparkle', 'sm') + 'With suggested changes' : ic('file', 'sm') + 'Proposal as written (Sept 2026)'}</span>
    <span class="spacer"></span>
    ${S.role ? `<label>Viewing as <select data-change="persona" aria-label="Switch persona">${PERSONAS.map(p => `<option value="${p.id}" ${p.id === S.role ? 'selected' : ''}>${esc(name(p.id))} · ${esc(p.label)}</option>`).join('')}</select></label>` : ''}
    <label><input type="checkbox" data-change="annotate" ${S.annotate ? 'checked' : ''}> Labels</label>
    <button data-act="tourstart">${ic('activity', 'sm')} Present</button>
    ${PUBLIC ? '' : '<a class="btnlink" href="compare.html">Side by side</a>'}
    <button data-act="${REV ? 'changes' : 'map'}">${REV ? 'What changed?' : 'Proposal map'}</button>
    ${PUBLIC ? '' : `<a class="btnlink" href="${REV ? 'proposal-as-written.html' : 'with-suggested-changes.html'}">${REV ? '← As written' : 'Revised →'}</a>`}
    <button data-act="reset" title="Clear everything you changed in this demo">Reset</button>
  </div>`;
}

function navItems() {
  const r = S.role;
  if (!REV) return [
    ['home', 'Home', 'home'], ['profile', 'My Profile', 'user'], ['directory', 'Find Faculty', 'users'], ['match', 'New Faculty Match', 'link'],
    ['living', 'Living in Hanoi', 'map'], ['forums', 'Forums & Communities', 'message'], ['events', 'Events & Activities', 'calendar'],
    ['recs', 'Recommendations', 'star'], ['ask', 'Ask the Community', 'help'],
  ].filter(i => !(isAdmin() && i[0] === 'match'));
  if (r === 'erik') return [['home', 'Home', 'home'], ['arrival', 'Arrival plan', 'plane'], ['qa', 'Ask & Discuss', 'message'], ['living', 'Living in Hanoi', 'map'], ['events', 'Events', 'calendar'], ['directory', 'Faculty directory', 'lock', 'locked'], ['profile', 'My guest profile', 'user']];
  const items = [['home', 'Home', 'home']];
  if (r === 'sofia') items.push(['arrival', 'Arrival plan', 'plane']);
  items.push(['qa', 'Ask & Discuss', 'message'], ['directory', 'People', 'users']);
  if (!isAdmin()) items.push(['match', r === 'sofia' ? 'My buddy' : 'Buddy programme', 'link']);
  items.push(['living', 'Living in Hanoi', 'map'], ['events', 'Events', 'calendar'], ['profile', 'My profile', 'user']);
  return items;
}
const ADMIN_TABS = () => [
  ['overview', REV ? 'Pilot metrics' : 'Overview', 'chart'], ['matching', 'Matching', 'link'], ['moderation', 'Moderation', 'flag'],
  ['content', 'Content review', 'clock'], ['config', REV ? 'Topics & settings' : 'Configuration', 'sliders'], ['users', REV ? 'Users & access' : 'Users & roles', 'users'],
  ...(REV ? [['consent', 'Consent register', 'shield']] : []),
  ['automations', 'Automations', 'zap'], ['architecture', 'Architecture', 'layers'], ['audit', 'Audit log', 'list'],
];
function adminCounts() {
  return {
    matching: S.matches.filter(m => m.status === 'requested').length,
    moderation: S.reports.filter(r => r.status === 'open').length + S.feedback.filter(f => !f.done).length,
    content: S.guides.filter(g => D(g.next) <= TODAY).length + S.recs.filter(r => freshness(r.date) !== 'current').length,
  };
}
function sidebar(page, arg) {
  const activeKey = { forum: 'forums', thread: REV ? 'qa' : 'forums', guide: 'living' }[page] || page;
  const counts = isAdmin() ? adminCounts() : {};
  return `<aside class="side" id="side">
    <div class="brand"><div class="brand-mark" role="img" aria-label="VinUniversity"></div><div class="brand-txt"><b>VinUniversity</b><span>International Faculty Community</span></div></div>
    <nav class="nav" aria-label="Main">
      ${navItems().map(([k, l, i, x]) => `<a href="#/${k}" class="${activeKey === k ? 'on' : ''} ${x || ''}">${ic(i)}${l}</a>`).join('')}
      ${isAdmin() ? `<div class="nav-h">Administration</div>${ADMIN_TABS().map(([k, l, i]) => `<a href="#/admin/${k}" class="${page === 'admin' && (arg || 'overview') === k ? 'on' : ''}">${ic(i)}${l}${counts[k] ? `<span class="count">${counts[k]}</span>` : ''}</a>`).join('')}` : ''}
    </nav>
    <div class="side-foot">${REV ? 'Pilot · Semester 1, 2026–27' : 'Shows Phases 1–2 of the proposal'}<br>${isPartner() ? 'Guest access' : isPre() ? 'Pre-arrival guest access' : 'Signed in with VinUniversity SSO'}</div>
  </aside>`;
}
function topbar() {
  const mine = S.notifs.filter(n => n.to === S.role);
  const unread = mine.filter(n => !S.read[n.id]).length;
  const p = me(), persona = PERSONAS.find(x => x.id === S.role);
  return `<header class="top">
    <button class="icon-btn menu-btn" data-act="side" aria-label="Open menu">${ic('menu')}</button>
    <div class="search">${ic('search')}<input id="gsearch" data-input="search" placeholder="Search people, posts, guides, events…" autocomplete="off" aria-label="Search"><div class="search-res" id="search-res"></div></div>
    <div class="top-actions">
      <div style="position:relative">
        <button class="icon-btn" data-act="bell" aria-label="Notifications">${ic('bell')}${unread ? '<span class="dot"></span>' : ''}</button>
        <div class="notif-panel" id="notif-panel">
          <div class="card-h"><h3>Notifications</h3>${unread ? `<button class="btn ghost sm" data-act="readall">Mark all read</button>` : ''}</div>
          <div style="max-height:380px;overflow:auto">${mine.length ? mine.map(n => `<a class="notif ${S.read[n.id] ? '' : 'unread'}" href="#/${n.go}" data-act="readnotif" data-id="${n.id}"><span class="flow-ico" ${n.auto ? '' : 'style="background:var(--navy-50);color:var(--navy-700)"'}>${ic(n.auto ? 'zap' : 'message', 'sm')}</span><div><div>${esc(n.text)}</div><div class="nd">${ago(n.date)}${n.auto ? ` · automated${REV ? '' : ' (Power Automate)'}` : ''}</div></div></a>`).join('') : '<div class="empty">Nothing yet</div>'}</div>
        </div>
      </div>
      <a class="me-chip" href="#/profile">${av(p.id, 'sm')}<span class="txt"><span class="nm">${esc(name(p.id))}</span><br><span class="rl">${esc(persona.label)}</span></span></a>
      <button class="icon-btn" data-act="signout" title="Switch persona" aria-label="Sign out">${ic('logout')}</button>
    </div>
  </header>`;
}

/* ---------- Sign-in ---------- */
function signin() {
  return `<div class="signin">
    <section class="signin-art">
      <svg class="lattice" viewBox="0 0 200 200" fill="none" stroke="#fff" stroke-width=".6">${Array.from({ length: 10 }, (_, i) => `<circle cx="100" cy="100" r="${10 + i * 9}"/>`).join('')}</svg>
      <div class="row"><div class="brand-mark lg" role="img" aria-label="VinUniversity"></div><div class="brand-txt"><b>VinUniversity</b><span>International Faculty Community</span></div></div>
      <h1>One home for international faculty in Hanoi.</h1>
      <p>Find colleagues who share your field, your hobbies or your situation. Get trusted answers about schools, housing and banking. Meet someone on your first week, not your first year.</p>
      <div class="three"><div><b>Who can I connect with?</b>Directory, interest groups and a buddy for every new arrival.</div><div><b>What do I need to know?</b>Curated guides and dated faculty recommendations.</div><div><b>What’s happening?</b>Events, outings and conversations across all colleges.</div></div>
      <div class="quote">“A new colleague should be able to find people with shared interests, identify someone who can answer a relocation question, and receive a personal connection without needing to know whom to ask.” <span style="font-style:normal;font-size:13px;color:#93A3C6">Proposal §16</span></div>
    </section>
    <section class="signin-pane">
      <div class="logo-full" role="img" aria-label="VinUniversity"></div>
      <div><div class="tiny strong" style="letter-spacing:1px;text-transform:uppercase;color:var(--red)">${REV ? 'Revised concept · with suggested changes' : 'Concept demo · proposal as written'}</div>
      <h2 style="font-family:var(--serif);font-size:30px;color:var(--navy-900);margin-top:8px;font-weight:600">Choose who to be</h2>
      <p class="muted mt8">Each persona sees a different side of the platform. You can switch at any time from the bar at the top; what you do as one persona (for example, requesting a buddy) shows up for the others.</p></div>
      ${PERSONAS.map(p => `<button class="persona" data-act="persona" data-id="${p.id}">${av(p.id, 'lg')}<div><div class="pr">${esc(p.label)}</div><div class="pn">${esc(name(p.id))}</div><div class="pb">${esc(p.blurb[MODE])}</div></div></button>`).join('')}
      <div class="notice">${ic('key')}<div>${REV ? `Faculty sign in with VinUniversity single sign-on. <b>New hires and partners</b> use a personal invitation link until their account exists. ${chg(1)} ${chg(2)}` : `Everyone signs in with a VinUniversity Microsoft account (Entra ID single sign-on). ${ref(11, 'Institutional SSO')}`}</div></div>
    </section>
  </div>`;
}
function entraBlocked() {
  return `<div style="background:#EFEFEF;min-height:calc(100vh - var(--bar, 38px));padding:16px">
    <div class="entra">
      <div class="logo-full sm" role="img" aria-label="VinUniversity"></div>
      <div class="acct">${ic('back', 'sm')} erik.lindqvist@example.se</div>
      <h2>Enter password</h2>
      <div class="err">This account doesn’t exist in the VinUniversity directory. Only VinUniversity faculty and staff can sign in. Contact your administrator.</div>
      <input class="input" type="password" value="••••••••" disabled style="border-radius:0;border-width:0 0 1px">
      <div style="text-align:right;margin-top:24px"><button class="btn" style="border-radius:0" data-act="signout">Use another account</button></div>
    </div>
    <div class="card card-pad" style="max-width:640px;margin:0 auto">
      <div class="row mb12">${ic('info', 'lg')}<h2 style="font-family:var(--serif);font-size:22px;color:var(--navy-900);font-weight:600">Why Erik can’t get in</h2></div>
      <p>As written, every user signs in with a VinUniversity account ${ref(11, 'Institutional SSO')}. Partners appear only as a group that “could be added later if approved” ${ref(12)} ${phase(3)}.</p>
      <p>Erik is the one visiting schools and viewing apartments while Sofia teaches. He can’t read the schools forum, the housing guide, or sign up for the family events.</p>
      <div class="row wrap mt16"><button class="btn primary" data-act="persona" data-id="sofia">View as Sofia instead</button><a class="btn" href="with-suggested-changes.html">See how the revised version handles this →</a></div>
    </div>
  </div>`;
}

/* ---------- Shared fragments ---------- */
const pageHead = (title, lede = '', right = '', crumbs = '') => `<div class="page-h"><div>${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${title}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</div>${right ? `<div class="row wrap">${right}</div>` : ''}</div>`;
const dateTile = s => { const d = D(s); return `<div class="date-tile"><div class="m">${MON[d.getMonth()]}</div><div class="d">${d.getDate()}</div></div>`; };
const sourceBadge = g => g.source === 'official' ? `<span class="badge official">${ic('shield', 'sm')}Official · ${esc(name(g.owner))}</span>` : `<span class="badge peer">${ic('users', 'sm')}Faculty-contributed</span>`;
const freshBadge = s => { const f = freshness(s); return `<span class="fresh ${f}"><i></i>${FRESH_LABEL[f]}</span>`; };
const tagLabel = id => forum(id).short;
function eventItem(e) {
  return `<a class="list-item" href="javascript:void 0" data-act="event" data-id="${e.id}">${dateTile(e.date)}<div class="li-main"><span class="li-title">${esc(e.title)}</span><span class="li-sub">${fmtShort(e.date)} · ${e.time} · ${esc(e.loc)}</span></div>${e.official ? '<span class="badge red">Official</span>' : ''}</a>`;
}
function threadItem(t) {
  return `<a class="list-item" href="#/thread/${t.id}">${av(t.author, 'sm')}<div class="li-main"><span class="li-title">${esc(t.title)}</span><span class="li-sub">${esc(REV ? tagLabel(t.forum) : forum(t.forum).short)} · ${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'} · ${ago(lastActivity(t))}</span></div></a>`;
}
function upcomingEvents(n = 4, filter = () => true) {
  return expandEvents(TODAY_ISO, '2026-12-31').filter(filter).slice(0, n);
}
function expandEvents(from, to) {
  const out = [];
  for (const e of S.events) {
    if (e.weekly) { let d = e.date; while (d <= to) { if (d >= from) out.push({ ...e, date: d }); d = addDays(d, 7); } }
    else if (e.date >= from && e.date <= to) out.push(e);
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
const partnerFriendly = e => ['Social', 'Family', 'Cultural', 'Weekend'].includes(e.cat);

/* ==================================================================
   PAGES
================================================================== */
const PAGES = {};

/* ---------- Home ---------- */
PAGES.home = () => isAdmin() ? homeAdmin() : isPartner() ? homePartner() : homeFaculty();

function onboardingSteps() {
  const p = me(), m = currentMatch(p.id);
  return [
    { t: 'Complete your profile', s: `${p.complete}% complete`, done: p.complete >= 90, go: 'profile' },
    { t: 'Request a buddy', s: m ? (m.status === 'requested' ? 'Waiting for confirmation' : `Matched with ${name(m.buddy)}`) : 'Get 3–5 suggestions', done: !!m, go: 'match' },
    { t: 'Read “Your first week in Hanoi”', s: '6 min read', done: S.readGuides.includes('g1'), go: 'guide/g1' },
    { t: 'Ask your first question', s: 'Schools, housing, anything', done: S.asked, go: REV ? 'qa' : 'ask' },
  ];
}
function threeQuestions() {
  const p = me();
  let people;
  if (p.isNew) {
    const sug = suggestions(p.id).filter(s => !s.full).slice(0, 3);
    people = `<div class="small muted mb8">Suggested buddies, based on your profile ${ref(6)}</div>` + sug.map(s => `<a class="list-item" href="javascript:void 0" data-act="person" data-id="${s.id}">${av(s.id)}<div class="li-main"><span class="li-title">${esc(name(s.id))}</span><span class="li-sub">${esc(s.parts.filter(x => x.v >= .5 && x.wt).slice(0, 2).map(x => x.why).join(' · ') || person(s.id).college)}</span></div><span class="badge navy">${s.pct}%</span></a>`).join('');
  } else {
    const newbies = S.faculty.filter(f => f.isNew && f.id !== p.id).sort((a, b) => b.joined.localeCompare(a.joined)).slice(0, 4);
    people = `<div class="small muted mb8">New this term. Say hello!</div>` + newbies.map(f => `<a class="list-item" href="javascript:void 0" data-act="person" data-id="${f.id}">${av(f.id)}<div class="li-main"><span class="li-title">${esc(name(f.id))}</span><span class="li-sub">${f.college} · ${esc(f.country)} · ${f.preArrival ? 'arriving ' + fmtShort(f.joined) : 'joined ' + ago(f.joined)}</span></div></a>`).join('');
  }
  const wants = (p.wantsHelp && p.wantsHelp.length ? p.wantsHelp : p.helpTopics) || [];
  const guides = S.guides.filter(g => wants.includes(g.cat)).concat(S.guides.filter(g => !wants.includes(g.cat))).slice(0, 4);
  const info = guides.map(g => `<a class="list-item" href="#/guide/${g.id}"><span class="forum-ico">${ic(g.source === 'official' ? 'shield' : 'book')}</span><div class="li-main"><span class="li-title">${esc(g.title)}</span><span class="li-sub">${g.source === 'official' ? 'Official' : 'Faculty-contributed'} · ${g.mins} min</span></div></a>`).join('');
  const latest = [...S.threads].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a))).slice(0, 3);
  return `<div class="grid g3 mt24">
    <section class="card card-pad q-col"><h2>Who can I connect with?</h2><div class="q-sub">People ${ref(3)}</div>${people}<a class="btn ghost sm mt8" href="#/directory">Browse the directory ${ic('chev', 'sm')}</a></section>
    <section class="card card-pad q-col"><h2>What information do I need?</h2><div class="q-sub">Picked for your help topics ${tech(REV ? 'SharePoint pages' : 'SharePoint')}</div>${info}<a class="btn ghost sm mt8" href="#/living">All guides ${ic('chev', 'sm')}</a></section>
    <section class="card card-pad q-col"><h2>What’s happening?</h2><div class="q-sub">Events and conversations</div>${upcomingEvents(3).map(eventItem).join('')}<div class="hr"></div>${latest.map(threadItem).join('')}</section>
  </div>`;
}
function homeFaculty() {
  const p = me();
  const intl = S.faculty.length;
  let hero;
  if (isPre()) {
    const d = daysUntil(SOFIA_ARRIVAL);
    const done = ARRIVAL_PLAN.filter(a => planDone(a)).length;
    hero = `<section class="hero ph ph-facade"><div class="row between wrap" style="align-items:flex-start;gap:24px"><div>
      <div class="tiny" style="letter-spacing:1px;text-transform:uppercase;color:#F5B3BE;font-weight:700">Pre-arrival access ${chg(1)}</div>
      <h1 class="mt8">Welcome, Sofia. Hanoi is getting ready for you.</h1>
      <p>You’re using the invitation link HR sent when you signed your contract. Your VinUniversity account starts on ${fmt(SOFIA_ARRIVAL)}, and everything you set up here carries over.</p>
      <div class="row wrap mt16"><a class="btn red" href="#/arrival">${ic('plane', 'sm')}Open my arrival plan</a><a class="btn" href="#/qa">${ic('help', 'sm')}Ask a question</a></div></div>
      <div class="countdown"><b>${d}</b><span>days until<br>you land</span></div></div>
      <div class="hero-stats"><div><b>${done}/${ARRIVAL_PLAN.length}</b><span>arrival steps done</span></div><div><b>${currentMatch('sofia') ? first(currentMatch('sofia').buddy) : '—'}</b><span>your buddy</span></div><div><b>Erik</b><span>partner access active</span></div></div></section>`;
  } else {
    const greet = p.isNew ? `Welcome to Hanoi, ${p.first}.` : `Good morning, ${p.first}.`;
    const sub = p.isNew ? `You joined ${collegeName(p.college)} ${ago(p.joined)}. Here’s where to start.` : `${S.threads.filter(t => monthsSince(t.date) < .25).length} new conversations this week and ${upcomingEvents(100).length} events coming up.`;
    hero = `<section class="hero ph ${p.isNew ? 'ph-fountain' : 'ph-lawn'}"><h1>${greet}</h1><p>${sub}</p>
      <div class="hero-stats"><div><b>${intl}</b><span>international faculty</span></div><div><b>${S.faculty.filter(f => f.buddy.available).length}</b><span>volunteer buddies</span></div><div><b>${S.threads.length}</b><span>conversations</span></div><div><b>${upcomingEvents(100, e => e.date <= addDays(TODAY_ISO, 30)).length}</b><span>events in the next 30 days</span></div></div></section>`;
  }
  let extra = '';
  if (p.isNew && !isPre()) {
    const steps = onboardingSteps();
    extra = `<section class="card mt24"><div class="card-h"><h2>${ic('list')}Getting started ${phase(2)}</h2><span class="small muted">${steps.filter(s => s.done).length} of ${steps.length} done</span></div>
      <div class="card-b"><div class="grid g4">${steps.map(s => `<a class="step ${s.done ? 'done' : ''}" href="#/${s.go}" style="color:inherit;text-decoration:none"><span class="tick">${s.done ? ic('check', 'sm') : ''}</span><div><div class="st-title">${s.t}</div><div class="tiny muted">${s.s}</div></div></a>`).join('')}</div></div></section>`;
  }
  if (!p.isNew) {
    const mine = S.matches.filter(m => m.buddy === p.id && ACTIVE_M.includes(m.status));
    const topics = p.helpTopics.map(t => TOPIC_FORUM[t]);
    const canAnswer = S.threads.filter(t => topics.includes(t.forum) && t.author !== p.id).sort((a, b) => a.replies.length - b.replies.length || b.date.localeCompare(a.date)).slice(0, 4);
    extra = `<div class="grid g2 mt24">
      <section class="card"><div class="card-h"><h2>${ic('link')}Your buddies</h2><a class="btn ghost sm" href="#/match">Manage</a></div><div class="card-b">
        ${mine.length ? mine.map(m => `<div class="list-item">${av(m.seeker)}<div class="li-main"><span class="li-title">${esc(name(m.seeker))}</span><span class="li-sub">Introduced ${fmt(m.intro)} · ${m.status === 'checkin_due' ? '<b style="color:var(--amber)">check-in due</b>' : 'going well'}</span></div><button class="btn sm" data-act="person" data-id="${m.seeker}">Profile</button></div>`).join('') : '<div class="muted small">No buddies right now.</div>'}
        <div class="small muted mt8">Workload: ${load_(p.id)} of ${p.buddy.max} buddy places used ${ref(6, 'workload')}</div></div></section>
      <section class="card"><div class="card-h"><h2>${ic('help')}Questions you could answer</h2><span class="small muted">From your help topics</span></div><div class="card-b">
        ${canAnswer.map(t => `<a class="list-item" href="#/thread/${t.id}">${av(t.author, 'sm')}<div class="li-main"><span class="li-title">${esc(t.title)}</span><span class="li-sub">${esc(forum(t.forum).short)} · ${t.replies.length ? t.replies.length + ' replies' : '<b style="color:var(--red)">no replies yet</b>'} · ${ago(t.date)}</span></div></a>`).join('') || '<div class="muted small">Nothing waiting.</div>'}</div></section>
    </div>`;
    if (REV) extra += bridgeCard();
  }
  if (isPre()) extra = arrivalSummary() + bridgeCard(true);
  return hero + extra + threeQuestions();
}
function bridgeCard(compact) {
  return `<section class="card chg-box mt24"><div class="card-h"><h2>${ic('chat')}Your WhatsApp and Zalo groups ${chg(4)}</h2><span class="small muted">Linked by Faculty Affairs</span></div><div class="card-b">
    <div class="grid g2"><div><p class="small" style="margin:0">${compact ? 'Most day-to-day chat happens in the faculty WhatsApp and Zalo groups. Ask Linh for an invite before you arrive. Answers worth keeping get saved here, so you can search them.' : 'Monday’s digest went to the <b>Faculty WhatsApp group (148 members)</b> and <b>Faculty Zalo group (61)</b>: 6 new answers, 4 events, 2 unanswered questions.'}</p>
    <div class="row wrap mt12">${compact ? `<button class="btn sm" data-act="joinchat">${ic('chat', 'sm')}Request a group invite</button>` : `<button class="btn sm" data-act="savechat">${ic('download', 'sm')}Save an answer from a chat group</button><a class="btn ghost sm" href="#/thread/t22">See a saved answer</a>`}</div></div>
    <div class="notice gold small">${ic('info')}<div>The platform doesn’t try to replace the chat groups. It posts a weekly digest there, and good answers can be saved here with the author’s permission.</div></div></div></div></section>`;
}
function homePartner() {
  const fam = upcomingEvents(4, partnerFriendly);
  const partnerThreads = S.threads.filter(t => ['partners', 'schools', 'housing', 'health'].includes(t.forum)).sort((a, b) => (b.forum === 'partners') - (a.forum === 'partners') || lastActivity(b).localeCompare(lastActivity(a))).slice(0, 5);
  return `<section class="hero ph ph-fountain"><div class="tiny" style="letter-spacing:1px;text-transform:uppercase;color:#F5B3BE;font-weight:700">Partner guest access ${chg(2)}</div>
    <h1 class="mt8">Welcome, Erik.</h1><p>Sofia added you as her partner, so you can follow the arrival plan together, ask questions and join family events. Your guest access stays linked to her account.</p>
    <div class="row wrap mt16"><a class="btn red" href="#/arrival">${ic('plane', 'sm')}Shared arrival plan</a><a class="btn" href="#/qa">${ic('message', 'sm')}Ask & Discuss</a></div></section>
    ${arrivalSummary(true)}
    <div class="grid g3 mt24">
      <section class="card card-pad q-col"><h2>For partners and families</h2><div class="q-sub">Conversations you can join</div>${partnerThreads.map(threadItem).join('')}</section>
      <section class="card card-pad q-col"><h2>Family-friendly events</h2><div class="q-sub">Partners and children welcome</div>${fam.map(eventItem).join('')}</section>
      <section class="card card-pad q-col"><h2>What you can see</h2><div class="q-sub">Guest access, by design</div>
        <div class="list-item">${ic('check')}<div class="li-main"><span class="li-title">Ask & Discuss, guides, events</span><span class="li-sub">Read, post and RSVP</span></div></div>
        <div class="list-item">${ic('check')}<div class="li-main"><span class="li-title">Sofia’s arrival plan</span><span class="li-sub">Shared checklist</span></div></div>
        <div class="list-item">${ic('lock')}<div class="li-main"><span class="li-title">Faculty directory</span><span class="li-sub">Faculty only, to protect their contact details</span></div></div>
        <div class="list-item">${ic('lock')}<div class="li-main"><span class="li-title">Buddy matching</span><span class="li-sub">Sofia’s buddy can include you</span></div></div></section>
    </div>`;
}
function homeAdmin() {
  const c = adminCounts();
  const unanswered = S.threads.filter(t => !t.replies.length);
  const att = [
    c.matching && { i: 'link', t: `${c.matching} buddy request${c.matching > 1 ? 's' : ''} waiting`, s: 'Confirm or choose another buddy', go: 'admin/matching' },
    S.reports.filter(r => r.status === 'open').length && { i: 'flag', t: `${S.reports.filter(r => r.status === 'open').length} reported posts`, s: 'Moderation queue', go: 'admin/moderation' },
    unanswered.length && { i: 'help', t: `${unanswered.length} questions without an answer`, s: 'Nudge the people who can help', go: 'admin/moderation' },
    c.content && { i: 'clock', t: `${c.content} resources past their review date`, s: 'Housing, banking and schools go stale fastest', go: 'admin/content' },
    S.leavers.filter(l => l.status === 'leaving').length && { i: 'users', t: `${S.leavers.filter(l => l.status === 'leaving').length} leavers from the HR sync`, s: 'Deactivate on their last day', go: 'admin/users' },
    S.feedback.filter(f => !f.done).length && { i: 'chat', t: `${S.feedback.filter(f => !f.done).length} feedback submissions`, s: 'From the feedback button', go: 'admin/moderation' },
  ].filter(Boolean);
  return `<section class="hero ph ph-facade"><h1>Good morning, Linh.</h1><p>${REV ? 'Week 7 of the pilot.' : 'Platform administrator · Faculty Affairs.'} Here is what needs you today.</p>
    <div class="hero-stats"><div><b>${S.faculty.length}</b><span>faculty profiles</span></div><div><b>${S.faculty.filter(f => f.complete < 70).length}</b><span>incomplete profiles</span></div><div><b>${c.matching}</b><span>match requests</span></div><div><b>${WAU[WAU.length - 1]}</b><span>active this week</span></div></div></section>
    <div class="split mt24"><section class="card"><div class="card-h"><h2>${ic('alert')}Needs your attention ${ref(7, 'admin dashboard')}</h2></div><div class="card-b">
      ${att.length ? att.map(a => `<a class="list-item" href="#/${a.go}"><span class="forum-ico">${ic(a.i)}</span><div class="li-main"><span class="li-title">${a.t}</span><span class="li-sub">${a.s}</span></div>${ic('chev')}</a>`).join('') : '<div class="empty">All clear.</div>'}</div></section>
    <section class="card"><div class="card-h"><h2>${ic('calendar')}Coming up</h2></div><div class="card-b">${upcomingEvents(5).map(eventItem).join('')}</div></section></div>
    ${threeQuestions()}`;
}

/* ---------- Arrival plan (revised) ---------- */
function planDone(a) {
  if (a.auto === 'match' && a.id === 'a3') { const m = currentMatch('sofia'); if (m && ACTIVE_M.includes(m.status)) return true; }
  return !!S.plan[a.id];
}
function arrivalSummary(partner) {
  const done = ARRIVAL_PLAN.filter(planDone).length, next = ARRIVAL_PLAN.filter(a => !planDone(a)).slice(0, 3);
  return `<section class="card chg-box mt24"><div class="card-h"><h2>${ic('plane')}${partner ? 'Your shared arrival plan' : 'Next on your arrival plan'} ${chg(1)}</h2><a class="btn ghost sm" href="#/arrival">Open plan ${ic('chev', 'sm')}</a></div>
    <div class="card-b"><div class="row mb12"><div class="progress green" style="flex:1"><i style="width:${Math.round(done / ARRIVAL_PLAN.length * 100)}%"></i></div><span class="small strong">${done}/${ARRIVAL_PLAN.length}</span></div>
    <div class="steps">${next.map(a => planStep(a)).join('')}</div></div></section>`;
}
function planStep(a) {
  const d = planDone(a);
  return `<div class="step ${d ? 'done' : ''}"><button class="tick" data-act="plan" data-id="${a.id}" aria-label="Toggle">${d ? ic('check', 'sm') : ''}</button><span class="when">${a.when}</span><div class="li-main"><div class="st-title">${a.title}</div></div><a class="btn ghost sm" href="#/${a.link}">Open ${ic('chev', 'sm')}</a></div>`;
}
PAGES.arrival = () => {
  const d = daysUntil(SOFIA_ARRIVAL), m = currentMatch('sofia');
  const inv = S.invites.find(i => i.id === 'i1');
  return pageHead(`Arrival plan`, `${d} days until Sofia lands on ${fmt(SOFIA_ARRIVAL)}. Shared between Sofia and Erik. Either of you can tick things off.`, chg(1, false))
    + `<div class="split"><section class="card"><div class="card-h"><h2>${ic('list')}Timeline</h2><span class="small muted">${ARRIVAL_PLAN.filter(planDone).length} of ${ARRIVAL_PLAN.length} done</span></div><div class="card-b"><div class="steps">${ARRIVAL_PLAN.map(planStep).join('')}</div></div></section>
    <div class="stack">
      <section class="card card-pad"><h3 class="mb8">Your buddy</h3>${m ? `<div class="row">${av(m.buddy, 'lg')}<div><div class="strong">${esc(name(m.buddy))}</div><div class="small muted">${m.status === 'requested' ? 'Waiting for the coordinator to confirm' : 'Introduced ' + fmt(m.intro)}</div></div></div>${m.status !== 'requested' ? '<p class="small mt12">Suggested: a video call this week, then coffee in your first week.</p>' : ''}` : `<p class="small muted">No buddy yet. Most new hires meet theirs on video about six weeks before they arrive.</p>${S.role === 'sofia' ? '<a class="btn primary sm" href="#/match">Find a buddy</a>' : ''}`}</section>
      <section class="card card-pad"><h3 class="mb8">Access</h3>
        <dl class="kv"><dt>Invitation</dt><dd>Sent by HR ${fmt(inv.sent)}</dd><dt>Guest until</dt><dd>${fmt(SOFIA_ARRIVAL)}</dd><dt>Then</dt><dd>VinUni SSO takes over automatically</dd><dt>Partner</dt><dd>Erik Lindqvist · active</dd></dl></section>
      <section class="card card-pad"><h3 class="mb8">Chat groups ${chg(4)}</h3><p class="small">The faculty WhatsApp and Zalo groups are where day-to-day chat happens.</p><button class="btn sm" data-act="joinchat">${ic('chat', 'sm')}Request an invite</button></section>
    </div></div>`;
};

/* ---------- Profile (§4) ---------- */
const VIS_OPTS = [['faculty', 'Visible to faculty'], ['match', 'Matching only'], ['me', 'Only me']];
const visSelect = (nm, val, opts = VIS_OPTS) => `<select class="input" name="${nm}" style="width:auto;padding:4px 8px;font-size:12.5px">${opts.map(([v, l]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
const chipSet = (nm, all, on) => `<div class="chips">${all.map(x => `<label class="chip ${on.includes(x) ? 'on' : ''}"><input type="checkbox" name="${nm}" value="${esc(x)}" ${on.includes(x) ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div>`;
const req = '<span class="badge red">Required</span>', opt = '<span class="badge">Optional</span>', rec = '<span class="badge navy">Recommended</span>';
function completeness(p) {
  const checks = [p.first, p.last, p.college, p.expertise.length, p.interests.length, p.languages.length, p.regions.length, p.helpTopics.length || p.wantsHelp.length, p.contact, p.area && p.area !== 'Undecided', p.photo, p.phone];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
}
PAGES.profile = () => {
  if (isAdmin()) return pageHead('My account', 'Staff accounts don’t have a community profile.') + `<div class="card card-pad" style="max-width:640px"><div class="row">${av('linh', 'xl')}<div><div class="strong" style="font-size:18px">Linh Trần</div><div class="muted">Faculty Affairs Officer · Platform Administrator</div></div></div><div class="hr"></div>${rolesTable()}</div>`;
  if (isPartner()) return guestProfile();
  const p = me();
  const fam = p.family;
  const consentOn = !REV || (p.consent && p.consent.family);
  return pageHead('My profile', 'You decide what other faculty can see. Optional personal fields are private by default.', `<button class="btn" data-act="preview">${ic('eye', 'sm')}Preview as others see it</button>`)
    + `<form data-form="profile"><div class="split"><div class="stack">
    <section class="card"><div class="card-h"><h2>${ic('user')}About you ${ref(4)} ${tech(REV ? 'Microsoft Lists' : 'Power Apps + Dataverse')}</h2></div><div class="card-b">
      <div class="row" style="gap:16px;margin-bottom:18px">${av(p.id, 'xl')}<div><button type="button" class="btn sm" data-act="photo">${ic('edit', 'sm')}${p.photo ? 'Change photo' : 'Add photo'}</button><div class="hint mt8">Profile photo ${opt} · visible if you opt in</div></div></div>
      <div class="grid g2"><div class="field"><label>First name ${req}</label><input class="input" name="first" value="${esc(p.first)}" required></div><div class="field"><label>Last name ${req}</label><input class="input" name="last" value="${esc(p.last)}" required></div></div>
      <div class="grid g2"><div class="field"><label>College / school / unit ${req}</label><select class="input" name="college">${Object.entries(COLLEGES).map(([k, v]) => `<option value="${k}" ${k === p.college ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>VinUniversity email ${req}</label><input class="input" value="${isPre() ? 'Available from ' + fmt(SOFIA_ARRIVAL) : email(p.id)}" readonly style="background:var(--bg)"><span class="hint">${isPre() ? `Using your personal email until then ${chg(1)}` : 'Visible to faculty'}</span></div></div>
      <div class="field"><label>Academic / professional expertise ${req}</label><input class="input" name="expertise" value="${esc(p.expertise.join(', '))}"><span class="hint">Comma-separated. Visible to faculty.</span></div>
    </div></section>
    <section class="card"><div class="card-h"><h2>${ic('heart')}Interests and background</h2></div><div class="card-b">
      <div class="field"><span class="lbl">Hobbies and interests ${opt}</span>${chipSet('interests', S.tags, p.interests)}</div>
      <div class="grid g2"><div class="field"><label>Languages ${rec}</label><input class="input" name="languages" value="${esc(p.languages.join(', '))}"></div><div class="field"><label>Country / region familiarity ${rec}</label><input class="input" name="regions" value="${esc(p.regions.join(', '))}"></div></div>
    </div></section>
    <section class="card"><div class="card-h"><h2>${ic('help')}Helping and being helped</h2></div><div class="card-b">
      <div class="field"><span class="lbl">Topics I can help with ${rec}</span>${chipSet('helpTopics', HELP_TOPICS, p.helpTopics)}</div>
      <div class="field"><span class="lbl">Topics I would like help with ${opt}</span>${chipSet('wantsHelp', HELP_TOPICS, p.wantsHelp)}<span class="hint">Used for matching and onboarding only. Not shown on your profile.</span></div>
      <div class="row wrap" style="gap:18px"><label class="row"><span class="toggle"><input type="checkbox" name="buddy" ${p.buddy.available ? 'checked' : ''}><span></span></span><b class="small">Available as a new-faculty buddy</b></label>
      <label class="row small">Up to <select class="input" name="buddyMax" style="width:auto;padding:4px 8px">${[1, 2, 3].map(n => `<option ${n === (p.buddy.max || 1) ? 'selected' : ''}>${n}</option>`).join('')}</select> buddies at a time</label></div>
    </div></section>
    <section class="card ${REV ? 'chg-box' : ''}"><div class="card-h"><h2>${ic('lock')}Private details</h2>${REV ? chg(7) : ref(4, 'privacy recommendation')}</div><div class="card-b">
      <div class="notice mb16">${ic('shield')}<div>These fields are never required. Family information is private by default and can be used only for matching if you choose. ${REV ? 'We record your consent for each one, and you can withdraw it at any time.' : ''}</div></div>
      <div class="field"><label>Cell / messaging number ${opt} ${visSelect('phoneVis', p.phoneVis, [['faculty', 'Visible to faculty'], ['me', 'Only me']])}</label><input class="input" name="phone" value="${esc(p.phone || '')}" placeholder="+84 …"></div>
      ${REV ? `<label class="row mb12" style="align-items:flex-start"><input type="checkbox" name="consentFamily" ${consentOn ? 'checked' : ''} data-change="consent" style="margin-top:4px"><span class="small"><b>I consent</b> to VinUniversity processing my partner and children’s age information for buddy matching, under Vietnam’s Personal Data Protection Law and Decree 13/2023. ${p.consent && p.consent.family ? `<span class="muted">Given ${fmt(p.consent.family)}.</span>` : ''}</span></label>` : ''}
      <fieldset id="famfields" ${consentOn ? '' : 'disabled'} style="border:0;padding:0;margin:0;${consentOn ? '' : 'opacity:.45'}">
        <div class="field"><label>Partner / family information ${opt} ${visSelect('famVis', fam.vis)}</label><label class="row small"><input type="checkbox" name="partner" ${fam.partner ? 'checked' : ''}> I have a partner or spouse living with me in Hanoi</label></div>
        <div class="field"><span class="lbl">Children’s age ranges ${opt}</span>${chipSet('kids', KID_RANGES, fam.kids)}<span class="hint">Age ranges only. Never names or birth dates. Uses the same visibility as family information.</span></div>
      </fieldset>
      <div class="grid g2"><div class="field"><label>Preferred contact method ${opt}</label><select class="input" name="contact">${['Email', 'Teams', 'Zalo', 'WhatsApp', 'Phone'].map(c => `<option ${c === p.contact ? 'selected' : ''}>${c}</option>`).join('')}</select><span class="hint">Subject to university policy</span></div>
      <div class="field"><label>Broad area ${opt}</label><select class="input" name="area">${AREAS.map(a => `<option ${a === p.area ? 'selected' : ''}>${a}</option>`).join('')}</select><span class="hint">For matching only. We never ask for your address. ${ref(6)}</span></div></div>
    </div></section>
    <div class="row"><button class="btn primary" type="submit">${ic('check', 'sm')}Save profile</button><span class="small muted">Last confirmed ${p.updated ? fmt(p.updated) : fmt(p.joined)}. We’ll remind you every ${S.remind} months. ${ref(7)}</span></div>
  </div>
  <aside class="stack">
    <section class="card card-pad"><div class="row between"><b>Profile completeness</b><b>${p.complete}%</b></div><div class="progress ${p.complete >= 90 ? 'green' : ''} mt8"><i style="width:${p.complete}%"></i></div><p class="small muted mt12">Complete profiles get better buddy suggestions and are easier to find.</p></section>
    <section class="card card-pad"><b>Who sees what</b><dl class="kv mt12 small" style="grid-template-columns:1fr auto">
      <dt>Name, college, expertise, email</dt><dd><span class="badge navy">Faculty</span></dd><dt>Phone</dt><dd><span class="badge">${p.phoneVis === 'faculty' ? 'Faculty' : 'Only you'}</span></dd>
      <dt>Family</dt><dd><span class="badge">${{ faculty: 'Faculty', match: 'Matching', me: 'Only you' }[fam.vis]}</span></dd><dt>Help wanted, area</dt><dd><span class="badge">Matching</span></dd>
      ${REV ? '<dt>Partners (guests)</dt><dd><span class="badge">Never</span></dd>' : ''}<dt>Public internet</dt><dd><span class="badge red">Never</span></dd></dl></section>
    ${REV ? `<section class="card card-pad chg-box"><b>Your data ${chg(7)}</b><p class="small muted mt8">Download everything we hold about you, or delete all optional fields at once.</p><div class="row wrap"><button type="button" class="btn sm" data-act="mydata">${ic('download', 'sm')}Download my data</button><button type="button" class="btn sm" data-act="wipe">${ic('trash', 'sm')}Delete optional data</button></div></section>` : ''}
  </aside></div></form>`;
};
function guestProfile() {
  const p = me();
  return pageHead('My guest profile', 'Partners have a small profile so others know who is posting.', chg(2)) + `<div class="split"><section class="card card-pad">
    <div class="row mb16">${av(p.id, 'xl')}<div><div class="strong" style="font-size:18px">${esc(name(p.id))}</div><div class="muted">${esc(p.title)}</div><span class="badge mt8">Guest</span></div></div>
    <dl class="kv"><dt>Email</dt><dd>${esc(p.email)}</dd><dt>Linked to</dt><dd>${esc(name(p.partnerOf))} (CECS)</dd><dt>Interests</dt><dd>${(p.interests || []).map(i => `<span class="tag">${i}</span>`).join(' ')}</dd><dt>Languages</dt><dd>${(p.languages || []).join(', ')}</dd><dt>Access ends</dt><dd>Automatically when Sofia leaves VinUniversity, or if she removes you</dd></dl></section>
    <aside class="card card-pad"><b>Privacy</b><p class="small muted mt8">You don’t appear in the faculty directory, and you can’t see faculty contact details. Your name shows on posts you write and events you join.</p><p class="small muted">Consent recorded ${fmt('2026-10-14')}.</p></aside></div>`;
}

/* ---------- Person drawer ---------- */
function personDrawer(id, preview = false) {
  const p = person(id), viewerIsSelf = id === S.role && !preview;
  const showFam = p.family && (p.family.vis === 'faculty' || viewerIsSelf) && (p.family.partner || p.family.kids.length);
  const showPhone = p.phone && (p.phoneVis === 'faculty' || viewerIsSelf);
  const hidden = [];
  if (p.phone && p.phoneVis !== 'faculty') hidden.push('phone number');
  if (p.family && p.family.vis !== 'faculty' && (p.family.partner || p.family.kids.length)) hidden.push(`family information (${p.family.vis === 'match' ? 'matching only' : 'only you'})`);
  hidden.push('topics you want help with', 'broad area');
  const contactBtn = { Teams: ['chat', 'Message on Teams'], WhatsApp: ['chat', 'WhatsApp'], Zalo: ['chat', 'Zalo'], Email: ['mail', 'Email'], Phone: ['phone', 'Call'] }[p.contact] || ['mail', 'Email'];
  const load = p.buddy ? load_(id) : 0;
  return `<div class="drawer-h"><b>${preview ? 'Preview: how other faculty see you' : 'Faculty profile'}</b><button class="icon-btn" data-act="close" aria-label="Close">${ic('x')}</button></div>
  <div class="drawer-b">
    ${preview ? `<div class="notice mb16">${ic('eye')}<div>Hidden from other faculty: ${hidden.join(', ')}.</div></div>` : ''}
    <div class="row" style="gap:16px;align-items:flex-start">${av(id, 'xl')}<div><h2 style="font-family:var(--serif);font-size:24px;color:var(--navy-900);font-weight:600">${esc(name(id))}</h2><div class="muted">${esc(p.title)} · ${esc(collegeName(p.college))}</div>
      <div class="row wrap mt8">${p.isNew ? `<span class="badge gold">${p.preArrival ? 'Arriving ' + fmtShort(p.joined) : 'New this term'}</span>` : ''}${p.buddy && p.buddy.available ? `<span class="badge green">Buddy · ${Math.max(0, p.buddy.max - load)} of ${p.buddy.max} places free</span>` : ''}${(p.moderator || []).map(f => `<span class="badge navy">Moderates ${esc(forum(f).short)}</span>`).join('')}</div></div></div>
    <div class="row wrap mt16"><button class="btn primary sm" data-act="contact" data-id="${id}">${ic(contactBtn[0], 'sm')}${contactBtn[1]}</button><button class="btn sm" data-act="contact" data-id="${id}" data-how="email">${ic('mail', 'sm')}${esc(email(id))}</button></div>
    <div class="hr"></div>
    <dl class="kv">
      <dt>Expertise</dt><dd><div class="tags">${p.expertise.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></dd>
      ${p.helpTopics.length ? `<dt>Can help with</dt><dd><div class="tags">${p.helpTopics.map(x => `<span class="badge navy">${esc(x)}</span>`).join('')}</div></dd>` : ''}
      ${p.interests.length ? `<dt>Interests</dt><dd><div class="tags">${p.interests.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div></dd>` : ''}
      <dt>Languages</dt><dd>${esc(p.languages.join(', '))}</dd>
      <dt>Familiar with</dt><dd>${esc(p.regions.join(', '))}${p.country ? ` · from ${esc(p.country)}` : ''}</dd>
      <dt>In Hanoi</dt><dd>${p.preArrival ? 'Arriving ' + fmt(p.joined) : p.years ? `Since ${D(p.joined).getFullYear()}` : 'Since ' + MON[D(p.joined).getMonth()] + ' ' + D(p.joined).getFullYear()}</dd>
      ${showFam ? `<dt>Family</dt><dd>${p.family.partner ? 'Partner' : ''}${p.family.partner && p.family.kids.length ? ' · ' : ''}${p.family.kids.length ? 'Children aged ' + p.family.kids.join(', ') : ''}</dd>` : ''}
      ${showPhone ? `<dt>Phone</dt><dd>${esc(p.phone)}</dd>` : ''}
      <dt>Prefers</dt><dd>${esc(p.contact)}</dd>
    </dl>
    ${!preview && id !== S.role && p.helpTopics.length ? `<div class="hr"></div><div class="small muted mb8">Have a question in one of ${first(id)}’s topics?</div><a class="btn sm" href="#/${REV ? 'qa' : 'ask'}">${ic('help', 'sm')}Ask the community</a>` : ''}
  </div>`;
}

/* ---------- Directory ---------- */
PAGES.directory = () => {
  if (isPartner()) return pageHead('Faculty directory') + `<div class="card card-pad chg-box" style="max-width:640px"><div class="row mb12">${ic('lock', 'lg')}<h2 style="font-family:var(--serif);font-size:22px;font-weight:600;color:var(--navy-900)">For faculty only</h2></div><p>Faculty contact details stay with faculty. As a partner you can still reach people by posting in Ask & Discuss, replying to threads, or meeting them at events.</p>${chg(2, false)}<div class="row mt16"><a class="btn primary" href="#/qa">Go to Ask & Discuss</a></div></div>`;
  const f = S.dir;
  const langs = [...new Set(S.faculty.flatMap(p => p.languages))].sort();
  return pageHead(REV ? 'People' : 'Find Faculty', 'Search by college, expertise, hobbies, languages or what people can help with.', `${ref(3)} ${ref(4)} ${tech(REV ? 'Lists view' : 'Power Apps')}`)
    + `<section class="card card-pad mb16"><div class="search" style="max-width:none;margin-bottom:12px">${ic('search')}<input class="input" style="padding-left:38px" data-input="dir" name="q" value="${esc(f.q)}" placeholder="Name, expertise or interest…" aria-label="Search the directory"></div>
    <div class="filters">
      <select class="input" data-change="dir" name="college"><option value="">All colleges</option>${Object.keys(COLLEGES).map(c => `<option value="${c}" ${f.college === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="input" data-change="dir" name="topic"><option value="">Can help with…</option>${HELP_TOPICS.map(t => `<option ${f.topic === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select class="input" data-change="dir" name="interest"><option value="">Any interest</option>${S.tags.map(t => `<option ${f.interest === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select class="input" data-change="dir" name="lang"><option value="">Any language</option>${langs.map(t => `<option ${f.lang === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    <div class="row wrap mt12" style="gap:18px"><label class="row small"><input type="checkbox" data-change="dir" name="buddy" ${f.buddy ? 'checked' : ''}> Available as a buddy</label>
    <label class="row small"><input type="checkbox" data-change="dir" name="family" ${f.family ? 'checked' : ''}> Has children (only people who share this)</label>
    <button class="btn ghost sm" data-act="dirclear">Clear filters</button></div></section>
    <div id="dir-results">${dirResults()}</div>`;
};
function dirResults() {
  const f = S.dir, q = f.q.trim().toLowerCase();
  const list = S.faculty.filter(p => (!q || [p.first, p.last, ...p.expertise, ...p.interests, p.country].join(' ').toLowerCase().includes(q))
    && (!f.college || p.college === f.college) && (!f.topic || p.helpTopics.includes(f.topic)) && (!f.interest || p.interests.includes(f.interest))
    && (!f.lang || p.languages.includes(f.lang)) && (!f.buddy || (p.buddy.available && load_(p.id) < p.buddy.max)) && (!f.family || (p.family.vis === 'faculty' && p.family.kids.length)))
    .sort((a, b) => a.last.localeCompare(b.last));
  return `<div class="row between mb12"><span class="small muted">${list.length} of ${S.faculty.length} faculty</span>${f.family ? `<span class="small muted">${ic('lock', 'sm')} People who keep family info private never appear in this filter.</span>` : ''}</div>
    <div class="grid g-auto">${list.map(p => `<article class="card person" data-act="person" data-id="${p.id}" tabindex="0">
      <div class="row">${av(p.id)}<div style="min-width:0"><div class="p-name">${esc(name(p.id))}${p.id === S.role ? ' <span class="badge">You</span>' : ''}</div><div class="p-title">${esc(p.title)} · ${p.college}</div></div></div>
      <div class="tags">${p.expertise.slice(0, 2).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
      ${p.helpTopics.length ? `<div class="small"><span class="muted">Can help with:</span> ${p.helpTopics.slice(0, 3).map(esc).join(', ')}</div>` : '<div class="small muted">&nbsp;</div>'}
      <div class="row wrap">${p.isNew ? '<span class="badge gold">New</span>' : ''}${p.buddy.available ? (load_(p.id) < p.buddy.max ? '<span class="badge green">Buddy available</span>' : '<span class="badge">Buddy · full</span>') : ''}<span class="small muted" style="margin-left:auto">${esc(p.languages.slice(0, 3).join(' · '))}</span></div>
    </article>`).join('') || '<div class="empty card">No one matches those filters.</div>'}</div>`;
}

/* ---------- Matching (§6) ---------- */
function flowSteps(status) {
  const steps = [['Onboarding form', 'What matters to you'], ['Suggestions', '3–5 matches'], [REV ? 'Coordinator confirms' : 'Admin confirms', REV ? 'By hand in the pilot' : 'Or user confirms'], ['Introduction', 'Both get an intro'], ['Check-in', 'After 2–4 weeks'], ['Re-match', 'If needed']];
  const idx = { none: 1, requested: 2, introduced: 3, checkin_due: 4, active: 5 }[status] ?? 1;
  return `<div class="flow mb16">${steps.map((s, i) => `<div class="flow-step ${i < idx ? 'done' : i === idx ? 'cur' : ''}">${s[0]}<small>${s[1]}</small></div>`).join('')}</div>`;
}
function matchCard(s, seekerId, opts = {}) {
  const p = person(s.id), why = s.parts.filter(x => x.wt && x.v >= .5).sort((a, b) => b.wt * b.v - a.wt * a.v).slice(0, 3);
  return `<article class="card match-card">
    <div class="row" style="align-items:flex-start">${av(s.id, 'lg')}<div style="flex:1;min-width:0"><div class="p-name strong">${esc(name(s.id))}</div><div class="small muted">${esc(p.title)} · ${p.college} · ${p.years} yrs in Hanoi</div></div><div class="score-ring" style="--p:${s.pct}"><b>${s.pct}%</b></div></div>
    <ul class="small" style="margin:0">${why.map(w => `<li>${esc(w.why)}</li>`).join('') || '<li class="muted">Few overlaps. Mostly a general guide.</li>'}</ul>
    <details><summary class="small" style="cursor:pointer;color:var(--navy-700);font-weight:600">Why this score?</summary><div class="mt8">${s.parts.map(x => `<div class="fbar"><span>${esc(x.label.split(' / ')[0].split(',')[0])}</span><div class="progress"><i style="width:${x.wt ? x.v * 100 : 0}%"></i></div><span>${x.wt ? Math.round(x.v * 100) : 'off'}</span></div>`).join('')}<div class="tiny muted mt8">Workload adjustment: −${s.load * 10}% (${s.load} of ${s.max} places used)</div></div></details>
    <div class="row between"><span class="small muted">${s.load} of ${s.max} buddy places used</span>${opts.action || ''}</div>
  </article>`;
}
PAGES.match = () => {
  const p = me();
  if (!p.isNew) return buddyView(p);
  const m = currentMatch(p.id);
  const head = pageHead(REV ? 'My buddy' : 'New Faculty Match', REV ? 'An experienced colleague who helps you settle in, ideally before you even land.' : 'Get matched with an established colleague who can help you settle in.', `${ref(6)} ${REV ? chg(5) : phase(2)}`);
  if (m && m.status !== 'rematch') return head + flowSteps(m.status) + matchStatus(m);
  return head + flowSteps('none') + matchForm(p);
}
function matchForm(p) {
  const pr = prefsFor(p.id);
  const sug = suggestions(p.id, S.matches.filter(m => m.seeker === p.id && m.status === 'rematch').map(m => m.buddy));
  const open = sug.filter(s => !s.full).slice(0, 5), full = sug.filter(s => s.full && s.raw >= 40);
  return `<div class="split"><div>
    <div class="row between mb12"><h2 style="font-family:var(--serif);font-size:22px;color:var(--navy-900);font-weight:600">Suggested buddies</h2><span class="small muted">${REV ? 'Your coordinator confirms the final pick with you' : 'Ranked by the factors you chose'}</span></div>
    ${full.length ? `<div class="notice warn mb16">${ic('info')}<div>${full.map(s => `<b>${esc(name(s.id))}</b> (${s.raw}% before workload)`).join(', ')} would be a good match but ${full.length > 1 ? 'are' : 'is'} at capacity. We spread buddies out so no one gets every newcomer.</div></div>` : ''}
    <div class="grid g2">${open.map(s => matchCard(s, p.id, { action: `<button class="btn primary sm" data-act="requestmatch" data-id="${s.id}">${REV ? 'I’d like ' + esc(first(s.id)) : 'Request'}</button>` })).join('')}</div>
  </div>
  <aside class="card"><div class="card-h"><h2>${ic('sliders')}What matters to you?</h2></div><div class="card-b">
    <p class="small muted">Changes update the suggestions straight away.</p>
    ${FACTORS.map(f => `<div class="imp"><span class="small strong">${esc(f.label)}${f.key === 'family' ? ` <span class="tiny muted">(private)</span>` : ''}</span><div class="seg">${[['0', 'Off'], ['1', 'Nice'], ['2', 'Key']].map(([v, l]) => `<button type="button" class="${String(pr.imp[f.key]) === v ? 'on' : ''}" data-act="imp" data-k="${f.key}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}
    <div class="field mt16"><span class="lbl">I’d like help with</span>${chipSet('mhelp', HELP_TOPICS, pr.help).replace(/name="mhelp"/g, 'name="mhelp" data-change="mpref"')}</div>
    <div class="field"><span class="lbl">Hobbies to share</span>${chipSet('mhob', S.tags, pr.hobbies).replace(/name="mhob"/g, 'name="mhob" data-change="mpref"')}</div>
    <div class="field"><label>Where you’ll live (broad area)</label><select class="input" data-change="mpref" name="marea">${AREAS.map(a => `<option ${a === pr.area ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
  </div></aside></div>`;
}
function matchStatus(m) {
  const b = person(m.buddy);
  if (m.status === 'requested') return `<section class="card card-pad" style="max-width:760px"><div class="row" style="gap:16px">${av(b.id, 'lg')}<div><div class="strong" style="font-size:17px">You asked for ${esc(name(b.id))}</div><div class="muted small">Requested ${fmt(m.created)} · waiting for ${REV ? 'your coordinator' : 'Faculty Affairs'} to confirm</div></div></div>
    <div class="notice mt16">${ic('info')}<div><b>Demo tip:</b> switch to <b>Linh Trần (administrator)</b> to confirm this match, then come back.</div></div>
    <div class="row mt16"><button class="btn" data-act="showme" data-who="linh" data-go="admin/matching">${ic('swap', 'sm')}Switch to Linh</button><button class="btn ghost" data-act="cancelmatch" data-id="${m.id}">Cancel request</button></div></section>`;
  const intro = `<section class="card" style="max-width:860px"><div class="card-h"><h2>${ic('mail')}Introduction · ${fmt(m.intro)}</h2><span class="badge navy">${REV ? 'Automated' : 'Power Automate'}</span></div><div class="card-b">
    <div class="row mb16">${av(m.seeker)}${ic('link')}${av(m.buddy)}<div class="small muted">${esc(name(m.seeker))} and ${esc(name(m.buddy))}</div></div>
    <p>Hi ${first(m.seeker)} and ${first(m.buddy)}, meet each other! ${first(m.buddy)} has been in Hanoi for ${b.years} years and offered to help with ${b.helpTopics.join(', ').toLowerCase() || 'settling in'}. ${REV && isPre() ? 'A short video call before ' + first(m.seeker) + ' arrives is a great start.' : 'A coffee on campus this week is a great start.'}</p>
    <div class="row wrap"><button class="btn primary sm" data-act="contact" data-id="${b.id}">${ic('chat', 'sm')}Message ${esc(first(b.id))}</button><button class="btn sm" data-act="person" data-id="${b.id}">View profile</button></div></div></section>`;
  if (m.status === 'introduced') return intro + `<section class="card card-pad mt16" style="max-width:860px"><div class="row between wrap"><div><b>Check-in scheduled for ${fmt(m.checkin)}</b><div class="small muted">We’ll ask how it’s going, and you can ask for a different match.</div></div><button class="btn" data-act="skipahead" data-id="${m.id}">${ic('clock', 'sm')}Demo: skip ahead 3 weeks</button></div></section>`;
  if (m.status === 'checkin_due') return `<section class="card mb16" style="max-width:860px;border-color:var(--navy-500)"><div class="card-h"><h2>${ic('help')}How’s it going with ${esc(first(b.id))}?</h2><span class="badge navy">Check-in</span></div><div class="card-b"><p class="small muted">Only Faculty Affairs sees your answer.</p><div class="row wrap"><button class="btn primary" data-act="checkin" data-id="${m.id}" data-v="well">Going well</button><button class="btn" data-act="checkin" data-id="${m.id}" data-v="notyet">We haven’t connected yet</button><button class="btn" data-act="checkin" data-id="${m.id}" data-v="rematch">${ic('refresh', 'sm')}I’d like a different match</button></div></div></section>` + intro;
  return `<div class="notice green mb16" style="max-width:860px">${ic('check')}<div>Check-in done: <b>${esc(m.checkinResult || 'Going well')}</b>. ${esc(first(b.id))} stays your buddy for as long as you both like.</div></div>` + intro;
}
function buddyView(p) {
  const mine = S.matches.filter(m => m.buddy === p.id && ACTIVE_M.includes(m.status));
  const pending = S.matches.filter(m => m.buddy === p.id && m.status === 'requested');
  return pageHead(REV ? 'Buddy programme' : 'New Faculty Match', 'Volunteer as a buddy for colleagues who are new to Hanoi.', ref(6))
    + `<div class="split"><div class="stack">
    <section class="card"><div class="card-h"><h2>${ic('link')}Your buddies</h2><span class="small muted">${load_(p.id)} of ${p.buddy.max} places used</span></div><div class="card-b">
      ${mine.map(m => `<div class="list-item">${av(m.seeker)}<div class="li-main"><span class="li-title">${esc(name(m.seeker))}</span><span class="li-sub">${person(m.seeker).college} · introduced ${fmt(m.intro)} · ${m.status === 'checkin_due' ? 'check-in due ' + fmt(m.checkin) : m.checkinResult ? 'check-in: ' + m.checkinResult : 'check-in ' + fmt(m.checkin)}</span></div><button class="btn sm" data-act="contact" data-id="${m.seeker}">${ic('chat', 'sm')}Message</button></div>`).join('') || '<div class="muted small">No current buddies.</div>'}
      ${pending.length ? `<div class="hr"></div><div class="small muted mb8">Requested, waiting for ${REV ? 'the coordinator' : 'admin confirmation'}</div>${pending.map(m => `<div class="list-item">${av(m.seeker)}<div class="li-main"><span class="li-title">${esc(name(m.seeker))}</span><span class="li-sub">Asked for you ${ago(m.created)}</span></div></div>`).join('')}` : ''}
    </div></section>
    <section class="card"><div class="card-h"><h2>${ic('users')}Newcomers who might like your help</h2></div><div class="card-b">${S.faculty.filter(f => f.isNew && !currentMatch(f.id)).map(f => { const s = scoreFor(f.id, p); return `<div class="list-item">${av(f.id)}<div class="li-main"><span class="li-title">${esc(name(f.id))}</span><span class="li-sub">${f.college} · ${f.preArrival ? 'arriving ' + fmtShort(f.joined) : 'joined ' + ago(f.joined)} · wants help with ${f.wantsHelp.join(', ').toLowerCase()}</span></div><span class="badge navy">${s.pct}%</span></div>`; }).join('') || '<div class="muted small">Every newcomer has a buddy.</div>'}</div></section>
  </div>
  <aside class="card card-pad"><b>Your availability</b><label class="row mt12"><span class="toggle"><input type="checkbox" data-change="buddyavail" ${p.buddy.available ? 'checked' : ''}><span></span></span><span class="small">Available as a buddy</span></label>
    <p class="small muted mt12">You can take up to <b>${p.buddy.max}</b> at a time (change this on your profile). When you’re full, you stop appearing in suggestions, so the same helpful people don’t get every match.</p>
    <div class="hr"></div><b class="small">What a buddy does</b><ul class="small mt8"><li>A first coffee or video call</li><li>Answer “where do I…” questions for the first couple of months</li><li>Invite them to one community event</li></ul></aside></div>`;
}

/* ---------- Living in Hanoi (§3) ---------- */
PAGES.living = arg => {
  const tabs = REV ? `<div class="tabs"><a href="#/living" class="${arg !== 'recs' ? 'on' : ''}">${ic('book', 'sm')}Guides</a><a href="#/living/recs" class="${arg === 'recs' ? 'on' : ''}">${ic('star', 'sm')}Faculty recommendations</a></div>` : '';
  if (REV && arg === 'recs') return pageHead('Living in Hanoi', 'Practical guides, and dated recommendations from colleagues.') + tabs + recsBody();
  const cats = [...new Set(S.guides.map(g => g.cat))];
  const list = S.guides.filter(g => !S.guideCat || g.cat === S.guideCat);
  return pageHead('Living in Hanoi', 'Curated guides for the practical side of moving here. Official information is clearly marked and kept apart from peer advice.', `${ref(3)} ${ref(7, 'official vs peer')} ${tech('SharePoint')}`) + `<div class="banner ph-fountain mb16"><span>VinUniversity campus, Gia Lâm, Hanoi</span></div>` + tabs
    + `<div class="chips mb16"><span class="chip ${!S.guideCat ? 'on' : ''}" data-act="guidecat" data-v="">All</span>${cats.map(c => `<span class="chip ${S.guideCat === c ? 'on' : ''}" data-act="guidecat" data-v="${esc(c)}">${esc(c)}</span>`).join('')}</div>
    <div class="grid g-auto">${list.map(g => { const due = D(g.next) <= TODAY; return `<a class="card guide-card" href="#/guide/${g.id}"><div class="row between">${sourceBadge(g)}<span class="tiny muted">${g.mins} min</span></div><h3>${esc(g.title)}</h3><p class="small muted" style="margin:0">${esc(g.summary)}</p><div class="row between mt8"><span class="tag">${esc(g.cat)}</span><span class="tiny ${due ? '' : 'muted'}" style="${due ? 'color:var(--amber);font-weight:600' : ''}">${due ? 'Review overdue' : 'Reviewed ' + fmt(g.reviewed)}</span></div></a>`; }).join('')}</div>`;
};
PAGES.guide = id => {
  const g = S.guides.find(x => x.id === id); if (!g) return PAGES.living('');
  if (!S.readGuides.includes(id)) S.readGuides.push(id);
  const due = D(g.next) <= TODAY;
  const related = S.threads.filter(t => TOPIC_FORUM[g.cat] === t.forum).slice(0, 3);
  return pageHead(esc(g.title), esc(g.summary), '', `<a href="#/living">Living in Hanoi</a>${ic('chev', 'sm')}${esc(g.cat)}`)
    + `<div class="split"><article class="card card-pad article">
      <div class="row wrap mb12">${sourceBadge(g)}<span class="small muted">Owner: ${esc(name(g.owner))} · Reviewed ${fmt(g.reviewed)}</span>${due ? `<span class="badge amber">${ic('clock', 'sm')}Review overdue since ${fmt(g.next)}</span>` : ''}</div>
      ${g.source === 'faculty' ? `<div class="notice gold">${ic('info')}<div>Written by faculty from their own experience. It is not official VinUniversity guidance. ${g.cat === 'Housing' ? 'Mentions of realtors are not endorsements.' : ''}</div></div>` : `<div class="notice">${ic('shield')}<div>Official information maintained by ${esc(name(g.owner))}. Sample content for this demo.</div></div>`}
      ${g.sections.map((s, i) => `<h2 id="s${i}">${esc(s.h)}</h2>${s.body}`).join('')}
      <div class="hr"></div><div class="row wrap between"><span class="small muted">Was this useful?</span><div class="row"><button class="btn sm" data-act="helpful">${ic('check', 'sm')}Yes</button><button class="btn sm" data-act="outdated" data-kind="guide" data-id="${g.id}">${ic('flag', 'sm')}Report outdated info</button></div></div>
    </article>
    <aside class="stack"><section class="card card-pad toc"><b>On this page</b><div class="mt8">${g.sections.map((s, i) => `<a href="javascript:void 0" data-act="scrollto" data-id="s${i}">${esc(s.h)}</a>`).join('')}</div></section>
      ${related.length ? `<section class="card card-pad"><b>Related conversations</b><div class="mt8">${related.map(threadItem).join('')}</div></section>` : ''}</aside></div>`;
};

/* ---------- Recommendations (§3) ---------- */
PAGES.recs = () => pageHead('Recommendations', 'Services and places colleagues have used, with dates so you can tell whether they’re still current.', `${ref(3)} ${ref(7, 'review dates')}`) + recsBody();
function recsBody() {
  const cats = [...new Set(S.recs.map(r => r.cat))];
  const list = S.recs.filter(r => !S.recCat || r.cat === S.recCat).sort((a, b) => b.date.localeCompare(a.date));
  return `<div class="row between wrap mb16"><div class="chips"><span class="chip ${!S.recCat ? 'on' : ''}" data-act="reccat" data-v="">All</span>${cats.map(c => `<span class="chip ${S.recCat === c ? 'on' : ''}" data-act="reccat" data-v="${esc(c)}">${esc(c)}</span>`).join('')}</div>
    <button class="btn primary" data-act="addrec">${ic('plus', 'sm')}Add a recommendation</button></div>
    <div class="row wrap small muted mb16" style="gap:16px"><span class="fresh current"><i></i>Confirmed in the last 6 months</span><span class="fresh due"><i></i>6–12 months: review due</span><span class="fresh old"><i></i>Over a year: likely outdated</span></div>
    <div class="grid g-auto">${list.map(r => `<article class="card rec"><div class="row between"><span class="tag">${esc(r.cat)}</span>${freshBadge(r.date)}</div><h3>${esc(r.name)}</h3><p class="small" style="margin:0">${esc(r.notes)}</p>
      <div class="row small muted">${av(r.by, 'sm')}<span>${esc(name(r.by))} · last confirmed ${fmt(r.date)} · ${r.confirms} ${r.confirms === 1 ? 'person agrees' : 'people agree'}</span></div>
      ${r.commercial ? `<div class="tiny muted">${ic('info', 'sm')} Faculty recommendation, not a VinUniversity endorsement.</div>` : ''}${r.finance ? `<div class="tiny muted">${ic('info', 'sm')} Not financial advice.</div>` : ''}
      <div class="row wrap mt8"><button class="btn sm" data-act="confirmrec" data-id="${r.id}">${ic('check', 'sm')}Still accurate</button><button class="btn ghost sm" data-act="outdated" data-kind="rec" data-id="${r.id}">${ic('flag', 'sm')}Outdated?</button></div></article>`).join('')}</div>`;
}

/* ---------- Forums (proposal §5) ---------- */
PAGES.forums = () => pageHead('Forums & Communities', 'Topic spaces for asking questions, recommending providers and organising activities.', `${ref(5)} ${tech('Teams channels')}`)
  + `<div class="grid g-auto">${S.forums.filter(f => !f.archived).map(f => {
    const ts = S.threads.filter(t => t.forum === f.id), replies = ts.reduce((a, t) => a + t.replies.length, 0);
    const last = ts.map(lastActivity).sort().pop();
    return f.future ? `<div class="card forum-card" style="opacity:.6"><div class="row between"><span class="forum-ico">${ic(f.icon)}</span><span class="badge">Future</span></div><h3>${esc(f.name)}</h3><p class="small muted" style="margin:0">${esc(f.desc)}</p><div class="fc-stats">${phase(3)}</div></div>`
      : `<a class="card forum-card" href="#/forum/${f.id}"><div class="row between"><span class="forum-ico">${ic(f.icon || 'message')}</span>${f.disclaimer ? `<span class="badge amber" title="${esc(f.disclaimer)}">${ic('info', 'sm')}Disclaimer</span>` : ''}</div><h3>${esc(f.name)}</h3><p class="small muted" style="margin:0">${esc(f.desc)}</p>
      <div class="fc-stats"><span>${ts.length} threads</span><span>${replies} replies</span><span>${last ? ago(last) : 'no posts yet'}</span>${f.mod ? `<span style="margin-left:auto" title="Moderator: ${esc(name(f.mod))}">${av(f.mod, 'sm')}</span>` : ''}</div></a>`;
  }).join('')}</div>`;
PAGES.forum = id => {
  const f = forum(id);
  const ts = S.threads.filter(t => t.forum === id).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || lastActivity(b).localeCompare(lastActivity(a)));
  return pageHead(esc(f.name), esc(f.desc), `<button class="btn primary" data-act="newpost" data-forum="${id}">${ic('plus', 'sm')}New post</button>`, `<a href="#/forums">Forums</a>${ic('chev', 'sm')}${esc(f.short)}`)
    + (f.disclaimer ? `<div class="notice warn mb16">${ic('info')}<div>${esc(f.disclaimer)}</div></div>` : '')
    + `<div class="row small muted mb12">${f.mod ? `${av(f.mod, 'sm')} Moderated by ${esc(name(f.mod))}` : 'No moderator assigned'} · ${helpersFor(id).length} faculty list this as a help topic</div>
    <section class="card">${ts.map(threadRow).join('') || '<div class="empty">No posts yet. Be the first!</div>'}</section>`;
};
function threadRow(t) {
  return `<a class="thread-row" href="#/thread/${t.id}">${av(t.author)}<div style="min-width:0;flex:1"><div class="tr-title">${t.pinned ? `<span class="badge navy" style="margin-right:6px">${ic('pin', 'sm')}Pinned</span>` : ''}${esc(t.title)}</div>
    <div class="tr-meta"><span>${esc(name(t.author))}</span>${person(t.author).guest ? '<span class="badge">Guest</span>' : ''}<span>· ${ago(t.date)}</span>${REV ? `<span class="tag">${esc(tagLabel(t.forum))}</span>` : ''}${t.source ? `<span class="badge gold">${ic('chat', 'sm')}Saved from Zalo group</span>` : ''}${!t.replies.length ? '<span class="badge red">Unanswered</span>' : ''}</div></div>
    <div class="tr-replies"><b>${t.replies.length}</b><span>replies</span></div></a>`;
}
PAGES.thread = id => {
  const t = S.threads.find(x => x.id === id); if (!t) return REV ? PAGES.qa() : PAGES.forums();
  const f = forum(t.forum);
  const canMod = isAdmin() || (person(S.role).moderator || []).includes(t.forum);
  const crumbs = REV ? `<a href="#/qa">Ask & Discuss</a>${ic('chev', 'sm')}<a href="javascript:void 0" data-act="qatag" data-v="${t.forum}">${esc(tagLabel(t.forum))}</a>` : `<a href="#/forums">Forums</a>${ic('chev', 'sm')}<a href="#/forum/${f.id}">${esc(f.short)}</a>`;
  const post = (x, i, op) => `<div class="post ${op ? 'op' : ''}">${av(x.author)}<div class="post-body"><div class="post-meta"><b>${esc(name(x.author))}</b><span class="muted">${esc(person(x.author).title || '')}</span>${person(x.author).guest ? '<span class="badge">Guest</span>' : ''}${(person(x.author).moderator || []).includes(t.forum) ? '<span class="badge navy">Moderator</span>' : ''}<span class="muted">· ${fmt(x.date)}</span></div><div style="white-space:pre-wrap">${esc(x.body)}</div>
    <div class="post-actions"><button class="btn ghost sm" data-act="helpful">${ic('check', 'sm')}Helpful</button><button class="btn ghost sm" data-act="report" data-id="${t.id}" data-i="${i}">${ic('flag', 'sm')}Report</button></div></div></div>`;
  const healthLink = t.forum === 'health' ? `<div class="notice mb16">${ic('shield')}<div>Official benefits information: <a href="#/guide/g5">Health insurance and dependants (HR)</a>. Peer replies below are personal experience.</div></div>` : '';
  return pageHead(esc(t.title), '', canMod ? `<button class="btn sm" data-act="pin" data-id="${t.id}">${ic('pin', 'sm')}${t.pinned ? 'Unpin' : 'Pin'}</button>` : '', crumbs)
    + (f.disclaimer ? `<div class="notice warn mb16">${ic('info')}<div>${esc(f.disclaimer)}</div></div>` : '') + healthLink
    + (t.source ? `<div class="notice gold mb16">${ic('chat')}<div>Saved from the Faculty Zalo group by a moderator, with the author’s permission, so it can be found later. ${chg(4)}</div></div>` : '')
    + `<div class="split"><div><section class="card">${post(t, -1, true)}${t.replies.map((r, i) => post(r, i)).join('')}</section>
    <form class="card card-pad mt16" data-form="reply" data-id="${t.id}"><div class="field" style="margin:0"><label for="replybox">Your reply</label><textarea class="input" id="replybox" name="body" placeholder="Share what worked for you…" required></textarea></div><div class="row between mt12"><span class="small muted">${isPartner() ? 'Posting as a guest' : 'Visible to all community members'}</span><button class="btn primary" type="submit">${ic('send', 'sm')}Reply</button></div></form></div>
    <aside class="stack"><section class="card card-pad"><b>${REV ? 'Topic' : 'Forum'}</b><div class="mt8 small">${esc(f.name)}</div>${f.mod ? `<div class="row small mt12">${av(f.mod, 'sm')}Moderator: ${esc(name(f.mod))}</div>` : ''}</section>
    ${!isPartner() ? `<section class="card card-pad"><b>People who can help</b><div class="mt8">${helpersFor(t.forum).slice(0, 4).map(h => `<a class="list-item" href="javascript:void 0" data-act="person" data-id="${h.id}">${av(h.id, 'sm')}<div class="li-main"><span class="li-title">${esc(name(h.id))}</span><span class="li-sub">${esc(h.helpTopics.filter(x => TOPIC_FORUM[x] === t.forum).join(', '))}</span></div></a>`).join('') || '<div class="small muted">No one yet.</div>'}</div></section>` : ''}</aside></div>`;
};

/* ---------- Ask the Community (proposal §3) ---------- */
PAGES.ask = () => pageHead('Ask the Community', 'Post a question and we’ll send it to the right group, instead of emailing the whole faculty.', `${ref(3)} ${phase(1)}`)
  + `<div class="split"><form class="card card-pad" data-form="ask">
    <div class="field"><label for="ask-t">Your question</label><input class="input" id="ask-t" name="title" data-input="askroute" placeholder="e.g. Which schools near Ocean Park take mid-year admissions?" required></div>
    <div class="field"><label for="ask-b">Details <span class="badge">Optional</span></label><textarea class="input" id="ask-b" name="body" data-input="askroute" placeholder="Ages, budget, timing… whatever helps people answer."></textarea></div>
    <div id="ask-route">${askRoute('')}</div>
    <button class="btn primary mt12" type="submit">${ic('send', 'sm')}Post question</button></form>
    <aside class="card card-pad"><b>How routing works</b><ol class="small mt8" style="padding-left:1.2em"><li>We read your question and suggest the best forum.</li><li>The faculty who list that topic under “I can help with” get a notification.</li><li>If no one answers in 48 hours, the forum moderator is alerted. ${phase(2)}</li></ol><div class="hr"></div><b class="small">Recently asked</b>${[...S.threads].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(threadItem).join('')}</aside></div>`;
function askRoute(text, chosen) {
  const r = routeQuestion(text), f = chosen || r.forum, helpers = helpersFor(f);
  const opts = REV ? [...activeForums(), PARTNER_TAG] : activeForums();
  return `<div class="notice ${r.confident || chosen ? 'green' : ''}">${ic(r.confident ? 'sparkle' : 'info')}<div style="flex:1"><div class="row wrap"><b>${REV ? 'Topic:' : 'Best place:'}</b><select class="input" name="forum" data-change="askforum" style="width:auto;padding:4px 8px">${opts.map(o => `<option value="${o.id}" ${o.id === f ? 'selected' : ''}>${esc(REV ? o.short : o.name)}</option>`).join('')}</select></div>
    <div class="small mt8">${helpers.length ? `<span class="av-stack" style="display:inline-flex;vertical-align:middle;margin-right:6px">${helpers.slice(0, 5).map(h => av(h.id, 'sm')).join('')}</span>${helpers.length} ${helpers.length === 1 ? 'colleague lists' : 'colleagues list'} this as a help topic and will be notified.` : 'The moderator will be notified.'}</div></div></div>`;
}

/* ---------- Ask & Discuss (revised) ---------- */
PAGES.qa = () => {
  const tags = [...activeForums(), PARTNER_TAG];
  let list = S.threads.filter(t => !S.qaTag || t.forum === S.qaTag);
  if (S.qaSort === 'unanswered') list = list.filter(t => !t.replies.length);
  list.sort((a, b) => S.qaSort === 'top' ? b.replies.length - a.replies.length : lastActivity(b).localeCompare(lastActivity(a)));
  return pageHead('Ask & Discuss', 'One place for every question and conversation. Tags keep it organised, so a small community stays busy instead of spread across empty forums.', `${chg(3)} ${chg(4)}`)
    + `<form class="card card-pad mb16 chg-box" data-form="ask"><div class="row" style="align-items:flex-start;gap:14px">${av(S.role)}<div style="flex:1;min-width:0">
      <input class="input" name="title" data-input="askroute" placeholder="Ask a question or start a conversation…" required aria-label="Question">
      <textarea class="input mt8" name="body" data-input="askroute" placeholder="Details (optional)" style="min-height:64px"></textarea>
      <div id="ask-route" class="mt8">${askRoute('')}</div>
      <div class="row between mt12"><span class="small muted">${isPartner() ? 'Posting as a guest' : 'Visible to faculty and partner guests'}</span><button class="btn primary" type="submit">${ic('send', 'sm')}Post</button></div></div></div></form>
    <div class="row between wrap mb12"><div class="chips"><span class="chip ${!S.qaTag ? 'on' : ''}" data-act="qatag" data-v="">All</span>${tags.map(t => `<span class="chip ${S.qaTag === t.id ? 'on' : ''}" data-act="qatag" data-v="${t.id}">${esc(t.short)} <span class="tiny" style="opacity:.7">${threadCount(t.id)}</span></span>`).join('')}</div>
    <div class="seg">${[['latest', 'Latest'], ['unanswered', 'Unanswered'], ['top', 'Most replies']].map(([v, l]) => `<button class="${S.qaSort === v ? 'on' : ''}" data-act="qasort" data-v="${v}">${l}</button>`).join('')}</div></div>
    <section class="card">${list.map(threadRow).join('') || '<div class="empty">Nothing here yet.</div>'}</section>`;
};

/* ---------- Events (§3) ---------- */
PAGES.events = () => {
  const cats = [...new Set(S.events.map(e => e.cat))];
  return pageHead(REV ? 'Events' : 'Events & Activities', 'Social, cultural, sports, family and weekend activities, organised by faculty and by the university.', `${ref(3)} <button class="btn primary" data-act="newevent">${ic('plus', 'sm')}Create event</button>`)
    + `<div class="row between wrap mb16"><div class="seg">${[['calendar', 'Calendar'], ['list', 'List']].map(([v, l]) => `<button class="${S.evView === v ? 'on' : ''}" data-act="evview" data-v="${v}">${l}</button>`).join('')}</div>
    <div class="chips"><span class="chip ${!S.evCat ? 'on' : ''}" data-act="evcat" data-v="">All</span>${cats.map(c => `<span class="chip ${S.evCat === c ? 'on' : ''}" data-act="evcat" data-v="${c}">${c}</span>`).join('')}</div></div>`
    + (S.evView === 'calendar' ? calendar() : `<section class="card"><div class="card-b">${upcomingEvents(60, e => !S.evCat || e.cat === S.evCat).map(e => `<div class="list-item">${dateTile(e.date)}<div class="li-main"><span class="li-title">${esc(e.title)}</span><span class="li-sub">${fmtShort(e.date)} · ${e.time} · ${esc(e.loc)} · by ${esc(name(e.by))}${e.weekly ? ' · weekly' : ''}</span></div>${e.official ? '<span class="badge red">Official</span>' : `<span class="tag">${e.cat}</span>`}${e.going.includes(S.role) ? '<span class="badge green">Going</span>' : ''}<button class="btn sm" data-act="event" data-id="${e.id}">Details</button></div>`).join('')}</div></section>`);
};
function calendar() {
  const { y, m } = S.cal, firstDay = new Date(y, m, 1), start = new Date(firstDay); start.setDate(1 - ((firstDay.getDay() + 6) % 7));
  const evs = expandEvents(iso(start), iso(new Date(y, m + 1, 7))).filter(e => !S.evCat || e.cat === S.evCat);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i); const k = iso(d);
    if (i >= 35 && d.getMonth() !== m) break;
    cells.push(`<div class="day ${d.getMonth() !== m ? 'out' : ''} ${k === TODAY_ISO ? 'today' : ''}"><span class="dn">${d.getDate()}</span>${evs.filter(e => e.date === k).map(e => `<span class="ev ${e.official ? 'official' : e.cat}" data-act="event" data-id="${e.id}" title="${esc(e.title)}">${e.time} ${esc(e.title)}</span>`).join('')}</div>`);
  }
  return `<section class="card"><div class="card-h"><button class="icon-btn" data-act="calnav" data-v="-1" aria-label="Previous month">${ic('back')}</button><h2 style="font-family:var(--serif);font-size:20px">${MONTH[m]} ${y}</h2><button class="icon-btn" data-act="calnav" data-v="1" aria-label="Next month">${ic('chev')}</button></div>
    <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="dow">${d}</div>`).join('')}${cells.join('')}</div></section>`;
}
function eventModal(id) {
  const e = S.events.find(x => x.id === id), going = e.going.includes(S.role);
  return modalShell(esc(e.title), `<div class="row wrap mb12">${e.official ? '<span class="badge red">Official · VinUniversity</span>' : `<span class="tag">${e.cat}</span>`}${e.weekly ? '<span class="badge navy">Weekly</span>' : ''}${REV && partnerFriendly(e) ? `<span class="badge gold">Partners & families welcome ${chg(2)}</span>` : ''}</div>
    <dl class="kv"><dt>When</dt><dd>${fmtShort(e.date)} ${D(e.date).getFullYear()} · ${e.time}${e.weekly ? ' (and every week)' : ''}</dd><dt>Where</dt><dd>${esc(e.loc)}</dd><dt>Organiser</dt><dd class="row">${av(e.by, 'sm')}${esc(name(e.by))}</dd></dl>
    <p class="mt16">${esc(e.desc)}</p>
    <div class="cap mt16"><span>${e.going.length} going</span><div class="progress ${e.going.length >= e.cap ? 'red' : 'green'}"><i style="width:${Math.min(100, e.going.length / e.cap * 100)}%"></i></div><span>${e.cap} places</span></div>
    <div class="av-stack mt12">${e.going.slice(0, 12).map(g => av(g, 'sm')).join('')}</div>`,
    `<button class="btn" disabled title="Calendar integration is Phase 3">${ic('calendar', 'sm')}Add to Outlook</button> ${S.annotate ? phase(3) : ''}<button class="btn ${going ? '' : 'primary'}" data-act="rsvp" data-id="${e.id}">${going ? 'Cancel RSVP' : (e.going.length >= e.cap ? 'Join waitlist' : 'I’m going')}</button>`);
}

/* ==================================================================
   ADMIN
================================================================== */
PAGES.admin = tab => {
  tab = tab || 'overview';
  const t = ADMIN_TABS().find(x => x[0] === tab) || ADMIN_TABS()[0];
  const body = ({ overview: aOverview, matching: aMatching, moderation: aModeration, content: aContent, config: aConfig, users: aUsers, consent: aConsent, automations: aAutomations, architecture: aArchitecture, audit: aAudit }[t[0]] || aOverview)();
  return pageHead(t[1], '', '', 'Administration') + `<div class="tabs">${ADMIN_TABS().map(([k, l, i]) => `<a href="#/admin/${k}" class="${k === t[0] ? 'on' : ''}">${ic(i, 'sm')}${l}</a>`).join('')}</div>` + body;
};
function kpis() {
  const c = adminCounts();
  const items = [
    ['New users (30 days)', S.faculty.filter(f => (TODAY - D(f.joined)) / 864e5 <= 30 && D(f.joined) <= TODAY).length, 'Joined since 15 Sep', 'users'],
    ['Incomplete profiles', S.faculty.filter(f => f.complete < 70).length, 'Under 70% complete', 'user', true],
    ['Unanswered questions', S.threads.filter(t => !t.replies.length).length, 'No reply yet', 'help', true],
    [REV ? 'Active topics' : 'Active groups', (REV ? [...activeForums(), PARTNER_TAG] : activeForums()).filter(f => S.threads.some(t => t.forum === f.id && monthsSince(lastActivity(t)) < 1)).length, 'Posts in the last 30 days', 'message'],
    ['Upcoming events', upcomingEvents(100, e => e.date <= addDays(TODAY_ISO, 30)).length, 'Next 30 days', 'calendar'],
    ['Matching requests', c.matching, 'Waiting for confirmation', 'link', c.matching > 0],
  ];
  return `<div class="grid g3 mb16" style="grid-template-columns:repeat(auto-fill,minmax(155px,1fr))">${items.map(([l, v, s, i, al]) => `<div class="card kpi ${al && v ? 'alert' : ''}"><div class="k-l">${ic(i, 'sm')}${l}</div><div class="k-v">${v}</div><div class="k-s">${s}</div></div>`).join('')}</div>`;
}
function wauChart() {
  const W = 560, H = 180, P = 28, max = 80, bw = (W - P * 2) / WAU.length;
  const bars = WAU.map((v, i) => { const h = (v / max) * (H - P * 2); return `<rect x="${P + i * bw + 4}" y="${H - P - h}" width="${bw - 8}" height="${h}" rx="3" fill="${i === WAU.length - 1 ? 'var(--red)' : 'var(--navy-700)'}"><title>Week ${i + 1}: ${v}</title></rect>${i === WAU.length - 1 ? `<text x="${P + i * bw + bw / 2}" y="${H - P - h - 6}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${v}</text>` : ''}`; }).join('');
  const grid = [0, 20, 40, 60, 80].map(v => { const y = H - P - (v / max) * (H - P * 2); return `<line x1="${P}" x2="${W - P}" y1="${y}" y2="${y}" stroke="var(--line-2)"/><text x="${P - 6}" y="${y + 4}" text-anchor="end">${v}</text>`; }).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly active users over 12 weeks">${grid}${bars}<text x="${P}" y="${H - 8}">12 weeks ago</text><text x="${W - P}" y="${H - 8}" text-anchor="end">this week</text></svg></div>`;
}
function topicBars() {
  const ids = REV ? [...activeForums(), PARTNER_TAG] : activeForums();
  const rows = ids.map(f => [f.short, S.threads.filter(t => t.forum === f.id).reduce((a, t) => a + 1 + t.replies.length, 0)]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map(r => r[1]), 1);
  return rows.map(([l, v]) => `<div class="hbar"><span class="small">${esc(l)}</span><div class="progress"><i style="width:${v / max * 100}%"></i></div><b class="small">${v}</b></div>`).join('');
}
function aOverview() {
  const metrics = REV ? (() => {
    const newHires = S.faculty.filter(f => f.isNew), withBuddy = newHires.filter(f => { const m = currentMatch(f.id); return m && ACTIVE_M.includes(m.status); });
    const pct = Math.round(withBuddy.length / newHires.length * 100);
    const M = [
      ['New hires with a buddy before arrival', `${pct}%`, 'Target 80%', pct / 80, `${withBuddy.length} of ${newHires.length} new hires this term`],
      ['Median time to first answer', '5.2 h', 'Target under 24 h', 1, 'Across 31 questions this term'],
      ['New faculty who feel settled at 8 weeks', '4.3 / 5', 'Target 4.0', 1, 'Short survey · 6 responses'],
      ['International faculty active weekly', `${Math.round(WAU[WAU.length - 1] / 160 * 100)}%`, 'Target 40%', 1, `${WAU[WAU.length - 1]} of about 160`],
    ];
    return `<section class="chg-box card card-pad mb16"><div class="row between wrap mb12"><h2 style="font-family:var(--serif);font-size:22px;color:var(--navy-900);font-weight:600">Is the pilot working?</h2>${chg(8, false)}</div>
      <div class="grid g4">${M.map(([l, v, t, r, s]) => `<div class="card metric"><div class="m-top"><span class="m-v">${v}</span><span class="badge ${r >= 1 ? 'green' : 'amber'}">${r >= 1 ? 'On track' : 'Below target'}</span></div><div class="m-l">${l}</div><div class="m-t">${t} · ${s}</div></div>`).join('')}</div>
      <p class="small muted mt12" style="margin-bottom:0">Decision point at the end of the semester: expand, adjust or stop.</p></section>`;
  })() : '';
  return metrics + `<div class="row between mb12"><h2 style="font-size:16px">${REV ? 'Operations' : 'Dashboard'} ${ref(7, 'admin dashboard')}</h2>${REV ? '' : tech('Power BI (optional)')}</div>` + kpis()
    + `<div class="grid g2"><section class="card"><div class="card-h"><h2>${ic('activity')}Weekly active users</h2><span class="small muted">last 12 weeks</span></div><div class="card-b">${wauChart()}</div></section>
    <section class="card"><div class="card-h"><h2>${ic('message')}Posts and replies by ${REV ? 'topic' : 'forum'}</h2></div><div class="card-b">${topicBars()}</div></section></div>
    <section class="card mt16"><div class="card-h"><h2>${ic('user')}Incomplete profiles</h2><button class="btn sm" data-act="nudgeprofiles">${ic('zap', 'sm')}Send reminder to all</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>College</th><th>Complete</th><th>Joined</th></tr></thead><tbody>${S.faculty.filter(f => f.complete < 70).map(f => `<tr><td><div class="row">${av(f.id, 'sm')}${esc(name(f.id))}</div></td><td>${f.college}</td><td style="min-width:140px"><div class="row"><div class="progress" style="flex:1"><i style="width:${f.complete}%"></i></div><span class="small">${f.complete}%</span></div></td><td class="small muted">${fmt(f.joined)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function aMatching() {
  const reqs = S.matches.filter(m => m.status === 'requested'), active = S.matches.filter(m => ACTIVE_M.includes(m.status));
  const buddies = S.faculty.filter(f => f.buddy.available).map(f => [f, load_(f.id)]).sort((a, b) => b[1] / b[0].buddy.max - a[1] / a[0].buddy.max);
  return `${REV ? `<div class="notice gold mb16">${ic('info')}<div>In the pilot, the coordinator makes every match by hand. Scores are only suggestions, and the newcomer is asked before anything is confirmed. ${chg(5)}</div></div>` : `<div class="notice mb16">${ic('info')}<div>Rules-based matching ${ref(6)}: the system suggests, and an administrator (or the user) confirms. ${phase(2)}</div></div>`}
    <section class="card mb16"><div class="card-h"><h2>${ic('link')}Requests waiting (${reqs.length})</h2></div>${reqs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>New faculty</th><th>Requested buddy</th><th>Score</th><th>Buddy load</th><th>Requested</th><th></th></tr></thead><tbody>
      ${reqs.map(m => { const s = scoreFor(m.seeker, person(m.buddy)); return `<tr><td><div class="row">${av(m.seeker, 'sm')}<div><div class="strong small">${esc(name(m.seeker))}</div><div class="tiny muted">${person(m.seeker).college} · wants ${person(m.seeker).wantsHelp.join(', ').toLowerCase()}</div></div></div></td><td><div class="row">${av(m.buddy, 'sm')}<span class="small">${esc(name(m.buddy))}</span></div></td><td><span class="badge navy">${s.pct}%</span></td><td class="small">${s.load} / ${s.max}${s.full ? ' <span class="badge red">full</span>' : ''}</td><td class="small muted">${ago(m.created)}</td>
      <td><div class="row"><button class="btn primary sm" data-act="approve" data-id="${m.id}">${ic('check', 'sm')}Confirm</button><button class="btn sm" data-act="altmatch" data-id="${m.id}">Choose another</button><button class="btn ghost sm" data-act="decline" data-id="${m.id}">Decline</button></div></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty">No requests waiting.</div>'}</section>
    <div class="grid g2"><section class="card"><div class="card-h"><h2>${ic('users')}Active matches</h2></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pair</th><th>Status</th><th>Check-in</th></tr></thead><tbody>${active.map(m => `<tr><td><div class="row">${av(m.seeker, 'sm')}${ic('link', 'sm')}${av(m.buddy, 'sm')}<span class="small">${esc(first(m.seeker))} + ${esc(first(m.buddy))}</span></div></td><td>${{ introduced: '<span class="badge navy">Introduced</span>', checkin_due: '<span class="badge amber">Check-in due</span>', active: '<span class="badge green">Active</span>' }[m.status]}</td><td class="small muted">${m.checkinResult ? esc(m.checkinResult) : fmt(m.checkin)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card"><div class="card-h"><h2>${ic('activity')}Buddy workload</h2><span class="small muted">${ref(6, 'workload')}</span></div><div class="card-b">${buddies.map(([f, l]) => `<div class="hbar"><span class="small">${esc(name(f.id))}</span><div class="progress ${l >= f.buddy.max ? 'red' : ''}"><i style="width:${l / f.buddy.max * 100}%"></i></div><b class="small">${l}/${f.buddy.max}</b></div>`).join('')}</div></section></div>`;
}
function aModeration() {
  const open = S.reports.filter(r => r.status === 'open'), unanswered = S.threads.filter(t => !t.replies.length);
  return `<section class="card mb16"><div class="card-h"><h2>${ic('flag')}Reported content (${open.length})</h2></div><div class="card-b">${open.map(r => { const t = S.threads.find(x => x.id === r.thread); return `<div class="list-item" style="align-items:flex-start"><span class="forum-ico">${ic('flag')}</span><div class="li-main"><span class="li-title">${esc(r.reason)}</span><span class="li-sub">In <a href="#/thread/${t.id}">${esc(t.title)}</a> · reported by ${esc(name(r.by))} ${ago(r.date)}</span><div class="small mt8" style="padding:8px 12px;background:var(--bg);border-radius:8px">${esc(r.excerpt)}</div></div><div class="row"><button class="btn sm" data-act="mod" data-id="${r.id}" data-v="keep">Keep</button><button class="btn red sm" data-act="mod" data-id="${r.id}" data-v="remove">Remove</button></div></div>`; }).join('') || '<div class="empty">Nothing reported.</div>'}</div></section>
    <section class="card mb16"><div class="card-h"><h2>${ic('help')}Unanswered questions</h2><span class="small muted">Alert after 48 hours ${phase(2)}</span></div><div class="card-b">${unanswered.map(t => `<div class="list-item">${av(t.author, 'sm')}<div class="li-main"><a class="li-title" href="#/thread/${t.id}">${esc(t.title)}</a><span class="li-sub">${esc(forum(t.forum).short)} · ${ago(t.date)} · ${helpersFor(t.forum).length} possible helpers</span></div><button class="btn sm" data-act="nudge" data-id="${t.id}">${ic('zap', 'sm')}Nudge helpers</button></div>`).join('') || '<div class="empty">Every question has an answer.</div>'}</div></section>
    <section class="card"><div class="card-h"><h2>${ic('chat')}Feedback from the feedback button</h2><span class="small muted">${ref(7)}</span></div><div class="card-b">${S.feedback.map((f, i) => `<div class="list-item">${av(f.by, 'sm')}<div class="li-main"><span class="li-title">${esc(f.kind)}</span><span class="li-sub">${esc(f.text)} · ${esc(name(f.by))}</span></div>${f.done ? '<span class="badge green">Handled</span>' : `<button class="btn sm" data-act="fbdone" data-i="${i}">Mark handled</button>`}</div>`).join('') || '<div class="empty small">No feedback yet. Try the Feedback button in the corner.</div>'}</div></section>`;
}
function aContent() {
  const rows = [
    ...S.guides.map(g => ({ kind: 'Guide', id: g.id, title: g.title, owner: g.owner, last: g.reviewed, state: D(g.next) <= TODAY ? 'old' : (D(g.next) - TODAY) / 864e5 < 45 ? 'due' : 'current', next: g.next })),
    ...S.recs.map(r => ({ kind: 'Recommendation', id: r.id, title: r.name, owner: r.by, last: r.date, state: freshness(r.date), next: addDays(r.date, 183) })),
  ].sort((a, b) => ({ old: 0, due: 1, current: 2 }[a.state] - { old: 0, due: 1, current: 2 }[b.state]) || a.next.localeCompare(b.next));
  const label = { old: ['red', 'Overdue'], due: ['amber', 'Due soon'], current: ['green', 'Current'] };
  return `<div class="notice mb16">${ic('clock')}<div>Housing, banking, schools, insurance and providers go stale fastest. Owners get a reminder on the review date; anything still overdue after 14 days lands here. ${ref(7)} ${phase(2)}</div></div>
    <section class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Owner</th><th>Last reviewed</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><div class="small strong">${esc(r.title)}</div><div class="tiny muted">${r.kind}</div></td><td><div class="row small">${av(r.owner, 'sm')}${esc(name(r.owner))}</div></td><td class="small">${fmt(r.last)}</td><td><span class="badge ${label[r.state][0]}">${label[r.state][1]}</span></td><td><div class="row"><button class="btn sm" data-act="reviewed" data-kind="${r.kind}" data-id="${r.id}">${ic('check', 'sm')}Mark reviewed</button>${r.kind === 'Recommendation' ? `<button class="btn ghost sm" data-act="archiverec" data-id="${r.id}">Archive</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></section>`;
}
function aConfig() {
  const forumsSection = REV ? `<section class="card mb16 chg-box"><div class="card-h"><h2>${ic('tag')}Topics</h2>${chg(3)}</div><div class="card-b">
      <p class="small muted">Everything starts as a tag in Ask & Discuss. When a topic gets more than <b>${S.promote}</b> posts a month, consider giving it its own space with a moderator.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Topic</th><th>Posts (30 days)</th><th>Moderator</th><th></th></tr></thead><tbody>${[...activeForums(), PARTNER_TAG].map(f => { const n = S.threads.filter(t => t.forum === f.id && monthsSince(lastActivity(t)) < 1).reduce((a, t) => a + 1 + t.replies.filter(r => monthsSince(r.date) < 1).length, 0); return `<tr><td class="strong small">${esc(f.short)}</td><td><div class="row"><div class="progress" style="width:120px"><i style="width:${Math.min(100, n / S.promote * 100)}%"></i></div><span class="small">${n}</span></div></td><td class="small">${f.mod ? esc(name(f.mod)) : '—'}</td><td>${n >= S.promote ? '<span class="badge green">Ready for its own space</span>' : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <form class="row wrap mt16" data-form="addforum"><input class="input" name="name" placeholder="New topic, e.g. Language exchange" style="max-width:300px" required><button class="btn primary">${ic('plus', 'sm')}Add topic</button></form></div></section>`
    : `<section class="card mb16"><div class="card-h"><h2>${ic('message')}Forum categories</h2><span class="small muted">A new forum is a configuration entry, not a programming project. ${ref(12)}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Forum</th><th>Moderator</th><th>Disclaimer</th><th>Threads</th><th>Active</th></tr></thead><tbody>${S.forums.map(f => `<tr><td class="small strong">${esc(f.name)}</td><td class="small">${f.mod ? esc(name(f.mod)) : '—'}</td><td>${f.disclaimer ? '<span class="badge amber">Yes</span>' : '<span class="small muted">No</span>'}</td><td class="small">${threadCount(f.id)}</td><td><label class="toggle"><input type="checkbox" data-change="forumactive" data-id="${f.id}" ${!f.future && !f.archived ? 'checked' : ''}><span></span></label></td></tr>`).join('')}</tbody></table></div>
      <form class="card-b" data-form="addforum" style="border-top:1px solid var(--line-2)"><b class="small">Add a category</b><div class="grid g3 mt8"><input class="input" name="name" placeholder="Name, e.g. Parents of toddlers" required><select class="input" name="mod"><option value="">Moderator…</option>${S.faculty.filter(f => !f.isNew).map(f => `<option value="${f.id}">${esc(name(f.id))}</option>`).join('')}</select><input class="input" name="disclaimer" placeholder="Disclaimer (optional)"></div><input class="input mt8" name="desc" placeholder="Short description"><button class="btn primary mt12">${ic('plus', 'sm')}Create category</button></form></section>`;
  return forumsSection + `<div class="grid g2"><section class="card"><div class="card-h"><h2>${ic('sliders')}Matching weights</h2><span class="small muted">${ref(12, 'configurable rules')}</span></div><div class="card-b">${FACTORS.map(f => `<div class="weight"><span>${esc(f.label)}</span><input type="range" min="0" max="5" step="1" value="${S.weights[f.key]}" data-change="weight" data-k="${f.key}" aria-label="${esc(f.label)}"><b>${S.weights[f.key]}</b></div>`).join('')}<p class="small muted mt8" style="margin:0">Changes apply to every suggestion straight away.</p></div></section>
    <div class="stack"><section class="card"><div class="card-h"><h2>${ic('tag')}Interest tags</h2></div><div class="card-b"><div class="chips">${S.tags.map(t => `<span class="chip">${esc(t)}<button class="btn ghost sm" style="padding:0 2px" data-act="deltag" data-v="${esc(t)}" aria-label="Remove ${esc(t)}">${ic('x', 'sm')}</button></span>`).join('')}</div><form class="row mt12" data-form="addtag"><input class="input" name="tag" placeholder="New tag" required><button class="btn">${ic('plus', 'sm')}Add</button></form></div></section>
    <section class="card card-pad"><b>Profile update reminders</b><div class="row mt12"><span class="small">Ask faculty to confirm their profile every</span><select class="input" style="width:auto" data-change="remind">${[6, 12].map(n => `<option value="${n}" ${S.remind === n ? 'selected' : ''}>${n} months</option>`).join('')}</select></div><div class="tiny muted mt8">${ref(7)}</div></section></div></div>`;
}
function rolesTable() {
  return `<table class="tbl"><thead><tr><th>Role</th><th>Can do</th></tr></thead><tbody>
    <tr><td class="strong small">Faculty User</td><td class="small">Own profile, directory, forums, events, recommendations, buddy requests</td></tr>
    <tr><td class="strong small">Moderator</td><td class="small">+ pin, edit and remove posts in their forum; mark content outdated</td></tr>
    <tr><td class="strong small">Platform Administrator</td><td class="small">+ confirm matches, manage categories, tags and accounts, see the dashboard and audit log</td></tr>
    <tr><td class="strong small">Technical Administrator</td><td class="small">Platform configuration and integrations. No access to private profile fields (least privilege)</td></tr>
    ${REV ? `<tr><td class="strong small">Partner guest ${chg(2)}</td><td class="small">Ask & Discuss, guides, events, shared arrival plan. No directory</td></tr><tr><td class="strong small">Pre-arrival guest ${chg(1)}</td><td class="small">Everything a faculty user can do, until their VinUni account starts</td></tr>` : ''}</tbody></table>`;
}
function aUsers() {
  const roleOf = f => S.roles[f.id] || (f.moderator ? 'Moderator' : 'Faculty User');
  return `${REV ? `<div class="grid g2 mb16"><section class="card chg-box"><div class="card-h"><h2>${ic('plane')}Pre-arrival invitations</h2>${chg(1)}</div><div class="card-b">${S.invites.map(i => `<div class="list-item"><span class="forum-ico">${ic('mail')}</span><div class="li-main"><span class="li-title">${esc(i.name)} · ${i.college}</span><span class="li-sub">Starts ${fmt(i.start)} · invited ${fmt(i.sent)}${i.partner ? ' · partner: ' + esc(i.partner) : ''}</span></div><span class="badge ${i.status.startsWith('Active') ? 'green' : 'amber'}">${esc(i.status)}</span></div>`).join('')}
      <form class="mt12" data-form="invite"><div class="grid g2"><input class="input" name="name" placeholder="New hire’s name" required><input class="input" name="email" type="email" placeholder="Personal email" required></div><div class="grid g2 mt8"><select class="input" name="college">${Object.keys(COLLEGES).map(c => `<option>${c}</option>`).join('')}</select><input class="input" name="start" type="date" value="2027-01-05" required></div><button class="btn primary mt8">${ic('send', 'sm')}Send invitation</button></form></div></section>
    <section class="card chg-box"><div class="card-h"><h2>${ic('heart')}Partner guest accounts</h2>${chg(2)}</div><div class="card-b">${OTHERS.filter(o => o.guest).map(o => `<div class="list-item">${av(o.id)}<div class="li-main"><span class="li-title">${esc(name(o.id))}</span><span class="li-sub">Linked to ${esc(name(o.partnerOf))} · ends automatically when they leave</span></div><span class="badge green">Active</span></div>`).join('')}<p class="small muted mt12" style="margin-bottom:0">Faculty add their partner from their own profile. No directory access, no contact details.</p></div></section></div>` : ''}
    <section class="card mb16"><div class="card-h"><h2>${ic('alert')}Leavers from the HR sync</h2><span class="small muted">${REV ? 'Entra ID' : 'Microsoft Entra ID'} ${ref(7, 'auto-deactivation')}</span></div><div class="card-b">${S.leavers.map((l, i) => `<div class="list-item"><span class="forum-ico">${ic('user')}</span><div class="li-main"><span class="li-title">${esc(l.name)} · ${l.college}</span><span class="li-sub">Last day ${fmt(l.leaveDate)}</span></div>${l.status === 'leaving' ? `<button class="btn sm" data-act="deactivate" data-i="${i}">Deactivate now</button>` : '<span class="badge">Deactivated</span>'}</div>`).join('')}</div></section>
    <section class="card mb16"><div class="card-h"><h2>${ic('users')}All accounts</h2><span class="small muted">${S.faculty.length} faculty</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Name</th><th>College</th><th>Role</th><th>Profile</th><th>Status</th></tr></thead><tbody>${S.faculty.map(f => `<tr><td><div class="row">${av(f.id, 'sm')}<span class="small strong">${esc(name(f.id))}</span></div></td><td class="small">${f.college}</td><td><select class="input" style="width:auto;padding:4px 8px;font-size:13px" data-change="role" data-id="${f.id}">${['Faculty User', 'Moderator', 'Platform Administrator', 'Technical Administrator'].map(r => `<option ${r === roleOf(f) ? 'selected' : ''}>${r}</option>`).join('')}</select></td><td class="small">${f.complete}%</td><td>${f.preArrival ? '<span class="badge gold">Pre-arrival guest</span>' : '<span class="badge green">Active</span>'}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="card card-pad"><b>Roles</b> ${ref(11)}<div class="mt12">${rolesTable()}</div></section>`;
}
function aConsent() {
  return `<div class="notice gold mb16">${ic('shield')}<div>Vietnam’s Personal Data Protection Law and Decree 13/2023 require consent that is specific, recorded and can be withdrawn. Each optional field has its own consent, with a purpose and a date. ${chg(7)}</div></div>
    <section class="card"><div class="card-h"><h2>${ic('shield')}Consent register</h2><button class="btn sm" data-act="exportconsent">${ic('download', 'sm')}Export CSV</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Person</th><th>Data</th><th>Purpose</th><th>Given</th><th>Status</th></tr></thead><tbody>${S.consents.map(c => `<tr><td><div class="row">${av(c.who, 'sm')}<span class="small">${esc(name(c.who))}</span></div></td><td class="small">${esc(c.field)}</td><td class="small">${esc(c.purpose)}</td><td class="small">${fmt(c.given)}</td><td><span class="badge ${c.status === 'Given' ? 'green' : 'amber'}">${esc(c.status)}</span></td></tr>`).join('')}</tbody></table></div></section>`;
}
function aAutomations() {
  return `<div class="notice mb16">${ic('zap')}<div>${REV ? 'Built with Power Automate standard connectors, which are included in most Microsoft 365 licences.' : 'Built with Power Automate.'} ${ref(8)} ${REV ? chg(6) : ''}</div></div>
    <section class="card">${S.flows.map(f => `<div class="flow-row"><span class="flow-ico">${ic('zap', 'sm')}</span><div><div class="strong small">${esc(f.name)} ${f.rev ? chg(f.id === 'f9' ? 1 : f.id === 'f10' ? 4 : 7) : ''}</div><div class="small muted"><b>When</b> ${esc(f.trigger)} → ${esc(f.action)}</div><div class="tiny muted">Last run ${fmt(f.last)} · ${f.runs} runs</div></div><label class="toggle"><input type="checkbox" data-change="flow" data-id="${f.id}" ${f.on ? 'checked' : ''}><span></span></label></div>`).join('')}</section>`;
}
function aArchitecture() {
  const box = (t, s, cls = '') => `<div class="card card-pad ${cls}" style="padding:14px"><div class="strong small">${t}</div><div class="tiny muted mt8">${s}</div></div>`;
  const stack = REV ? [
    ['Front door', [box('Teams tab + web link', 'One place to go. A personal link works for pre-arrival guests and partners.')]],
    ['Interface', [box('Power Apps (canvas)', 'Directory, profile, buddy, Ask & Discuss')]],
    ['Data', [box('Dataverse for Teams or Microsoft Lists', 'Included in most M365 licences. Fine for a few hundred people.', 'chg-box'), box('SharePoint pages', 'Living in Hanoi guides')]],
    ['Workflows', [box('Power Automate (standard)', 'Invites, intros, check-ins, digest')]],
    ['Bridges', [box('WhatsApp / Zalo digest', 'Weekly post to the existing groups', 'chg-box')]],
    ['Identity', [box('Entra ID + guest invites', 'Faculty by SSO; guests by invitation, tied to a faculty account', 'chg-box')]],
  ] : [
    ['Front door', [box('Microsoft Teams', 'Community entry point, channels, notifications')]],
    ['Interface', [box('Power Apps', 'Directory, profile editor, matching, admin dashboard')]],
    ['Data', [box('Microsoft Dataverse', 'Profiles, interests, matches, resources, events'), box('SharePoint', 'Curated relocation guides, FAQs')]],
    ['Workflows', [box('Power Automate', 'Onboarding, reminders, intros, alerts')]],
    ['Analytics', [box('Power BI (optional)', 'Adoption, engagement, matching activity')]],
    ['Identity', [box('Microsoft Entra ID', 'Institutional sign-in and account lifecycle')]],
  ];
  const entities = [['Faculty', S.faculty.length], ['Expertise', [...new Set(S.faculty.flatMap(f => f.expertise))].length], ['Interests & Hobbies', S.tags.length], ['Help Topics', HELP_TOPICS.length], ['Matching Preferences', S.faculty.filter(f => f.isNew).length], ['Matches', S.matches.length], [REV ? 'Topics' : 'Forum Categories', S.forums.length], ['Posts & Replies', S.threads.reduce((a, t) => a + 1 + t.replies.length, 0)], ['Resources', S.guides.length], ['Events', S.events.length], ['Recommendations', S.recs.length]];
  return `<div class="split"><section class="card"><div class="card-h"><h2>${ic('layers')}${REV ? 'Pilot stack' : 'Proposed stack'}</h2>${REV ? chg(6) : ref(8)}</div><div class="card-b"><div class="stack" style="gap:10px">${stack.map(([l, boxes]) => `<div style="display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:center"><span class="tiny strong muted" style="text-transform:uppercase;letter-spacing:.6px">${l}</span><div class="grid" style="grid-template-columns:repeat(${boxes.length},minmax(0,1fr));gap:10px">${boxes.join('')}</div></div>`).join('')}</div>
    ${REV ? `<div class="notice gold mt16">${ic('info')}<div><b>Why not full Dataverse yet?</b> It needs premium Power Apps licences for each user. If the pilot meets its targets, the same tables move to full Dataverse.</div></div>` : `<div class="notice warn mt16">${ic('help')}<div><b>Open question (§15 Q1):</b> which Microsoft 365 and Power Platform licences does VinUniversity already have?</div></div>`}</div></section>
    <aside class="card"><div class="card-h"><h2>${ic('list')}Data model ${ref(10)}</h2></div><div class="card-b">${entities.map(([e, n]) => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line-2)"><span>${e}</span><span class="badge">${n} in demo</span></div>`).join('')}</div></aside></div>`;
}
function aAudit() {
  return `<section class="card"><div class="card-h"><h2>${ic('list')}Audit log</h2><span class="small muted">Administrative changes and moderation ${ref(11)}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>${S.audit.map(a => `<tr><td class="small muted" style="white-space:nowrap">${esc(a.date)}</td><td class="small">${a.who === 'system' ? `<span class="badge">${ic('zap', 'sm')}Automation</span>` : esc(name(a.who))}</td><td class="small">${esc(a.what)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

/* ==================================================================
   MODALS
================================================================== */
function proposalMap() {
  const rows = [
    ['§3', 'Proposed user experience: the three home-page questions and eight areas', 'sofia', 'home'],
    ['§4', 'Directory and profile, with per-field privacy', 'sofia', 'profile'],
    ['§4', 'Search and filter the directory', 'james', 'directory'],
    ['§5', 'Ten forums with moderators and disclaimers', 'james', 'forums'],
    ['§6', 'Rules-based matching, workload balancing, check-ins', 'sofia', 'match'],
    ['§7', 'Admin dashboard, review dates, feedback, leavers', 'linh', 'admin/overview'],
    ['§8', 'Technology architecture', 'linh', 'admin/architecture'],
    ['§10', 'Data model', 'linh', 'admin/architecture'],
    ['§11', 'Security: SSO only (try the partner persona), roles, audit log', 'erik', 'home'],
    ['§12', 'Scalability: new forums and weights by configuration', 'linh', 'admin/config'],
  ];
  const mvp = [
    ['Faculty can sign in using their VinUniversity identity', 'sofia', 'home'], ['Faculty can create and update their own profile', 'sofia', 'profile'],
    ['Users can search and filter the directory', 'james', 'directory'], ['Users can join and take part in the forums', 'james', 'forums'],
    ['New faculty can request a buddy; admins can approve', 'sofia', 'match'], ['Admins can add forum categories without code', 'linh', 'admin/config'],
    ['Admins can deactivate users and moderate content', 'linh', 'admin/users'], ['Optional personal information has clear privacy controls', 'sofia', 'profile'],
    ['Works on desktop and mobile', null, null], ['Basic usage metrics for admins', 'linh', 'admin/overview'],
  ];
  return modalShell('Proposal map', `<p class="small muted">Where each part of the proposal lives in this demo. Purple <span class="ann" style="cursor:default">§</span> labels on the pages point back to the proposal.</p>
    ${rows.map(([s, t, w, g]) => `<div class="list-item"><span class="badge navy">${s}</span><div class="li-main"><span class="li-title">${t}</span><span class="li-sub">as ${esc(name(w))}</span></div><button class="btn sm" data-act="showme" data-who="${w}" data-go="${g}">Show me</button></div>`).join('')}
    <h3 class="mt24 mb8" style="font-family:var(--serif);font-size:19px;color:var(--navy-900)">§14 MVP acceptance criteria</h3>
    ${mvp.map(([t, w, g]) => `<div class="list-item"><span style="color:var(--green)">${ic('check')}</span><div class="li-main"><span class="li-title" style="font-weight:500">${t}</span></div>${w ? `<button class="btn ghost sm" data-act="showme" data-who="${w}" data-go="${g}">Try it</button>` : '<span class="small muted">Resize the window</span>'}</div>`).join('')}`, '', 'Concept demo of the proposal as written (Sept 2026)');
}
function changesModal() {
  return modalShell('What changed?', `<p class="small muted">This version keeps everything in the proposal and adds the eight suggestions from our feedback. Teal <span class="ann chg" style="cursor:default">Change</span> labels mark each one in the demo.</p>
    ${CHANGES.map(c => `<div class="list-item" style="align-items:flex-start"><span class="badge" style="background:var(--chg-50);color:var(--chg)">${c.n}</span><div class="li-main"><span class="li-title">${esc(c.title)}</span><span class="li-sub" style="display:block;margin-top:2px">${esc(c.why)}</span></div><button class="btn sm" data-act="showme" data-who="${c.who}" data-go="${c.go}">Show me</button></div>`).join('')}`, PUBLIC ? '' : `<a class="btn" href="proposal-as-written.html">Compare with the proposal as written</a>`, 'Revised concept with suggested changes');
}

/* ==================================================================
   EVENTS
================================================================== */
const ACT = {
  close: closeOverlays,
  copytext: () => { const t = $('#dl-text'); const done = () => toast('Copied'); try { navigator.clipboard.writeText(t.value).then(done, () => { t.select(); toast('Press Ctrl+C to copy'); }); } catch (e) { t.select(); toast('Press Ctrl+C to copy'); } },
  tourstart: () => applyStep(0),
  tourend: () => { S.tour = null; highlight(null); render(); },
  tourstep: el => { const n = S.tour + +el.dataset.v; if (n >= TOUR.length) ACT.tourend(); else applyStep(Math.max(0, n)); },
  side: () => { const open = document.body.classList.toggle('side-open'); $('#scrim').classList.toggle('open', open); },
  persona: el => { S.role = el.dataset.id; save(); go('home'); },
  signout: () => { S.role = null; save(); location.hash = ''; render(); },
  reset: () => askConfirm('Reset the demo?', 'Everything you changed in this demo will be cleared.', 'Reset demo', () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } S = fresh(); location.hash = ''; render(); }),
  confirmyes: () => { const f = pendingConfirm; pendingConfirm = null; closeOverlays(); if (f) f(); },
  map: () => openModal(proposalMap()),
  changes: () => openModal(changesModal()),
  showme: el => { const w = el.dataset.who; if (w) S.role = w; save(); go(el.dataset.go); },
  bell: (el, e) => { e.stopPropagation(); $('#notif-panel').classList.toggle('open'); },
  readnotif: el => { S.read[el.dataset.id] = 1; save(); },
  readall: (el, e) => { e.stopPropagation(); S.notifs.filter(n => n.to === S.role).forEach(n => S.read[n.id] = 1); render(); },
  person: el => openDrawer(personDrawer(el.dataset.id)),
  preview: () => openDrawer(personDrawer(S.role, true)),
  contact: el => toast(el.dataset.how === 'email' ? `Opens a new email to ${email(el.dataset.id)} (demo)` : `Opens ${person(el.dataset.id).contact || 'Teams'} chat with ${name(el.dataset.id)} (demo)`),
  photo: () => { me().photo = true; toast('Photo uploaded (demo)'); render(); },
  scrollto: el => { const t = document.getElementById(el.dataset.id); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  helpful: el => { el.classList.add('on'); el.innerHTML = ic('check', 'sm') + 'Thanks!'; },
  plan: el => { const a = ARRIVAL_PLAN.find(x => x.id === el.dataset.id); S.plan[a.id] = !planDone(a); render(); },
  joinchat: () => { notify('linh', `${name(S.role)} asked for an invite to the faculty WhatsApp/Zalo groups.`, 'admin/users'); toast('Request sent to Faculty Affairs'); },
  savechat: () => openModal(modalShell('Save an answer from a chat group', `<form data-form="savechat" id="savechatf"><div class="field"><label>Question</label><input class="input" name="title" value="Where can I get passport photos taken near campus?" required></div><div class="field"><label>Answer (paste from WhatsApp or Zalo)</label><textarea class="input" name="body" required>The photo shop next to the Ocean Park S1 pharmacy does them in 10 minutes, about 50k VND for 6.</textarea></div><div class="field"><label>Topic</label><select class="input" name="forum">${activeForums().map(f => `<option value="${f.id}" ${f.id === 'newto' ? 'selected' : ''}>${esc(f.short)}</option>`).join('')}</select></div><label class="row small"><input type="checkbox" required checked> The author agreed to have this saved here</label></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="savechatf">Save to Ask & Discuss</button>`)),
  // matching
  imp: el => { const p = prefsFor(S.role); p.imp[el.dataset.k] = +el.dataset.v; S.prefs[S.role] = p; render(); },
  requestmatch: el => {
    S.matches.push({ id: uid('m'), seeker: S.role, buddy: el.dataset.id, status: 'requested', created: TODAY_ISO });
    notify('linh', `${name(S.role)} asked for ${name(el.dataset.id)} as a buddy.`, 'admin/matching');
    toast(`Request sent. ${REV ? 'Your coordinator' : 'Faculty Affairs'} will confirm.`); render();
  },
  cancelmatch: el => { S.matches = S.matches.filter(m => m.id !== el.dataset.id); render(); },
  skipahead: el => { const m = S.matches.find(x => x.id === el.dataset.id); m.status = 'checkin_due'; notify(m.seeker, `It’s been 3 weeks. How’s it going with ${first(m.buddy)}?`, 'match'); render(); },
  checkin: el => {
    const m = S.matches.find(x => x.id === el.dataset.id), v = el.dataset.v;
    if (v === 'rematch') { m.status = 'rematch'; notify('linh', `${name(m.seeker)} asked for a different buddy.`, 'admin/matching'); toast('No problem. Here are new suggestions.'); }
    else { m.status = 'active'; m.checkinResult = v === 'well' ? 'Going well' : 'Not connected yet'; if (v === 'notyet') notify(m.buddy, `Friendly nudge: ${first(m.seeker)} would love to meet up.`, 'match'); toast('Thanks for checking in'); }
    render();
  },
  approve: el => approveMatch(el.dataset.id),
  decline: el => { const m = S.matches.find(x => x.id === el.dataset.id); m.status = 'declined'; audit(`Declined buddy request: ${name(m.seeker)} → ${name(m.buddy)}`); notify(m.seeker, 'Your buddy request needs a different match. Please pick again.', 'match'); render(); },
  altmatch: el => {
    const m = S.matches.find(x => x.id === el.dataset.id);
    openModal(modalShell(`Choose a buddy for ${esc(first(m.seeker))}`, `<div class="small muted mb12">Top suggestions for ${esc(name(m.seeker))}, who wants help with ${esc(person(m.seeker).wantsHelp.join(', ').toLowerCase())}.</div>${suggestions(m.seeker).slice(0, 6).map(s => `<div class="list-item">${av(s.id)}<div class="li-main"><span class="li-title">${esc(name(s.id))}</span><span class="li-sub">${esc(s.parts.filter(x => x.wt && x.v >= .5).map(x => x.why).slice(0, 2).join(' · '))} · ${s.load}/${s.max} places</span></div><span class="badge navy">${s.pct}%</span><button class="btn sm ${s.full ? '' : 'primary'}" data-act="pickalt" data-m="${m.id}" data-id="${s.id}" ${s.full ? 'disabled' : ''}>${s.full ? 'Full' : 'Pick'}</button></div>`).join('')}`));
  },
  pickalt: el => { const m = S.matches.find(x => x.id === el.dataset.m); m.buddy = el.dataset.id; closeOverlays(); approveMatch(m.id); },
  // admin
  mod: el => { const r = S.reports.find(x => x.id === el.dataset.id); r.status = el.dataset.v; audit(`${el.dataset.v === 'remove' ? 'Removed' : 'Kept'} reported content: ${r.reason}`); toast(el.dataset.v === 'remove' ? 'Content removed; author notified' : 'Report dismissed'); render(); },
  nudge: el => { const t = S.threads.find(x => x.id === el.dataset.id); helpersFor(t.forum).forEach(h => notify(h.id, `Can you help? “${t.title}”`, 'thread/' + t.id)); toast(`Nudged ${helpersFor(t.forum).length} faculty who can help with ${forum(t.forum).short}`, true); audit(`Nudged helpers for “${t.title}”`); render(); },
  nudgeprofiles: () => { const l = S.faculty.filter(f => f.complete < 70); l.forEach(f => notify(f.id, 'Your profile is incomplete. A few more details help colleagues find you.', 'profile')); toast(`Reminder sent to ${l.length} faculty`, true); audit(`Sent profile reminders to ${l.length} faculty`); },
  fbdone: el => { S.feedback[+el.dataset.i].done = true; render(); },
  reviewed: el => {
    if (el.dataset.kind === 'Guide') { const g = S.guides.find(x => x.id === el.dataset.id); g.reviewed = TODAY_ISO; g.next = addDays(TODAY_ISO, 183); audit(`Marked guide reviewed: ${g.title}`); }
    else { const r = S.recs.find(x => x.id === el.dataset.id); r.date = TODAY_ISO; audit(`Marked recommendation reviewed: ${r.name}`); }
    toast('Marked as reviewed'); render();
  },
  archiverec: el => { const r = S.recs.find(x => x.id === el.dataset.id); S.recs = S.recs.filter(x => x !== r); audit(`Archived recommendation: ${r.name}`); toast('Archived'); render(); },
  deactivate: el => { const l = S.leavers[+el.dataset.i]; l.status = 'deactivated'; audit(`Deactivated account: ${l.name}`); toast(`${l.name} deactivated; profile hidden`); render(); },
  deltag: el => { S.tags = S.tags.filter(t => t !== el.dataset.v); audit(`Removed interest tag “${el.dataset.v}”`); render(); },
  exportconsent: () => download('consent-register.csv', 'person,data,purpose,given,status\n' + S.consents.map(c => [name(c.who), c.field, c.purpose, c.given, c.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv'),
  mydata: () => { const p = me(); download(`my-data-${p.id}.json`, JSON.stringify({ profile: p, consents: S.consents.filter(c => c.who === p.id), posts: S.threads.filter(t => t.author === p.id).map(t => t.title), exported: TODAY_ISO }, null, 2)); },
  wipe: () => askConfirm('Delete optional data?', 'This deletes all your optional profile data and withdraws your consents. Your name, college, expertise and email stay.', 'Delete optional data', () => { const p = me(); Object.assign(p, { phone: '', interests: [], wantsHelp: [], helpTopics: [], area: 'Undecided', photo: false, family: { partner: false, kids: [], vis: 'me' }, consent: {} }); p.complete = completeness(p); S.consents = S.consents.map(c => c.who === p.id ? { ...c, status: 'Withdrawn ' + TODAY_ISO } : c); audit(`${name(p.id)} deleted their optional profile data`); toast('Optional data deleted; consents withdrawn'); render(); }),
  // content
  guidecat: el => { S.guideCat = el.dataset.v; render(); },
  reccat: el => { S.recCat = el.dataset.v; render(); },
  confirmrec: el => { const r = S.recs.find(x => x.id === el.dataset.id); r.date = TODAY_ISO; r.confirms++; toast('Thanks! Marked as still accurate'); render(); },
  outdated: el => { S.feedback.unshift({ kind: 'Outdated information', text: (el.dataset.kind === 'guide' ? S.guides.find(g => g.id === el.dataset.id).title : S.recs.find(r => r.id === el.dataset.id).name), by: S.role, date: TODAY_ISO }); notify('linh', 'Someone reported outdated information.', 'admin/moderation'); toast('Reported to the moderators. Thank you!'); },
  addrec: () => openModal(modalShell('Add a recommendation', `<form data-form="addrec" id="addrecf"><div class="field"><label>Name of the service or place</label><input class="input" name="name" required placeholder="e.g. Ocean Park Swim School"></div><div class="field"><label>Category</label><select class="input" name="cat">${[...new Set(S.recs.map(r => r.cat))].map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>Why you recommend it</label><textarea class="input" name="notes" required></textarea></div><label class="row small"><input type="checkbox" name="commercial" checked> This is a business (adds “not a VinUniversity endorsement”)</label><p class="small muted mt12">It will show today’s date and be flagged for review after 6 months.</p></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="addrecf">Add</button>`)),
  newpost: el => openModal(modalShell(`New post in ${esc(forum(el.dataset.forum).short)}`, `<form data-form="newpost" id="newpostf" data-forum="${el.dataset.forum}"><div class="field"><label>Title</label><input class="input" name="title" required></div><div class="field"><label>Message</label><textarea class="input" name="body" required></textarea></div></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="newpostf">Post</button>`)),
  report: el => { S.reports.unshift({ id: uid('r'), thread: el.dataset.id, reason: 'Reported by a community member', by: S.role, date: TODAY_ISO, status: 'open', excerpt: '(post content)' }); notify('linh', 'A post was reported for moderation.', 'admin/moderation'); toast('Reported to the moderators'); },
  pin: el => { const t = S.threads.find(x => x.id === el.dataset.id); t.pinned = !t.pinned; audit(`${t.pinned ? 'Pinned' : 'Unpinned'} “${t.title}”`); render(); },
  qatag: el => { S.qaTag = el.dataset.v; if (parseHash().page !== 'qa') go('qa'); else render(); },
  qasort: el => { S.qaSort = el.dataset.v; render(); },
  // events
  event: (el, e) => { e.preventDefault(); openModal(eventModal(el.dataset.id)); },
  rsvp: el => { const ev = S.events.find(x => x.id === el.dataset.id); if (ev.going.includes(S.role)) ev.going = ev.going.filter(g => g !== S.role); else { ev.going.push(S.role); toast(`You’re going to ${ev.title}. We’ll remind you the day before.`, true); } render(); openModal(eventModal(ev.id)); },
  evview: el => { S.evView = el.dataset.v; render(); },
  evcat: el => { S.evCat = el.dataset.v; render(); },
  calnav: el => { const d = new Date(S.cal.y, S.cal.m + +el.dataset.v, 1); S.cal = { y: d.getFullYear(), m: d.getMonth() }; render(); },
  newevent: () => openModal(modalShell('Create an event', `<form data-form="newevent" id="neweventf"><div class="field"><label>Title</label><input class="input" name="title" required placeholder="e.g. Board games night"></div><div class="grid g2"><div class="field"><label>Date</label><input class="input" type="date" name="date" value="2026-10-30" required></div><div class="field"><label>Time</label><input class="input" type="time" name="time" value="19:00" required></div></div><div class="field"><label>Location</label><input class="input" name="loc" required placeholder="Where?"></div><div class="grid g2"><div class="field"><label>Category</label><select class="input" name="cat">${['Social', 'Cultural', 'Sports', 'Family', 'Weekend'].map(c => `<option>${c}</option>`).join('')}</select></div><div class="field"><label>Places</label><input class="input" type="number" name="cap" value="12" min="2"></div></div><div class="field"><label>Description</label><textarea class="input" name="desc"></textarea></div></form>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="neweventf">Create</button>`)),
  feedback: () => openModal(modalShell('Send feedback', `<form data-form="feedback" id="fbf"><div class="field"><label>What kind of feedback?</label><select class="input" name="kind"><option>${REV ? 'Suggest a new topic' : 'Suggest a new forum category'}</option><option>Outdated information</option><option>Something isn’t working</option><option>Other</option></select></div><div class="field"><label>Tell us more</label><textarea class="input" name="text" required></textarea></div></form><p class="small muted">Goes to the platform administrators. ${ref(7)}</p>`, `<button class="btn" data-act="close">Cancel</button><button class="btn primary" type="submit" form="fbf">Send</button>`)),
  dirclear: () => { S.dir = { q: '', college: '', topic: '', lang: '', interest: '', family: false, buddy: false }; render(); },
};
function approveMatch(id, force = false) {
  const m = S.matches.find(x => x.id === id);
  if (load_(m.buddy) >= person(m.buddy).buddy.max && !force) return askConfirm('Buddy at capacity', `${name(m.buddy)} already has ${person(m.buddy).buddy.max} buddies. Confirm this match anyway?`, 'Confirm anyway', () => approveMatch(id, true));
  m.status = 'introduced'; m.intro = TODAY_ISO; m.checkin = addDays(TODAY_ISO, 21);
  notify(m.seeker, `You’ve been introduced to your buddy, ${name(m.buddy)}!`, 'match');
  notify(m.buddy, `Meet your new buddy: ${name(m.seeker)}.`, 'match');
  audit(`Confirmed buddy match: ${name(m.seeker)} + ${name(m.buddy)}`);
  toast(`Introduction sent to ${first(m.seeker)} and ${first(m.buddy)}`, true); render();
}

const CHG = {
  persona: el => { S.role = el.value; save(); go(parseHash().page === 'admin' ? 'home' : parseHash().page + (parseHash().arg ? '/' + parseHash().arg : '')); },
  annotate: el => { S.annotate = el.checked; render(); },
  dir: el => { S.dir[el.name] = el.type === 'checkbox' ? el.checked : el.value; $('#dir-results').innerHTML = dirResults(); save(); },
  mpref: () => {
    const p = prefsFor(S.role), c = $('#content');
    p.help = [...c.querySelectorAll('input[name=mhelp]:checked')].map(i => i.value);
    p.hobbies = [...c.querySelectorAll('input[name=mhob]:checked')].map(i => i.value);
    p.area = c.querySelector('select[name=marea]').value; S.prefs[S.role] = p; render();
  },
  askforum: () => {},
  consent: el => {
    const fs = $('#famfields'); fs.disabled = !el.checked; fs.style.opacity = el.checked ? '' : '.45';
    const p = me(); p.consent = p.consent || {};
    if (el.checked) { p.consent.family = TODAY_ISO; S.consents.unshift({ who: p.id, field: 'Partner / family information', purpose: 'Buddy matching only', given: TODAY_ISO, status: 'Given' }); toast('Consent recorded'); }
    else { delete p.consent.family; S.consents = S.consents.map(c => c.who === p.id && c.field.includes('family') ? { ...c, status: 'Withdrawn ' + TODAY_ISO } : c); toast('Consent withdrawn. Family info is no longer used.'); }
    save();
  },
  buddyavail: el => { me().buddy.available = el.checked; if (el.checked && !me().buddy.max) me().buddy.max = 1; toast(el.checked ? 'You’re available as a buddy' : 'You won’t get new buddy requests'); render(); },
  weight: el => { S.weights[el.dataset.k] = +el.value; audit(`Changed matching weight “${FACTORS.find(f => f.key === el.dataset.k).label}” to ${el.value}`); render(); },
  remind: el => { S.remind = +el.value; audit(`Profile reminder interval set to ${el.value} months`); toast('Saved'); save(); },
  forumactive: el => { const f = S.forums.find(x => x.id === el.dataset.id); f.future = false; f.archived = !el.checked; audit(`${el.checked ? 'Activated' : 'Archived'} forum “${f.name}”`); toast(el.checked ? 'Forum is live' : 'Forum archived'); render(); },
  role: el => { S.roles[el.dataset.id] = el.value; audit(`Changed role of ${name(el.dataset.id)} to ${el.value}`); toast('Role updated'); save(); },
  flow: el => { const f = S.flows.find(x => x.id === el.dataset.id); f.on = el.checked; audit(`${el.checked ? 'Enabled' : 'Disabled'} automation “${f.name}”`); save(); },
};
const INP = {
  dir: el => { S.dir.q = el.value; $('#dir-results').innerHTML = dirResults(); },
  askroute: el => { const f = el.closest('form'); const txt = f.elements.title.value + ' ' + f.elements.body.value; $('#ask-route').innerHTML = askRoute(txt); },
  search: el => {
    const q = el.value.trim().toLowerCase(), box = $('#search-res');
    if (q.length < 2) { box.classList.remove('open'); return; }
    const people = isPartner() ? [] : S.faculty.filter(p => (name(p.id) + ' ' + p.expertise.join(' ') + ' ' + p.interests.join(' ')).toLowerCase().includes(q)).slice(0, 4);
    const threads = S.threads.filter(t => (t.title + ' ' + t.body).toLowerCase().includes(q)).slice(0, 4);
    const guides = S.guides.filter(g => (g.title + ' ' + g.summary + ' ' + g.cat).toLowerCase().includes(q)).slice(0, 3);
    const events = S.events.filter(e => (e.title + ' ' + e.desc).toLowerCase().includes(q)).slice(0, 3);
    const grp = (t, items) => items.length ? `<div class="grp">${t}</div>${items.join('')}` : '';
    box.innerHTML = grp('People', people.map(p => `<a href="javascript:void 0" data-act="person" data-id="${p.id}">${av(p.id, 'sm')}<div><div>${esc(name(p.id))}</div><div class="sub">${p.college} · ${esc(p.expertise[0])}</div></div></a>`))
      + grp('Conversations', threads.map(t => `<a href="#/thread/${t.id}">${ic('message')}<div><div>${esc(t.title)}</div><div class="sub">${esc(forum(t.forum).short)} · ${t.replies.length} replies</div></div></a>`))
      + grp('Guides', guides.map(g => `<a href="#/guide/${g.id}">${ic('book')}<div><div>${esc(g.title)}</div><div class="sub">${esc(g.cat)}</div></div></a>`))
      + grp('Events', events.map(e => `<a href="javascript:void 0" data-act="event" data-id="${e.id}">${ic('calendar')}<div><div>${esc(e.title)}</div><div class="sub">${fmtShort(e.date)}</div></div></a>`)) || '<div class="empty small">No results</div>';
    box.classList.add('open');
  },
};
const listOf = (fd, k) => fd.getAll(k).map(String);
const csv = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const FORM = {
  gate: f => {
    if (sha256hex(GATE.salt + f.elements.pw.value) !== GATE.hash) { $('#gate-err').hidden = false; f.elements.pw.select(); return; }
    gateOpenNow = true; try { localStorage.setItem(GATE_KEY, '1'); } catch (e) { /* remember for this visit only */ }
    render();
  },
  profile: (f, fd) => {
    const p = me();
    Object.assign(p, { first: fd.get('first'), last: fd.get('last'), college: fd.get('college'), expertise: csv(fd.get('expertise')), interests: listOf(fd, 'interests'), languages: csv(fd.get('languages')), regions: csv(fd.get('regions')), helpTopics: listOf(fd, 'helpTopics'), wantsHelp: listOf(fd, 'wantsHelp'), phone: fd.get('phone'), phoneVis: fd.get('phoneVis'), contact: fd.get('contact'), area: fd.get('area'), updated: TODAY_ISO });
    p.buddy = { ...p.buddy, available: !!fd.get('buddy'), max: +fd.get('buddyMax') };
    if (!f.querySelector('#famfields').disabled) p.family = { partner: !!fd.get('partner'), kids: listOf(fd, 'kids'), vis: fd.get('famVis') };
    p.complete = completeness(p); toast('Profile saved'); render();
  },
  reply: (f, fd) => {
    const t = S.threads.find(x => x.id === f.dataset.id);
    t.replies.push({ author: S.role, date: TODAY_ISO, body: fd.get('body') });
    if (t.author !== S.role) notify(t.author, `${name(S.role)} replied to “${t.title}”.`, 'thread/' + t.id, false);
    toast('Reply posted'); render();
  },
  ask: (f, fd) => {
    const forumId = fd.get('forum') || routeQuestion(fd.get('title')).forum;
    const t = { id: uid('t'), forum: forumId, title: fd.get('title'), author: S.role, date: TODAY_ISO, body: fd.get('body') || '', replies: [] };
    S.threads.unshift(t); S.asked = true;
    const helpers = helpersFor(forumId).filter(h => h.id !== S.role);
    helpers.forEach(h => notify(h.id, `New question in ${forum(forumId).short}: “${t.title}”`, 'thread/' + t.id));
    toast(`Posted. ${helpers.length} colleagues who can help were notified.`, true); go('thread/' + t.id);
  },
  newpost: (f, fd) => { const t = { id: uid('t'), forum: f.dataset.forum, title: fd.get('title'), author: S.role, date: TODAY_ISO, body: fd.get('body'), replies: [] }; S.threads.unshift(t); S.asked = true; go('thread/' + t.id); },
  savechat: (f, fd) => { const t = { id: uid('t'), forum: fd.get('forum'), title: fd.get('title'), author: S.role, date: TODAY_ISO, body: fd.get('body'), replies: [], source: 'zalo' }; S.threads.unshift(t); audit(`Saved an answer from a chat group: “${t.title}”`); toast('Saved. It’s now searchable.'); go('thread/' + t.id); },
  addrec: (f, fd) => { S.recs.unshift({ id: uid('rc'), name: fd.get('name'), cat: fd.get('cat'), by: S.role, date: TODAY_ISO, confirms: 1, commercial: !!fd.get('commercial'), notes: fd.get('notes') }); closeOverlays(); toast('Recommendation added'); render(); },
  newevent: (f, fd) => {
    const e = { id: uid('e'), title: fd.get('title'), date: fd.get('date'), time: fd.get('time'), loc: fd.get('loc'), cat: fd.get('cat'), cap: +fd.get('cap') || 10, by: S.role, going: [S.role], desc: fd.get('desc') || '' };
    S.events.push(e); const d = D(e.date); S.cal = { y: d.getFullYear(), m: d.getMonth() };
    const fans = S.faculty.filter(p => p.id !== S.role && p.interests.some(i => (e.title + e.desc).toLowerCase().includes(i.toLowerCase().split(' ')[0]))).length;
    closeOverlays(); toast(`Event created. Interested faculty will be notified${fans ? ` (${fans} people)` : ''}.`, true); render();
  },
  feedback: (f, fd) => { S.feedback.unshift({ kind: fd.get('kind'), text: fd.get('text'), by: S.role, date: TODAY_ISO }); notify('linh', `New feedback: ${fd.get('kind')}`, 'admin/moderation'); closeOverlays(); toast('Thanks! Your feedback went to the administrators.'); render(); },
  addforum: (f, fd) => {
    const nm = fd.get('name'), id = 'c' + uid('');
    S.forums.splice(S.forums.length - 1, 0, { id, name: nm, short: nm.length > 22 ? nm.slice(0, 20) + '…' : nm, desc: fd.get('desc') || 'New community space.', mod: fd.get('mod') || null, icon: 'message', disclaimer: fd.get('disclaimer') || null });
    audit(`Created ${REV ? 'topic' : 'forum category'} “${nm}”`); toast(`${REV ? 'Topic' : 'Forum'} “${nm}” is live, no code needed`); render();
  },
  addtag: (f, fd) => { const t = fd.get('tag').trim(); if (t && !S.tags.includes(t)) { S.tags.push(t); audit(`Added interest tag “${t}”`); } render(); },
  invite: (f, fd) => {
    S.invites.unshift({ id: uid('i'), name: fd.get('name'), email: fd.get('email'), college: fd.get('college'), start: fd.get('start'), sent: TODAY_ISO, status: 'Invited, not opened', partner: null });
    audit(`Sent pre-arrival invitation to ${fd.get('name')}`); toast(`Invitation emailed to ${fd.get('email')}`, true); render();
  },
};

document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (!e.target.closest('#notif-panel') && !e.target.closest('[data-act=bell]')) { const n = $('#notif-panel'); if (n) n.classList.remove('open'); }
  if (!e.target.closest('.search')) { const s = $('#search-res'); if (s) s.classList.remove('open'); }
  if (e.target.id === 'scrim') return closeOverlays();
  if (e.target.closest('.side a')) { document.body.classList.remove('side-open'); $('#scrim').classList.remove('open'); }
  if (a && ACT[a.dataset.act]) { if (a.tagName === 'A' && a.getAttribute('href') === 'javascript:void 0') e.preventDefault(); ACT[a.dataset.act](a, e); }
  else if (e.target.closest('#modal a[href^="#/"], #drawer a[href^="#/"]')) closeOverlays();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeOverlays();
  if (EMBED && !e.target.closest('input, textarea, select') && ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp'].includes(e.key)) { window.parent.postMessage({ type: 'key', key: e.key }, '*'); e.preventDefault(); }
  if (S.tour != null && !e.target.closest('input, textarea, select') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) ACT.tourstep({ dataset: { v: e.key === 'ArrowRight' ? 1 : -1 } });
  if (e.key === 'Enter' && e.target.matches('article[data-act]')) ACT[e.target.dataset.act](e.target, e);
});
document.addEventListener('change', e => {
  const chip = e.target.closest('.chip'); if (chip && e.target.type === 'checkbox') chip.classList.toggle('on', e.target.checked);
  const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el, e);
});
document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && INP[el.dataset.input]) INP[el.dataset.input](el, e); });
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); FORM[f.dataset.form](f, new FormData(f)); save(); });
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
window.addEventListener('resize', () => { const bar = $('#demobar'); if (bar) document.documentElement.style.setProperty('--bar', bar.offsetHeight + 'px'); });
render();
