// Run with: node --test vinder/test
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const D = require('../src/data.js');

const TODAY = new Date(2026, 9, 22); // 22 Oct 2026
const byId = id => D.users.find(u => u.id === id);

test('age and star sign come from the date of birth', () => {
  assert.equal(L.age('2008-01-04', TODAY), 18);
  assert.equal(L.zodiac('2008-01-04'), 'Capricorn');
  assert.equal(L.age('2000-07-01', TODAY), 26);
  assert.equal(L.zodiac('2000-07-01'), 'Cancer');
});

test('star sign cusp days', () => {
  assert.equal(L.zodiac('2000-01-19'), 'Capricorn');
  assert.equal(L.zodiac('2000-01-20'), 'Aquarius');
  assert.equal(L.zodiac('2000-07-22'), 'Cancer');
  assert.equal(L.zodiac('2000-07-23'), 'Leo');
  assert.equal(L.zodiac('2000-12-21'), 'Sagittarius');
  assert.equal(L.zodiac('2000-12-22'), 'Capricorn');
  assert.equal(L.zodiac('2000-02-30'), '');
});

test('under-18 sign-ups are blocked, birthday counts', () => {
  assert.equal(L.isAdult('2008-10-22', TODAY), true);
  assert.equal(L.isAdult('2008-10-23', TODAY), false);
  assert.equal(L.isAdult('2010-01-01', TODAY), false);
  assert.equal(L.isAdult('not a date', TODAY), false);
});

test('students never see faculty and faculty never see students', () => {
  const student = byId('minh-tri'), faculty = byId('thanh-ngan');
  const sDeck = L.buildDeck(student, D.users, {});
  const fDeck = L.buildDeck(faculty, D.users, {});
  assert.ok(sDeck.length > 10, 'student deck is big enough to hit the free limit');
  assert.ok(fDeck.length > 10, 'faculty deck is big enough to hit the free limit');
  assert.ok(sDeck.every(u => u.mode === 'student'));
  assert.ok(fDeck.every(u => u.mode === 'faculty'));
  assert.ok(!sDeck.some(u => u.id === student.id));
});

test('interestedIn has to work both ways', () => {
  const tri = byId('minh-tri');
  const deck = L.buildDeck(tri, D.users, {}).map(u => u.id);
  assert.ok(!deck.includes('khoa'), 'Khoa is only into women');
  assert.ok(deck.includes('linh'), 'Linh is into men');
  const ngan = byId('thanh-ngan');
  const fdeck = L.buildDeck(ngan, D.users, {}).map(u => u.id);
  assert.ok(!fdeck.includes('thu'), 'Thu is only into men');
  assert.ok(fdeck.includes('huy'));
  const onlyWomen = Object.assign({}, tri, { interestedIn: 'female' });
  assert.ok(L.buildDeck(onlyWomen, D.users, {}).every(u => u.gender === 'female'));
});

test('swiped people leave the deck', () => {
  const tri = byId('minh-tri');
  const deck = L.buildDeck(tri, D.users, { linh: 'pass', an: 'like' }).map(u => u.id);
  assert.ok(!deck.includes('linh') && !deck.includes('an'));
});

test('free tier: 10 swipes a day, reset at local midnight', () => {
  const day1 = new Date(2026, 9, 22, 23, 59), day2 = new Date(2026, 9, 23, 0, 1);
  let c = null;
  assert.equal(L.swipesLeft(c, false, day1), 10);
  for (let i = 0; i < 10; i++) c = L.countSwipe(c, day1);
  assert.equal(L.swipesLeft(c, false, day1), 0);
  assert.equal(L.swipesLeft(c, true, day1), Infinity);
  assert.equal(L.swipesLeft(c, false, day2), 10);
  assert.deepEqual(L.countSwipe(c, day2), { day: '2026-10-23', count: 1 });
  assert.equal(L.msUntilMidnight(new Date(2026, 9, 22, 23, 59, 0)), 60000);
});

test('free tier: photos 3 to 5 blurred, rewind is premium', () => {
  assert.equal(L.photoLocked(0, false, false), false);
  assert.equal(L.photoLocked(1, false, false), false);
  assert.equal(L.photoLocked(2, false, false), true);
  assert.equal(L.photoLocked(4, true, false), false);
  assert.equal(L.photoLocked(4, false, true), false, 'your own photos are never blurred');
  assert.equal(L.canRewind(false, ['a']), false);
  assert.equal(L.canRewind(true, ['a']), true);
  assert.equal(L.canRewind(true, []), false);
});

test('VinCupid offline rules', () => {
  const mai = byId('mai');
  assert.equal(L.heuristic('send nudes').verdict, 'block');
  assert.equal(L.heuristic('you are such a slut').category, 'harassment');
  const scam = L.heuristic('add my telegram, I have a paid modeling job in Bangkok, send your passport');
  assert.equal(scam.verdict, 'warn');
  assert.equal(scam.category, 'scam');
  assert.equal(L.heuristic('send me money via USDT').category, 'scam');
  assert.equal(L.heuristic("come to my room and don't tell anyone").category, 'ill-intent');
  const boring = L.heuristic('hi', { partner: mai });
  assert.equal(boring.verdict, 'coach');
  assert.ok(boring.openers.length >= 2 && boring.openers.some(o => o.includes(mai.favorites[0])));
  assert.equal(L.heuristic('heyyy!!').verdict, 'coach');
  assert.equal(L.heuristic('Want to get bánh mì after the Data Structures lecture?').verdict, 'ok');
  assert.equal(L.heuristic('I loved Sex Education, the show').verdict, 'ok');
});

test('AI can raise a verdict but the rules always win on severity', () => {
  const rules = L.heuristic('send nudes');
  assert.equal(L.mergeVerdicts(rules, { verdict: 'ok' }).verdict, 'block');
  const ok = L.heuristic('Nice to meet you, how was your week?');
  assert.equal(L.mergeVerdicts(ok, { verdict: 'warn', category: 'scam' }).verdict, 'warn');
});

test('ghosting: a chat goes cold after 48 hours', () => {
  const now = Date.now();
  assert.equal(L.coldStatus([{ from: 'me', t: now - 3600e3 }], 'me', now), null);
  assert.deepEqual(L.coldStatus([{ from: 'me', t: now - 50 * 3600e3 }], 'me', now), { since: now - 50 * 3600e3, waitingOn: 'them' });
  assert.equal(L.coldStatus([{ from: 'x', t: now - 50 * 3600e3 }], 'me', now).waitingOn, 'you');
  assert.equal(L.coldStatus([], 'me', now), null);
});

test('vouch token round-trip, including Vietnamese names', () => {
  const tok = L.makeVouchToken({ u: 'minh-tri', n: 'Bảo Anh', r: 'best friend', by: 'linh', t: 1 });
  assert.match(tok, /^[A-Za-z0-9_-]+$/, 'token is URL-safe');
  assert.deepEqual(L.readVouchToken(tok), { u: 'minh-tri', n: 'Bảo Anh', r: 'best friend', by: 'linh', t: 1 });
  assert.equal(L.readVouchToken('garbage!!'), null);
  assert.equal(L.readVouchToken(L.b64urlEncode('{"u":1}')), null);
  assert.deepEqual(L.vouchSummary([{ rating: 4, rel: 'ex' }, { rating: 5, rel: 'best friend' }]), { avg: 4.5, count: 2, rel: 'best friend' });
});

test('sign-in and LinkedIn input checks', () => {
  assert.ok(L.isVinUniEmail('tri.nhm@vinuni.edu.vn'));
  assert.ok(!L.isVinUniEmail('tri@gmail.com'));
  assert.ok(!L.isVinUniEmail('tri@vinuni.edu.vn.evil.com'));
  assert.equal(L.linkedInSlug('https://www.linkedin.com/in/nguyen-hoang-minh-tri-vinuni/'), 'nguyen-hoang-minh-tri-vinuni');
  assert.equal(L.linkedInSlug('linkedin.com/in/abc'), 'abc');
  assert.equal(L.linkedInSlug('https://linkedin.com/company/vinuni'), null);
  const li = L.mockLinkedIn(byId('thanh-ngan'), 'thanh-ngan-tran');
  assert.equal(li.demo, true);
  assert.match(li.headline, /TA, Marketing/);
});

test('mock data is consistent', () => {
  const ids = new Set();
  for (const u of D.users) {
    assert.ok(!ids.has(u.id), `duplicate id ${u.id}`);
    ids.add(u.id);
    assert.ok(L.isAdult(u.dob), `${u.id} is an adult`);
    assert.equal(u.greenFlags.length, 3, `${u.id} has 3 green flags`);
    assert.equal(u.redFlags.length, 3, `${u.id} has 3 red flags`);
    assert.equal(u.favorites.length, 5, `${u.id} has 5 favourites`);
    assert.ok(D.COLLEGES[u.college], `${u.id} has a real college`);
    assert.ok(['student', 'faculty'].includes(u.mode));
    if (u.mode === 'faculty') assert.ok(D.ROLES.includes(u.facultyRole), `${u.id} has a faculty role`);
  }
  for (const pool of Object.values(D.SEEDS)) for (const k of ['ongoing', 'cold', 'scam']) assert.ok(ids.has(pool[k]));
});
