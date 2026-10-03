export async function api(url, opts = {}) {
  const body = opts.body;
  const r = await fetch(url, {
    credentials: 'same-origin', ...opts,
    headers: { 'X-Requested-With': 'fetch', ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
  });
  if (r.status === 204) return null;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || `Erreur ${r.status}`), { status: r.status });
  return data;
}

export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...kids.flat().filter((x) => x != null && x !== false));
  return n;
}

export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n);
export const enc = (path) => path.split('/').map(encodeURIComponent).join('/');
export const size = (b) => (b < 1024 ? `${b} o` : b < 1048576 ? `${(b / 1024).toFixed(1)} Ko` : `${(b / 1048576).toFixed(1)} Mo`);

let toastTimer;
export function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = el('div', { id: 'toast', role: 'status' }); document.body.append(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch { const a = el('textarea', { style: 'position:fixed;opacity:0' }); a.value = text; document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); }
}

const ICONS = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  down: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  arrow: '<path d="M5 12h14m0 0l-6-6m6 6l-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
};
export function icon(name) {
  const n = el('span', { class: 'ic', 'aria-hidden': 'true' });
  n.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`;
  return n;
}

// Bouton clair/sombre. Le choix est mémorisé ; sans choix on suit le système.
export function initTheme(slot) {
  const root = document.documentElement;
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const b = el('button', { class: 'icon-btn', type: 'button' });
  const paint = () => { b.replaceChildren(icon(current() === 'dark' ? 'sun' : 'moon')); b.setAttribute('aria-label', current() === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'); };
  b.addEventListener('click', () => { const n = current() === 'dark' ? 'light' : 'dark'; root.dataset.theme = n; try { localStorage.setItem('theme', n); } catch {} paint(); });
  paint(); slot.append(b);
}
