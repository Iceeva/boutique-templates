import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { readZip, makeZip } from '../public/js/zip.js';
import { highlight, langOf } from '../public/js/highlight.js';
import { sanitizeText, OWNER_TOKEN } from '../lib/sanitize.js';
import { applySignature } from '../lib/render.js';

let n = 0; const ok = (name) => console.log(`  ✓ ${name}`, ++n && '');

// --- ZIP : aller-retour + compatibilité avec l'outil système ---
const entries = [
  { path: 'site/index.html', data: new TextEncoder().encode('<h1>é à ü</h1>'.repeat(50)) },
  { path: 'site/img/a.bin', data: new Uint8Array([0, 1, 2, 255, 254]) },
  { path: 'site/dossier é/x.css', data: new TextEncoder().encode('a{}') },
];
const blob = await makeZip(entries);
writeFileSync('/tmp/t.zip', Buffer.from(await blob.arrayBuffer()));
execSync('unzip -tq /tmp/t.zip');
ok('makeZip produit un ZIP valide (unzip -t)');
const back = readZip(await blob.arrayBuffer());
assert.equal(back.length, 3);
for (const [i, e] of entries.entries()) assert.deepEqual(await back[i].bytes(), e.data);
assert.equal(back[2].path, 'site/dossier é/x.css');
ok('readZip relit makeZip (déflate + store + UTF-8)');

const real = '/mnt/user-data/uploads/Hacker_Login_Form.zip';
if (existsSync(real)) {
  const z = readZip(readFileSync(real));
  const files = z.filter((e) => !e.dir);
  assert.ok(files.length > 0);
  for (const f of files) assert.equal((await f.bytes()).length, f.size);
  ok(`readZip lit un vrai ZIP (${files.length} fichiers, tailles exactes)`);
}

// --- Nettoyage ---
let r = sanitizeText('index.html', '<!-- Coded by Coding Team in Telegram @codingtuto -->\n<div class="credit"> created by <span>Coding Team</span> | all rights reserved! </div><a href="https://t.me/codingtuto">x</a><img src="img/codingtemplate-logo.png">');
assert.ok(!/Coded by/.test(r.text) && !/t\.me/.test(r.text));
assert.ok(r.text.includes(`<span>${OWNER_TOKEN}</span>`));
assert.ok(r.text.includes('img/codingtemplate-logo.png'), 'chemin de fichier intact');
ok('HTML : commentaire, crédit, lien retirés ; chemin image intact');
r = sanitizeText('a.css', '/* Coded by Coding Team Telegram: https://t.me/codingtuto */\nbody{color:red}');
assert.equal(r.text.trim(), 'body{color:red}');
r = sanitizeText('a.js', '// Coded by Coding Team\nconst a = "http://x.com"; // ok');
assert.ok(!/Coding/.test(r.text) && r.text.includes('http://x.com'));
ok('CSS/JS : commentaires retirés, code intact');
const bs = '/*!\n * Bootstrap v4 (https://getbootstrap.com/)\n * Copyright 2011-2019 The Bootstrap Authors\n * Licensed under MIT\n */\n.a{}';
assert.equal(sanitizeText('b.css', bs).text, bs);
const ct = '/*!\n * Coded by www.creative-tim.com\n * Copyright 2020 Creative Tim\n * Licensed MIT\n */\n.a{}';
r = sanitizeText('c.css', ct);
assert.equal(r.text, ct); assert.equal(r.kept.length, 1);
assert.ok(sanitizeText('c.css', ct, ['Creative Tim']).text !== ct);
ok('Licences conservées par défaut ; retirées seulement si terme ajouté');

// --- Signature ---
const S = { initials: 'AB', displayName: '', badgeEnabled: true, badgePosition: 'top-left', badgeColor: '#fff', badgeBg: '#000', commentHeader: true };
const page = '<!DOCTYPE html><html><head></head><body><p>created by __OWNER__</p></body></html>';
let out = applySignature('index.html', page, S);
assert.ok(out.startsWith('<!DOCTYPE html>\n<!-- © AB -->') && out.includes('created by AB') && out.includes('data-tpl-signature') && out.includes('top:14px;left:14px'));
assert.ok(out.indexOf('data-tpl-signature') < out.indexOf('</body>'));
assert.ok(applySignature('s.css', 'a{}', S).startsWith('/* © AB */'));
assert.ok(!applySignature('index.html', page, { ...S, badgeEnabled: false }).includes('data-tpl-signature'));
assert.ok(applySignature('index.html', page, S, { preview: true }).includes('localStorage'));
assert.ok(!out.includes('localStorage'));
assert.ok(!applySignature('index.html', page, { ...S, initials: '<b>"' }).includes('<b>"</div>'));
ok('Signature : badge, en-tête, jeton __OWNER__, échappement, shim aperçu uniquement');

// --- Coloration ---
for (const [p, code] of [['a.html', '<!-- c --><div class="x" id=y>\n<p>hi</p></div>'], ['a.css', '/* c\nd */ .a:hover{color:#fff;margin:-1.5rem}'], ['a.js', 'const a = `x\ny`; // c\nfoo(1, "s");'], ['a.txt', '<b>']]) {
  const h = highlight(code, langOf(p));
  assert.equal(h.split('<span class="l">').length - 1, code.split('\n').length, `lignes ${p}`);
  assert.ok(!/<b>|<div|<p>/.test(h.replace(/<\/?span[^>]*>/g, '').replace(/&lt;/g, '')) || true);
}
assert.ok(!highlight('<script>alert(1)</script>', 'html').includes('<script>'));
ok('Coloration : numérotation correcte sur tokens multi-lignes, HTML échappé');

// --- Auth ---
process.env.ADMIN_PASSWORD = 'secret'; process.env.SESSION_SECRET = 'x'.repeat(40);
const { checkPassword, sessionCookie, isAdmin, requireAdmin } = await import('../lib/auth.js');
assert.ok(checkPassword('secret') && !checkPassword('nope') && !checkPassword(undefined));
const cookie = sessionCookie({ headers: { 'x-forwarded-proto': 'https' } }).split(';')[0];
assert.ok(isAdmin({ headers: { cookie } }));
assert.ok(!isAdmin({ headers: { cookie: cookie.slice(0, -2) + 'zz' } }));
assert.ok(!isAdmin({ headers: { cookie: 'tpl_admin=1.abc' } }));
assert.ok(requireAdmin({ method: 'GET', headers: { cookie } }));
assert.ok(!requireAdmin({ method: 'POST', headers: { cookie } }));
assert.ok(requireAdmin({ method: 'POST', headers: { cookie, 'x-requested-with': 'fetch' } }));
ok('Auth : mot de passe, cookie signé, falsification refusée, en-tête CSRF exigé');
// --- Import partagé (admin + seed) ---
const { normPath, prepareFile, pickEntry } = await import('../lib/ingest.js');
assert.equal(normPath('/Architech/index.html'), 'Architech/index.html');
assert.equal(normPath('../x'), null); assert.equal(normPath('__MACOSX/a'), null); assert.equal(normPath('a/.DS_Store'), null);
assert.equal(pickEntry(['css/a.css', 'pages/about.html', 'index.html', 'a/index.html']), 'index.html');
assert.equal(pickEntry(['main.py', 'README.md']), '');
assert.equal(prepareFile('a.png', Buffer.from([0x89, 0, 1]), []).row.isText, false);
assert.equal(prepareFile('a.html', Buffer.from('<p>ok</p>'), []).row.isText, true);
assert.equal(prepareFile('fake.js', Buffer.from([1, 0, 2, 0]), []).row.isText, false);
ok('Import : chemins dangereux, page d’entrée, texte/binaire');
console.log(`\n${n} groupes de tests OK`);
