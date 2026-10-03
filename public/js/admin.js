import { api, el, fmt, toast, initTheme } from './common.js';
import { readZip } from './zip.js';

const $ = (id) => document.getElementById(id);
const MAX_FILE = 2.5 * 1024 * 1024;   // limite Vercel : 4,5 Mo par requête (base64 +33 %)
const MAX_BATCH = 3_000_000;
const JUNK = /(^|\/)(__MACOSX|node_modules|\.git|\.idea|\.vscode)(\/|$)|(^|\/)(\.DS_Store|Thumbs\.db)$/;
let templates = [], categories = [], editing = null, mode = 'zip';

// ---------- session ----------
async function boot() {
  if (!$('themeSlot').children.length) initTheme($('themeSlot'));
  const me = await api('/api/admin/me').catch(() => ({}));
  $('login').hidden = !!me.authenticated; $('app').hidden = !me.authenticated;
  if (me.authenticated) { await Promise.all([loadCats(), loadList(), loadSettings()]); go('list'); }
}
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('loginErr').textContent = '';
  try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('pw').value }) }); $('pw').value = ''; boot(); }
  catch (err) { $('loginErr').textContent = err.message; }
});
$('logout').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); location.reload(); });

function go(s) {
  for (const n of ['list', 'edit', 'sig', 'cats']) $(`s-${n}`).hidden = n !== s;
  $('kpis').hidden = s !== 'list';
  $('nav').querySelectorAll('button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.s === s));
  if (s === 'edit' && !editing) resetForm();
}
$('nav').addEventListener('click', (e) => { if (e.target.dataset.s) go(e.target.dataset.s); });

// ---------- catégories ----------
async function loadCats() {
  categories = await api('/api/admin/categories');
  $('category').replaceChildren(el('option', { value: '', text: 'Sans catégorie' }), ...categories.map((c) => el('option', { value: c.id, text: c.name })));
  $('catList').replaceChildren(...categories.map((c) => el('span', { class: 'chip' }, c.name,
    el('button', { type: 'button', 'aria-label': `Supprimer ${c.name}`, text: '×', onclick: async () => { await api(`/api/admin/categories/${c.id}`, { method: 'DELETE' }); loadCats(); } }))));
}
$('catForm').addEventListener('submit', async (e) => {
  e.preventDefault(); if (!$('catName').value.trim()) return;
  await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: $('catName').value }) });
  $('catName').value = ''; loadCats();
});

// ---------- liste ----------
async function loadList() {
  templates = await api('/api/admin/templates');
  const sum = (k) => templates.reduce((n, t) => n + t[k], 0);
  $('kpis').replaceChildren(...[['Templates', templates.length], ['Vues', sum('views')], ['Codes copiés', sum('copies')], ['ZIP téléchargés', sum('downloads')]]
    .map(([l, v]) => el('div', { class: 'kpi' }, el('b', { text: fmt(v) }), el('span', { text: l }))));
  $('listSub').textContent = templates.length ? `${templates.length} template${templates.length > 1 ? 's' : ''}` : 'Aucun template pour le moment. Ajoute le premier.';
  $('rows').replaceChildren(...templates.map((t) => {
    const r = t.cleanupReport;
    return el('tr', {},
      el('td', {}, el('b', { text: t.title }), r && (r.removed?.length || r.kept?.length || r.skipped?.length) && el('ul', { class: 'report' },
        r.removed.length > 0 && el('li', { text: `${r.removed.length} mention(s) retirée(s)` }),
        r.kept.length > 0 && el('li', { text: `${r.kept.length} licence(s) conservée(s)` }),
        r.skipped.length > 0 && el('li', { text: `${r.skipped.length} fichier(s) ignoré(s) (trop gros)`, title: r.skipped.join('\n') }))),
      el('td', { text: t._count.files }), el('td', { text: fmt(t.views) }), el('td', { text: fmt(t.copies) }), el('td', { text: fmt(t.downloads) }),
      el('td', {}, el('span', { class: `pill${t.published ? ' on' : ''}`, text: t.published ? 'Visible' : 'Masqué' })),
      el('td', {}, el('div', { class: 'acts' },
        el('a', { class: 'btn', href: `/t/${t.slug}`, target: '_blank', text: 'Voir' }),
        el('button', { class: 'btn', text: 'Modifier', onclick: () => edit(t) }),
        el('button', { class: 'btn', text: t.published ? 'Masquer' : 'Publier', onclick: async () => { await api(`/api/admin/templates/${t.id}`, { method: 'PATCH', body: JSON.stringify({ published: !t.published }) }); loadList(); } }),
        el('button', { class: 'btn danger', text: 'Supprimer', onclick: async () => { if (confirm(`Supprimer « ${t.title} » et tous ses fichiers ?`)) { await api(`/api/admin/templates/${t.id}`, { method: 'DELETE' }); loadList(); } } }))));
  }));
}

// ---------- formulaire ----------
function setMode(m) {
  mode = m;
  $('srcPick').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
  $('m-manual').hidden = m !== 'manual'; $('m-file').hidden = m === 'manual';
  $('picked').textContent = ''; $('dropHint').textContent = HINT[m] || ''; ['zip', 'folder', 'files'].forEach((k) => ($(`in-${k}`).value = ''));
}
$('srcPick').addEventListener('click', (e) => e.target.dataset.m && setMode(e.target.dataset.m));
const HINT = { zip: 'Dépose une archive ZIP ici', folder: 'Clique pour choisir un dossier', files: 'Dépose des fichiers ici' };
function picked(k, files) {
  const f = [...files]; $('picked').textContent = f.length === 1 ? f[0].name : f.length ? `${f.length} fichiers sélectionnés` : '';
  if (!$('title').value && k === 'zip' && f[0]) $('title').value = f[0].name.replace(/\.zip$/i, '').replace(/[_-]+/g, ' ');
}
for (const k of ['zip', 'folder', 'files']) $(`in-${k}`).addEventListener('change', (e) => picked(k, e.target.files));
const drop = $('drop');
drop.addEventListener('click', () => $(`in-${mode}`).click());
drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(`in-${mode}`).click(); } });
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = e.dataTransfer.files; if (!files.length) return;
  const k = files.length === 1 && /\.zip$/i.test(files[0].name) ? 'zip' : 'files';
  setMode(k); $(`in-${k}`).files = files; picked(k, files);
});

function resetForm() {
  editing = null; $('form').reset(); setMode('zip'); $('log').replaceChildren();
  $('formTitle').textContent = 'Ajouter un template'; $('save').textContent = 'Enregistrer et publier'; $('cancel').hidden = true;
  $('formSub').textContent = 'Tes initiales sont appliquées automatiquement, et les mentions d’auteur d’origine sont retirées à l’import.';
}
function edit(t) {
  editing = t; go('edit'); setMode('zip'); $('log').replaceChildren();
  $('title').value = t.title; $('desc').value = t.description; $('tags').value = t.tags.join(', ');
  $('category').value = t.categoryId ?? ''; $('published').checked = t.published;
  $('formTitle').textContent = `Modifier « ${t.title} »`; $('cancel').hidden = false;
  $('save').textContent = 'Enregistrer les modifications';
  $('formSub').textContent = 'Laisse la source vide pour ne changer que les informations. Si tu en choisis une, elle remplace tous les fichiers.';
}
$('cancel').addEventListener('click', () => { resetForm(); go('list'); });

const log = (msg, bad) => { const li = el('li', { class: bad ? 'bad' : '', text: msg }); $('log').append(li); li.scrollIntoView({ block: 'nearest' }); return li; };
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

async function gather() {
  let list = [];
  if (mode === 'zip') {
    const f = $('in-zip').files[0]; if (!f) return null;
    list = readZip(await f.arrayBuffer()).filter((e) => !e.dir).map((e) => ({ path: e.path, size: e.size, bytes: () => e.bytes() }));
  } else if (mode === 'manual') {
    const enc = new TextEncoder(); let html = $('c-html').value, css = $('c-css').value, js = $('c-js').value;
    if (!html.trim() && !css.trim() && !js.trim()) return null;
    if (css.trim() && !/style\.css/.test(html)) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, '<link rel="stylesheet" href="style.css">\n</head>') : `<link rel="stylesheet" href="style.css">\n${html}`;
    if (js.trim() && !/script\.js/.test(html)) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, '<script src="script.js"></script>\n</body>') : `${html}\n<script src="script.js"></script>`;
    if (!/<html|<!doctype/i.test(html)) html = `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${$('title').value}</title>${css.trim() ? '\n<link rel="stylesheet" href="style.css">' : ''}\n</head>\n<body>\n${html}${js.trim() ? '\n<script src="script.js"></script>' : ''}\n</body>\n</html>\n`;
    for (const [p, c] of [['index.html', html], ['style.css', css], ['script.js', js]]) if (c.trim()) { const u = enc.encode(c); list.push({ path: p, size: u.length, bytes: async () => u }); }
  } else {
    list = [...$(`in-${mode}`).files].map((f) => ({ path: f.webkitRelativePath || f.name, size: f.size, bytes: async () => new Uint8Array(await f.arrayBuffer()) }));
    if (!list.length) return null;
  }
  list = list.map((f) => ({ ...f, path: f.path.replace(/\\/g, '/').replace(/^\.?\/+/, '') })).filter((f) => !JUNK.test(f.path));
  const roots = new Set(list.map((f) => f.path.split('/')[0]));
  if (roots.size === 1 && list.every((f) => f.path.includes('/'))) list = list.map((f) => ({ ...f, path: f.path.split('/').slice(1).join('/') }));
  return list;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault(); $('log').replaceChildren(); $('save').disabled = true;
  try {
    const meta = { title: $('title').value, description: $('desc').value, tags: $('tags').value, categoryId: $('category').value || null, published: $('published').checked };
    const files = await gather();
    if (!editing && !files) throw new Error('Choisis une source : archive, dossier, fichiers ou code.');
    const t = editing
      ? await api(`/api/admin/templates/${editing.id}`, { method: 'PATCH', body: JSON.stringify(meta) })
      : await api('/api/admin/templates', { method: 'POST', body: JSON.stringify(meta) });
    log(editing ? 'Informations enregistrées.' : 'Template créé.');
    if (files) {
      const report = { removed: [], kept: [], skipped: [] };
      const ok = files.filter((f) => { if (f.size > MAX_FILE) { report.skipped.push(`${f.path} (${(f.size / 1048576).toFixed(1)} Mo)`); return false; } return true; });
      if (!ok.length) throw new Error('Aucun fichier importable (vide ou trop gros).');
      let batch = [], bytes = 0, first = !!editing, done = 0;
      const flush = async () => {
        if (!batch.length) return;
        const r = await api(`/api/admin/templates/${t.id}/files`, { method: 'POST', body: JSON.stringify({ files: batch, reset: first }) });
        first = false; report.removed.push(...r.removed); report.kept.push(...r.kept); report.skipped.push(...r.skipped);
        batch = []; bytes = 0;
      };
      const line = log(`Envoi 0/${ok.length} fichiers…`);
      for (const f of ok) {
        const data = b64(await f.bytes());
        if (bytes + data.length > MAX_BATCH) await flush();
        batch.push({ path: f.path, b64: data }); bytes += data.length; line.textContent = `Envoi ${++done}/${ok.length} fichiers…`;
      }
      await flush();
      const fin = await api(`/api/admin/templates/${t.id}/finalize`, { method: 'POST', body: JSON.stringify({ report }) });
      line.textContent = `${fin.files} fichiers importés · page d’aperçu : ${fin.entryPath}`;
      if (!fin.hasPage) log('Aucune page HTML trouvée : ce template sera en « code seul », sans aperçu.');
      if (report.removed.length) log(`${report.removed.length} mention(s) d’auteur retirée(s) ou remplacée(s).`);
      if (report.kept.length) log(`${report.kept.length} licence(s) open source conservée(s) (obligatoires).`);
      report.skipped.forEach((s) => log(`Ignoré (trop gros pour Vercel) : ${s}`, true));
    }
    log('Terminé ✓'); toast('Template enregistré');
    await loadList();
    if (!editing) { const lines = [...$('log').children]; resetForm(); $('log').append(...lines); }
  } catch (err) { log(err.message, true); }
  $('save').disabled = false;
});

// ---------- signature ----------
const sigFields = ['siteName', 'initials', 'displayName', 'badgePosition', 'badgeColor', 'badgeBg'];
function demo() { const d = $('demo'); d.textContent = $('initials').value || '··'; d.style.background = $('badgeBg').value; d.style.color = $('badgeColor').value; }
async function loadSettings() {
  const s = await api('/api/admin/settings');
  sigFields.forEach((k) => ($(k).value = s[k])); $('badgeEnabled').checked = s.badgeEnabled; $('commentHeader').checked = s.commentHeader;
  $('terms').value = s.blockedTerms.join('\n'); demo();
}
['initials', 'badgeColor', 'badgeBg'].forEach((k) => $(k).addEventListener('input', demo));
async function saveSettings() {
  const body = Object.fromEntries(sigFields.map((k) => [k, $(k).value]));
  Object.assign(body, { badgeEnabled: $('badgeEnabled').checked, commentHeader: $('commentHeader').checked, blockedTerms: $('terms').value.split('\n') });
  await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
  await loadSettings();
}
$('sigForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try { await saveSettings(); toast('Signature enregistrée sur tous les templates'); }
  catch (err) { toast(err.message); }
});
$('resan').addEventListener('click', async (e) => {
  e.target.disabled = true; $('sigLog').replaceChildren();
  const add = (m) => $('sigLog').append(el('li', { text: m }));
  try {
    await saveSettings();
    let total = 0;
    for (const t of templates) { const r = await api(`/api/admin/templates/${t.id}/sanitize`, { method: 'POST' }); total += r.changed; add(`${t.title} : ${r.changed} fichier(s) modifié(s) sur ${r.files}`); }
    add(`Terminé — ${total} fichier(s) nettoyé(s).`);
  } catch (err) { add(`Erreur : ${err.message}`); }
  e.target.disabled = false;
});

boot();
