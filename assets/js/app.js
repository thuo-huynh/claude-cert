import * as S from './store.js';

const $app = document.getElementById('app');
const storage = (() => { try { return window.localStorage; } catch { return null; } })() || { getItem: () => null, setItem() {} };
let state = S.load(storage);
const persist = () => S.save(storage, state);
const SOURCE_SITE = 'https://anthropic.cloudexam.pro';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Source text uses **bold** and `code` only; escape first, then format.
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// ---------- data ----------
const cache = {};
const getJSON = (url) => (cache[url] ||= fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }));
const getText = (url) => (cache[url] ||= fetch(url).then((r) => { if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.text(); }));
const certList = () => getJSON('data/certs.json');

async function loadCert(code) {
  const list = await certList();
  if (!list.some((c) => c.code === code)) throw new Error('not-found');
  const [d, vi, lessons] = await Promise.all([
    getJSON(`data/${code}.json`),
    getJSON(`data/vi/${code}.json`).catch(() => ({})),
    getJSON(`content/${code}/index.json`).catch(() => []),
  ]);
  if (!d.byId) {
    for (const q of d.questions) if (q.domain == null && vi[q.id]?.domain) q.domain = vi[q.id].domain;
    Object.assign(d, { byId: Object.fromEntries(d.questions.map((q) => [q.id, q])), vi, lessons });
  }
  return d;
}
const domainName = (d, n) => d.domains.find((x) => x.n === n)?.name || `Domain ${n}`;
const lessonsOf = (d) => d.lessons.filter((l) => l.task);

// ---------- routing ----------
function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return { parts: path.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query) };
}
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

let actions = {};   // data-act name -> handler, replaced by each view
let cleanup = [];   // timers to clear when the route changes
let lastRoute = '';
const ui = { showVi: {}, showEn: {}, setup: null, review: 'wrong' };

async function render() {
  const route = location.hash.split('?')[0];
  const routeChanged = route !== lastRoute;
  lastRoute = route;
  cleanup.forEach((f) => f()); cleanup = [];
  let parts = [], query;
  const focusKey = document.activeElement?.dataset?.act ? `${document.activeElement.dataset.act}|${document.activeElement.dataset.arg ?? ''}` : null;
  let html;
  actions = {};
  try {
    ({ parts, query } = parseHash());
    html = await view(parts, query);
  } catch (e) {
    console.error(e);
    html = e.message === 'not-found'
      ? `<div class="wrap section"><h1 class="page-title">Không tìm thấy trang</h1><p><a href="#/">Về trang chủ</a></p></div>`
      : `<div class="wrap section"><h1 class="page-title">Không tải được dữ liệu</h1><p class="muted">${esc(e.message)}</p><p><button class="btn" data-act="reload">Thử lại</button></p></div>`;
    actions.reload = () => location.reload();
  }
  if (html == null) return; // view redirected
  $app.innerHTML = html;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = (a.dataset.nav === 'home' && (!parts[0] || parts[0] === 'c' || parts[0] === 'kien-thuc')) || (a.dataset.nav === 'progress' && parts[0] === 'tien-do') || (a.dataset.nav === 'glossary' && parts[0] === 'thuat-ngu');
    a.toggleAttribute('aria-current', false);
    if (on) a.setAttribute('aria-current', 'page');
  });
  if (routeChanged) { window.scrollTo(0, 0); $app.focus({ preventScroll: true }); }
  else if (focusKey) {
    const [act, arg] = focusKey.split('|');
    const el = [...$app.querySelectorAll(`[data-act="${act}"]`)].find((x) => (x.dataset.arg ?? '') === arg);
    (el && !el.disabled ? el : $app.querySelector('#exph'))?.focus({ preventScroll: true });
  }
  afterRender.forEach((f) => f()); afterRender = [];
}
let afterRender = [];

function view(parts, query) {
  const [a, b, c, d] = parts;
  if (!a) return homeView();
  if (a === 'c' && b && !c) return certView(b);
  if (a === 'c' && c === 'luyen-tap') return setupView(b, query);
  if (a === 'c' && c === 'thi-thu') return mockListView(b);
  if (a === 'c' && c === 'lam' && d) return runnerView(b, d, query);
  if (a === 'c' && c === 'ket-qua' && d) return resultView(b, d);
  if (a === 'c' && (c === 'cheat-sheet' || c === 'ghi-chu')) return markdownView(b, c);
  if (a === 'kien-thuc' && b) return lessonView(b, c || 'on-nhanh');
  if (a === 'tien-do') return progressView();
  if (a === 'thuat-ngu') return glossaryView();
  throw new Error('not-found');
}

$app.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (link && !link.getAttribute('href').startsWith('#/')) { // in-page anchor inside lesson content
    e.preventDefault();
    document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const el = e.target.closest('[data-act]');
  if (el && actions[el.dataset.act] && !el.disabled) { e.preventDefault(); actions[el.dataset.act](el.dataset.arg, el); }
});
$app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el && actions[el.dataset.change]) actions[el.dataset.change](el);
});
window.addEventListener('hashchange', render);
// Another tab saved progress (or reset it): adopt it so this tab doesn't write stale state back.
window.addEventListener('storage', (e) => { if (e.key === S.KEY || e.key === null) { state = S.load(storage); render(); } });
document.querySelector('.skip').addEventListener('click', (e) => { e.preventDefault(); $app.focus(); });
document.getElementById('theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('ccvn:theme', next); } catch { /* not kept */ }
  if ($app.querySelector('.mermaid')) render(); // diagrams are drawn with theme colours
});

// ---------- shared bits ----------
const bar = (p, cls = '') => `<div class="bar ${cls}" role="img" aria-label="${p}%"><span style="width:${p}%"></span></div>`;
// Fixed mock sets when the source provides them (CCAR-P); otherwise draw an exam-length random set.
const mockIds = (d, k) => (d.questions.some((q) => q.set === k)
  ? S.selectQuestions(state, d.questions, { set: k })
  : S.shuffled(d.questions.map((q) => q.id)).slice(0, d.mockSize || 60));
const KIND_LABEL = { practice: 'Luyện tập', mock1: 'Thi thử · Đề 1', mock2: 'Thi thử · Đề 2', mock3: 'Thi thử · Đề 3' };

function certHeader(d, active) {
  const t = (key, href, label) => `<a href="${href}"${key === active ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<p class="crumb"><a href="#/">Trang chủ</a> / ${esc(d.name)}</p>
  <div class="row"><div class="grow"><span class="chip accent">${esc(d.examCode)}</span>
  <h1 class="page-title" style="margin-top:8px">${esc(d.name)}</h1></div></div>
  <nav class="tabs" aria-label="Mục của chứng chỉ">
    ${t('overview', `#/c/${d.code}`, 'Tổng quan')}
    ${d.lessons.length ? t('lessons', `#/kien-thuc/${d.code}`, 'Kiến thức') : ''}
    ${t('practice', `#/c/${d.code}/luyen-tap`, 'Luyện tập')}
    ${t('mock', `#/c/${d.code}/thi-thu`, 'Thi thử')}
    ${t('cheat', `#/c/${d.code}/cheat-sheet`, 'Cheat sheet')}
    ${t('notes', `#/c/${d.code}/ghi-chu`, 'Ghi chú')}
  </nav>`;
}

function confirmReset(msg, fn) { if (confirm(msg)) { fn(); persist(); render(); } }

// ---------- home ----------
async function homeView() {
  const list = await certList();
  const all = await Promise.all(list.map((c) => loadCert(c.code)));
  const open = Object.entries(state.sessions).filter(([, s]) => !s.submitted).sort((x, y) => y[1].startedAt - x[1].startedAt)[0];
  let resume = `<p class="label">Bắt đầu từ đâu?</p><h2 style="font-size:20px;line-height:28px;margin-bottom:12px">Chưa có bài nào đang làm</h2>
    <p class="small muted" style="margin:0 0 16px">Chọn một chứng chỉ bên dưới. Đáp án bạn chọn được lưu trên trình duyệt này, và bạn có thể xoá bất cứ lúc nào.</p>`;
  if (open) {
    const [, s] = open;
    const d = all.find((x) => x.code === s.cert);
    const done = s.ids.filter((id) => s.picks[id]?.length).length;
    const wrong = S.wrongIds(state, d.questions).length;
    resume = `<p class="label">Đang làm dở</p>
      <h2 style="font-size:20px;line-height:28px;margin-bottom:12px">${esc(d.name)} · ${esc(s.label || KIND_LABEL[s.kind])}</h2>
      ${bar(pct(done, s.ids.length))}
      <p class="small muted" style="margin:8px 0 16px">${done}/${s.ids.length} câu đã trả lời</p>
      <div class="row"><a class="btn primary" href="#/c/${s.cert}/lam/${s.kind}">Làm tiếp câu ${Math.min(s.i + 1, s.ids.length)}</a>
      ${wrong ? `<a class="btn danger" href="#/c/${s.cert}/luyen-tap?set=wrong">Làm lại ${wrong} câu sai</a>` : ''}</div>`;
  }
  return `<div class="wrap">
  <section class="hero">
    <div>
      <p class="eyebrow"><span class="tag">EN</span> Câu hỏi tiếng Anh · Giải thích tiếng Việt</p>
      <h1>Ôn thi chứng chỉ Claude theo cách dễ hiểu nhất</h1>
      <p class="lead">Làm câu hỏi giống đề thật, sai chỗ nào đọc giải thích chỗ đó. Tiến độ lưu ngay trên trình duyệt của bạn, không cần đăng ký.</p>
      <div class="row"><a class="btn primary lg" href="#chon">Chọn chứng chỉ</a><a class="btn lg" href="#/tien-do">Xem tiến độ</a></div>
    </div>
    <div class="card raised">${resume}</div>
  </section>
  <section class="section" id="chon">
    <h2>Chọn chứng chỉ</h2>
    <p class="muted" style="margin:0 0 24px">Cả bốn kỳ thi đều 120 phút, điểm đậu 720/1000, thi qua Pearson VUE bằng tiếng Anh.</p>
    <div class="grid">${all.map((d) => {
      const st = S.stats(state, d.questions);
      return `<a class="card certcard" href="#/c/${d.code}">
        <span class="chip accent" style="align-self:flex-start">${esc(d.examCode)}</span>
        <h3>${esc(d.name)}</h3>
        <span class="small muted" style="flex-grow:1">${esc(d.facts.questions)}</span>
        <span class="small muted">${d.questions.length} câu luyện · ${lessonsOf(d).length} bài kiến thức · ${esc(d.facts.fee?.split(',')[0])}</span>
        ${bar(pct(st.answered, st.total), 'thin')}
        <span class="small muted">Đã làm ${st.answered}/${st.total}${st.answered ? ` · đúng ${pct(st.correct, st.answered)}%` : ''}</span>
      </a>`;
    }).join('')}</div>
  </section>
  <section class="section">
    <h2>Học theo 3 bước</h2>
    <div class="steps" style="margin-top:16px">
      <div><b class="n">1</b><b>Đọc kiến thức</b><p class="small muted" style="margin:4px 0 0">Bài học tiếng Việt theo từng task của đề, kèm bẫy đề và mẹo chọn đáp án.</p></div>
      <div><b class="n">2</b><b>Luyện từng câu</b><p class="small muted" style="margin:4px 0 0">Chọn giải thích ngay sau mỗi câu, hoặc làm hết rồi xem giải thích một lượt.</p></div>
      <div><b class="n">3</b><b>Thi thử có bấm giờ</b><p class="small muted" style="margin:4px 0 0">Mỗi chứng chỉ có 3 đề. Nộp bài xong biết domain nào còn yếu, câu sai được gom lại để làm lại.</p></div>
    </div>
  </section></div>`;
}

// ---------- certification overview ----------
async function certView(code) {
  const d = await loadCert(code);
  const ds = S.domainStats(state, d.questions);
  const wrong = S.wrongIds(state, d.questions).length;
  const st = S.stats(state, d.questions);
  const f = d.facts;
  actions.resetCert = () => confirmReset(`Xoá toàn bộ đáp án, bài đang làm và bài đã đọc của ${d.name}? Không hoàn tác được.`, () => S.resetCert(state, code));
  return `<div class="wrap">${certHeader(d, 'overview')}
  <div class="row" style="margin-bottom:24px">
    <a class="btn primary" href="#/c/${code}/luyen-tap">Luyện tập</a>
    ${wrong ? `<a class="btn danger" href="#/c/${code}/luyen-tap?set=wrong">Làm lại câu sai <span class="chip bad" style="line-height:20px">${wrong}</span></a>` : ''}
    ${d.lessons.length ? `<a class="btn" href="#/kien-thuc/${code}">Đọc kiến thức</a>` : ''}
  </div>
  <div class="split">
    <section class="main card">
      <h2 style="font-size:20px;line-height:28px">Các domain trong đề</h2>
      <p class="small muted" style="margin:4px 0 16px">Tỷ trọng càng cao càng nhiều câu. Bấm vào một domain để luyện riêng phần đó.</p>
      ${d.domains.map((x) => {
        const s = ds[x.n] || { total: 0, answered: 0, correct: 0 };
        return `<a class="domrow" href="#/c/${code}/luyen-tap?domain=${x.n}">
          <span><b lang="en">${x.n}. ${esc(x.name)}</b><span class="small muted">${s.answered}/${s.total} câu đã làm${s.answered ? ` · đúng ${pct(s.correct, s.answered)}%` : ''}</span></span>
          <strong style="text-align:right">${esc(x.weight)}</strong>${bar(pct(s.answered, s.total), 'thin')}</a>`;
      }).join('')}
    </section>
    <aside class="side">
      <div class="card"><h2 style="font-size:20px;line-height:28px;margin-bottom:16px">Thông tin kỳ thi</h2>
        <dl class="facts"><dt>Mã thi</dt><dd>${esc(d.examCode)}</dd><dt>Số câu</dt><dd lang="en">${esc(f.questions)}</dd><dt>Thời gian</dt><dd lang="en">${esc(f.time)}</dd>
        <dt>Điểm đậu</dt><dd lang="en">${esc(f.passing)}</dd><dt>Lệ phí</dt><dd lang="en">${esc(f.fee?.split('[')[0].replace(/,\s*before.*$/, ''))}</dd><dt>Hiệu lực</dt><dd lang="en">${esc(f.validity)}</dd></dl></div>
      <div class="card"><h2 style="font-size:20px;line-height:28px;margin-bottom:12px">Tiến độ của bạn</h2>
        ${bar(pct(st.answered, st.total))}
        <p class="small muted" style="margin:8px 0 16px">${st.answered}/${st.total} câu · đúng ${st.correct} · sai ${st.wrong}</p>
        <button class="btn ghost" data-act="resetCert" style="padding:0">Xoá tiến độ chứng chỉ này</button></div>
    </aside>
  </div></div>`;
}

// ---------- setup (choose practice mode) ----------
async function setupView(code, query) {
  const d = await loadCert(code);
  if (!ui.setup || ui.setup.code !== code || query.toString()) {
    ui.setup = { code, set: query.get('set') === 'wrong' ? 'wrong' : 'all', explain: 'now', shuffle: false,
      domains: query.get('domain') ? [Number(query.get('domain'))] : d.domains.map((x) => x.n) };
    if (query.toString()) { history.replaceState(null, '', `#/c/${code}/luyen-tap`); lastRoute = `#/c/${code}/luyen-tap`; }
  }
  const u = ui.setup;
  const wrongN = S.wrongIds(state, d.questions).length;
  if (u.set === 'wrong' && !wrongN) u.set = 'all';
  const all = u.domains.length === d.domains.length;
  const ids = S.selectQuestions(state, d.questions, { set: u.set, domains: all ? null : u.domains });
  const open = state.sessions[S.sessionKey(code, 'practice')];
  const openDone = open && !open.submitted ? open.ids.filter((id) => open.picks[id]?.length).length : 0;

  Object.assign(actions, {
    set: (v) => { if (v === 'wrong' && !wrongN) return; u.set = v; render(); },
    explain: (v) => { u.explain = v; render(); },
    shuffle: (el) => { u.shuffle = el.checked; },
    dom: (v) => { const n = Number(v); u.domains = u.domains.includes(n) ? u.domains.filter((x) => x !== n) : [...u.domains, n].sort(); render(); },
    domAll: () => { u.domains = all ? [] : d.domains.map((x) => x.n); render(); },
    discard: () => { delete state.sessions[S.sessionKey(code, 'practice')]; persist(); render(); },
    start: () => {
      const picked = S.selectQuestions(state, d.questions, { set: u.set, domains: all ? null : u.domains, shuffle: u.shuffle });
      if (!picked.length) return;
      if (open && !open.submitted && !confirm('Bạn đang có một lượt làm dở. Bắt đầu lượt mới sẽ bỏ lượt đó. Tiếp tục?')) return;
      S.startSession(state, { cert: code, kind: 'practice', ids: picked, explain: u.explain,
        label: `${u.set === 'wrong' ? 'Làm lại câu sai' : 'Tất cả câu'} · ${u.explain === 'now' ? 'Giải thích ngay' : 'Giải thích cuối bài'}` });
      persist(); go(`#/c/${code}/lam/practice`);
    },
  });
  const opt = (group, val, title, desc, disabled = false) =>
    `<button class="opt" role="radio" aria-checked="${u[group] === val}" ${disabled ? 'aria-disabled="true"' : ''} data-act="${group}" data-arg="${val}"><b>${title}</b><span>${desc}</span></button>`;
  return `<div class="wrap narrow">${certHeader(d, 'practice')}
  <h2 style="font-size:28px;line-height:36px;margin-bottom:20px">Bạn muốn luyện thế nào?</h2>
  ${open && !open.submitted ? `<div class="banner"><p><strong>Bạn còn một lượt đang làm dở:</strong> ${esc(open.label)} · ${openDone}/${open.ids.length} câu</p>
    <a class="btn primary" href="#/c/${code}/lam/practice">Làm tiếp</a><button class="btn" data-act="discard">Bỏ lượt này</button></div>` : ''}
  <h3 style="font-size:20px;line-height:28px;margin-bottom:12px">1. Làm câu nào?</h3>
  <div class="choice" role="radiogroup" aria-label="Bộ câu hỏi">
    ${opt('set', 'all', `Tất cả câu hỏi (${d.questions.length})`, 'Câu luyện tập và toàn bộ câu trong 3 đề thi thử của chứng chỉ này.')}
    ${opt('set', 'wrong', `Làm lại câu sai (${wrongN})`, wrongN ? 'Câu bạn trả lời sai ở lần gần nhất. Làm đúng là câu tự rời khỏi danh sách.' : 'Chưa có câu sai nào. Làm vài câu trước đã.', !wrongN)}
  </div>
  <h3 style="font-size:20px;line-height:28px;margin-bottom:12px">2. Xem giải thích khi nào?</h3>
  <div class="choice" role="radiogroup" aria-label="Cách giải thích">
    ${opt('explain', 'now', 'Giải thích ngay', 'Chọn đáp án xong là biết đúng/sai và đọc giải thích luôn.')}
    ${opt('explain', 'end', 'Giải thích cuối bài', 'Làm hết rồi nộp bài, sau đó xem điểm và giải thích của tất cả các câu. Không bấm giờ, được đổi đáp án trước khi nộp.')}
  </div>
  <h3 style="font-size:20px;line-height:28px;margin-bottom:12px">3. Tuỳ chọn</h3>
  <div class="card" style="padding-top:8px;padding-bottom:16px;margin-bottom:28px">
    <label class="toggle"><span class="grow"><b style="font-weight:500;display:block">Xáo trộn thứ tự câu hỏi</b><span class="small muted">Đáp án A–D giữ nguyên thứ tự để khớp với lời giải thích.</span></span>
      <input type="checkbox" data-change="shuffle" ${u.shuffle ? 'checked' : ''}></label>
    <div style="border-top:1px solid var(--border);padding-top:12px">
      <div class="row" style="margin-bottom:8px"><b class="grow" style="font-weight:500">Domain</b><button class="btn ghost" data-act="domAll" style="min-height:36px">${all ? 'Bỏ chọn hết' : 'Chọn tất cả'}</button></div>
      <div class="pills" lang="en">${d.domains.map((x) => `<button aria-pressed="${u.domains.includes(x.n)}" data-act="dom" data-arg="${x.n}">${u.domains.includes(x.n) ? '✓ ' : ''}${x.n}. ${esc(x.name)}</button>`).join('')}</div>
    </div>
  </div>
  <div class="row"><p class="grow small muted" style="margin:0">${ids.length} câu sẽ được làm${u.domains.length ? '' : ' · hãy chọn ít nhất một domain'}</p>
    <button class="btn primary lg" data-act="start" ${ids.length ? '' : 'disabled'}>Bắt đầu</button></div>
  </div>`;
}

// ---------- mock exam list ----------
async function mockListView(code) {
  const d = await loadCert(code);
  actions.startMock = (k) => {
    const old = state.sessions[S.sessionKey(code, k)];
    if (old && !old.submitted && !confirm('Đề này đang làm dở. Làm lại từ đầu?')) return;
    S.startSession(state, { cert: code, kind: k, ids: mockIds(d, k), explain: 'end', minutes: d.mockMinutes, label: KIND_LABEL[k] });
    persist(); go(`#/c/${code}/lam/${k}`);
  };
  return `<div class="wrap narrow">${certHeader(d, 'mock')}
  <p class="muted" style="margin:0 0 20px">${d.mockSize ? `Mỗi lần làm bốc ngẫu nhiên ${d.mockSize} câu từ ${d.questions.length} câu, như độ dài đề thật` : 'Mỗi đề 15 câu'}, ${d.mockMinutes} phút, không xem đáp án trong lúc làm. Hết giờ bài tự nộp.</p>
  <div style="display:flex;flex-direction:column;gap:12px">${['mock1', 'mock2', 'mock3'].map((k, i) => {
    const s = state.sessions[S.sessionKey(code, k)];
    let status = '<span class="muted small">Chưa làm</span>', btns = `<button class="btn primary" data-act="startMock" data-arg="${k}">Bắt đầu</button>`;
    if (s && !s.submitted) {
      status = `<span class="small">Đang làm · ${s.ids.filter((id) => s.picks[id]?.length).length}/${s.ids.length} câu</span>`;
      btns = `<a class="btn primary" href="#/c/${code}/lam/${k}">Làm tiếp</a><button class="btn" data-act="startMock" data-arg="${k}">Làm lại từ đầu</button>`;
    } else if (s) {
      const sc = S.sessionScore(s, d.byId);
      status = `<span class="chip ${pct(sc.correct, sc.total) >= 70 ? 'ok' : 'bad'}">${sc.correct}/${sc.total} · ${pct(sc.correct, sc.total)}%</span>`;
      btns = `<a class="btn" href="#/c/${code}/ket-qua/${k}">Xem kết quả</a><button class="btn primary" data-act="startMock" data-arg="${k}">Làm lại</button>`;
    }
    return `<div class="card row"><div class="grow"><h3 style="font-size:20px;line-height:28px">Đề ${i + 1}</h3>${status}</div>${btns}</div>`;
  }).join('')}</div></div>`;
}

// ---------- question runner (practice and mock, plus read-only review after submit) ----------
async function runnerView(code, kind, query) {
  const d = await loadCert(code);
  const s = state.sessions[S.sessionKey(code, kind)];
  if (!s) { go(kind === 'practice' ? `#/c/${code}/luyen-tap` : `#/c/${code}/thi-thu`); return null; }
  if (query.has('i')) { s.i = Math.max(0, Math.min(s.ids.length - 1, Number(query.get('i')) || 0)); history.replaceState(null, '', `#/c/${code}/lam/${kind}`); lastRoute = `#/c/${code}/lam/${kind}`; }
  const review = s.submitted;
  const isMock = kind !== 'practice';
  const now = s.explain === 'now' && !isMock;
  const id = s.ids[s.i];
  const q = d.byId[id];
  const vi = d.vi[id] || {};
  const multi = q.answer.length > 1;
  const pick = s.picks[id] || [];
  s.done ||= {};
  const revealed = review || (now && (s.done[id] || s.peek[id]));
  const answeredN = s.ids.filter((x) => s.picks[x]?.length).length;
  let right = 0, wrongN = 0;
  if (now) for (const x of s.ids) if (s.done[x]) (S.isCorrect(s.picks[x] || [], d.byId[x].answer) ? right++ : wrongN++);

  const save = () => { persist(); render(); };
  const finish = () => { S.submitSession(state, s, d.byId); persist(); go(`#/c/${code}/ket-qua/${kind}`); };
  Object.assign(actions, {
    pick: (k) => {
      if (revealed) return;
      if (multi) s.picks[id] = pick.includes(k) ? pick.filter((x) => x !== k) : [...pick, k].sort();
      else s.picks[id] = [k];
      if (now && !multi) { s.done[id] = true; S.record(state, q, s.picks[id]); }
      save();
    },
    check: () => { if (!pick.length) return; s.done[id] = true; S.record(state, q, pick); save(); },
    peek: () => { s.peek[id] = !s.peek[id]; save(); },
    redo: () => { delete s.picks[id]; delete s.peek[id]; if (s.done[id]) S.clearAnswer(state, id); delete s.done[id]; save(); },
    flag: () => { s.flags[id] = !s.flags[id]; save(); },
    goto: (i) => { s.i = Number(i); save(); window.scrollTo(0, 0); },
    prev: () => { if (s.i > 0) actions.goto(s.i - 1); },
    next: () => { if (s.i < s.ids.length - 1) actions.goto(s.i + 1); },
    vi: () => { ui.showVi[id] = !ui.showVi[id]; render(); },
    en: () => { ui.showEn[id] = !ui.showEn[id]; render(); },
    submit: () => {
      const left = s.ids.length - answeredN;
      if (!left) return finish();
      const dlg = document.getElementById('submitdlg');
      dlg.querySelector('[data-left]').textContent = left;
      dlg.showModal();
    },
    submitYes: finish,
    submitNo: () => document.getElementById('submitdlg').close(),
  });

  // keyboard: 1-6 / a-f choose, arrows move
  const onKey = (e) => {
    if (e.target.closest('input, textarea, select, dialog') || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toUpperCase();
    const byNum = '123456'.indexOf(k);
    const letter = byNum >= 0 ? q.options[byNum]?.k : q.options.find((o) => o.k === k)?.k;
    if (letter && !review) actions.pick(letter);
    else if (e.key === 'ArrowRight') actions.next();
    else if (e.key === 'ArrowLeft') actions.prev();
  };
  document.addEventListener('keydown', onKey);
  cleanup.push(() => document.removeEventListener('keydown', onKey));

  // mock timer: updates in place, auto-submits at zero
  let timer = '';
  if (isMock && s.deadline && !review) {
    const fmtT = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
    timer = `<span class="timer" role="timer" aria-label="Thời gian còn lại" data-timer>${fmtT(s.deadline - Date.now())}</span>`;
    const tick = () => {
      const left = s.deadline - Date.now();
      const el = $app.querySelector('[data-timer]');
      if (el) { el.textContent = fmtT(left); el.classList.toggle('low', left < 5 * 60000); }
      if (left <= 0) { clearInterval(h); finish(); }
    };
    const h = setInterval(tick, 1000);
    cleanup.push(() => clearInterval(h));
    if (s.deadline <= Date.now()) { finish(); return null; }
  }

  const optHtml = q.options.map((o) => {
    const isAns = q.answer.includes(o.k), picked = pick.includes(o.k);
    let cls = '';
    if (revealed) cls = isAns ? 'ok' : picked ? 'bad' : 'dim';
    else if (picked) cls = 'sel';
    const why = vi.opts?.[o.k];
    const showWhy = revealed && why;
    const badges = revealed && (isAns || picked)
      ? `<div class="badges">${isAns ? '<span class="chip ok">✓ Đáp án đúng</span>' : ''}${picked ? `<span class="chip ${isAns ? 'ok' : 'bad'}">Bạn chọn</span>` : ''}</div>` : '';
    return `<div class="option ${cls}">
      <button ${multi ? `role="checkbox" aria-checked="${picked}"` : `role="radio" aria-checked="${picked}"`} data-act="pick" data-arg="${o.k}" ${revealed ? 'disabled' : ''} lang="en">
        <span class="letter" aria-hidden="true">${o.k}</span><span><span class="vh">Đáp án ${o.k}: </span>${fmt(o.t)}${ui.showVi[id] && vi.o?.[o.k] ? `<span class="otrans" lang="vi">${fmt(vi.o[o.k])}</span>` : ''}</span></button>
      ${badges}
      ${showWhy ? `<p class="why"><b>${isAns ? 'Vì sao đúng:' : 'Vì sao sai:'}</b> ${fmt(why)}</p>` : ''}
    </div>`;
  }).join('');

  const correct = S.isCorrect(pick, q.answer);
  const hasVi = Boolean(vi.opts || vi.tip || vi.ask || vi.exp);
  const showEn = Boolean(q.why) && (ui.showEn[id] ?? !hasVi);
  const lesson = vi.lesson ? d.lessons.find((l) => l.slug === vi.lesson) : lessonsOf(d).find((l) => l.domain === q.domain);
  const explain = revealed ? `<section class="card explain" aria-labelledby="exph">
    <div class="head"><h2 id="exph" tabindex="-1">Giải thích</h2>
      ${pick.length ? `<span class="chip ${correct ? 'ok' : 'bad'}">${correct ? '✓ Bạn trả lời đúng' : '✕ Bạn trả lời chưa đúng'}</span>` : '<span class="chip">Bạn chưa trả lời</span>'}
      <span class="chip">Đáp án đúng: ${q.answer.join(', ')}</span></div>
    ${!hasVi ? '<p class="notice">Câu này chưa có giải thích tiếng Việt. Tạm thời bạn xem giải thích gốc tiếng Anh bên dưới.</p>' : ''}
    ${vi.exp ? `<p style="margin:0 0 20px">${fmt(vi.exp)}</p>` : ''}
    ${vi.tip ? `<div class="tip"><p class="label">Mẹo nhớ</p><p class="title">${fmt(vi.tip.title)}</p>${(vi.tip.body || []).map((p) => `<p>${fmt(p)}</p>`).join('')}</div>` : ''}
    ${vi.ask ? `<p class="label">Đề hỏi gì</p><p style="margin:0 0 4px;font-weight:600">${fmt(vi.ask.title)}</p><p style="margin:0 0 20px;font-size:15px;line-height:24px">${fmt(vi.ask.body)}</p>` : ''}
    <div class="row" style="border-top:1px dashed var(--border);padding-top:16px">
      ${lesson ? `<a class="btn" href="#/kien-thuc/${code}/${lesson.slug}">Học lại: ${esc(lesson.task)} · ${esc(lesson.title)}</a>` : ''}
      ${q.why ? `<button class="btn" data-act="en" aria-expanded="${showEn}"><span class="tag">EN</span>${showEn ? 'Ẩn giải thích gốc' : 'Xem giải thích gốc'}</button>` : ''}
    </div>
    ${showEn ? `<p class="en" lang="en"><strong>${q.answer.join(', ')}.</strong> ${fmt(q.why)}</p>` : ''}
  </section>` : '';

  const graded = (x) => review || (now && s.done[x]);
  const nav = `<aside class="card qnav"><h2 style="font-size:18px;line-height:26px">Điều hướng câu hỏi</h2>
    <p class="small muted" style="margin:4px 0 14px">${review ? 'Bấm một câu để xem lại' : now ? `Đúng ${right} · Sai ${wrongN} · Còn ${s.ids.length - right - wrongN}` : `Đã làm ${answeredN} · Đánh dấu ${Object.values(s.flags).filter(Boolean).length} · Còn ${s.ids.length - answeredN}`}</p>
    <nav class="qgrid" aria-label="Chuyển câu">${s.ids.map((x, i) => {
      const ok = graded(x) && S.isCorrect(s.picks[x] || [], d.byId[x].answer);
      const c = graded(x) ? (ok ? 'ok' : 'bad') : s.flags[x] ? 'flag' : s.picks[x]?.length ? 'done' : '';
      const st = graded(x) ? (ok ? ', đúng' : ', sai') : s.picks[x]?.length ? ', đã làm' : '';
      return `<button class="${c} ${i === s.i ? 'cur' : ''}" data-act="goto" data-arg="${i}" aria-label="Câu ${i + 1}${st}" ${i === s.i ? 'aria-current="true"' : ''}>${s.flags[x] && !review ? '⚑' : ''}${i + 1}</button>`;
    }).join('')}</nav>
    ${review ? '' : `<div class="legend">${now
      ? '<span><i style="background:var(--correct-soft)"></i>Đúng</span><span><i style="background:var(--wrong-soft)"></i>Sai</span>'
      : '<span><i style="background:var(--ink)"></i>Đã làm</span><span><i style="background:var(--accent-soft)"></i>⚑ Xem lại</span>'}<span><i style="border:2px solid var(--accent)"></i>Đang xem</span></div>`}
  </aside>`;

  const last = s.i === s.ids.length - 1;
  const meta = `${d.name} · ${review ? 'Xem lại · ' : ''}${s.label || KIND_LABEL[kind]}`;
  return `<div class="qhead"><div class="wrap inner">
    <a class="iconbtn" style="border:0;background:none" href="${review ? `#/c/${code}/ket-qua/${kind}` : isMock ? `#/c/${code}/thi-thu` : `#/c/${code}/luyen-tap`}" aria-label="Thoát (đã lưu)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></a>
    <div class="meta"><p>${esc(meta)}</p>
      <div class="prog"><strong style="white-space:nowrap">Câu ${s.i + 1}/${s.ids.length}</strong>${bar(pct(review ? s.i + 1 : answeredN, s.ids.length))}
      ${now ? `<span style="white-space:nowrap"><strong style="color:var(--correct)">Đúng ${right}</strong> · <strong style="color:var(--wrong)">Sai ${wrongN}</strong></span>` : ''}</div></div>
    ${timer}
    ${!review && !now ? '<button class="btn primary" data-act="submit">Nộp bài</button>' : ''}
  </div></div>
  <div class="wrap qlayout">
    <div class="qmain">
      <div class="card raised">
        <div class="qtop">
          <span class="chip">Câu ${s.i + 1}</span>
          <span class="chip">${multi ? `Chọn ${q.answer.length} đáp án` : '1 đáp án'}</span>
          ${(isMock && !review) || q.domain == null ? '' : `<span class="chip accent" lang="en">${esc(domainName(d, q.domain))}</span>`}
          <span class="grow"></span>
          ${!review && !now ? `<button class="btn" data-act="flag" aria-pressed="${!!s.flags[id]}" style="min-height:40px">${s.flags[id] ? '⚑ Đã đánh dấu' : '⚐ Đánh dấu xem lại'}</button>` : ''}
          ${vi.q ? `<button class="btn" data-act="vi" aria-pressed="${!!ui.showVi[id]}" style="min-height:40px;color:var(--info)">${ui.showVi[id] ? 'Ẩn bản dịch' : 'Dịch câu hỏi'}</button>` : ''}
        </div>
        ${q.scenarioIntro ? `<p class="scenario" lang="en"><strong>Scenario: ${esc(q.scenario)}.</strong> ${fmt(q.scenarioIntro)}</p>` : q.scenario ? `<p class="scenario" lang="en"><strong>Scenario:</strong> ${esc(q.scenario)}</p>` : ''}
        <p class="stem" lang="en">${fmt(q.q)}</p>
        ${vi.q && ui.showVi[id] ? `<p class="trans"><span class="tag">VI</span> ${fmt(vi.q)}</p>` : ''}
        <div class="options" role="${multi ? 'group' : 'radiogroup'}" aria-label="Các đáp án">${optHtml}</div>
        ${multi && now && !revealed ? `<p class="multi-hint">Chọn đủ ${q.answer.length} đáp án rồi bấm Kiểm tra.</p>` : ''}
        ${!review && !now ? '<p class="multi-hint">Đáp án được lưu ngay khi bạn chọn, đổi được tới lúc nộp bài.</p>' : ''}
      </div>
      ${explain}
      <div class="dock"><div class="inner">
        <button class="btn pill" data-act="prev" ${s.i ? '' : 'disabled'}>← <span class="hide-sm">Câu </span>trước</button>
        ${last ? (review ? '' : `<button class="btn pill primary" data-act="submit">${now ? 'Hoàn thành' : 'Nộp bài'}</button>`) : '<button class="btn pill" data-act="next"><span class="hide-sm">Câu </span>tiếp →</button>'}
        <span class="grow"></span>
        ${now && multi && !revealed ? `<button class="btn pill primary" data-act="check" ${pick.length ? '' : 'disabled'}>Kiểm tra</button>` : ''}
        ${now && revealed ? '<button class="btn pill ghost" data-act="redo">Làm lại câu này</button>' : ''}
        ${now && !s.done[id] ? `<button class="btn pill ${revealed ? '' : 'primary'}" data-act="peek">${revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}</button>` : ''}
      </div></div>
    </div>
    ${nav}
  </div>
  <dialog id="submitdlg" aria-labelledby="dlgh"><h2 id="dlgh">Còn <span data-left></span> câu chưa trả lời</h2>
    <p class="small muted">Câu chưa làm sẽ tính là sai và được thêm vào danh sách "Làm lại câu sai".</p>
    <div class="row"><button class="btn" data-act="submitNo">Làm tiếp</button><button class="btn primary" data-act="submitYes">Vẫn nộp bài</button></div></dialog>`;
}
// dialog buttons sit inside #app, so the same delegated click handler serves them.

// ---------- result ----------
async function resultView(code, kind) {
  const d = await loadCert(code);
  const s = state.sessions[S.sessionKey(code, kind)];
  if (!s || !s.submitted) { go(`#/c/${code}`); return null; }
  const sc = S.sessionScore(s, d.byId);
  const mins = Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000));
  const doms = Object.entries(sc.byDomain).map(([n, v]) => ({ n: Number(n), ...v, p: pct(v.correct, v.total) })).sort((a, b) => a.n - b.n);
  const weakest = [...doms].sort((a, b) => a.p - b.p || b.total - a.total)[0];
  const items = s.ids.map((id, i) => ({ id, i, q: d.byId[id], ok: S.isCorrect(s.picks[id] || [], d.byId[id].answer) }));
  const wrongItems = items.filter((x) => !x.ok);
  const shown = ui.review === 'wrong' ? wrongItems : items;
  actions.filter = (v) => { ui.review = v; render(); };
  actions.again = () => {
    S.startSession(state, { cert: code, kind, ids: kind === 'practice' ? s.ids : mockIds(d, kind), explain: s.explain,
      minutes: kind === 'practice' ? 0 : d.mockMinutes, label: s.label });
    persist(); go(`#/c/${code}/lam/${kind}`);
  };
  return `<div class="wrap">
  <p class="crumb"><a href="#/c/${code}">${esc(d.name)}</a> / ${esc(s.label || KIND_LABEL[kind])}</p>
  <h1 class="page-title">Kết quả của bạn</h1>
  <div class="stats">
    <div class="card stat big"><p class="label" style="color:inherit">Điểm</p><p class="num">${pct(sc.correct, sc.total)}%</p><p class="small" style="margin:0">${sc.correct}/${sc.total} câu đúng</p></div>
    <div class="card stat"><p class="label">Thời gian làm bài</p><p class="num">${mins} phút</p></div>
    <div class="card stat"><p class="label">Cần ôn thêm</p><p style="margin:4px 0;font-weight:600" lang="en">${esc(domainName(d, weakest.n))}</p><p class="small muted" style="margin:0">Đúng ${weakest.correct}/${weakest.total} câu</p></div>
  </div>
  <div class="split">
    <section class="card" style="flex:1 1 360px;min-width:0"><h2 style="font-size:20px;line-height:28px;margin-bottom:16px">Theo domain</h2>
      <div style="display:flex;flex-direction:column;gap:14px">${doms.map((x) => `<div><div class="row small" style="gap:8px;margin-bottom:4px"><span class="grow" lang="en">${esc(domainName(d, x.n))}</span><strong>${x.correct}/${x.total}</strong></div>
        <div class="bar"><span style="width:${x.p}%;background:${x.p < 60 ? 'var(--wrong)' : x.p < 80 ? 'var(--accent)' : 'var(--correct)'}"></span></div></div>`).join('')}</div></section>
    <section class="card main" style="flex:999 1 520px;min-width:0">
      <div class="row" style="margin-bottom:16px;gap:8px"><h2 class="grow" style="font-size:20px;line-height:28px">Xem lại từng câu</h2>
        <div class="pills"><button aria-pressed="${ui.review === 'wrong'}" data-act="filter" data-arg="wrong">Câu sai (${wrongItems.length})</button><button aria-pressed="${ui.review === 'all'}" data-act="filter" data-arg="all">Tất cả (${items.length})</button></div></div>
      <div style="display:flex;flex-direction:column;gap:8px">${shown.length ? shown.map((x) => `<a class="reviewitem" href="#/c/${code}/lam/${kind}?i=${x.i}">
        <span class="mark ${x.ok ? 'ok' : 'bad'}" aria-label="${x.ok ? 'Đúng' : 'Sai'}">${x.ok ? '✓' : '✕'}</span>
        <span style="min-width:0"><span class="small muted" style="display:block" lang="en">Câu ${x.i + 1} · ${esc(domainName(d, x.q.domain))}</span>
        <span lang="en" style="display:block;font-size:15px;line-height:22px">${esc(x.q.q.length > 160 ? x.q.q.slice(0, 157) + '…' : x.q.q)}</span>
        <span class="small">Bạn chọn <strong style="color:var(--${x.ok ? 'correct' : 'wrong'})">${(s.picks[x.id] || []).join(', ') || '—'}</strong> · Đáp án <strong style="color:var(--correct)">${x.q.answer.join(', ')}</strong></span></span></a>`).join('') : '<p class="muted">Không có câu sai nào. Tuyệt!</p>'}</div>
      <div class="row" style="margin-top:20px">
        ${S.wrongIds(state, d.questions).length ? `<a class="btn primary" href="#/c/${code}/luyen-tap?set=wrong">Làm lại câu sai</a>` : ''}
        <button class="btn" data-act="again">${kind === 'practice' ? 'Làm lại lượt này' : 'Làm lại đề này'}</button>
        <a class="btn ghost" href="#/c/${code}">Về trang chứng chỉ</a></div>
    </section>
  </div></div>`;
}

// ---------- lessons ----------
async function lessonView(code, slug) {
  const d = await loadCert(code);
  const meta = d.lessons.find((l) => l.slug === slug);
  if (!meta) throw new Error('not-found');
  const body = (await getText(`content/${code}/${slug}.html`))
    .replace(/href="\/(?!\/)/g, `href="${SOURCE_SITE}/`); // links to other pages of the source site
  const lessons = lessonsOf(d);
  const readKey = `${code}/${slug}`;
  const readN = lessons.filter((l) => state.read[`${code}/${l.slug}`]).length;
  const idx = lessons.findIndex((l) => l.slug === slug);
  const prev = lessons[idx - 1], next = idx >= 0 ? lessons[idx + 1] : lessons[0];
  actions.read = () => { state.read[readKey] = !state.read[readKey]; if (!state.read[readKey]) delete state.read[readKey]; persist(); render(); };
  actions.toc = (_, el) => { const t = el.closest('.toc'); t.dataset.collapsed = t.dataset.collapsed === 'true' ? 'false' : 'true'; };
  const byDomain = d.domains.map((x) => ({ ...x, items: lessons.filter((l) => l.domain === x.n) })).filter((x) => x.items.length);
  const qCount = meta.domain ? d.questions.filter((q) => q.domain === meta.domain).length : d.questions.length;
  return `<div class="wrap">
  <p class="crumb"><a href="#/">Trang chủ</a> / <a href="#/c/${code}">${esc(d.name)}</a> / Kiến thức</p>
  <div class="lessonwrap">
    <aside class="toc" aria-label="Mục lục bài học" data-collapsed="true">
      <div class="row" style="gap:8px"><p style="margin:0;font-family:var(--font-serif);font-size:20px;line-height:28px;font-weight:600" class="grow">Kiến thức ${esc(d.examCode)}</p>
        <button class="btn tocbtn" data-act="toc" style="min-height:36px">Mục lục</button></div>
      <p class="small muted" style="margin:4px 0 8px">Đã đọc ${readN}/${lessons.length} bài</p>${bar(pct(readN, lessons.length), 'thin')}
      <div class="tocbody" style="margin-top:12px">
        <ol><li><a href="#/kien-thuc/${code}" ${slug === 'on-nhanh' ? 'aria-current="page"' : ''}><span class="st"></span>Tổng quan · ôn nhanh</a></li></ol>
        ${byDomain.map((x) => `<details ${x.n === meta.domain || (!meta.domain && x.n === 1) ? 'open' : ''}><summary><span class="grow" lang="en">${x.n} · ${esc(x.name)}</span><span class="small muted">${esc(x.weight)}</span></summary>
          <ol>${x.items.map((l) => { const done = state.read[`${code}/${l.slug}`]; return `<li><a href="#/kien-thuc/${code}/${l.slug}" ${l.slug === slug ? 'aria-current="page"' : ''}>
            <span class="st ${done ? 'done' : ''}" aria-label="${done ? 'Đã đọc' : 'Chưa đọc'}">${done ? '✓' : '○'}</span><span><span class="tn">${esc(l.task)}</span> ${esc(l.title)}</span></a></li>`; }).join('')}</ol></details>`).join('')}
      </div>
    </aside>
    <div class="lessonmain">
      <div class="lesson"><article class="lmain">${body}</article></div>
      ${meta.task ? `<section class="lessonend"><div class="grow"><h2>Đọc xong rồi? Thử ngay vài câu</h2><p>${qCount} câu hỏi thuộc domain ${esc(domainName(d, meta.domain))}</p></div>
        <button class="btn ${state.read[readKey] ? 'on' : ''}" data-act="read" aria-pressed="${!!state.read[readKey]}">${state.read[readKey] ? '✓ Đã đọc' : 'Đánh dấu đã đọc'}</button>
        <a class="btn primary" href="#/c/${code}/luyen-tap?domain=${meta.domain}">Luyện câu hỏi</a></section>` : ''}
      <nav class="pager" aria-label="Bài khác">
        ${prev ? `<a href="#/kien-thuc/${code}/${prev.slug}" rel="prev"><small>← Bài trước</small><b>${esc(prev.task)}</b> ${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="next" href="#/kien-thuc/${code}/${next.slug}" rel="next"><small>Bài sau →</small><b>${esc(next.task)}</b> ${esc(next.title)}</a>` : ''}
      </nav>
    </div>
  </div></div>`;
}

// ---------- cheat sheet & notes (markdown from the MIT repo) ----------
const isDark = () => (document.documentElement.dataset.theme
  ? document.documentElement.dataset.theme === 'dark'
  : matchMedia('(prefers-color-scheme: dark)').matches);
let mermaidLib;
// Turn ```mermaid code blocks into rendered diagrams (library loaded only when a page has one).
async function renderMermaid(root) {
  const blocks = [...root.querySelectorAll('pre > code.language-mermaid')];
  if (!blocks.length) return;
  const nodes = blocks.map((code) => {
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = code.textContent;
    code.parentElement.replaceWith(div);
    return div;
  });
  try {
    mermaidLib ||= (await import('https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs')).default;
    mermaidLib.initialize({ startOnLoad: false, securityLevel: 'strict', theme: isDark() ? 'dark' : 'neutral', fontFamily: 'Be Vietnam Pro, system-ui, sans-serif' });
    await mermaidLib.run({ nodes });
  } catch (e) {
    console.error(e); // diagram source stays visible as text
    nodes.forEach((n) => n.classList.add('failed'));
  }
}

async function markdownView(code, which) {
  const d = await loadCert(code);
  const showEn = ui.mdEn === `${code}/${which}`;
  const vi = await getText(`data/vi/md/${code}-${which === 'cheat-sheet' ? 'cheat-sheet' : 'notes'}.md`).catch(() => null);
  const md = !vi || showEn ? (which === 'cheat-sheet' ? d.cheatSheet : d.notes) : vi;
  const html = window.marked ? window.marked.parse(md) : `<pre>${esc(md)}</pre>`;
  actions.mdLang = () => { ui.mdEn = showEn ? null : `${code}/${which}`; render(); };
  afterRender.push(() => {
    const art = $app.querySelector('.md');
    art.querySelectorAll('table').forEach((t) => { const w = document.createElement('div'); w.className = 'tablewrap'; t.replaceWith(w); w.append(t); });
    art.querySelectorAll('a[href]').forEach((a) => { const h = a.getAttribute('href'); if (!/^(https?:|#\/)/.test(h)) a.replaceWith(...a.childNodes); }); // repo-relative links don't exist here
    renderMermaid(art);
  });
  return `<div class="wrap narrow">${certHeader(d, which === 'cheat-sheet' ? 'cheat' : 'notes')}
    ${vi ? `<div class="row" style="margin-bottom:16px"><span class="grow small muted">${showEn ? 'Đang xem bản gốc tiếng Anh.' : 'Bản tiếng Việt.'}</span>
      <button class="btn" data-act="mdLang"><span class="tag">${showEn ? 'VI' : 'EN'}</span>${showEn ? 'Xem bản tiếng Việt' : 'Xem bản gốc'}</button></div>`
      : '<p class="notice"><span class="tag">EN</span> Tài liệu gốc tiếng Anh.</p>'}
    <article class="md" lang="${showEn || !vi ? 'en' : 'vi'}">${html}</article></div>`;
}

// ---------- glossary ----------
async function glossaryView() {
  const { groups } = await getJSON('data/vi/glossary.json');
  const total = groups.reduce((n, g) => n + g.terms.length, 0);
  afterRender.push(() => {
    const box = $app.querySelector('#gq');
    const filter = () => {
      const q = box.value.trim().toLowerCase();
      let shown = 0;
      $app.querySelectorAll('.gterm').forEach((el) => { const on = !q || el.textContent.toLowerCase().includes(q); el.hidden = !on; shown += on; });
      $app.querySelectorAll('.ggroup').forEach((g) => { g.hidden = !g.querySelector('.gterm:not([hidden])'); });
      $app.querySelector('#gcount').textContent = q ? `${shown} thuật ngữ khớp` : `${total} thuật ngữ`;
    };
    box.addEventListener('input', filter);
  });
  return `<div class="wrap narrow">
    <p class="crumb"><a href="#/">Trang chủ</a> / Thuật ngữ</p>
    <h1 class="page-title">Thuật ngữ</h1>
    <p class="muted" style="margin:0 0 16px">Giải thích ngắn các thuật ngữ hay gặp trong đề và bài học. Tên thuật ngữ giữ tiếng Anh như trong đề thi.</p>
    <input id="gq" class="gsearch" type="search" placeholder="Tìm thuật ngữ, ví dụ: MCP, caching, hook…" aria-label="Tìm thuật ngữ" autocomplete="off">
    <p class="small muted" id="gcount" aria-live="polite" style="margin:8px 0 12px">${total} thuật ngữ</p>
    <nav class="row" aria-label="Nhóm thuật ngữ" style="flex-wrap:wrap;gap:8px;margin-bottom:8px">${groups.map((g) => `<a class="chip" href="#g-${g.id}">${esc(g.name)}</a>`).join('')}</nav>
    ${groups.map((g) => `<section class="ggroup" id="g-${g.id}"><h2>${esc(g.name)}</h2>
      ${g.source ? `<p class="small muted" style="margin:0 0 8px">${esc(g.source)}</p>` : ''}
      <dl>${g.terms.map((x) => `<div class="gterm"><dt lang="en">${esc(x.t)}</dt><dd>${fmt(x.d)}</dd></div>`).join('')}</dl></section>`).join('')}
  </div>`;
}

// ---------- progress & reset ----------
async function progressView() {
  const list = await certList();
  const all = await Promise.all(list.map((c) => loadCert(c.code)));
  Object.assign(actions, {
    resetCert: (code) => confirmReset(`Xoá toàn bộ đáp án, bài đang làm và bài đã đọc của ${all.find((x) => x.code === code).name}? Không hoàn tác được.`, () => S.resetCert(state, code)),
    resetAll: () => confirmReset('Xoá TOÀN BỘ dữ liệu học trên trình duyệt này (mọi đáp án, bài thi, bài đã đọc)? Không hoàn tác được.', () => { state = S.empty(); }),
  });
  return `<div class="wrap narrow">
    <p class="crumb"><a href="#/">Trang chủ</a> / Tiến độ</p>
    <h1 class="page-title">Tiến độ của bạn</h1>
    <p class="muted" style="margin:0 0 24px">Mọi đáp án bạn chọn chỉ được lưu trên trình duyệt này (localStorage), không gửi đi đâu. Đổi máy, dùng tab ẩn danh hoặc xoá dữ liệu trình duyệt thì tiến độ sẽ mất.</p>
    <div style="display:flex;flex-direction:column;gap:12px">${all.map((d) => {
      const st = S.stats(state, d.questions);
      const read = lessonsOf(d).filter((l) => state.read[`${d.code}/${l.slug}`]).length;
      return `<div class="card"><div class="row" style="margin-bottom:12px"><div class="grow"><span class="chip accent">${esc(d.examCode)}</span>
        <h2 style="font-size:20px;line-height:28px;margin-top:6px"><a href="#/c/${d.code}" style="color:inherit">${esc(d.name)}</a></h2></div>
        <button class="btn danger" data-act="resetCert" data-arg="${d.code}">Xoá tiến độ</button></div>
        ${bar(pct(st.answered, st.total))}
        <p class="small muted" style="margin:8px 0 0">Câu hỏi: ${st.answered}/${st.total} đã làm · đúng ${st.correct} · sai ${st.wrong}${st.answered ? ` (${pct(st.correct, st.answered)}% đúng)` : ''} · Kiến thức: ${read}/${lessonsOf(d).length} bài</p>
        ${st.wrong ? `<p style="margin:12px 0 0"><a class="btn" href="#/c/${d.code}/luyen-tap?set=wrong">Làm lại ${st.wrong} câu sai</a></p>` : ''}</div>`;
    }).join('')}</div>
    <div class="card" style="margin-top:24px;border-color:var(--wrong)"><h2 style="font-size:20px;line-height:28px">Xoá toàn bộ</h2>
      <p class="small muted">Xoá mọi đáp án, bài thi và bài đã đọc trên trình duyệt này.</p>
      <button class="btn danger" data-act="resetAll">Xoá toàn bộ dữ liệu</button></div>
  </div>`;
}

render();
