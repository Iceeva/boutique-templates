import { el, enc, fmt, icon } from './common.js';

// L'aperçu est le vrai site, réduit : on ne le charge que lorsque la carte approche de l'écran.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); }
}, { rootMargin: '400px' });
const ro = new ResizeObserver((entries) => entries.forEach((e) => e.target.style.setProperty('--s', e.contentRect.width / 1280)));

function mount(box) {
  const f = el('iframe', { src: `/p/${box.dataset.slug}/${enc(box.dataset.entry)}`, sandbox: 'allow-scripts', tabindex: '-1', 'aria-hidden': 'true', title: '' });
  f.addEventListener('load', () => box.classList.add('ready'));
  setTimeout(() => box.classList.add('ready'), 6000);
  box.append(f);
}

export function thumb(t, { overlay = true } = {}) {
  if (!t.entryPath) return el('div', { class: 'thumb nopv' }, el('b', { text: 'CODE SEUL' }), el('small', { text: (t.tags || []).slice(0, 3).join(' · ') }));
  const box = el('div', { class: 'thumb' },
    overlay && t.category && el('span', { class: 'cat', text: t.category.name }),
    overlay && el('span', { class: 'cta' }, 'Voir l’aperçu', icon('arrow')));
  box.dataset.slug = t.slug; box.dataset.entry = t.entryPath;
  io.observe(box); ro.observe(box);
  return box;
}

export function card(t, i = 0) {
  return el('a', { class: 'card', href: `/t/${t.slug}`, style: `--i:${i}` },
    thumb(t),
    el('div', { class: 'meta' }, el('b', { text: t.title }),
      el('span', {}, el('span', {}, icon('eye'), ` ${fmt(t.views)}`), el('span', {}, icon('down'), ` ${fmt(t.downloads)}`))));
}

export const skeleton = () => el('div', { class: 'card sk', 'aria-hidden': 'true' }, el('div', { class: 'thumb' }), el('div', { class: 'line' }));
