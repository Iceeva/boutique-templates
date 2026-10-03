import { api, el, debounce, fmt, icon, initTheme } from './common.js';
import { card, thumb, skeleton } from './cards.js';

const params = new URLSearchParams(location.search);
const state = { q: params.get('q') || '', category: params.get('category') || '', sort: params.get('sort') || 'recent', page: 1 };
const $ = (id) => document.getElementById(id);
const grid = $('grid');
let token = 0, stackDone = false;

initTheme($('themeSlot'));
$('searchIc').replaceWith(icon('search'));

function heroStack(items) {
  const picks = items.filter((t) => t.entryPath).slice(0, 3);
  if (stackDone || picks.length < 3) return;
  stackDone = true;
  $('stack').replaceChildren(...picks.map((t) => el('a', { class: 'stk', href: `/t/${t.slug}`, tabindex: '-1' }, thumb(t, { overlay: false }))));
}

async function load(append = false) {
  const my = ++token;
  if (!append) grid.replaceChildren(...Array.from({ length: 6 }, skeleton));
  const qs = new URLSearchParams({ q: state.q, category: state.category, sort: state.sort, page: state.page });
  const shown = new URLSearchParams();
  if (state.q) shown.set('q', state.q);
  if (state.category) shown.set('category', state.category);
  if (state.sort !== 'recent') shown.set('sort', state.sort);
  history.replaceState(null, '', shown.size ? `?${shown}` : location.pathname);
  const data = await api(`/api/templates?${qs}`);
  if (my !== token) return;
  if (!append) grid.replaceChildren();
  data.items.forEach((t, i) => grid.append(card(t, i)));
  $('empty').hidden = grid.children.length > 0;
  $('more').hidden = state.page >= data.pages;
  if (!state.q && !state.category && state.page === 1) heroStack(data.items);
  return data;
}

function chips(categories) {
  const box = $('chips');
  const make = (slug, label, count) => el('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(state.category === slug),
    onclick: (e) => { state.category = slug; state.page = 1; [...box.children].forEach((c) => c.setAttribute('aria-pressed', String(c === e.currentTarget))); load(); },
  }, label, count != null && el('small', { text: count }));
  const total = categories.reduce((n, c) => n + c.count, 0);
  box.replaceChildren(make('', 'Tout', total), ...categories.filter((c) => c.count > 0).map((c) => make(c.slug, c.name, c.count)));
}

$('q').value = state.q; $('sort').value = state.sort;
$('q').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
$('sort').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; load(); });
$('more').addEventListener('click', () => { state.page++; load(true); });
addEventListener('keydown', (e) => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); $('q').focus(); }
});

api('/api/templates?meta=1').then((m) => {
  $('brand').textContent = m.siteName; document.title = `${m.siteName} — templates web à copier ou télécharger`;
  const shown = m.categories.filter((c) => c.count > 0), total = shown.reduce((n, c) => n + c.count, 0);
  $('stats').replaceChildren(el('span', {}, el('b', { text: fmt(total) }), ' templates'), el('span', {}, el('b', { text: shown.length }), ' catégories'), el('span', {}, el('b', { text: '0' }), ' compte requis'));
  $('foot').textContent = `${m.initials ? `© ${m.initials} · ` : ''}${m.siteName} — templates à copier ou télécharger`;
  chips(m.categories);
}).catch(() => {});
load().catch(() => { grid.replaceChildren(); $('empty').hidden = false; $('empty').textContent = 'Impossible de charger les templates pour le moment.'; });
