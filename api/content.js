const { CONTENT_PATH, readJson, configured } = require('./_lib');
const seed = require('../data/seed.json');
module.exports = async (req, res) => {
  let data = null;
  try { if (configured()) data = await readJson(CONTENT_PATH); } catch (e) { console.error('content read failed', e); }
  if (req.query && req.query.fresh) res.setHeader('Cache-Control', 'no-store');
  else { res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=5, stale-while-revalidate=30'); }
  res.status(200).json(data || seed);
};
