// Vérifie le seed SANS base de données : fichiers, tailles, nettoyage, liens cassés, mentions restantes.
import { templates } from '../seed/manifest.js';
import { loadTemplate, brokenRefs, residual } from '../seed/load.js';

let total = 0, files = 0, problems = 0;
for (const def of templates) {
  const t = await loadTemplate(def);
  const label = def.slug.padEnd(30);
  if (t.missing || t.encrypted) { console.log(`${label} ⚠ ${t.encrypted || def.encrypted ? 'archive chiffrée (mot de passe requis) — en attente' : 'archive absente'}`); continue; }
  const size = t.rows.reduce((n, r) => n + r.size, 0); total += size; files += t.rows.length;
  const broken = t.entry ? brokenRefs(t.rows) : [], left = residual(t.rows);
  console.log(`${label} ${String(t.rows.length).padStart(4)} fichiers ${(size / 1048576).toFixed(1).padStart(5)} Mo | aperçu: ${(t.entry || '—').slice(0, 28).padEnd(28)} | retiré: ${String(t.removed.length).padStart(2)} licences: ${t.kept.length} | liens cassés: ${broken.length}${t.skipped.length ? ` | ignorés: ${t.skipped.length}` : ''}${t.entryMissing ? ' | ⚠ PAGE D’APERÇU INTROUVABLE' : ''}`);
  if (t.entryMissing) problems++;
  if (process.argv.includes('-v')) { broken.slice(0, 6).forEach((b) => console.log('      cassé :', b)); left.slice(0, 4).forEach((b) => console.log('      reste :', b)); }
}
console.log(`\nTotal : ${files} fichiers, ${(total / 1048576).toFixed(1)} Mo${problems ? ` — ${problems} problème(s)` : ''}`);
process.exit(problems ? 1 : 0);
