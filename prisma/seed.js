// Remplit la base : catégories, réglages, puis tous les templates de seed/templates/.
//   npm run db:seed            -> ajoute ce qui manque (ne touche pas aux templates déjà présents)
//   npm run db:seed -- --force -> réimporte aussi les templates existants (remplace leurs fichiers)
import { PrismaClient } from '@prisma/client';
import { categories, templates } from '../seed/manifest.js';
import { loadTemplate } from '../seed/load.js';

const prisma = new PrismaClient();
const force = process.argv.includes('--force') || process.env.SEED_FORCE === '1';

for (const [i, [slug, name]] of categories.entries()) {
  await prisma.category.upsert({ where: { slug }, update: { name, position: i }, create: { slug, name, position: i } });
}
const settings = await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

let added = 0, skipped = 0;
for (const def of templates) {
  const existing = await prisma.template.findUnique({ where: { slug: def.slug }, select: { id: true } });
  if (existing && !force) { console.log(`= ${def.slug} (déjà présent)`); continue; }

  const t = await loadTemplate(def, settings.blockedTerms);
  if (t.missing || t.encrypted) { console.log(`⚠ ${def.slug} : ${t.encrypted ? 'archive chiffrée' : 'archive absente'} — ignoré`); skipped++; continue; }

  const category = await prisma.category.findUnique({ where: { slug: def.category }, select: { id: true } });
  const data = {
    title: def.title, description: def.description, tags: def.tags, categoryId: category?.id ?? null,
    entryPath: t.entry, published: true,
    cleanupReport: { removed: t.removed.slice(0, 200), kept: t.kept.slice(0, 50), skipped: t.skipped },
  };
  const tpl = existing
    ? await prisma.template.update({ where: { id: existing.id }, data })
    : await prisma.template.create({ data: { slug: def.slug, ...data } });
  if (existing) await prisma.templateFile.deleteMany({ where: { templateId: tpl.id } });

  // Insertion par lots (limite le poids de chaque requête).
  let batch = [], bytes = 0;
  const flush = async () => { if (batch.length) await prisma.templateFile.createMany({ data: batch }); batch = []; bytes = 0; };
  for (const row of t.rows) {
    if (batch.length >= 100 || bytes + row.size > 8_000_000) await flush();
    batch.push({ ...row, templateId: tpl.id }); bytes += row.size;
  }
  await flush();
  console.log(`✓ ${def.slug} — ${t.rows.length} fichiers, ${t.removed.length} mention(s) retirée(s)${t.skipped.length ? `, ${t.skipped.length} ignoré(s)` : ''}`);
  added++;
}
console.log(`\nSeed terminé : ${added} template(s) importé(s)${skipped ? `, ${skipped} en attente (archive chiffrée ou absente)` : ''}.`);
await prisma.$disconnect();
