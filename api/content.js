const { CONTENT_PATH, readJson, configured } = require('./_lib');
const seed = require('../data/seed.json');
module.exports = async (req, res) => {
  let data = null;
  try { if (configured()) data = await readJson(CONTENT_PATH); } catch (e) { console.error('content read failed', e); }
  if (req.query && req.query.fresh) res.setHeader('Cache-Control', 'no-store');
  else { res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=5, stale-while-revalidate=30'); }
  if (data) {
    // Nội dung lưu trước khi có mục mới thì lấy phần thiếu từ bản gốc.
    data = Object.assign({}, seed, data);
    const t = Object.assign({}, seed.theme, data.theme || {});
    t.sections = Object.assign({}, seed.theme.sections, t.sections || {});
    const saved = Array.isArray(t.nav) ? t.nav : [];
    t.nav = seed.theme.nav.map((n) => Object.assign({}, n, saved.find((x) => x && x.id === n.id) || {}));
    data.theme = t;
    data.products = (data.products || []).map((p) => { if (p.colors) return p; const o = seed.products.find((x) => x.id === p.id); return Object.assign({}, p, { colors: o ? o.colors : [] }); });
  }
  res.status(200).json(data || seed);
};
