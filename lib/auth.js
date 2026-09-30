import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const COOKIE = 'tpl_admin';
const TTL = 7 * 24 * 3600;
const secret = () => process.env.SESSION_SECRET || '';
const sign = (v) => createHmac('sha256', secret()).update(v).digest('base64url');

export function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || !secret()) return false;
  const a = createHash('sha256').update(String(input ?? '')).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function sessionCookie(req) {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE}=${exp}.${sign(exp)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${TTL}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;

export function isAdmin(req) {
  if (!secret()) return false;
  const raw = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig) return false;
  const good = sign(exp);
  if (sig.length !== good.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  return Number(exp) > Date.now() / 1000;
}

// Session valide + en-tête personnalisé sur les écritures (protège du CSRF).
export function requireAdmin(req) {
  if (!isAdmin(req)) return false;
  if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'fetch') return false;
  return true;
}
