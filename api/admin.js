// API admin (une seule fonction, routage interne) : /api/admin/<route>
import { prisma, getSettings } from '../lib/db.js';
import { send, fail, slugify } from '../lib/http.js';
import { checkPassword, sessionCookie, clearCookie, isAdmin, requireAdmin } from '../lib/auth.js';
import { sanitizeText } from '../lib/sanitize.js';
import { normPath, prepareFile, pickEntry } from '../lib/ingest.js';

const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const COLOR = /^#[0-9a-f]{3,8}$/i;
const clean = (s, n) => String(s ?? '').replace(/[<>&"'`]/g, '').trim().slice(0, n);
const tagsOf = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(',')).map((t) => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 12);

async function uniqueSlug(base) {
  let slug = slugify(base), i = 2;
  while (await prisma.template.findUnique({ where: { slug }, select: { id: true } })) slug = `${slugify(base)}-${i++}`;
  return slug;
}

export default async function handler(req, res) {
  try {
    const [a, b, c] = String(req.query.route || '').split('/').filter(Boolean);
    const m = req.method;
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    if (a === 'login' && m === 'POST') {
      if (!checkPassword(body.password)) { await new Promise((r) => setTimeout(r, 700)); return fail(res, 401, 'Mot de passe incorrect'); }
      res.setHeader('Set-Cookie', sessionCookie(req));
      return send(res, 200, { ok: true });
    }
    if (a === 'logout' && m === 'POST') { res.setHeader('Set-Cookie', clearCookie()); return send(res, 200, { ok: true }); }
    if (a === 'me') return send(res, 200, { authenticated: isAdmin(req) });
    if (!requireAdmin(req)) return fail(res, 401, 'Non autorisé');

    // ---- Réglages : signature + termes à retirer ----
    if (a === 'settings') {
      if (m === 'GET') return send(res, 200, await getSettings());
      if (m === 'PUT') {
        const data = {
          siteName: clean(body.siteName, 40) || 'Boutique Templates',
          initials: clean(body.initials, 12),
          displayName: clean(body.displayName, 40),
          badgeEnabled: !!body.badgeEnabled,
          commentHeader: !!body.commentHeader,
          badgePosition: POSITIONS.includes(body.badgePosition) ? body.badgePosition : 'bottom-right',
          badgeColor: COLOR.test(body.badgeColor) ? body.badgeColor : '#ffffff',
          badgeBg: COLOR.test(body.badgeBg) ? body.badgeBg : '#111111',
          blockedTerms: [...new Set((body.blockedTerms || []).map((t) => String(t).trim().slice(0, 60)).filter(Boolean))].slice(0, 50),
        };
        await getSettings();
        return send(res, 200, await prisma.siteSettings.update({ where: { id: 1 }, data }));
      }
    }

    // ---- Catégories ----
    if (a === 'categories') {
      if (m === 'GET') return send(res, 200, await prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }] }));
      if (m === 'POST') {
        const name = clean(body.name, 40);
        if (!name) return fail(res, 400, 'Nom requis');
        const slug = slugify(name);
        const cat = await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name, position: 99 } });
        return send(res, 200, cat);
      }
      if (m === 'DELETE' && b) { await prisma.category.delete({ where: { id: Number(b) } }).catch(() => {}); return send(res, 200, { ok: true }); }
    }

    // ---- Templates ----
    if (a === 'templates') {
      if (!b && m === 'GET') {
        const list = await prisma.template.findMany({
          orderBy: { createdAt: 'desc' },
          select: { id: true, slug: true, title: true, description: true, tags: true, categoryId: true, published: true, views: true, copies: true, downloads: true, entryPath: true, cleanupReport: true, _count: { select: { files: true } } },
        });
        return send(res, 200, list);
      }
      if (!b && m === 'POST') {
        const title = clean(body.title, 80);
        if (!title) return fail(res, 400, 'Titre requis');
        const t = await prisma.template.create({
          data: {
            title, slug: await uniqueSlug(body.slug || title), description: clean(body.description, 500),
            tags: tagsOf(body.tags), categoryId: body.categoryId ? Number(body.categoryId) : null, published: body.published !== false,
          },
        });
        return send(res, 200, t);
      }
      if (b && !c && m === 'PATCH') {
        const data = {};
        if (body.title !== undefined) data.title = clean(body.title, 80);
        if (body.description !== undefined) data.description = clean(body.description, 500);
        if (body.tags !== undefined) data.tags = tagsOf(body.tags);
        if (body.categoryId !== undefined) data.categoryId = body.categoryId ? Number(body.categoryId) : null;
        if (body.published !== undefined) data.published = !!body.published;
        if (body.entryPath !== undefined && normPath(body.entryPath)) data.entryPath = normPath(body.entryPath);
        return send(res, 200, await prisma.template.update({ where: { id: b }, data }));
      }
      if (b && !c && m === 'DELETE') { await prisma.template.delete({ where: { id: b } }).catch(() => {}); return send(res, 200, { ok: true }); }

      if (b && c === 'files') {
        if (m === 'GET') return send(res, 200, await prisma.templateFile.findMany({ where: { templateId: b }, select: { path: true, size: true, isText: true }, orderBy: { path: 'asc' } }));
        if (m === 'DELETE') { await prisma.templateFile.deleteMany({ where: { templateId: b, path: String(req.query.path || '') } }); return send(res, 200, { ok: true }); }
        if (m === 'POST') {
          const s = await getSettings();
          if (body.reset) await prisma.templateFile.deleteMany({ where: { templateId: b } });
          const removed = [], kept = [], skipped = [], ops = [];
          for (const f of Array.isArray(body.files) ? body.files : []) {
            const path = normPath(f.path);
            if (!path) { skipped.push(String(f.path)); continue; }
            const r = prepareFile(path, Buffer.from(String(f.b64 || ''), 'base64'), s.blockedTerms);
            removed.push(...r.removed); kept.push(...r.kept);
            const row = r.row;
            ops.push(prisma.templateFile.upsert({ where: { templateId_path: { templateId: b, path } }, update: row, create: { ...row, templateId: b } }));
          }
          await prisma.$transaction(ops);
          return send(res, 200, { saved: ops.length, skipped, removed, kept });
        }
      }
      // Choisit la page d'entrée et enregistre le rapport de nettoyage.
      if (b && c === 'finalize' && m === 'POST') {
        const files = await prisma.templateFile.findMany({ where: { templateId: b }, select: { path: true } });
        const entryPath = pickEntry(files.map((f) => f.path));
        const r = body.report || {};
        const report = { removed: (r.removed || []).slice(0, 200), kept: (r.kept || []).slice(0, 50), skipped: (r.skipped || []).slice(0, 50) };
        const t = await prisma.template.update({ where: { id: b }, data: { entryPath, cleanupReport: report } });
        return send(res, 200, { entryPath: t.entryPath, files: files.length, hasPage: !!entryPath });
      }
      // Re-nettoie les fichiers déjà importés avec la liste de termes actuelle.
      if (b && c === 'sanitize' && m === 'POST') {
        const s = await getSettings();
        const files = await prisma.templateFile.findMany({ where: { templateId: b, isText: true } });
        let changed = 0; const removed = [];
        for (const f of files) {
          const r = sanitizeText(f.path, f.text ?? '', s.blockedTerms);
          if (!r.changed) continue;
          changed++; removed.push(...r.removed);
          await prisma.templateFile.update({ where: { id: f.id }, data: { text: r.text, size: Buffer.byteLength(r.text) } });
        }
        return send(res, 200, { files: files.length, changed, removed: removed.slice(0, 50) });
      }
    }
    return fail(res, 404, 'Route inconnue');
  } catch (e) {
    console.error(e);
    return fail(res, 500, e.code === 'P2025' ? 'Élément introuvable' : 'Erreur serveur');
  }
}
