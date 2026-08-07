/* ============================================================
   仙女AI提示词库 — 单页应用逻辑
   无后端 · IndexedDB 本地存储 · 响应式（电脑/手机）
   ============================================================ */

/* ---------------- 分类元信息 ---------------- */
const CATS = {
  '美食':   { color: '#FFB3BA', emoji: '🍰' },
  '养生':   { color: '#B5EAD7', emoji: '🌿' },
  '国风':   { color: '#FFD8A8', emoji: '🏮' },
  '知识卡片': { color: '#C7CEEA', emoji: '📚' },
  '小红书海报': { color: '#FF9EB5', emoji: '📕' },
  '穿搭':   { color: '#FFC8DD', emoji: '👗' },
  '职场':   { color: '#BDE0FE', emoji: '💼' },
  '心理':   { color: '#FFAFCC', emoji: '💗' },
  '理财':   { color: '#FDFFB6', emoji: '💰' },
  '商业':   { color: '#A0C4FF', emoji: '🚀' },
  '科技':   { color: '#9BF6FF', emoji: '🔧' },
  '教育':   { color: '#CAFFBF', emoji: '🎓' },
  '其他':   { color: '#E0BBE4', emoji: '✨' },
};
const CAT_KEYS = Object.keys(CATS);

const THEMES = [
  { name: '蜜桃粉', accent: '#FF8FAB', soft: '#FFE3EC', deep: '#E75C86' },
  { name: '天空蓝', accent: '#7FB5FF', soft: '#E3F0FF', deep: '#3E7BE0' },
  { name: '薄荷绿', accent: '#5FD3B2', soft: '#E0FBF4', deep: '#1FA386' },
  { name: '蜜橘橙', accent: '#FFB067', soft: '#FFEFD9', deep: '#E5852E' },
  { name: '葡萄紫', accent: '#B58BE8', soft: '#F0E6FF', deep: '#7E4FCF' },
  { name: '蜜罐黄', accent: '#F5C84B', soft: '#FFF6D6', deep: '#C99A12' },
];

/* ---------------- 导航配置 ---------------- */
const SIDE_NAV = [
  { route: 'home', icon: '🏠', iconImg: 'nav/1.png', label: '工作台', bg: '#FFD6E0' },
  { route: 'library', icon: '📚', iconImg: 'nav/2.png', label: '提示词库', bg: '#C7E2FF' },
  { route: 'plans', icon: '🔗', iconImg: 'nav/3.png', label: '方案', bg: '#C9F2E3' },
  { route: 'ai', icon: '✨', iconImg: 'nav/4.png', label: 'AI工具', bg: '#E2D4FF' },
  { route: 'inspiration', icon: '💡', iconImg: 'nav/5.png', label: '灵感收集', bg: '#FFE0B8' },
  { route: 'help', icon: '❓', iconImg: 'nav/6.png', label: '帮助', bg: '#FFF1A8' },
  { route: 'settings', icon: '⚙️', iconImg: 'nav/7.png', label: '设置', bg: '#FFD0C4' },
];
const BOTTOM_NAV = [
  { route: 'home', icon: '🏠', label: '工作台' },
  { route: 'library', icon: '📚', label: '提示词库' },
  { route: 'plans', icon: '🔗', label: '方案' },
  { route: 'ai', icon: '✨', label: 'AI工具' },
  { route: 'more', icon: '🍒', label: '我的' },
];

function navIcon(n) {
  const bg = n.bg ? ` style="background:${esc(n.bg)}"` : '';
  if (n.iconImg) return `<span class="nav-ico"${bg}><img class="nav-ico-img" src="${esc(n.iconImg)}" alt="" loading="lazy"></span>`;
  return `<span class="nav-ico"${bg}>${n.icon}</span>`;
}
function renderBrandIcon(v) {
  v = v || '\u{1FA84}';
  const isImg = /^https?:\/\/|^\/|^data:|^blob:|\.png$|\.jpg$|\.jpeg$|\.webp$|\.gif$|^brand-logo/.test(v);
  if (isImg) return `<img class="brand-emoji" src="${esc(v)}" alt="logo">`;
  return `<span class="brand-emoji brand-emoji-text">${esc(v)}</span>`;
}

/* ---------------- IndexedDB 层 ---------------- */
const DB_NAME = 'xiannv-prompt-db', DB_VERSION = 2;
let _db = null;
function openDB() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('prompts')) db.createObjectStore('prompts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('plans')) db.createObjectStore('plans', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('inspirations')) db.createObjectStore('inspirations', { keyPath: 'id' });
    };
    r.onsuccess = (e) => { _db = e.target.result; res(_db); };
    r.onerror = (e) => rej(e.target.error);
  });
}
async function _store(name, mode) { const db = await openDB(); return db.transaction(name, mode).objectStore(name); }
async function dbGetAll(store) { const s = await _store(store, 'readonly'); return new Promise((res, rej) => { const r = s.getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); }); }
async function dbGet(store, key) { const s = await _store(store, 'readonly'); return new Promise((res, rej) => { const r = s.get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function dbPut(store, val) { const s = await _store(store, 'readwrite'); return new Promise((res, rej) => { const r = s.put(val); r.onsuccess = () => res(val); r.onerror = () => rej(r.error); }); }
async function dbDel(store, key) { const s = await _store(store, 'readwrite'); return new Promise((res, rej) => { const r = s.delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error); }); }

/* ---------------- 工具函数 ---------------- */
function uid() { return 'id_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function isThisWeek(ts) {
  const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7; start.setDate(start.getDate() - (day - 1));
  return ts >= start.getTime();
}
let _urlMap = new Map();
function imgUrl(blob) {
  if (!blob) return null;
  if (_urlMap.has(blob)) return _urlMap.get(blob);
  const u = URL.createObjectURL(blob); _urlMap.set(blob, u); return u;
}
function catMeta(cat) { return CATS[cat] || CATS['其他']; }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden'); t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 250); }, 1800);
}

/* ---------------- 全局状态 ---------------- */
let state = {
  prompts: [], plans: [], settings: null, inspirations: [],
  view: 'home',
  search: '', category: '全部', tag: '', showDeleted: false,
  pendingSearchFocus: false,
};

/* ---------------- 默认设置 ---------------- */
function defaultSettings() {
  return { theme: 0, brandEmoji: '\u{1FA84}' };
}

/* ---------------- 示例数据（完整提示词，未删减） ---------------- */
function makePlaceholderBlob(cat) {
  const c = catMeta(cat);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.color}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="170" font-size="92" text-anchor="middle">${c.emoji}</text><text x="200" y="250" font-size="22" text-anchor="middle" fill="#4A3B47" font-family="sans-serif" font-weight="bold">${cat}</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

function samplePrompts() {
  const now = Date.now();
  const base = (window.SEED_PROMPTS && window.SEED_PROMPTS.length) ? window.SEED_PROMPTS : [];
  return base.map((o, i) => ({
    id: uid(),
    title: o.title || '未命名提示词',
    category: o.category || '其他',
    tags: Array.isArray(o.tags) ? o.tags : [],
    content: o.content || '',
    source: o.source || '仙女提示词库',
    confirmed: false,
    favorited: false,
    planIds: [],
    deleted: false,
    createdAt: now - (base.length - i) * 86400000,
    updatedAt: now - (base.length - i) * 3600000,
    image: null, effectUrl: o.effect || null, effectThumb: o.effectThumb || null,
  }));
}

/* ---------------- 种子标题同步（覆盖官方示例标题，确保新标题显示） ---------------- */
function applySeedToPrompt(p, s) {
  const o = s.o;
  p.title = o.title;
  if (o.category) p.category = o.category;
  if (Array.isArray(o.tags)) p.tags = o.tags;
  if (o.content) p.content = o.content;
  p.source = o.source || '仙女提示词库';
  p.effectUrl = s.eff;
  p.effectThumb = s.thumb;
}
async function syncSeedTitles() {
  const base = (window.SEED_PROMPTS || []);
  if (!base.length) return;
  const seedInfo = base.map((o, i) => ({
    o, i,
    eff: o.effect || ('effect/' + String(i + 1).padStart(2, '0') + '.png'),
    thumb: o.effectThumb || ('effect_thumb/' + String(i + 1).padStart(2, '0') + '.webp'),
  }));
  const seedByEffect = {};
  seedInfo.forEach(s => { seedByEffect[s.eff] = s; });
  const official = state.prompts.filter(p => p.source === '仙女提示词库');
  const unmatched = [];
  const used = new Set();
  for (const p of official) {
    const s = p.effectUrl ? seedByEffect[p.effectUrl] : null;
    if (s && !used.has(s.i)) {
      used.add(s.i);
      applySeedToPrompt(p, s);
      await dbPut('prompts', p);
    } else {
      unmatched.push(p);
    }
  }
  // 兜底：对没有 effectUrl 的老卡片，按 seed 顺序（createdAt 升序）对齐覆盖
  const remaining = seedInfo.filter(s => !used.has(s.i)).sort((a, b) => a.i - b.i);
  unmatched.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const n = Math.min(unmatched.length, remaining.length);
  for (let k = 0; k < n; k++) {
    applySeedToPrompt(unmatched[k], remaining[k]);
    await dbPut('prompts', unmatched[k]);
  }
}

/* ---------------- 数据加载 / 播种 ---------------- */
async function loadData() {
  state.prompts = await dbGetAll('prompts');
  // 迁移：为已 seeded 的种子提示词补上真实效果图（清除旧占位 SVG，改显示 effect/ 静态图）
  try {
    const seedByTitle = {};
    const seedKey = {};
    (window.SEED_PROMPTS || []).forEach((o, i) => { seedKey[o.title] = { effectUrl: 'effect/' + String(i + 1).padStart(2, '0') + '.png', effectThumb: 'effect_thumb/' + String(i + 1).padStart(2, '0') + '.webp' }; });
    const migrated = await dbGet('meta', 'effectMigrated');
    if (!migrated) {
      for (const p of state.prompts) {
        if (p.source === '仙女提示词库' && seedKey[p.title]) {
          if (!p.effectUrl) p.effectUrl = seedKey[p.title].effectUrl;
          if (!p.effectThumb) p.effectThumb = seedKey[p.title].effectThumb;
          if (p.image && p.image.type === 'image/svg+xml') p.image = null; // 仅清除旧占位图，不动用户上传的照片
          await dbPut('prompts', p);
        }
      }
      await dbPut('meta', { key: 'effectMigrated', value: true });
    }
  } catch (e) { console.warn('effect migration skipped', e); }
  // 覆盖官方示例标题/内容为新版（带序号），让新标题在页面里显示
  try { await syncSeedTitles(); } catch (e) { console.warn('syncSeedTitles skipped', e); }
  state.prompts = await dbGetAll('prompts');
  state.plans = await dbGetAll('plans');
  state.settings = (await dbGet('meta', 'settings')) || defaultSettings();
  // 品牌图标迁移：把历史默认图标（朱迪图 / 魔法棒 / 仙女 / 樱桃）统一升级为魔法棒 🪄，仅迁移 App 默认值，不触碰用户自定义图标
  const LEGACY_BRANDS = ['brand-logo.png', '\u{1FA84}', '\u{1F9DA}', '\u{1F352}'];
  if (LEGACY_BRANDS.includes(state.settings.brandEmoji)) {
    state.settings.brandEmoji = '\u{1FA84}';
    await dbPut('meta', { key: 'settings', ...state.settings });
  }
  state.inspirations = await dbGetAll('inspirations');
  const seeded = await dbGet('meta', 'seeded');
  if (!seeded) {
    for (const p of samplePrompts()) await dbPut('prompts', p);
    const plan = { id: uid(), name: '🌟 新手入门示例方案', description: '把刚收集的提示词先放进这里练习关联', cardIds: [], createdAt: Date.now(), updatedAt: Date.now() };
    await dbPut('plans', plan);
    await dbPut('meta', { key: 'settings', ...state.settings });
    await dbPut('meta', { key: 'seeded', value: true });
    state.prompts = await dbGetAll('prompts');
    state.plans = await dbGetAll('plans');
  }
}

/* ---------------- 主题应用 ---------------- */
function applyTheme(idx) {
  const t = THEMES[idx] || THEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-soft', t.soft);
  r.setProperty('--accent-deep', t.deep);
  document.querySelector('meta[name=theme-color]').setAttribute('content', t.accent);
}

/* ---------------- 导航渲染 ---------------- */
function renderNav() {
  const side = document.getElementById('side-nav');
  side.innerHTML = SIDE_NAV.map((n) => `<a href="#/${n.route}" data-route="${n.route}">${navIcon(n)}<span class="nav-txt">${n.label}</span></a>`).join('');
  const bot = document.getElementById('bottom-nav');
  bot.innerHTML = BOTTOM_NAV.map((n) => `<a class="nav-item" href="#/${n.route}" data-route="${n.route}"><span class="nav-ico">${n.icon}</span><span>${n.label}</span></a>`).join('');
  const logo = state.settings.brandEmoji || '\u{1FA84}';
  const brandEl = document.getElementById('brand-emoji');
  if (brandEl) brandEl.innerHTML = renderBrandIcon(logo);
  setActiveNav();
}
function setActiveNav() {
  const v = state.view;
  document.querySelectorAll('[data-route]').forEach((a) => {
    const match = a.getAttribute('data-route') === v || (v === 'recycle' && a.getAttribute('data-route') === 'library');
    a.classList.toggle('active', match);
  });
}

/* ---------------- 路由 ---------------- */
function route() {
  let h = location.hash.replace(/^#\/?/, '');
  if (!h) h = 'home';
  state.view = h;
  setActiveNav();
  const titles = { home: '工作台', library: '提示词库', plans: '方案', ai: 'AI工具', more: '我的', inspiration: '灵感收集', help: '帮助中心', settings: '设置', recycle: '回收站' };
  document.getElementById('page-title').textContent = titles[h] || 'AI轻松学';
  if (h === 'library') state.showDeleted = false;
  const view = document.getElementById('view');
  // 方案页背景图
  view.className = (h === 'plans') ? 'view view--plans' : 'view';
  try {
    if (h === 'home') view.innerHTML = renderHome();
    else if (h === 'library') view.innerHTML = renderLibrary();
    else if (h === 'plans') view.innerHTML = renderPlans();
    else if (h === 'ai') view.innerHTML = renderAI();
    else if (h === 'more') view.innerHTML = renderMore();
    else if (h === 'inspiration') view.innerHTML = renderInspiration();
    else if (h === 'help') view.innerHTML = renderHelp();
    else if (h === 'settings') view.innerHTML = renderSettings();
    else if (h === 'recycle') view.innerHTML = renderRecycle();
    else view.innerHTML = renderHome();
    if (state.pendingSearchFocus && h === 'library') { const s = document.getElementById('lib-search'); if (s) { s.focus(); s.scrollIntoView({ block: 'center' }); } state.pendingSearchFocus = false; }
    if (h === 'settings') setTimeout(showStorage, 0);
    bindViewEvents();
  } catch (e) {
    view.innerHTML = `<div class="error-state"><p>😢 页面渲染出错</p><p>${esc(e.message)}</p></div>`;
  }
  view.scrollTop = 0; window.scrollTo(0, 0);
}

/* ---------------- 过滤逻辑 ---------------- */
function filteredPrompts() {
  let list = state.prompts.filter((p) => p.deleted === state.showDeleted);
  if (!state.showDeleted) {
    if (state.category !== '全部') list = list.filter((p) => p.category === state.category);
    if (state.tag) list = list.filter((p) => (p.tags || []).includes(state.tag));
    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter((p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        (p.tags || []).join(' ').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q));
    }
  }
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return list;
}
function allTags() {
  const s = new Set();
  state.prompts.filter((p) => !p.deleted).forEach((p) => (p.tags || []).forEach((t) => s.add(t)));
  return Array.from(s);
}

/* ---------------- 图片块渲染 ---------------- */
// 显示优先级：用户上传图(Blob) > 种子效果图(静态资源) > 分类占位图
// 仅 #78–#88 部署了效果原图（其余只用缩略图），避免请求不存在的原图导致破图
const FULL_RES_IDS = new Set([78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88]);
function hasFullRes(p) {
  if (!p || !p.effectUrl) return false;
  const m = p.effectUrl.match(/effect\/(\d+)\.png$/);
  if (!m) return false;
  return FULL_RES_IDS.has(parseInt(m[1], 10));
}
function cardImage(p) {
  if (p && p.image) return imgUrl(p.image);
  if (p && p.effectUrl && !p.effectHidden) {
    if (hasFullRes(p)) return p.effectUrl;
    if (p.effectThumb) return p.effectThumb;
  }
  return null;
}
/* 卡片图片：手机端(窄屏)用缩略图，电脑端(宽屏)用原图；详情页始终用原图(见 openDetail) */
function cardImgTag(p) {
  let url = null, original = null;
  if (p && p.image) { url = imgUrl(p.image); original = url; }
  else if (p && p.effectUrl && !p.effectHidden) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const fr = hasFullRes(p);
    url = (fr && !isMobile) ? p.effectUrl : (p.effectThumb || p.effectUrl);
    original = fr ? p.effectUrl : (p.effectThumb || p.effectUrl);
  }
  if (url) return `<div class="pcard-img"><img src="${url}" alt="" loading="lazy" decoding="async" data-act="zoom" data-zoom="${original}" style="cursor:zoom-in"></div>`;
  const c = catMeta(p.category);
  return `<div class="pcard-img" style="background:linear-gradient(135deg,${c.color},#ffffff)"><span>${c.emoji}</span></div>`;
}

function imgBlock(p, cls) {
  const url = cardImage(p);
  if (url) return `<div class="${cls}"><img src="${url}" alt="" loading="lazy" decoding="async" data-act="zoom" data-zoom="${url}" style="cursor:zoom-in"></div>`;
  const c = catMeta(p.category);
  return `<div class="${cls}" style="background:linear-gradient(135deg,${c.color},#ffffff)"><span>${c.emoji}</span></div>`;
}

/* ---------------- 视图：工作台 ---------------- */
function renderHome() {
  const total = state.prompts.filter((p) => !p.deleted).length;
  const plans = state.plans.length;
  const week = state.prompts.filter((p) => !p.deleted && isThisWeek(p.updatedAt)).length;
  const fav = state.prompts.filter((p) => !p.deleted && p.favorited).length;
  const recent = state.prompts.filter((p) => !p.deleted).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
  const cats = CAT_KEYS.filter((c) => state.prompts.some((p) => !p.deleted && p.category === c)).slice(0, 6);
  return `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">📚 提示词总数</div></div>
      <div class="stat-card"><div class="stat-num">${plans}</div><div class="stat-label">🔗 方案数</div></div>
      <div class="stat-card"><div class="stat-num">${week}</div><div class="stat-label">✨ 本周更新</div></div>
      <div class="stat-card"><div class="stat-num">${fav}</div><div class="stat-label">💖 收藏</div></div>
    </div>
    <div class="panel">
      <h3 class="section-title">🚀 快捷操作</h3>
      <div class="row-actions">
        <button class="btn-ghost accent" data-act="new">＋ 新建提示词</button>
        <button class="btn-ghost" data-act="goto-library">📚 浏览提示词库</button>
        <button class="btn-ghost" data-act="goto-ai">✨ 打开 AI 工具</button>
      </div>
    </div>
    <div class="panel">
      <h3 class="section-title">🕒 最近更新</h3>
      ${recent.length ? `<div class="card-grid">${recent.map(cardHTML).join('')}</div>` : emptyHTML('📭', '还没有提示词', '点上面的“新建提示词”开始吧')}
    </div>
    ${cats.length ? `<div class="panel"><h3 class="section-title">🏷️ 热门分类</h3><div class="filter-bar">${cats.map((c) => `<button class="chip" data-act="cat" data-cat="${esc(c)}">${catMeta(c).emoji} ${esc(c)}</button>`).join('')}</div></div>` : ''}
  `;
}
function emptyHTML(emoji, title, sub) {
  return `<div class="empty-state"><span class="emoji">${emoji}</span><h3>${esc(title)}</h3><p>${esc(sub)}</p></div>`;
}
function cardHTML(p) {
  const badges = `${p.confirmed ? '✅' : ''}${p.favorited ? '💖' : ''}`;
  return `<div class="pcard" data-act="detail" data-id="${p.id}">
    ${cardImgTag(p)}
    <div class="pcard-body">
      <div class="pcard-title">${esc(p.title)}</div>
      <div class="pcard-desc">${esc(p.content).slice(0, 120)}</div>
      <div class="pcard-tags" style="display:none">${(p.tags || []).slice(0, 3).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>
      <div class="pcard-meta"><span>🕒 ${fmtDate(p.updatedAt).slice(0, 10)}</span><span class="pcard-badges">${badges}</span></div>
    </div>
  </div>`;
}

/* ---------------- 视图：提示词库 ---------------- */
function renderLibrary() {
  const list = filteredPrompts();
  const cats = ['全部', '知识卡片', '小红书海报'];
  const tags = allTags();
  const head = state.showDeleted ? `<div class="filter-bar"><button class="chip" data-act="back-library">← 返回提示词库</button></div>` : `
    <div class="filter-bar">
      <input id="lib-search" class="search-input" type="search" placeholder="🔍 搜索标题 / 内容 / 标签…" value="${esc(state.search)}">
    </div>
    <div class="filter-bar">
      ${cats.map((c) => `<button class="chip ${state.category === c ? 'active' : ''}" data-act="set-cat" data-cat="${esc(c)}">${c === '全部' ? '全部' : catMeta(c).emoji + ' ' + esc(c)}</button>`).join('')}
    </div>
    ${/* 标签筛选栏已隐藏 */''}
  `;
  return `
    ${state.showDeleted ? '<h3 class="section-title">🗑️ 回收站（可恢复）</h3>' : ''}
    ${head}
    ${list.length
      ? `<div class="card-grid">${list.map((p) => state.showDeleted ? recycleCardHTML(p) : cardHTML(p)).join('')}</div>`
      : emptyHTML(state.showDeleted ? '♻️' : '🔍', state.showDeleted ? '回收站是空的' : (state.search || state.category !== '全部' || state.tag ? '没有匹配的提示词' : '还没有提示词'), state.showDeleted ? '' : '试试新建一条，或从示例数据开始')}
  `;
}
function recycleCardHTML(p) {
  return `<div class="recycle-item">
    <div class="ri-body"><div class="ri-title">${esc(p.title)}</div><div class="ri-sub">${fmtDate(p.updatedAt)}</div></div>
    <button class="mini-btn" data-act="restore" data-id="${p.id}">恢复</button>
    <button class="mini-btn danger" data-act="purge" data-id="${p.id}">彻底删除</button>
  </div>`;
}

/* ---------------- 视图：方案 ---------------- */
function renderPlans() {
  const open = (id) => { const pl = state.plans.find((x) => x.id === id); return pl; };
  const cards = state.plans.map((pl) => {
    const cnt = pl.cardIds ? pl.cardIds.length : 0;
    return `<div class="list-item" data-act="open-plan" data-id="${pl.id}">
      <span class="li-ico">🔗</span>
      <div class="li-body"><div class="li-title">${esc(pl.name)}</div><div class="li-sub">${cnt} 条提示词${esc(pl.description ? ' · ' + pl.description : '')}</div></div>
      <span class="li-arrow">›</span>
    </div>`;
  }).join('');
  return `
    <div class="row-actions" style="margin-bottom:16px">
      <button class="btn-ghost accent" data-act="new-plan">＋ 新建方案</button>
    </div>
    ${state.plans.length ? cards : emptyHTML('🔗', '还没有方案', '把相关提示词组合起来，方便成批使用')}
  `;
}

/* ---------------- 视图：AI工具 ---------------- */
function renderAI() {
  return `
    <div class="panel">
      <h3 class="section-title">✨ AI 工具箱</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div class="t-ico">🤖</div><h4>复制到 ChatGPT</h4>
          <p>打开 AI 生图工具，把提示词粘贴进去即可生图（需自备账号）</p>
          <button class="mini-btn" data-act="open-chatgpt">在浏览器打开</button>
        </div>
        <div class="tool-card">
          <div class="t-ico">💎</div><h4>复制到 Gemini</h4>
          <p>打开 jiaotu.top（邀请链接），适合中文知识卡片</p>
          <button class="mini-btn" data-act="open-gemini">在浏览器打开</button>
        </div>
        <div class="tool-card">
          <div class="t-ico">📋</div><h4>快速复制提示词</h4>
          <p>从提示词库进入任意卡片，点“复制提示词”即可</p>
          <button class="mini-btn" data-act="goto-library">去提示词库</button>
        </div>
      </div>
    </div>
    <div class="panel">
      <h3 class="section-title">🎴 本地 HTML 知识卡片生成器</h3>
      <p style="font-size:13px;color:var(--text-soft);margin:0 0 14px">填写下面内容，立即生成 Keynote 风格知识卡片（完全在本地运行，不调用任何接口），可下载为 HTML 文件。</p>
      <div class="field"><label>主标题</label><input type="text" id="kc-title" placeholder="例如：费曼学习法"></div>
      <div class="field"><label>卡片类型标签</label><input type="text" id="kc-type" placeholder="例如：思维模型"></div>
      <div class="field"><label>金句（视觉重心）</label><input type="text" id="kc-quote" placeholder="如果你不能简单地解释它，说明你还没有真正理解它。"></div>
      <div class="field"><label>要点 1 标题</label><input type="text" id="kc-p1t" placeholder="确立目标"></div>
      <div class="field"><label>要点 1 描述</label><textarea id="kc-p1d" style="min-height:70px" placeholder="选定学习概念，像老师一样写下来"></textarea></div>
      <div class="field"><label>要点 2 标题</label><input type="text" id="kc-p2t" placeholder="以教代学"></div>
      <div class="field"><label>要点 2 描述</label><textarea id="kc-p2d" style="min-height:70px" placeholder="用简单的语言向不懂的人讲解"></textarea></div>
      <div class="field"><label>要点 3 标题</label><input type="text" id="kc-p3t" placeholder="回顾简化"></div>
      <div class="field"><label>要点 3 描述</label><textarea id="kc-p3d" style="min-height:70px" placeholder="找出卡壳处，重新学习直到流畅"></textarea></div>
      <div class="row-actions">
        <button class="btn-ghost accent" data-act="gen-card">🎨 生成预览</button>
        <button class="btn-ghost" data-act="dl-card" id="kc-dl" disabled>⬇️ 下载 HTML</button>
      </div>
      <iframe id="kc-preview" class="iframe-preview" style="display:none"></iframe>
    </div>
  `;
}

/* ---------------- 视图：我的 ---------------- */
function renderMore() {
  const items = [
    { act: 'focus-search', ico: '🔍', t: '搜索提示词', s: '按标题/内容/标签查找' },
    { act: 'goto-plans', ico: '🔗', t: '关联 / 方案', s: '把提示词组合成方案' },
    { act: 'goto-inspiration', ico: '💡', t: '灵感收集', s: '随手记录灵感碎片' },
    { act: 'goto-help', ico: '❓', t: '帮助中心', s: '使用说明与提示词模板' },
    { act: 'goto-settings', ico: '⚙️', t: '设置', s: '主题 / 数据 / 账号' },
    { act: 'export', ico: '📤', t: '导出数据', s: '备份为 JSON 文件' },
    { act: 'import', ico: '📥', t: '导入数据', s: '从 JSON 恢复' },
    { act: 'about', ico: 'ℹ️', t: '关于', s: 'AI轻松学 v1.0.0' },
  ];
  return `<div class="more-grid">${items.map((i) => `<button class="more-card" data-act="${i.act}"><div class="mc-ico">${i.ico}</div><div class="mc-title">${i.t}</div><div class="mc-sub">${i.s}</div></button>`).join('')}</div>`;
}

/* ---------------- 视图：灵感收集 ---------------- */
function renderInspiration() {
  const list = (state.inspirations || []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const cards = list.length ? list.map((it) => {
    const img = it.image ? `<img class="insp-img" src="${imgUrl(it.image)}" alt="" loading="lazy" decoding="async" data-act="zoom" data-zoom="${imgUrl(it.image)}" style="cursor:zoom-in">` : '';
    return `<div class="insp-card">
      <div class="insp-top">
        <span class="tag">🕒 ${fmtDate(it.updatedAt)}</span>
        <div class="insp-actions">
          <button class="mini-btn" data-act="edit-insp" data-id="${it.id}">编辑</button>
          <button class="mini-btn danger" data-act="del-insp" data-id="${it.id}">删除</button>
        </div>
      </div>
      ${it.title ? `<div class="insp-title">${esc(it.title)}</div>` : ''}
      ${img}
      ${it.note ? `<div class="insp-note">${esc(it.note).replace(/\n/g, '<br>')}</div>` : ''}
    </div>`;
  }).join('') : emptyHTML('💡', '还没有灵感', '点右下角 ➕ 记录第一个灵感碎片');
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h3 class="section-title" style="margin:0">💡 灵感收集</h3>
      <button class="btn-ghost accent" data-act="new-insp">➕ 新建灵感</button>
    </div>
    <div class="insp-grid">${cards}</div>`;
}

/* ---------------- 灵感收集：编辑 / 新建 ---------------- */
let inspEditor = { id: null, image: null };
function openInspirationEditor(id) {
  const it = id ? (state.inspirations || []).find((x) => x.id === id) : null;
  inspEditor = { id: id || null, image: it ? (it.image || null) : null };
  const val = (v) => esc(v || '');
  openSheet(`
    <div class="sheet-head"><h2>${id ? '✏️ 编辑灵感' : '💡 新建灵感'}</h2><button class="sheet-close" data-act="close">✕</button></div>
    <div class="field"><label>标题（可选）</label><input type="text" id="insp-title" value="${val(it && it.title)}" placeholder="如：一个关于知识卡片的点子"></div>
    <div class="field"><label>内容 / 备注</label><textarea id="insp-note" placeholder="随手记下你的灵感碎片…">${val(it && it.note)}</textarea></div>
    <div class="field"><label>配图（可选）</label>
      <div class="img-uploader">
        <input type="file" id="insp-img" accept="image/*" style="display:none">
        <button class="mini-btn" data-act="pick-insp-img">🖼️ 选择图片</button>
        <div id="insp-img-prev"></div>
      </div>
    </div>
    <div class="row-actions">
      <button class="btn-ghost accent" data-act="save-insp">💾 保存</button>
      <button class="btn-ghost" data-act="close">取消</button>
    </div>
  `);
  renderInspImgPreview();
}
function renderInspImgPreview() {
  const box = document.getElementById('insp-img-prev');
  if (!box) return;
  if (inspEditor.image) {
    box.innerHTML = `<div class="img-preview"><img src="${imgUrl(inspEditor.image)}" alt="" loading="lazy" decoding="async"><div class="img-actions"><button class="mini-btn" data-act="pick-insp-img">更换</button><button class="mini-btn danger" data-act="del-insp-img">删除</button></div></div>`;
  } else {
    box.innerHTML = '';
  }
}
async function saveInspiration() {
  const title = document.getElementById('insp-title').value.trim();
  const note = document.getElementById('insp-note').value.trim();
  if (!title && !note && !inspEditor.image) { toast('请填写内容或选图'); return; }
  const now = Date.now();
  let rec;
  if (inspEditor.id) {
    rec = (state.inspirations || []).find((x) => x.id === inspEditor.id);
    Object.assign(rec, { title, note, image: inspEditor.image, updatedAt: now });
  } else {
    rec = { id: uid(), title, note, image: inspEditor.image, createdAt: now, updatedAt: now };
    if (!state.inspirations) state.inspirations = [];
    state.inspirations.push(rec);
  }
  await dbPut('inspirations', rec);
  toast(inspEditor.id ? '灵感已更新 ✅' : '灵感已保存 ✨');
  closeSheet(); route();
}
async function deleteInspiration(id) {
  const it = (state.inspirations || []).find((x) => x.id === id); if (!it) return;
  if (!confirm(`确定删除这条灵感「${it.title || '未命名'}」？`)) return;
  await dbDel('inspirations', id);
  state.inspirations = (state.inspirations || []).filter((x) => x.id !== id);
  toast('已删除'); route();
}

/* ---------------- 视图：帮助 ---------------- */
function renderHelp() {
  return `
    <div class="panel">
      <h3 class="section-title">❓ 怎么用</h3>
      <ol style="line-height:2;font-size:14px;padding-left:20px">
        <li>在「提示词库」点右上角 <b>＋ 新建</b>，粘贴你的完整提示词，可选分类、标签、上传配图。</li>
        <li>想找某条？用顶部搜索或分类/标签筛选；手机端在「提示词库」页顶部搜索框。</li>
        <li>进入卡片详情可<b>复制提示词</b>、<b>加入方案</b>、<b>确认</b>（✅）、<b>编辑</b>或<b>删除</b>。</li>
        <li>删除的卡片进入「回收站」，可随时恢复或彻底删除。</li>
        <li>在「AI工具」里可一键打开 ChatGPT / Gemini，或用本地生成器做知识卡片。</li>
      </ol>
    </div>
    <div class="panel">
      <h3 class="section-title">📝 通用提示词结构模板</h3>
      <div class="detail-prompt">主题 / 用途：
比例 / 尺寸：
整体风格：
构图 / 布局：
色彩：
文字内容（含标题、金句、正文）：
质量要求：先推理后排版，输出 4K 打印级高清，文字清晰锐利、无重影</div>
    </div>
    <div class="panel">
      <h3 class="section-title">💾 数据存储说明</h3>
      <p style="font-size:13px;color:var(--text-soft);line-height:1.8;margin:0">所有提示词与图片都保存在你当前浏览器的 IndexedDB 中，不会上传到任何服务器。换浏览器或清缓存会丢失数据，建议定期在「设置」里导出备份。</p>
    </div>`;
}

/* ---------------- 视图：设置 ---------------- */
function renderSettings() {
  const themes = THEMES.map((t, i) => `<div class="theme-dot ${state.settings.theme === i ? 'active' : ''}" data-act="set-theme" data-i="${i}" style="background:${t.accent}" title="${t.name}"></div>`).join('');
  return `
    <div class="panel">
      <h3 class="section-title">🎨 可爱主题色</h3>
      <div class="theme-row">${themes}</div>
    </div>
    <div class="panel">
      <h3 class="section-title">🖼️ 品牌图标</h3>
      <div class="field"><label>当前图标（显示在侧边栏顶部，尺寸 1cm×1cm）</label>
        <span id="brand-preview">${renderBrandIcon(state.settings.brandEmoji || '\u{1FA84}')}</span>
        <input type="text" id="brand-emoji-input" value="${esc(state.settings.brandEmoji || '\u{1FA84}')}" placeholder="图片地址或 emoji" style="width:220px">
        <button class="mini-btn" data-act="save-brand">保存</button>
      </div>
    </div>
    <div class="panel">
      <h3 class="section-title">💾 数据管理</h3>
      <div class="row-actions">
        <button class="btn-ghost" data-act="export">📤 导出备份(JSON)</button>
        <button class="btn-ghost" data-act="import">📥 导入恢复</button>
        <button class="btn-ghost accent" data-act="import-example">✨ 导入示例提示词</button>
      </div>
      <div id="storage-info" class="kv" style="margin-top:12px"></div>
      <div class="row-actions" style="margin-top:8px">
        <button class="btn-ghost danger" data-act="clear-all">🗑️ 清空全部数据</button>
      </div>
    </div>`;
}

/* ---------------- 视图：回收站 ---------------- */
function renderRecycle() { state.showDeleted = true; return renderLibrary(); }

/* ---------------- 抽屉 / 弹窗 ---------------- */
function openSheet(html, opts = {}) {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<div class="sheet-inner">${html}</div>`;
  overlay.classList.add('show'); sheet.classList.remove('hidden'); sheet.classList.add('show');
  sheet.scrollTop = 0;
  requestAnimationFrame(() => sheet.classList.add('show'));
}
function closeSheet() {
  const overlay = document.getElementById('overlay');
  const sheet = document.getElementById('sheet');
  sheet.classList.remove('show'); overlay.classList.remove('show');
  setTimeout(() => { sheet.classList.add('hidden'); sheet.innerHTML = ''; }, 250);
}

/* ---------------- 原图预览（点击放大 lightbox） ---------------- */
function openLightbox(url) {
  if (!url) return;
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `<div class="lightbox-inner"><img alt="原图预览"><button class="lightbox-close" aria-label="关闭">✕</button></div>`;
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox-close')) closeLightbox(); });
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = url;
  requestAnimationFrame(() => lb.classList.add('show'));
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('show');
}

/* ---------------- 详情 ---------------- */
function openDetail(id) {
  const p = state.prompts.find((x) => x.id === id);
  if (!p) return;
  const url = cardImage(p);
  const plans = state.plans.filter((pl) => (pl.cardIds || []).includes(id));
  const inPlans = plans.map((pl) => `<span class="tag">🔗 ${esc(pl.name)}</span>`).join('') || '<span class="kv">尚未加入任何方案</span>';
  openSheet(`
    <div class="sheet-head"><h2>${esc(p.title)}</h2><button class="sheet-close" data-act="close">✕</button></div>
    ${url ? `<img class="detail-img" src="${url}" alt="" loading="lazy" decoding="async" data-act="zoom" data-zoom="${url}" style="cursor:zoom-in">` : imgBlock(p, 'detail-img')}
    <div class="detail-meta">
      <span class="tag">${catMeta(p.category).emoji} ${esc(p.category)}</span>
      ${(p.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}
      ${p.confirmed ? '<span class="tag" style="background:#D7F5E3;color:#1FA386">✅ 已确认</span>' : ''}
    </div>
    <div class="detail-meta"><span class="kv">🕒 更新：${fmtDate(p.updatedAt)}</span>${p.source ? `<span class="kv"> · 来源：${esc(p.source)}</span>` : ''}</div>
    <div class="detail-meta">关联方案：${inPlans}</div>
    <div class="detail-prompt">${esc(p.content)}</div>
    <div class="row-actions" style="margin-top:16px">
      <button class="btn-ghost accent" data-act="copy" data-id="${p.id}">📋 复制提示词</button>
      <button class="btn-ghost" data-act="confirm" data-id="${p.id}">${p.confirmed ? '↩️ 取消确认' : '✅ 确认'}</button>
      <button class="btn-ghost" data-act="assoc" data-id="${p.id}">🔗 加入方案</button>
      <button class="btn-ghost" data-act="edit" data-id="${p.id}">✏️ 编辑</button>
      <button class="btn-ghost danger" data-act="soft-delete" data-id="${p.id}">🗑️ 删除</button>
    </div>
  `);
}

/* ---------------- 编辑 / 新建 ---------------- */
let editor = { id: null, image: null, removeImage: false };
function openEditor(id) {
  const p = id ? state.prompts.find((x) => x.id === id) : null;
  editor = { id: id || null, image: p ? (p.image || null) : null, effectUrl: p ? (p.effectUrl || null) : null, effectThumb: p ? (p.effectThumb || null) : null, hideEffect: p ? !!p.effectHidden : false, removeImage: false };
  const val = (v) => esc(v || '');
  const catOpts = CAT_KEYS.map((c) => `<option value="${c}" ${p && p.category === c ? 'selected' : ''}>${catMeta(c).emoji} ${c}</option>`).join('');
  openSheet(`
    <div class="sheet-head"><h2>${id ? '✏️ 编辑提示词' : '＋ 新建提示词'}</h2><button class="sheet-close" data-act="close">✕</button></div>
    <div class="field"><label>标题</label><input type="text" id="f-title" value="${val(p && p.title)}" placeholder="给这条提示词起个名字"></div>
    <div class="field"><label>分类</label><select id="f-cat">${catOpts}</select></div>
    <div class="field"><label>标签（用逗号分隔）</label><input type="text" id="f-tags" value="${val(p && (p.tags || []).join(', '))}" placeholder="如：文旅, 海报, 国风"></div>
    <div class="field"><label>完整提示词内容</label><textarea id="f-content" placeholder="在此粘贴完整提示词，不会被删减…">${val(p && p.content)}</textarea><div class="hint">支持长文本，保存后可在详情里完整查看与复制。</div></div>
    <div class="field"><label>配图（上传到本地，存入 IndexedDB）</label>
      <div class="img-uploader">
        <input type="file" id="f-img" accept="image/*" style="display:none">
        <button class="mini-btn" data-act="pick-img">🖼️ 选择图片</button>
        <div id="img-prev"></div>
      </div>
    </div>
    <div class="field"><label>来源备注（可选）</label><input type="text" id="f-source" value="${val(p && p.source)}" placeholder="如：仙女提示词库"></div>
    <div class="row-actions">
      <button class="btn-ghost accent" data-act="save">💾 保存</button>
      <button class="btn-ghost" data-act="close">取消</button>
    </div>
  `);
  renderImgPreview();
}
function renderImgPreview() {
  const box = document.getElementById('img-prev');
  if (!box) return;
  const u = editor.image ? imgUrl(editor.image) : (editor.effectUrl && !editor.hideEffect ? (hasFullRes({ effectUrl: editor.effectUrl }) ? editor.effectUrl : (editor.effectThumb || editor.effectUrl)) : null);
  if (u) {
    box.innerHTML = `<div class="img-preview"><img src="${u}" alt="" loading="lazy" decoding="async"><div class="img-actions"><button class="mini-btn" data-act="pick-img">更换</button><button class="mini-btn danger" data-act="del-img">删除</button></div></div>`;
  } else {
    box.innerHTML = `<button class="btn-ghost" data-act="pick-img">🖼️ 上传图片</button>`;
  }
}
function fileToBlob(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(new Blob([r.result], { type: file.type })); r.onerror = () => rej(r.error); r.readAsArrayBuffer(file); }); }

async function saveEditor() {
  const title = document.getElementById('f-title').value.trim();
  const content = document.getElementById('f-content').value;
  if (!title) { toast('请填写标题'); return; }
  const tags = document.getElementById('f-tags').value.split(',').map((s) => s.trim()).filter(Boolean);
  const category = document.getElementById('f-cat').value;
  const source = document.getElementById('f-source').value.trim();
  const now = Date.now();
  let rec;
  if (editor.id) {
    rec = state.prompts.find((x) => x.id === editor.id);
    Object.assign(rec, { title, content, tags, category, source, image: editor.image, effectUrl: editor.effectUrl || null, effectThumb: editor.effectThumb || null, effectHidden: editor.hideEffect, updatedAt: now });
  } else {
    rec = { id: uid(), title, content, tags, category, source, image: editor.image, effectUrl: editor.effectUrl || null, effectThumb: editor.effectThumb || null, effectHidden: editor.hideEffect, planIds: [], confirmed: false, favorited: false, deleted: false, createdAt: now, updatedAt: now };
    state.prompts.push(rec);
  }
  await dbPut('prompts', rec);
  toast(editor.id ? '已更新 ✅' : '已新建 ✅');
  closeSheet(); route();
}

/* ---------------- 关联方案 ---------------- */
function openAssoc(id) {
  const p = state.prompts.find((x) => x.id === id);
  const opts = state.plans.map((pl) => {
    const has = (pl.cardIds || []).includes(id);
    return `<div class="list-item" data-act="toggle-plan" data-pid="${pl.id}" data-cid="${id}" style="${has ? 'outline:2px solid var(--accent)' : ''}"><span class="li-ico">${has ? '✅' : '🔗'}</span><div class="li-body"><div class="li-title">${esc(pl.name)}</div><div class="li-sub">${(pl.cardIds || []).length} 条</div></div><span class="li-arrow">${has ? '已关联' : '关联'}</span></div>`;
  }).join('');
  openSheet(`
    <div class="sheet-head"><h2>🔗 加入方案</h2><button class="sheet-close" data-act="close">✕</button></div>
    <p class="kv" style="margin:0 0 12px">把「${esc(p.title)}」关联到方案，方便成批使用。</p>
    ${opts || emptyHTML('🔗', '还没有方案', '先去「方案」页新建一个')}
    <div class="row-actions" style="margin-top:12px"><button class="btn-ghost accent" data-act="new-plan-from" data-cid="${id}">＋ 新建并关联</button></div>
  `);
}

/* ---------------- 事件绑定 ---------------- */
function bindViewEvents() {
  const view = document.getElementById('view');
  view.onclick = (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.getAttribute('data-act');
    const id = el.getAttribute('data-id');
    switch (act) {
      case 'new': openEditor(null); break;
      case 'detail': openDetail(id); break;
      case 'zoom': openLightbox(el.getAttribute('data-zoom')); break;
      case 'cat': state.category = el.getAttribute('data-cat'); state.tag = ''; route(); break;
      case 'set-cat': state.category = el.getAttribute('data-cat'); route(); break;
      case 'set-tag': state.tag = el.getAttribute('data-tag'); route(); break;
      case 'goto-library': location.hash = '#/library'; break;
      case 'goto-ai': location.hash = '#/ai'; break;
      case 'goto-plans': location.hash = '#/plans'; break;
      case 'goto-inspiration': location.hash = '#/inspiration'; break;
      case 'goto-help': location.hash = '#/help'; break;
      case 'goto-settings': location.hash = '#/settings'; break;
      case 'focus-search': location.hash = '#/library'; state.pendingSearchFocus = true; break;
      case 'back-library': state.showDeleted = false; location.hash = '#/library'; break;
      case 'open-plan': openPlan(el.getAttribute('data-id')); break;
      case 'new-plan': createPlan(); break;
      case 'restore': restorePrompt(id); break;
      case 'purge': purgePrompt(id); break;
      case 'confirm': toggleConfirm(id); break;
      case 'copy': copyPrompt(id); break;
      case 'assoc': openAssoc(id); break;
      case 'edit': openEditor(id); break;
      case 'soft-delete': softDelete(id); break;
      case 'export': exportData(); break;
      case 'import': importData(); break;
      case 'import-example': importExamplePrompts(); break;
      case 'clear-all': clearAll(); break;
      case 'gen-card': genCard(); break;
      case 'dl-card': dlCard(); break;
      case 'open-chatgpt': window.open('https://23949449.share.mxai.cn/home/?from=invite&invite_id=23949449', '_blank'); break;
      case 'open-gemini': window.open('https://jiaotu.top/?invite=7R9L', '_blank'); break;
      case 'about': toast('AI轻松学 v1.0.0 · 本地优先 · 数据不出本机'); break;
      case 'new-insp': openInspirationEditor(null); break;
      case 'edit-insp': openInspirationEditor(id); break;
      case 'save-insp': saveInspiration(); break;
      case 'del-insp': deleteInspiration(id); break;
    }
  };
  const libSearch = document.getElementById('lib-search');
  if (libSearch) libSearch.oninput = (e) => { state.search = e.target.value; const grid = document.querySelector('.card-grid'); if (grid) { const l = filteredPrompts(); grid.innerHTML = l.map(cardHTML).join('') || emptyHTML('🔍', '没有匹配的提示词', ''); } };
}

/* ---------------- 各种操作 ---------------- */
async function softDelete(id) {
  const p = state.prompts.find((x) => x.id === id); if (!p) return;
  if (!confirm(`确定删除「${p.title}」？可到回收站恢复。`)) return;
  p.deleted = true; p.updatedAt = Date.now();
  await dbPut('prompts', p);
  toast('已删除，可到回收站恢复'); closeSheet(); route();
}
async function restorePrompt(id) {
  const p = state.prompts.find((x) => x.id === id); if (!p) return;
  p.deleted = false; p.updatedAt = Date.now();
  await dbPut('prompts', p); toast('已恢复 ♻️'); route();
}
async function purgePrompt(id) {
  const p = state.prompts.find((x) => x.id === id); if (!p) return;
  if (!confirm(`彻底删除「${p.title}」？此操作不可恢复。`)) return;
  await dbDel('prompts', id); state.prompts = state.prompts.filter((x) => x.id !== id); toast('已彻底删除'); route();
}
async function toggleConfirm(id) {
  const p = state.prompts.find((x) => x.id === id); if (!p) return;
  p.confirmed = !p.confirmed; p.updatedAt = Date.now();
  await dbPut('prompts', p); toast(p.confirmed ? '已确认 ✅' : '已取消确认'); closeSheet(); route();
}
async function copyPrompt(id) {
  const p = state.prompts.find((x) => x.id === id); if (!p) return;
  try { await navigator.clipboard.writeText(p.content); toast('提示词已复制 📋'); }
  catch { const ta = document.createElement('textarea'); ta.value = p.content; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('提示词已复制 📋'); }
}
async function createPlan(name) {
  const nm = name || prompt('方案名称：', '我的方案'); if (!nm) return null;
  const pl = { id: uid(), name: nm, description: '', cardIds: [], createdAt: Date.now(), updatedAt: Date.now() };
  state.plans.push(pl); await dbPut('plans', pl); return pl;
}
async function createPlanFrom(cid) {
  const nm = prompt('新方案名称：', '我的方案'); if (!nm) return;
  const pl = await createPlan(nm); if (!pl) return;
  pl.cardIds = [cid]; await dbPut('plans', pl);
  toast('已新建并关联 🔗'); closeSheet(); openPlan(pl.id);
}
async function openPlan(id) {
  const pl = state.plans.find((x) => x.id === id); if (!pl) return;
  const cards = (pl.cardIds || []).map((cid) => state.prompts.find((x) => x.id === cid)).filter(Boolean);
  openSheet(`
    <div class="sheet-head"><h2>${esc(pl.name)}</h2><button class="sheet-close" data-act="close">✕</button></div>
    <p class="kv" style="margin:0 0 12px">${esc(pl.description || '该方案包含的提示词')} · ${cards.length} 条</p>
    ${cards.length ? `<div class="card-grid">${cards.map(cardHTML).join('')}</div>` : emptyHTML('🔗', '方案还是空的', '去提示词详情点「加入方案」')}
    <div class="row-actions" style="margin-top:12px">
      <button class="btn-ghost" data-act="rename-plan" data-id="${pl.id}">✏️ 重命名</button>
      <button class="btn-ghost danger" data-act="del-plan" data-id="${pl.id}">🗑️ 删除方案</button>
    </div>
  `);
}
async function renamePlan(id) {
  const pl = state.plans.find((x) => x.id === id); if (!pl) return;
  const nm = prompt('方案名称：', pl.name); if (!nm) return;
  pl.name = nm; pl.updatedAt = Date.now(); await dbPut('plans', pl); toast('已重命名'); openPlan(id);
}
async function deletePlan(id) {
  const pl = state.plans.find((x) => x.id === id); if (!pl) return;
  if (!confirm(`删除方案「${pl.name}」？（卡片不会删除）`)) return;
  await dbDel('plans', id); state.plans = state.plans.filter((x) => x.id !== id); toast('方案已删除'); closeSheet(); route();
}

/* ---------------- 关联切换 ---------------- */
async function togglePlan(pid, cid) {
  const pl = state.plans.find((x) => x.id === pid); if (!pl) return;
  pl.cardIds = pl.cardIds || [];
  const i = pl.cardIds.indexOf(cid);
  if (i >= 0) pl.cardIds.splice(i, 1); else pl.cardIds.push(cid);
  pl.updatedAt = Date.now(); await dbPut('plans', pl); openAssoc(cid);
}

async function importExamplePrompts() {
  const seed = (window.SEED_PROMPTS || []);
  if (!seed.length) { toast('没有可用的示例数据'); return; }
  if (!confirm('将把《仙女提示词库》全部完整示例提示词追加到当前库（按标题去重，不会覆盖你自己的提示词）。继续？')) return;
  const have = new Set(state.prompts.filter((p) => !p.deleted).map((p) => p.title));
  let added = 0;
  for (const o of seed) {
    if (have.has(o.title)) continue;
    const rec = { id: uid(), title: o.title || '未命名提示词', category: o.category || '其他', tags: Array.isArray(o.tags) ? o.tags : [], content: o.content || '', source: o.source || '仙女提示词库', confirmed: false, favorited: false, planIds: [], deleted: false, createdAt: Date.now(), updatedAt: Date.now(), image: null, effectUrl: o.effect || null, effectThumb: o.effectThumb || null };
    state.prompts.push(rec); await dbPut('prompts', rec); have.add(o.title); added++;
  }
  toast(added ? `已导入 ${added} 条示例提示词 ✨` : '示例已全部存在，无需导入');
  route();
}

/* ---------------- 数据导出 / 导入 ---------------- */
function exportData() {
  const data = { version: 1, exportedAt: Date.now(), prompts: state.prompts, plans: state.plans, inspirations: state.inspirations, settings: state.settings };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = u; a.download = `AI轻松学_备份_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000); toast('已导出备份 📤');
}
function importData() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const txt = await f.text(); const data = JSON.parse(txt);
      if (!confirm('导入将合并到现有数据（相同 ID 覆盖）。继续？')) return;
      for (const p of data.prompts || []) { await dbPut('prompts', p); }
      for (const pl of data.plans || []) { await dbPut('plans', pl); }
      if (data.settings) { state.settings = data.settings; await dbPut('meta', { key: 'settings', ...state.settings }); }
      await loadData(); applyTheme(state.settings.theme || 0); renderNav(); route(); toast('导入完成 📥');
    } catch (e) { toast('导入失败：文件格式错误'); }
  };
  inp.click();
}
async function clearAll() {
  if (!confirm('确定清空全部提示词与方案？此操作不可恢复，建议先导出备份。')) return;
  for (const p of state.prompts) await dbDel('prompts', p.id);
  for (const pl of state.plans) await dbDel('plans', pl.id);
  await dbDel('meta', 'seeded');
  state.prompts = []; state.plans = [];
  toast('已清空，重新载入示例…'); setTimeout(() => location.reload(), 600);
}

/* ---------------- 本地知识卡片生成 ---------------- */
let lastCardHTML = '';
function genCard() {
  const g = (id) => (document.getElementById(id).value || '').trim();
  const title = g('kc-title') || '知识卡片';
  const type = g('kc-type') || '思维模型';
  const quote = g('kc-quote') || '';
  const pts = [
    { t: g('kc-p1t'), d: g('kc-p1d') },
    { t: g('kc-p2t'), d: g('kc-p2d') },
    { t: g('kc-p3t'), d: g('kc-p3d') },
  ].filter((x) => x.t || x.d);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-deep').trim() || '#E75C86';
  const body = pts.map((p, i) => `<div class="pt"><div class="ptn">${i + 1}</div><div><div class="ptt">${esc(p.t)}</div><div class="ptd">${esc(p.d)}</div></div></div>`).join('');
  lastCardHTML = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{margin:0;font-family:"PingFang SC","Microsoft YaHei",sans-serif;background:linear-gradient(135deg,#FFE3EC,#E3F0FF);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{width:600px;max-width:92vw;background:#fff;border-radius:28px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.15)}
.tag{display:inline-block;color:${accent};font-weight:700;letter-spacing:2px;font-size:14px}
.h{font-family:"Songti SC",serif;font-size:34px;font-weight:800;margin:10px 0 16px}
.q{font-size:18px;color:#555;font-style:italic;border-left:4px solid ${accent};padding-left:14px;margin:0 0 22px}
.pt{display:flex;gap:14px;margin:16px 0;align-items:flex-start}
.ptn{width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:${accent};color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.ptt{font-weight:700;font-size:17px}.ptd{color:#666;font-size:14px;margin-top:3px}
.foot{margin-top:24px;font-size:12px;color:#aaa;text-align:right;letter-spacing:1px}</style></head>
<body><div class="card"><div class="tag">${esc(type)}</div><div class="h">${esc(title)}</div>${quote ? `<div class="q">${esc(quote)}</div>` : ''}${body}<div class="foot">AI轻松学 · 知识卡片</div></div></body></html>`;
  const f = document.getElementById('kc-preview'); f.style.display = 'block'; f.srcdoc = lastCardHTML;
  document.getElementById('kc-dl').disabled = false; toast('已生成预览 🎨');
}
function dlCard() {
  if (!lastCardHTML) return;
  const blob = new Blob([lastCardHTML], { type: 'text/html' });
  const u = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = u; a.download = `知识卡片_${Date.now()}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}

/* ---------------- 设置交互 ---------------- */
function setTheme(i) { state.settings.theme = i; dbPut('meta', { key: 'settings', ...state.settings }); applyTheme(i); renderNav(); route(); toast('主题已更新 🎨'); }
function saveBrand() { const inp = document.getElementById('brand-emoji-input'); const v = (inp ? inp.value.trim() : '') || '\u{1FA84}'; state.settings.brandEmoji = v; dbPut('meta', { key: 'settings', ...state.settings }); renderNav(); const p = document.getElementById('brand-preview'); if (p) p.innerHTML = renderBrandIcon(v); toast('图标已保存 🖼️'); }
async function showStorage() {
  const box = document.getElementById('storage-info'); if (!box) return;
  if (navigator.storage && navigator.storage.estimate) {
    const e = await navigator.storage.estimate();
    const mb = (e.usage / 1024 / 1024).toFixed(2);
    box.textContent = `本地已用约 ${mb} MB（浏览器上限因设备而异，建议定期导出备份）`;
  } else box.textContent = '当前浏览器不支持容量估算。';
}

/* ---------------- 顶部 / 侧边 全局事件 ---------------- */
function bindGlobal() {
  document.getElementById('top-new').onclick = () => openEditor(null);
  document.getElementById('top-search').onclick = () => { location.hash = '#/library'; state.pendingSearchFocus = true; };
  document.getElementById('side-search-input').oninput = (e) => {
    state.search = e.target.value;
    const grid = document.querySelector('.card-grid');
    if (location.hash === '#/library' && grid) {
      grid.innerHTML = filteredPrompts().map(cardHTML).join('') || emptyHTML('🔍', '没有匹配的提示词', '');
      const s = document.getElementById('lib-search'); if (s) s.value = state.search;
    } else { location.hash = '#/library'; state.pendingSearchFocus = false; }
  };
  document.getElementById('menu-btn').onclick = () => openDrawer();
  document.getElementById('overlay').onclick = () => closeSheet();
  document.getElementById('drawer-overlay').onclick = () => closeDrawer();
  // 详情/方案里的动态按钮通过事件委托
  document.getElementById('sheet').onclick = (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const act = el.getAttribute('data-act');
    const id = el.getAttribute('data-id');
    switch (act) {
      case 'close': closeSheet(); break;
      case 'save': saveEditor(); break;
      case 'pick-img': document.getElementById('f-img').click(); break;
      case 'del-img': if (editor.image) editor.image = null; else editor.hideEffect = true; renderImgPreview(); break;
      case 'set-theme': setTheme(Number(el.getAttribute('data-i'))); break;
      case 'save-brand': saveBrand(); break;
      case 'toggle-plan': togglePlan(el.getAttribute('data-pid'), el.getAttribute('data-cid')); break;
      case 'new-plan-from': createPlanFrom(el.getAttribute('data-cid')); break;
      case 'rename-plan': renamePlan(el.getAttribute('data-id')); break;
      case 'del-plan': deletePlan(el.getAttribute('data-id')); break;
      case 'copy': copyPrompt(el.getAttribute('data-id')); break;
      case 'confirm': toggleConfirm(el.getAttribute('data-id')); break;
      case 'assoc': openAssoc(el.getAttribute('data-id')); break;
      case 'edit': openEditor(el.getAttribute('data-id')); break;
      case 'soft-delete': softDelete(el.getAttribute('data-id')); break;
      case 'pick-insp-img': document.getElementById('insp-img').click(); break;
      case 'del-insp-img': inspEditor.image = null; renderInspImgPreview(); break;
      case 'save-insp': saveInspiration(); break;
    }
  };
  document.getElementById('sheet').onchange = (e) => {
    if (e.target.id === 'f-img') {
      const file = e.target.files[0]; if (!file) return;
      fileToBlob(file).then((b) => { editor.image = b; renderImgPreview(); });
    }
    if (e.target.id === 'insp-img') {
      const file = e.target.files[0]; if (!file) return;
      fileToBlob(file).then((b) => { inspEditor.image = b; renderInspImgPreview(); });
    }
  };
}

/* ---------------- 移动端侧边抽屉 ---------------- */
function openDrawer() {
  let d = document.getElementById('drawer-panel');
  if (!d) {
    d = document.createElement('div'); d.id = 'drawer-panel'; d.className = 'drawer-panel';
    d.innerHTML = `<div class="brand">${renderBrandIcon(state.settings.brandEmoji || '\u{1FA84}')}<span class="brand-name">AI轻松学</span></div><nav class="side-nav">${SIDE_NAV.map((n) => `<a href="#/${n.route}" data-route="${n.route}">${navIcon(n)}<span class="nav-txt">${n.label}</span></a>`).join('')}</nav>`;
    document.body.appendChild(d);
    d.querySelectorAll('[data-route]').forEach((a) => a.onclick = () => { closeDrawer(); });
  }
  d.classList.add('show'); document.getElementById('drawer-overlay').classList.add('show');
}
function closeDrawer() { const d = document.getElementById('drawer-panel'); if (d) d.classList.remove('show'); document.getElementById('drawer-overlay').classList.remove('show'); }

/* ---------------- 启动 ---------------- */
async function init() {
  try {
    await openDB();
    await loadData();
    applyTheme(state.settings.theme || 0);
    renderNav();
    bindGlobal();
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/home';
    route();
    // 设置页存储信息
    if (state.view === 'settings') showStorage();
    setTimeout(showStorage, 300);
  } catch (e) {
    document.getElementById('view').innerHTML = `<div class="error-state"><p>😢 初始化失败</p><p>${esc(e.message)}</p><p>请确认浏览器支持 IndexedDB，且未禁用本地存储。</p></div>`;
  }
}
init();
