// Progress kept in each visitor's own browser (localStorage). Pure helpers take the state object
// and mutate it; load/save are the only functions that touch storage.
export const KEY = 'ccvn:v1';

export const empty = () => ({ v: 1, answers: {}, sessions: {}, read: {}, cards: {} });

export function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    return s && s.v === 1 ? { ...empty(), ...s } : empty();
  } catch {
    return empty(); // private mode, blocked storage or corrupt JSON
  }
}

export function save(storage, s) {
  try { storage.setItem(KEY, JSON.stringify(s)); } catch { /* quota or blocked: progress just isn't kept */ }
}

export const certOf = (qid) => qid.split('-').slice(0, 2).join('-'); // "ccar-p-m1-3" -> "ccar-p"

export const isCorrect = (pick, answer) =>
  pick.length === answer.length && answer.every((a) => pick.includes(a));

// Latest answer wins, so answering a wrong question correctly takes it off the wrong list.
export function record(s, q, pick) {
  s.answers[q.id] = { pick: [...pick], correct: isCorrect(pick, q.answer), at: Date.now() };
  return s.answers[q.id];
}

export function clearAnswer(s, qid) { delete s.answers[qid]; }

export const wrongIds = (s, questions) =>
  questions.filter((q) => s.answers[q.id] && !s.answers[q.id].correct).map((q) => q.id);

export function stats(s, questions) {
  let answered = 0, correct = 0;
  for (const q of questions) {
    const a = s.answers[q.id];
    if (a) { answered++; if (a.correct) correct++; }
  }
  return { total: questions.length, answered, correct, wrong: answered - correct };
}

export function domainStats(s, questions) {
  const by = {};
  for (const q of questions) {
    const d = (by[q.domain] ||= { total: 0, answered: 0, correct: 0 });
    d.total++;
    const a = s.answers[q.id];
    if (a) { d.answered++; if (a.correct) d.correct++; }
  }
  return by;
}

// Reset everything this visitor did for one certification (answers, open sessions, lessons read).
export function resetCert(s, cert) {
  for (const id of Object.keys(s.answers)) if (certOf(id) === cert) delete s.answers[id];
  for (const k of Object.keys(s.sessions)) if (k.startsWith(cert + ':')) delete s.sessions[k];
  for (const k of Object.keys(s.read)) if (k.startsWith(cert + '/')) delete s.read[k];
}

export function shuffled(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// set: 'all' | 'wrong' | 'mock1'..'mock3'; domains: array of domain numbers or null for all.
export function selectQuestions(s, questions, { set = 'all', domains = null, shuffle = false, rng } = {}) {
  let qs = set.startsWith('mock') ? questions.filter((q) => q.set === set) : questions;
  if (set === 'wrong') qs = qs.filter((q) => s.answers[q.id] && !s.answers[q.id].correct);
  if (domains) qs = qs.filter((q) => domains.includes(q.domain));
  return (shuffle ? shuffled(qs, rng) : qs).map((q) => q.id);
}

export const sessionKey = (cert, kind) => `${cert}:${kind}`;

export function startSession(s, { cert, kind, ids, explain, minutes = 0, label = '' }) {
  const now = Date.now();
  const session = { cert, kind, ids, explain, label, i: 0, picks: {}, peek: {}, flags: {}, submitted: false,
    startedAt: now, deadline: minutes ? now + minutes * 60000 : null };
  s.sessions[sessionKey(cert, kind)] = session;
  return session;
}

// "Explain at the end" and mock exams: record every question, unanswered ones as wrong.
export function submitSession(s, session, byId) {
  for (const id of session.ids) record(s, byId[id], session.picks[id] || []);
  session.submitted = true;
  session.finishedAt = Date.now();
}

export function sessionScore(session, byId) {
  let correct = 0;
  const byDomain = {};
  for (const id of session.ids) {
    const q = byId[id];
    const ok = isCorrect(session.picks[id] || [], q.answer);
    const d = (byDomain[q.domain] ||= { total: 0, correct: 0 });
    d.total++;
    if (ok) { correct++; d.correct++; }
  }
  return { total: session.ids.length, correct, byDomain };
}
