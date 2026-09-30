import { api, el, enc, fmt, size, toast, copyText } from './common.js';
import { highlight, langOf } from './highlight.js';
import { makeZip } from './zip.js';

const slug = location.pathname.split('/').filter(Boolean)[1];
const main = document.getElementById('main');
const base = (p) => `/p/${slug}/${enc(p)}`;
const ping = (event) => fetch(`/api/templates?slug=${slug}&event=${event}`, { method: 'POST', keepalive: true }).catch(() => {});
const IMG = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i;

let t, current, tab = 'preview';
const cache = new Map();

async function text(path) {
  if (!cache.has(path)) cache.set(path, await (await fetch(`${base(path)}?raw=1`)).text());
  return cache.get(path);
}

async function download(btn) {
  const label = btn.textContent; btn.disabled = true;
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
    ping('download'); toast('ZIP téléchargé');
  } catch { toast('Échec du téléchargement, réessaie'); }
  btn.textContent = label; btn.disabled = false;
}

async function copyAll() {
  const files = t.files.filter((f) => f.isText && f.size <= 150000 && !/\.min\.|\.map$/.test(f.path));
  files.sort((a) => (a.path === t.entryPath ? -1 : 0));
  const parts = await Promise.all(files.map(async (f) => `/* ===== ${f.path} ===== */\n${await text(f.path)}`));
  await copyText(parts.join('\n\n'));
  ping('copy');
  const skipped = t.files.length - files.length;
  toast(`${files.length} fichiers copiés${skipped ? ` (${skipped} ignorés : trop gros ou binaires)` : ''}`);
}

function preview() {
  const frame = el('iframe', { src: base(t.entryPath), title: `Aperçu de ${t.title}`, sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals' });
  const dev = (label, w) => el('button', { class: 'btn', type: 'button', 'aria-pressed': String(w === '100%'), onclick: (e) => {
    frame.style.width = w; e.currentTarget.parentNode.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
  } }, label);
  return el('div', {},
    el('div', { class: 'devices' }, dev('Ordinateur', '100%'), dev('Tablette', '820px'), dev('Mobile', '390px'),
      el('a', { class: 'btn', href: base(t.entryPath), target: '_blank', rel: 'noopener', text: 'Ouvrir dans un onglet' })),
    el('div', { class: 'stage' }, frame));
}

function codeView() {
  const tree = el('div', { class: 'tree', role: 'listbox', 'aria-label': 'Fichiers' });
  const pre = el('pre', { class: 'src', tabindex: '0' });
  const name = el('span'), copy = el('button', { class: 'btn', type: 'button', text: 'Copier le fichier' });
  let seen = new Set();
  for (const f of t.files) {
    const parts = f.path.split('/');
    parts.slice(0, -1).forEach((_, i) => { const d = parts.slice(0, i + 1).join('/'); if (!seen.has(d)) { seen.add(d); tree.append(el('div', { class: 'dir', style: `--d:${i}`, text: parts[i] + '/' })); } });
    tree.append(el('button', { type: 'button', style: `--d:${parts.length - 1}`, title: f.path, 'data-path': f.path, text: parts.at(-1), onclick: () => open(f) }));
  }
  async function open(f) {
    current = f;
    tree.querySelectorAll('button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.path === f.path));
    name.textContent = `${f.path} · ${size(f.size)}`;
    copy.hidden = !f.isText;
    if (f.isText) {
      pre.replaceChildren(); pre.textContent = 'Chargement…';
      const code = await text(f.path);
      if (current === f) pre.innerHTML = highlight(code, langOf(f.path));
    } else pre.replaceChildren(el('div', { class: 'note' }, IMG.test(f.path) ? el('img', { src: `${base(f.path)}?raw=1`, alt: f.path }) : 'Fichier binaire : il est inclus dans le ZIP.'));
  }
  copy.onclick = async () => { await copyText(await text(current.path)); ping('copy'); copy.textContent = 'Copié ✓'; setTimeout(() => (copy.textContent = 'Copier le fichier'), 1600); };
  const first = t.files.find((f) => f.path === t.entryPath) || t.files[0];
  if (first) queueMicrotask(() => open(first)); else pre.textContent = 'Ce template ne contient aucun fichier.';
  return el('div', { class: 'code' }, tree, el('div', { class: 'viewer' }, el('div', { class: 'vbar' }, name, copy), pre));
}

function show() {
  const panel = main.querySelector('#panel');
  panel.replaceChildren(tab === 'preview' ? preview() : codeView());
  main.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
}

async function init() {
  try { t = await api(`/api/templates?slug=${encodeURIComponent(slug)}`); }
  catch { main.replaceChildren(el('p', { class: 'empty', text: 'Ce template n’existe pas ou n’est plus disponible.' })); return; }
  document.title = t.title;
  const dl = el('button', { class: 'btn primary', type: 'button', text: 'Télécharger le ZIP', onclick: (e) => download(e.currentTarget) });
  const tabBtn = (id, label) => el('button', { type: 'button', role: 'tab', 'data-tab': id, text: label, onclick: () => { tab = id; show(); } });
  main.replaceChildren(
    el('div', { class: 'head' },
      el('div', {}, el('h1', { text: t.title }), t.description && el('p', { text: t.description }),
        el('div', { class: 'tags' }, t.category && el('span', { text: t.category.name }), t.tags.map((x) => el('span', { text: x })))),
      el('div', { class: 'actions' }, el('button', { class: 'btn', type: 'button', text: 'Copier tout le code', onclick: copyAll }), dl)),
    el('div', { class: 'tabs', role: 'tablist' }, tabBtn('preview', 'Aperçu'), tabBtn('code', `Code · ${fmt(t.files.length)} fichiers`)),
    el('div', { id: 'panel' }));
  show(); ping('view');
}
init();
