const { CONTENT_PATH, readJson, configured } = require('./_lib');
const seed = require('../data/seed.json');
const clone = (o) => JSON.parse(JSON.stringify(o));

// Nội dung lưu trước khi có mục mới thì lấy phần thiếu từ bản gốc, giữ nguyên chỗ đã sửa.
function upgrade(saved) {
  const data = Object.assign({}, clone(seed), saved);
  const oldTheme = saved.theme || {};
  const t = Object.assign({}, seed.theme, oldTheme);
  t.sections = Object.assign({}, seed.theme.sections, oldTheme.sections || {});
  if (!Array.isArray(saved.categories) || !saved.categories.length) {
    data.categories = clone(seed.categories).map((c) => (t.sections[c.id] === false ? Object.assign(c, { home: false }) : c));
  }
  if (!saved.menu || typeof saved.menu !== 'object') {
    const m = clone(seed.menu);
    const nav = Array.isArray(oldTheme.nav) ? oldTheme.nav : [];
    const apply = (list, ids) => list.filter((it, k) => {
      const n = nav.find((x) => x && x.id === ids[k]);
      if (n && n.label) it.label = n.label;
      return !(n && n.show === false);
    });
    m.left = apply(m.left, ['n0', 'n1', 'n2']);
    m.right = apply(m.right, ['n3', 'n4', 'n5']);
    data.menu = m;
  }
  delete t.nav;
  ['moto', 'fashion'].forEach((k) => delete t.sections[k]);
  data.theme = t;
  const h = saved.home || {};
  if (!Array.isArray(h.slides)) {
    const slides = clone(seed.home.slides);
    ['eyebrow', 'title1', 'title2', 'desc'].forEach((k) => { if (h[k]) slides[0][k] = h[k]; });
    if (h.heroImg) slides[0].img = h.heroImg;
    data.home = { slides };
  }
  data.products = (data.products || []).map((p) => {
    if (p.colors) return p;
    const o = seed.products.find((x) => x.id === p.id);
    return Object.assign({}, p, { colors: o ? o.colors : [] });
  });
  return data;
}

module.exports = async (req, res) => {
  let data = null;
  try { if (configured()) data = await readJson(CONTENT_PATH); } catch (e) { console.error('content read failed', e); }
  if (req.query && req.query.fresh) res.setHeader('Cache-Control', 'no-store');
  else { res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=5, stale-while-revalidate=30'); }
  res.status(200).json(data ? upgrade(data) : seed);
};
