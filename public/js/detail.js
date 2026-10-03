import { api, el, enc, fmt, size, toast, copyText, icon, initTheme } from './common.js';
import { highlight, langOf } from './highlight.js';
import { makeZip } from './zip.js';
import { card } from './cards.js';

const slug = location.pathname.split('/').filter(Boolean)[1];
const main = document.getElementById('main');
const base = (p) => `/p/${slug}/${enc(p)}`;
const ping = (event) => fetch(`/api/templates?slug=${slug}&event=${event}`, { method: 'POST', keepalive: true }).catch(() => {});
const IMG = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i;
const SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals';

let t, current, tab, hasPreview, tools;
const cache = new Map();
initTheme(document.getElementById('themeSlot'));

async function text(path) {
  if (!cache.has(path)) cache.set(path, await (await fetch(`${base(path)}?raw=1`)).text());
  return cache.get(path);
}

async function download(btn) {
  const label = btn.cloneNode(true).childNodes; btn.disabled = true;
  try {
    const out = []; let done = 0, i = 0;
    const worker = async () => {
      while (i < t.files.length) {
        const f = t.files[i++];
        const r = await fetch(`${base(f.path)}?raw=1`);
        out.push({ path: `${slug}/${f.path}`, data: new Uint8Array(await r.arrayBuffer()) });
        btn.textContent = `Préparation ${++done}/${t.files.length}`;
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    out.sort((a, b) => a.path.localeCompare(b.path));
    const url = URL.createObjectURL(await makeZip(out));
    el('a', { href: url, download: `${slug}.zip` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    ping('download'); toast('ZIP téléchargé ✓');
  } catch { toast('Échec du téléchargement, réessaie'); }
  btn.replaceChildren(...label); btn.disabled = false;
}

async function copyAll() {
  const files = t.files.filter((f) => f.isText && f.size <= 150000 && !/\.min\.|\.map$/.test(f.path));
  files.sort((a) => (a.path === t.entryPath ? -1 : 0));
  const parts = await Promise.all(files.map(async (f) => `/* ===== ${f.path} ===== */\n${await text(f.path)}`));
  await copyText(parts.join('\n\n'));
  ping('copy');
  const skipped = t.files.length - files.length;
  toast(`${files.length} fichiers copiés${skipped ? ` · ${skipped} ignorés (trop gros ou binaires)` : ''}`);
}

function preview() {
  const frame = el('iframe', { src: base(t.entryPath), title: `Aperçu de ${t.title}`, sandbox: SANDBOX });
  const dev = (label, w) => el('button', { type: 'button', 'aria-pressed': String(w === '100%'), text: label, onclick: (e) => {
    frame.style.width = w; frame.classList.toggle('narrow', w !== '100%');
    e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
  } });
  tools.append(el('div', { class: 'seg', role: 'group', 'aria-label': 'Taille d’écran' }, dev('Ordinateur', '100%'), dev('Tablette', '820px'), dev('Mobile', '390px')));
  return el('div', { class: 'win' },
    el('div', { class: 'win-bar' }, el('div', { class: 'dots' }, el('i'), el('i'), el('i')),
      el('div', { class: 'url', text: `${location.host}${base(t.entryPath)}` }),
      el('a', { href: base(t.entryPath), target: '_blank', rel: 'noopener' }, 'Ouvrir ', icon('arrow'))),
    el('div', { class: 'win-body' }, frame));
}

function codeView() {
  const tree = el('div', { class: 'tree', role: 'listbox', 'aria-label': 'Fichiers' });
  const pre = el('pre', { class: 'src', tabindex: '0' });
  const name = el('span'), copy = el('button', { class: 'btn', type: 'button', text: 'Copier le fichier' });
  const seen = new Set();
  for (const f of t.files) {
    const parts = f.path.split('/');
    parts.slice(0, -1).forEach((_, i) => { const d = parts.slice(0, i + 1).join('/'); if (!seen.has(d)) { seen.add(d); tree.append(el('div', { class: 'dir', style: `--d:${i}`, text: parts[i] + '/' })); } });
    tree.append(el('button', { type: 'button', style: `--d:${parts.length - 1}`, title: f.path, 'data-path': f.path, text: parts.at(-1), onclick: () => open(f) }));
  }
  async function open(f) {
    current = f;
    tree.querySelectorAll('button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.path === f.path));
    copy.hidden = !f.isText;
    if (f.isText) {
      name.textContent = `${f.path} · ${size(f.size)}`;
      pre.replaceChildren(); pre.textContent = 'Chargement…';
      const code = await text(f.path);
      if (current !== f) return;
      pre.innerHTML = highlight(code, langOf(f.path));
      name.textContent = `${f.path} · ${code.split('\n').length} lignes · ${size(f.size)}`;
    } else {
      name.textContent = `${f.path} · ${size(f.size)}`;
      pre.replaceChildren(el('div', { class: 'note' }, IMG.test(f.path) ? el('img', { src: `${base(f.path)}?raw=1`, alt: f.path }) : 'Fichier binaire : il est inclus dans le ZIP.'));
    }
  }
  copy.onclick = async () => { await copyText(await text(current.path)); ping('copy'); copy.textContent = 'Copié ✓'; setTimeout(() => (copy.textContent = 'Copier le fichier'), 1600); };
  const first = t.files.find((f) => f.path === t.entryPath) || t.files.find((f) => /^readme(\.md)?$/i.test(f.path)) || t.files.find((f) => f.isText && !f.path.startsWith('.') && f.size > 0) || t.files[0];
  if (first) queueMicrotask(() => open(first)); else pre.textContent = 'Ce template ne contient aucun fichier.';
  return el('div', { class: 'code' }, tree, el('div', { class: 'viewer' }, el('div', { class: 'vbar' }, name, copy), pre));
}

function show() {
  tools?.replaceChildren();
  document.getElementById('panel').replaceChildren(tab === 'preview' ? preview() : codeView());
  main.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
}

async function related() {
  if (!t.category) return;
  const r = await api(`/api/templates?category=${t.category.slug}&sort=popular`).catch(() => null);
  const items = (r?.items || []).filter((x) => x.slug !== slug).slice(0, 3);
  if (!items.length) return;
  document.getElementById('related').replaceChildren(
    el('h2', { text: `Dans la même catégorie : ${t.category.name}` }),
    el('div', { class: 'grid' }, items.map((x, i) => card(x, i))));
}

async function init() {
  try { t = await api(`/api/templates?slug=${encodeURIComponent(slug)}`); }
  catch { main.replaceChildren(el('p', { class: 'empty', text: 'Ce template n’existe pas ou n’est plus disponible.' })); return; }
  document.title = `${t.title} — template`;
  hasPreview = !!t.entryPath && t.files.some((f) => f.path === t.entryPath);
  tab = hasPreview ? 'preview' : 'code';
  const total = t.files.reduce((n, f) => n + f.size, 0);
  const dl = el('button', { class: 'btn primary', type: 'button', onclick: (e) => download(e.currentTarget) }, icon('down'), ` Télécharger le ZIP · ${size(total)}`);
  const tabBtn = (id, label) => el('button', { type: 'button', role: 'tab', 'data-tab': id, text: label, onclick: () => { tab = id; show(); } });

  tools = el('div', { class: 'tools' });
  main.replaceChildren(...[
    el('nav', { class: 'crumbs', 'aria-label': 'Fil d’Ariane' }, el('a', { href: '/', text: 'Tous les templates' }),
      t.category && ['/', el('a', { href: `/?category=${t.category.slug}`, text: t.category.name })]),
    el('div', { class: 'head' },
      el('div', {}, el('h1', { text: t.title }), t.description && el('p', { text: t.description }),
        el('div', { class: 'tags' }, t.category && el('span', { class: 'cat', text: t.category.name }), t.tags.map((x) => el('span', { text: x }))),
        el('div', { class: 'facts' }, el('span', {}, icon('eye'), ` ${fmt(t.views)} vues`), el('span', {}, icon('down'), ` ${fmt(t.downloads)} ZIP`), el('span', { text: `${fmt(t.files.length)} fichiers` }))),
      el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: 'Copier tout le code', onclick: copyAll }), dl)),
    !hasPreview && el('p', { class: 'notice', text: 'Ce template n’a pas d’aperçu : c’est une application qui demande un serveur (Python, PHP…). Le code et le ZIP sont complets.' }),
    hasPreview && el('div', { class: 'toolbar' }, el('div', { class: 'seg tabs', role: 'tablist' }, tabBtn('preview', 'Aperçu'), tabBtn('code', 'Code')), tools),
    el('div', { id: 'panel' }),
    el('section', { class: 'related', id: 'related' }),
  ].filter(Boolean));
  document.getElementById('foot').textContent = document.title;
  show(); ping('view'); related();
}
init();
