const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!L.isAuthed(req)) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    const c = L.body(req).content;
    if (!c || !Array.isArray(c.products) || !Array.isArray(c.stores) || !c.settings || !c.home) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    c.updatedAt = new Date().toISOString();
    await L.writeJson(L.CONTENT_PATH, c);
    return res.status(200).json({ ok: true, updatedAt: c.updatedAt });
  } catch (e) { console.error('save failed', e); return res.status(500).json({ error: 'Không lưu được.' }); }
};
