const L = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!L.configured()) return res.status(503).json({ error: 'Chưa cấu hình nơi lưu dữ liệu.' });
  try {
    const rec = await L.readJson(L.AUTH_PATH);
    if (req.method === 'GET') return res.status(200).json({ setup: !!rec, loggedIn: L.isAuthed(req) });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const b = L.body(req);
    if (b.action === 'logout') { res.setHeader('Set-Cookie', L.sessionCookie(true)); return res.status(200).json({ ok: true }); }
    const pw = String(b.password || '');
    if (b.action === 'setup') {
      if (rec) return res.status(409).json({ error: 'Mật khẩu quản trị đã được tạo.' });
      if (pw.length < 8) return res.status(400).json({ error: 'Mật khẩu cần ít nhất 8 ký tự.' });
      const salt = L.crypto.randomBytes(16).toString('hex');
      await L.writeJson(L.AUTH_PATH, { salt, hash: L.hashPw(pw, salt), createdAt: new Date().toISOString() });
      res.setHeader('Set-Cookie', L.sessionCookie());
      return res.status(200).json({ ok: true });
    }
    if (b.action === 'login') {
      if (!rec) return res.status(400).json({ error: 'Chưa tạo mật khẩu quản trị.' });
      const h = L.hashPw(pw, rec.salt);
      const ok = h.length === rec.hash.length && L.crypto.timingSafeEqual(Buffer.from(h), Buffer.from(rec.hash));
      if (!ok) { await new Promise((r) => setTimeout(r, 800)); return res.status(401).json({ error: 'Sai mật khẩu.' }); }
      res.setHeader('Set-Cookie', L.sessionCookie());
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Yêu cầu không hợp lệ.' });
  } catch (e) { console.error('auth failed', e); return res.status(500).json({ error: 'Lỗi máy chủ.' }); }
};
