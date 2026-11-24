const L = require('./_lib');
const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!L.isAuthed(req)) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    const b = L.body(req);
    const ext = TYPES[b.type];
    if (!ext || typeof b.data !== 'string') return res.status(400).json({ error: 'Chỉ nhận ảnh WebP, JPG hoặc PNG.' });
    const buf = Buffer.from(b.data, 'base64');
    if (!buf.length || buf.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Ảnh quá lớn (tối đa 3 MB).' });
    const base = String(b.name || 'anh').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'anh';
    const url = await L.saveImage(Date.now() + '-' + base + '.' + ext, buf, b.type);
    return res.status(200).json({ url });
  } catch (e) { console.error('upload failed', e); return res.status(500).json({ error: 'Không tải ảnh lên được.' }); }
};
