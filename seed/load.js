// Charge une archive du seed -> fichiers prêts à insérer (nettoyés, sans pubs d'auteur). Aucune base requise.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readZip } from '../public/js/zip.js';
import { normPath, prepareFile, pickEntry } from '../lib/ingest.js';
import { DEFAULT_TERMS } from '../lib/sanitize.js';

export const DIR = fileURLToPath(new URL('./templates/', import.meta.url));
export const MAX_FILE = 4 * 1024 * 1024;   // reste sous la limite de réponse de Vercel (4,5 Mo)

// Fichiers texte à la racine qui ne sont que de la pub / de l'attribution (hors licences).
const PROMO = /t\.me\/|telegram|télégram|canal|rejoign|auteur|développé par|designer\s*:|copyright|\bby\s+[A-Z]/i;

async function open(buf, depth = 0) {
  const entries = readZip(buf).filter((e) => !e.dir);
  if (entries.some((e) => e.encrypted)) return { encrypted: true };
  if (entries.length === 1 && /\.zip$/i.test(entries[0].path) && depth < 2) return open(await entries[0].bytes(), depth + 1);
  return { entries };
}

export async function loadTemplate(def, terms = DEFAULT_TERMS) {
  const file = `${DIR}${def.zip}.zip`;
  if (!existsSync(file)) return { missing: true };
  const arc = await open(readFileSync(file));
  if (arc.encrypted) return { encrypted: true };

  let list = arc.entries.map((e) => ({ path: normPath(e.path), size: e.size, bytes: () => e.bytes() })).filter((f) => f.path);
  // Retire les dossiers englobants (jusqu'à 3 niveaux : « Nom/», « @auteur sur telegram/ »…).
  for (let i = 0; i < 3; i++) {
    const roots = new Set(list.map((f) => f.path.split('/')[0]));
    if (roots.size !== 1 || !list.every((f) => f.path.includes('/'))) break;
    list = list.map((f) => ({ ...f, path: f.path.split('/').slice(1).join('/') }));
  }

  const all = [...terms, ...(def.terms || [])];
  const rows = [], removed = [], kept = [], skipped = [], dropped = [];
  for (const f of list) {
    const bytes = Buffer.from(await f.bytes());
    if (!f.path.includes('/') && /\.txt$/i.test(f.path) && !/licen[cs]e/i.test(f.path) && PROMO.test(bytes.toString('utf8'))) { dropped.push(f.path); continue; }
    if (bytes.length > MAX_FILE) { skipped.push(`${f.path} (${(bytes.length / 1048576).toFixed(1)} Mo)`); continue; }
    const r = prepareFile(f.path, bytes, all);
    rows.push(r.row); removed.push(...r.removed); kept.push(...r.kept);
  }
  dropped.forEach((p) => removed.push({ file: p, type: 'fichier', snippet: 'fichier de promotion / d’attribution écarté' }));
  const paths = rows.map((r) => r.path);
  const entry = def.entry !== undefined ? def.entry : pickEntry(paths);
  return { rows, removed, kept, skipped, dropped, entry, entryMissing: !!entry && !paths.includes(entry) };
}

// Références locales cassées dans les pages HTML (src/href relatifs vers un fichier absent).
export function brokenRefs(rows) {
  const have = new Set(rows.map((r) => r.path));
  const out = [];
  for (const r of rows) {
    if (!r.isText || !/\.html?$/i.test(r.path)) continue;
    const dir = r.path.split('/').slice(0, -1);
    for (const m of r.text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
      const u = m[1].trim();
      if (!u || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\{\{|<\?|\$|\+)/i.test(u) || u.includes('{{') || u.includes('<?')) continue;
      let p; try { p = decodeURIComponent(u.split(/[?#]/)[0]); } catch { p = u.split(/[?#]/)[0]; }
      if (!p || /\.html?$/i.test(p) && p.startsWith('/')) continue;
      const parts = p.startsWith('/') ? p.slice(1).split('/') : [...dir, ...p.split('/')];
      const stack = []; for (const s of parts) { if (s === '..') stack.pop(); else if (s && s !== '.') stack.push(s); }
      const full = stack.join('/');
      if (!have.has(full)) out.push(`${r.path} → ${u}`);
    }
  }
  return out;
}

// Mentions d'auteur qui subsistent après nettoyage (hors licences) : à relire.
export function residual(rows) {
  const re = /(?:created|designed|made|coded|developed|powered|built)\s+by\b[^\n<]{0,60}|©[^\n<]{0,60}|&copy;[^\n<]{0,60}/i;
  const out = [];
  for (const r of rows) {
    if (!r.isText || !/\.(html?|css|js|php|scss)$/i.test(r.path) || /\.min\.|vendor|vendors|node_modules|bootstrap|jquery/i.test(r.path)) continue;
    for (const line of r.text.split('\n')) { const m = re.exec(line.length > 400 ? line.slice(0, 400) : line); if (m) { out.push(`${r.path}: ${m[0].trim()}`); break; } }
  }
  return out;
}
