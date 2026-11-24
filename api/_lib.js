// Dùng chung cho các API: lưu trữ (Vercel Blob), phiên đăng nhập, băm mật khẩu.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = process.env.SESSION_SECRET || '';
const LOCAL = process.env.LOCAL_STORE || '';
const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const AUTH_PATH = 'private/auth-' + sign('auth-path').slice(0, 40) + '.json';
const CONTENT_PATH = 'content/site.json';

function configured() { return !!SECRET && (!!LOCAL || !!process.env.BLOB_READ_WRITE_TOKEN); }

async function readJson(p) {
  if (LOCAL) { try { return JSON.parse(fs.readFileSync(path.join(LOCAL, p), 'utf8')); } catch (e) { return null; } }
  const { list } = require('@vercel/blob');
  const r = await list({ prefix: p, limit: 5 });
  const b = r.blobs.find((x) => x.pathname === p);
  if (!b) return null;
  const res = await fetch(b.url + '?v=' + new Date(b.uploadedAt).getTime(), { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}
async function writeJson(p, data) {
  if (LOCAL) { const f = path.join(LOCAL, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data)); return; }
  const { put } = require('@vercel/blob');
  await put(p, JSON.stringify(data), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
}
async function saveImage(name, buf, type) {
  if (LOCAL) { const f = path.join(LOCAL, 'images', name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); return '/local-images/' + name; }
  const { put } = require('@vercel/blob');
  const b = await put('images/' + name, buf, { access: 'public', addRandomSuffix: true, contentType: type });
  return b.url;
}
function sessionCookie(clear) {
  if (clear) return 'yk_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
  const exp = Date.now() + 7 * 864e5;
  return 'yk_session=' + exp + '.' + sign('s:' + exp) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + 7 * 86400;
}
function isAuthed(req) {
  if (!SECRET) return false;
  const m = /(?:^|;\s*)yk_session=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const parts = m[1].split('.');
  if (parts.length !== 2 || !(Number(parts[0]) > Date.now())) return false;
  const good = sign('s:' + parts[0]);
  return parts[1].length === good.length && crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(good));
}
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
function body(req) { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }

module.exports = { AUTH_PATH, CONTENT_PATH, configured, readJson, writeJson, saveImage, sessionCookie, isAuthed, hashPw, body, crypto };
