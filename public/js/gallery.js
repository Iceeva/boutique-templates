import { api, el, enc, debounce, fmt } from './common.js';

const params = new URLSearchParams(location.search);
const state = { q: params.get('q') || '', category: params.get('category') || '', sort: params.get('sort') || 'recent', page: 1 };
const $ = (id) => document.getElementById(id);
const grid = $('grid');
let token = 0;

// L'aperçu est le vrai site, réduit : il n'est chargé que lorsque la carte approche de l'écran.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); }
}, { rootMargin: '300px' });
const ro = new ResizeObserver((entries) => entries.forEach((e) => e.target.style.setProperty('--s', e.contentRect.width / 1280)));

function mount(box) {
  box.append(el('iframe', {
    src: `/p/${box.dataset.slug}/${enc(box.dataset.entry)}`, sandbox: 'allow-scripts', tabindex: '-1',
    'aria-hidden': 'true', title: '', loading: 'lazy',
  }));
}

function card(t) {
  const box = el('div', { class: 'thumb' });
  box.dataset.slug = t.slug; box.dataset.entry = t.entryPath;
  io.observe(box); ro.observe(box);
  return el('a', { class: 'card', href: `/t/${t.slug}` },
    box,
    el('div', { class: 'meta' }, el('b', { text: t.title }), el('span', { text: `${fmt(t.views)} vues · ${fmt(t.downloads)} ZIP` })),
    t.category && el('div', { class: 'cat', text: t.category.name }));
}

async function load(append = false) {
  const my = ++token;
  const qs = new URLSearchParams({ q: state.q, category: state.category, sort: state.sort, page: state.page });
  const shown = new URLSearchParams();
  if (state.q) shown.set('q', state.q);
  if (state.category) shown.set('category', state.category);
  if (state.sort !== 'recent') shown.set('sort', state.sort);
  history.replaceState(null, '', shown.size ? `?${shown}` : location.pathname);
  const data = await api(`/api/templates?${qs}`);
  if (my !== token) return;
  if (!append) grid.replaceChildren();
  data.items.forEach((t) => grid.append(card(t)));
  $('empty').hidden = grid.children.length > 0;
  $('more').hidden = state.page >= data.pages;
}

function chips(categories) {
  const box = $('chips');
  const make = (slug, label, count) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(state.category === slug),
    onclick: (e) => { state.category = slug; state.page = 1; [...box.children].forEach((c) => c.setAttribute('aria-pressed', String(c === e.currentTarget))); load(); },
  }, label, count != null && el('small', { text: count }));
  box.replaceChildren(make('', 'Tout'), ...categories.filter((c) => c.count > 0).map((c) => make(c.slug, c.name, c.count)));
}

$('q').value = state.q; $('sort').value = state.sort;
$('q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
$('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; load(); });
$('more').addEventListener('click', () => { state.page++; load(true); });

api('/api/templates?meta=1').then((m) => {
  $('brand').textContent = m.siteName; document.title = `${m.siteName} — templates web à copier ou télécharger`;
  chips(m.categories);
}).catch(() => {});
load().catch(() => { $('empty').hidden = false; $('empty').textContent = 'Impossible de charger les templates pour le moment.'; });
