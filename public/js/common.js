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
