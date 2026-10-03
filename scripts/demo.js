// Mode démo local : `npm run demo` -> http://localhost:3000   (admin : mot de passe « demo »)
// Exécute les vraies fonctions de api/ avec les templates du seed chargés en mémoire. Aucune base requise.
import { register } from 'node:module';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.ADMIN_PASSWORD ||= 'demo';
process.env.SESSION_SECRET ||= 'demo-secret-demo-secret-demo-secret!';
register('./demo-loader.js', import.meta.url);

const { PrismaClient } = await import('@prisma/client');
const { store } = await import('../test/fake-prisma.js');
const { categories, templates } = await import('../seed/manifest.js');
const { loadTemplate } = await import('../seed/load.js');
const handlers = { templates: (await import('../api/templates.js')).default, preview: (await import('../api/preview.js')).default, admin: (await import('../api/admin.js')).default };

const db = new PrismaClient();
for (const [i, [slug, name]] of categories.entries()) await db.category.upsert({ where: { slug }, update: {}, create: { slug, name, position: i } });
const settings = await db.siteSettings.upsert({});
let n = 0;
for (const def of templates) {
  const t = await loadTemplate(def, settings.blockedTerms);
  if (t.missing || t.encrypted) continue;
  const cat = await db.category.findUnique({ where: { slug: def.category } });
  const tpl = await db.template.create({ data: { slug: def.slug, title: def.title, description: def.description, tags: def.tags, categoryId: cat?.id ?? null, entryPath: t.entry, cleanupReport: { removed: t.removed, kept: t.kept, skipped: t.skipped } } });
  await db.templateFile.createMany({ data: t.rows.map((r) => ({ ...r, templateId: tpl.id })) });
  n++;
}
console.log(`${n} templates chargés en mémoire.`);

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
const dec = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const query = Object.fromEntries(url.searchParams);
  let fn, m;
  if ((m = url.pathname.match(/^\/p\/([^/]+)(?:\/(.+))?$/))) { fn = handlers.preview; query.slug = dec(m[1]); if (m[2]) query.path = dec(m[2]); }
  else if (url.pathname === '/api/templates') fn = handlers.templates;
  else if ((m = url.pathname.match(/^\/api\/admin(?:\/(.*))?$/))) { fn = handlers.admin; query.route = m[1] || ''; }
  if (fn) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    req.query = query; req.body = raw && /json/.test(req.headers['content-type'] || '') ? JSON.parse(raw) : undefined;
    return fn(req, res);
  }
  let file = url.pathname;
  if (/^\/t\/[^/]+$/.test(file)) file = '/template.html'; else if (file === '/admin' || file === '/admin/') file = '/admin/index.html'; else if (file === '/') file = '/index.html';
  try {
    const p = normalize(join(PUBLIC, dec(file)));
    if (!p.startsWith(PUBLIC)) throw 0;
    res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream'); res.end(await readFile(p));
  } catch { res.statusCode = 404; res.end('404'); }
}).listen(process.env.PORT || 3000, () => console.log(`Démo : http://localhost:${process.env.PORT || 3000}  ·  admin : /admin (mot de passe « demo »)`));
