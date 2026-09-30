// API publique : liste/recherche, détail, compteurs. Aucune authentification.
import { prisma, getSettings } from '../lib/db.js';
import { send, fail } from '../lib/http.js';

const CACHE = 'public, s-maxage=30, stale-while-revalidate=120';

export default async function handler(req, res) {
  try {
    const { slug, event, meta } = req.query;

    if (req.method === 'POST') {
      const field = { view: 'views', copy: 'copies', download: 'downloads' }[event];
      if (!slug || !field) return fail(res, 400, 'Évènement invalide');
      await prisma.template.update({ where: { slug }, data: { [field]: { increment: 1 } } }).catch(() => {});
      res.statusCode = 204; return res.end();
    }
    if (req.method !== 'GET') return fail(res, 405, 'Méthode non autorisée');

    if (meta) {
      const [categories, s] = await Promise.all([
        prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }], include: { _count: { select: { templates: { where: { published: true } } } } } }),
        getSettings(),
      ]);
      return send(res, 200, {
        siteName: s.siteName, initials: s.initials,
        categories: categories.map((c) => ({ slug: c.slug, name: c.name, count: c._count.templates })),
      }, CACHE);
    }

    if (slug) {
      const t = await prisma.template.findFirst({
        where: { slug, published: true },
        include: { category: true, files: { select: { path: true, size: true, isText: true, mime: true }, orderBy: { path: 'asc' } } },
      });
      if (!t) return fail(res, 404, 'Template introuvable');
      const { cleanupReport, ...pub } = t;
      return send(res, 200, pub, CACHE);
    }

    const q = String(req.query.q || '').trim().slice(0, 80);
    const cat = String(req.query.category || '');
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 24;
    const where = { published: true };
    if (cat) where.category = { slug: cat };
    if (q) where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { has: q.toLowerCase() } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
    ];
    const orderBy = { popular: { views: 'desc' }, downloads: { downloads: 'desc' } }[req.query.sort] || { createdAt: 'desc' };
    const [total, items] = await Promise.all([
      prisma.template.count({ where }),
      prisma.template.findMany({
        where, orderBy, skip: (page - 1) * limit, take: limit,
        select: { slug: true, title: true, description: true, tags: true, entryPath: true, views: true, downloads: true, createdAt: true, category: { select: { name: true, slug: true } } },
      }),
    ]);
    return send(res, 200, { items, total, page, pages: Math.ceil(total / limit) }, CACHE);
  } catch (e) {
    console.error(e);
    return fail(res, 500, 'Erreur serveur');
  }
}
