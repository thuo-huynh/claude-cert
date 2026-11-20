import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../assets/js/store.js';

const qs = [
  { id: 'ccar-p-p1', set: 'practice', domain: 1, answer: ['A'] },
  { id: 'ccar-p-p2', set: 'practice', domain: 2, answer: ['B', 'D'] },
  { id: 'ccar-p-m1-1', set: 'mock1', domain: 1, answer: ['C'] },
];
const byId = Object.fromEntries(qs.map((q) => [q.id, q]));

const mem = () => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; } }; };

test('load falls back to empty on missing, corrupt or throwing storage', () => {
  assert.deepEqual(S.load(mem()), S.empty());
  assert.deepEqual(S.load({ getItem: () => '{bad' }), S.empty());
  assert.deepEqual(S.load({ getItem: () => { throw new Error('blocked'); } }), S.empty());
});

test('save then load round-trips answers', () => {
  const st = mem(), s = S.empty();
  S.record(s, qs[0], ['A']);
  S.save(st, s);
  assert.equal(S.load(st).answers['ccar-p-p1'].correct, true);
});

test('isCorrect needs the exact set, any order', () => {
  assert.ok(S.isCorrect(['D', 'B'], ['B', 'D']));
  assert.ok(!S.isCorrect(['B'], ['B', 'D']));
  assert.ok(!S.isCorrect([], ['A']));
});

test('latest answer wins: answering correctly removes from wrong list', () => {
  const s = S.empty();
  S.record(s, qs[0], ['B']);
  assert.deepEqual(S.wrongIds(s, qs), ['ccar-p-p1']);
  S.record(s, qs[0], ['A']);
  assert.deepEqual(S.wrongIds(s, qs), []);
});

test('selectQuestions filters by set, wrong and domain', () => {
  const s = S.empty();
  S.record(s, qs[1], ['B']);
  assert.deepEqual(S.selectQuestions(s, qs, { set: 'all' }), qs.map((q) => q.id));
  assert.deepEqual(S.selectQuestions(s, qs, { set: 'mock1' }), ['ccar-p-m1-1']);
  assert.deepEqual(S.selectQuestions(s, qs, { set: 'wrong' }), ['ccar-p-p2']);
  assert.deepEqual(S.selectQuestions(s, qs, { set: 'all', domains: [1] }), ['ccar-p-p1', 'ccar-p-m1-1']);
  assert.equal(S.selectQuestions(s, qs, { shuffle: true, rng: () => 0 }).length, 3);
});

test('submitSession records unanswered as wrong and scores by domain', () => {
  const s = S.empty();
  const sess = S.startSession(s, { cert: 'ccar-p', kind: 'practice', ids: qs.map((q) => q.id), explain: 'end' });
  sess.picks['ccar-p-p1'] = ['A'];
  sess.picks['ccar-p-p2'] = ['B', 'D'];
  S.submitSession(s, sess, byId);
  assert.equal(sess.submitted, true);
  assert.deepEqual(S.wrongIds(s, qs), ['ccar-p-m1-1']);
  const sc = S.sessionScore(sess, byId);
  assert.equal(sc.correct, 2);
  assert.deepEqual(sc.byDomain[1], { total: 2, correct: 1 });
});

test('resetCert clears only that certification', () => {
  const s = S.empty();
  S.record(s, qs[0], ['A']);
  S.record(s, { id: 'ccao-f-p1', answer: ['A'] }, ['A']);
  S.startSession(s, { cert: 'ccar-p', kind: 'mock1', ids: [], explain: 'end' });
  s.read['ccar-p/1-1'] = true;
  S.resetCert(s, 'ccar-p');
  assert.deepEqual(Object.keys(s.answers), ['ccao-f-p1']);
  assert.deepEqual(s.sessions, {});
  assert.deepEqual(s.read, {});
});

test('certOf parses ids', () => {
  assert.equal(S.certOf('ccar-p-m2-14'), 'ccar-p');
  assert.equal(S.certOf('ccao-f-p5'), 'ccao-f');
});
