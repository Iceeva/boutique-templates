// Logique d'import partagée par l'admin (upload) et le seed : chemins, détection texte/binaire, nettoyage, page d'entrée.
import { sanitizeText } from './sanitize.js';
import { isTextPath, mimeOf } from './render.js';

export function normPath(p) {
  const n = String(p || '').replace(/\\/g, '/').replace(/^(\.?\/)+/, '');
  const parts = n.split('/');
  if (!n || n.length > 300 || parts.some((x) => x === '' || x === '..' || x === '.')) return null;
  if (/(^|\/)(__MACOSX|\.git|node_modules)(\/|$)|(^|\/)(\.DS_Store|Thumbs\.db)$/.test(n)) return null;
  return n;
}

const looksBinary = (buf) => buf.subarray(0, 4000).includes(0);

// -> { row, removed, kept } ; row est prêt pour prisma.templateFile
export function prepareFile(path, bytes, terms) {
  let buf = Buffer.from(bytes);
  const isText = isTextPath(path) && !looksBinary(buf);
  let text = null, data = null, removed = [], kept = [];
  if (isText) {
    const r = sanitizeText(path, buf.toString('utf8').replace(/^\uFEFF/, ''), terms);
    text = r.text; removed = r.removed; kept = r.kept;
    buf = Buffer.from(text, 'utf8');
  } else data = buf;
  return { row: { path, mime: mimeOf(path), isText, size: buf.length, text, data }, removed, kept };
}

// Page d'aperçu : la plus proche de la racine, index.html en priorité. '' = aucune page HTML (code seul).
export function pickEntry(paths) {
  const isIndex = (p) => /(^|\/)index\.html?$/i.test(p);
  const pages = paths.filter((p) => /\.html?$/i.test(p));
  pages.sort((x, y) => x.split('/').length - y.split('/').length || Number(isIndex(y)) - Number(isIndex(x)) || x.length - y.length);
  return pages[0] || '';
}
