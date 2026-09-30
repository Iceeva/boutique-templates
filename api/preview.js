// Sert les fichiers d'un template : /p/:slug/:chemin   (?raw=1 = sans shim, pour code/ZIP)
import { prisma, getSettings } from '../lib/db.js';
import { applySignature, isTextPath, mimeOf } from '../lib/render.js';

export default async function handler(req, res) {
  try {
    const slug = String(req.query.slug || '');
    let path = String(req.query.path || '');
    const raw = req.query.raw === '1';

    if (!path) {
      const t = await prisma.template.findFirst({ where: { slug, published: true }, select: { entryPath: true } });
      if (!t) { res.statusCode = 404; return res.end('Introuvable'); }
      res.statusCode = 302;
      res.setHeader('Location', `/p/${slug}/${t.entryPath.split('/').map(encodeURIComponent).join('/')}`);
      return res.end();
    }

    const find = (p) => prisma.templateFile.findFirst({ where: { path: p, template: { slug, published: true } } });
    let file = await find(path);
    if (!file) { try { const d = decodeURIComponent(path); if (d !== path) file = await find(d); } catch {} }
    if (!file) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('Fichier introuvable'); }

    const mime = file.mime || mimeOf(file.path);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');

    if (file.isText) {
      const s = await getSettings();
      const body = applySignature(file.path, file.text ?? '', s, { preview: !raw });
      res.setHeader('Content-Type', `${mime}; charset=utf-8`);
      // Ouvert directement dans un onglet : le code du template n'a pas accès à ce site (origine opaque).
      if (mime === 'text/html' && !raw) res.setHeader('Content-Security-Policy', 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals');
      return res.end(body);
    }
    res.setHeader('Content-Type', mime);
    return res.end(Buffer.from(file.data ?? []));
  } catch (e) {
    console.error(e);
    res.statusCode = 500; return res.end('Erreur serveur');
  }
}
