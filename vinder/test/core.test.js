// Run with: node --test vinder/test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
globalThis.Logic = require('../src/logic.js');
globalThis.VinderData = require('../src/data.js');
const C = require('../src/core.js');
C.config.replyDelay = [0, 0];

const fresh = id => { C.reset(); if (id) C.login(id); };

test('first sign-in seeds a normal chat, a cold one and a scam attempt', () => {
  fresh('minh-tri');
  const a = C.acc();
  assert.deepEqual(Object.keys(a.matches).sort(), ['giang', 'lucas', 'mai']);
  assert.equal(a.chats.lucas[0].flag, 'scam');
  assert.equal(C.unreadCount(), 2, 'Mai and Lucas have unread messages');
  assert.ok(!C.deck().some(u => a.matches[u.id]), 'matched people are not in the deck');
  fresh('thanh-ngan');
  assert.deepEqual(Object.keys(C.acc().matches).sort(), ['alex', 'bao', 'hanh']);
});

test('swiping: likes back match, the free counter runs out at 10', () => {
  fresh('minh-tri');
  const an = C.byId('an');
  assert.equal(C.swipe(an, 'like').matched, true, 'An already likes Minh Tri');
  assert.equal(C.swipesLeft(), 9);
  assert.ok(!C.likers().some(u => u.id === 'an'), 'once swiped, An leaves the Likes grid');
  while (C.swipesLeft() > 0) C.swipe(C.deck()[0], 'pass');
  assert.equal(C.swipesLeft(), 0);
  C.setPremium(true);
  assert.equal(C.swipesLeft(), Infinity);
});

test('rewind is Premium-only and brings the last card back', () => {
  fresh('minh-tri');
  const first = C.deck()[0];
  C.swipe(first, 'pass');
  assert.deepEqual(C.rewind(), { ok: false, reason: 'premium' });
  C.setPremium(true);
  assert.deepEqual(C.rewind(), { ok: true, id: first.id });
  assert.equal(C.deck()[0].id, first.id);
  assert.deepEqual(C.rewind(), { ok: false, reason: 'empty' });
});

test('sending: harassment is blocked, "hi" is coached, scams get a warning', async () => {
  fresh('minh-tri');
  const mai = C.byId('mai'), count = () => C.realMessages('mai').length;
  const n0 = count();
  assert.equal((await C.send(mai, 'send nudes')).status, 'blocked');
  assert.equal(count(), n0, 'the blocked message is never stored as sent');
  assert.equal(C.acc().chats.mai.slice(-1)[0].kind, 'block');
  assert.equal((await C.send(mai, 'hi')).status, 'sent');
  const coach = C.acc().chats.mai.slice(-1)[0];
  assert.equal(coach.kind, 'coach');
  assert.ok(coach.openers.length >= 2);
  await C.send(mai, 'add my telegram, I have a paid modeling job');
  assert.equal(C.acc().chats.mai.slice(-1)[0].kind, 'warn');
  assert.equal((await C.send(mai, '   ')).status, 'skipped');
});

test('mock replies: scripted, and the scam account keeps flagging itself', async () => {
  fresh('minh-tri');
  const events = [];
  C.on('typing', (id, on) => events.push(`typing:${id}:${on}`));
  const msg = await C.reply(C.byId('mai'));
  assert.equal(msg.from, 'mai');
  assert.deepEqual(events.slice(-2), ['typing:mai:true', 'typing:mai:false']);
  const scam = await C.reply(C.byId('lucas'));
  assert.equal(scam.flag, 'scam');
});

test('block and unmatch remove the chat; blocked people never come back', () => {
  fresh('minh-tri');
  C.block(C.byId('lucas'));
  assert.ok(!C.acc().matches.lucas && !C.acc().chats.lucas);
  assert.ok(!C.matchLists().convos.includes('lucas'));
  C.unmatch(C.byId('giang'));
  assert.ok(!C.acc().matches.giang);
  C.report(C.byId('mai'), 'other', ' note ');
  assert.equal(C.acc().reports[0].note, 'note');
});

test('vouches: notes are screened, disputes are recorded by flag', async () => {
  fresh('minh-tri');
  const tok = C.L.makeVouchToken({ u: 'minh-tri', n: 'Bảo Anh', r: 'best friend' });
  assert.equal((await C.submitVouch(tok, { rating: 5, disputed: {}, note: 'he is a slut' })).ok, false);
  assert.equal((await C.submitVouch(tok, { rating: 0, disputed: {}, note: 'Great friend' })).ok, false);
  assert.equal((await C.submitVouch('nope', { rating: 5, disputed: {}, note: 'Great friend' })).ok, false);
  assert.deepEqual(await C.submitVouch(tok, { rating: 4, disputed: { 3: true }, note: 'Loyal, terrible at karaoke' }), { ok: true });
  const v = C.S.vouches['minh-tri'].slice(-1)[0];
  assert.deepEqual(v.disputed, ['Poses on lecture-hall ledges']);
  assert.equal(v.by, 'Bảo Anh');
});

test('sign-up creates a profile, logs in and is found again by email', () => {
  fresh();
  C.startSignup('vy@vinuni.edu.vn');
  Object.assign(C.S.draft, {
    mode: 'student', college: 'CHS', major: 'Nursing', goal: 'New friends', name: 'Nguyen Thao Vy', dob: '2006-02-20',
    gender: 'female', interestedIn: 'everyone', heightCm: '162', favorites: ['A', 'B', 'C', 'D', 'E'], bio: 'Hello there, nice to meet you all.',
    greenFlags: ['g1', 'g2', 'g3'], redFlags: ['r1', 'r2', 'r3'], instagram: '@vy.nurse', vcName: 'Quỳnh',
  });
  const p = C.finishSignup();
  assert.equal(C.S.me, p.id);
  assert.equal(p.short, 'Vy');
  assert.deepEqual(p.socials, [{ kind: 'instagram', url: 'instagram.com/vy.nurse' }]);
  assert.deepEqual(p.vouchContacts, [{ name: 'Quỳnh', rel: 'best friend' }]);
  assert.equal(C.S.draft, null);
  assert.equal(Object.keys(C.acc().matches).length, 3, 'new accounts get the demo chats too');
  assert.equal(C.findByEmail('vy@vinuni.edu.vn').id, p.id);
  assert.equal(C.completeness(p), 67, 'favourites, flags, a social and a vouch contact; no photos, short bio');
});

test('editing a demo profile keeps its photos and vouch contacts', () => {
  fresh('minh-tri');
  const d = C.toDraft(C.me());
  d.bio = 'New bio for testing the round trip.';
  d.heightPrivate = true;
  C.saveProfile(d);
  const u = C.me();
  assert.equal(u.bio, 'New bio for testing the round trip.');
  assert.equal(u.heightCm, null);
  assert.equal(u.photos.length, 4);
  assert.deepEqual(u.vouchContacts, [{ name: 'Bảo Anh', rel: 'best friend' }]);
  C.updateMe(p => p.vouchContacts.push({ name: 'Linh', rel: 'ex' }));
  assert.equal(C.me().vouchContacts.length, 2);
});

test('state survives a reload; reset wipes it', () => {
  fresh('minh-tri');
  C.setAI('AIza-test', '');
  C.reload();
  assert.equal(C.S.me, 'minh-tri');
  assert.equal(C.S.gemKey, 'AIza-test');
  assert.equal(C.S.gemModel, C.MODELS[0], 'an empty model falls back to the default');
  C.reset();
  C.reload();
  assert.equal(C.S.me, null);
});
