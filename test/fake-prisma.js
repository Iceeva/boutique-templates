// Base de données EN MÉMOIRE imitant la petite partie de Prisma utilisée ici. Réservé au mode démo et aux tests.
let seq = 0;
export const store = { categories: [], templates: [], files: [], settings: null };
const SETTINGS = { id: 1, siteName: 'Boutique Templates', initials: '', displayName: '', badgeEnabled: true, badgePosition: 'bottom-right', badgeColor: '#ffffff', badgeBg: '#111111', commentHeader: true, blockedTerms: ['Coding Team', 'CodingTeam', 'Coding Tuto', 'CodingTuto', 'codingtemplate'] };

const rel = (key, row) => (key === 'category' ? store.categories.find((c) => c.id === row.categoryId) : key === 'template' ? store.templates.find((t) => t.id === row.templateId) : undefined);
function match(where = {}, row) {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return v.some((w) => match(w, row));
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if ('contains' in v) return String(row[k] ?? '').toLowerCase().includes(String(v.contains).toLowerCase());
      if ('has' in v) return (row[k] || []).includes(v.has);
      const r = rel(k, row);
      return r ? match(v, r) : false;
    }
    return row[k] === v;
  });
}
const order = (rows, by) => {
  const list = Array.isArray(by) ? by : by ? [by] : [];
  return [...rows].sort((a, b) => { for (const o of list) { const [f, d] = Object.entries(o)[0]; if (a[f] !== b[f]) return (a[f] > b[f] ? 1 : -1) * (d === 'desc' ? -1 : 1); } return 0; });
};
const pick = (row, select) => (select ? Object.fromEntries(Object.entries(select).filter(([, v]) => v).map(([k]) => [k, row[k]])) : row);
function shape(row, { select, include } = {}) {
  let out = select ? pick(row, select) : { ...row };
  if (select?.category) out.category = rel('category', row) ? pick(rel('category', row), select.category.select) : null;
  if (include?.category) out.category = rel('category', row) || null;
  if (include?.files) { const f = order(store.files.filter((x) => x.templateId === row.id), include.files.orderBy); out.files = f.map((x) => pick(x, include.files.select)); }
  if (select?._count || include?._count) out._count = { files: store.files.filter((x) => x.templateId === row.id).length };
  return out;
}
const apply = (row, data) => { for (const [k, v] of Object.entries(data)) row[k] = v && typeof v === 'object' && 'increment' in v ? row[k] + v.increment : v; return row; };

export class PrismaClient {
  siteSettings = {
    upsert: async () => (store.settings ??= { ...SETTINGS }),
    update: async ({ data }) => Object.assign(store.settings ??= { ...SETTINGS }, data),
  };
  category = {
    findMany: async ({ orderBy, include } = {}) => order(store.categories, orderBy).map((c) => (include?._count ? { ...c, _count: { templates: store.templates.filter((t) => t.categoryId === c.id && match(include._count.select.templates.where, t)).length } } : c)),
    findUnique: async ({ where }) => store.categories.find((c) => c.slug === where.slug || c.id === where.id) || null,
    upsert: async ({ where, update, create }) => { const c = store.categories.find((x) => x.slug === where.slug); if (c) return Object.assign(c, update); const n = { id: ++seq, ...create }; store.categories.push(n); return n; },
    delete: async ({ where }) => { store.categories = store.categories.filter((c) => c.id !== where.id); store.templates.forEach((t) => t.categoryId === where.id && (t.categoryId = null)); },
  };
  template = {
    count: async ({ where } = {}) => store.templates.filter((t) => match(where, t)).length,
    findMany: async ({ where, orderBy, skip = 0, take, select, include } = {}) => order(store.templates.filter((t) => match(where, t)), orderBy).slice(skip, take ? skip + take : undefined).map((t) => shape(t, { select, include })),
    findFirst: async ({ where, select, include } = {}) => { const t = store.templates.find((x) => match(where, x)); return t ? shape(t, { select, include }) : null; },
    findUnique: async ({ where }) => store.templates.find((t) => (where.slug ? t.slug === where.slug : t.id === where.id)) || null,
    create: async ({ data }) => { const t = { id: 't' + ++seq, views: 0, copies: 0, downloads: 0, entryPath: 'index.html', published: true, tags: [], description: '', createdAt: new Date(Date.now() - (1000 - seq) * 1000), cleanupReport: null, ...data }; store.templates.push(t); return t; },
    update: async ({ where, data }) => { const t = store.templates.find((x) => x.id === where.id || x.slug === where.slug); if (!t) throw Object.assign(new Error('introuvable'), { code: 'P2025' }); return apply(t, data); },
    delete: async ({ where }) => { store.templates = store.templates.filter((t) => t.id !== where.id); store.files = store.files.filter((f) => f.templateId !== where.id); },
  };
  templateFile = {
    findFirst: async ({ where }) => store.files.find((f) => match(where, f)) || null,
    findMany: async ({ where, select, orderBy } = {}) => order(store.files.filter((f) => match(where, f)), orderBy).map((f) => pick(f, select)),
    deleteMany: async ({ where }) => { store.files = store.files.filter((f) => !match(where, f)); },
    createMany: async ({ data }) => { for (const r of data) store.files.push({ id: 'f' + ++seq, ...r }); },
    upsert: async ({ where, update, create }) => { const k = where.templateId_path; const f = store.files.find((x) => x.templateId === k.templateId && x.path === k.path); if (f) return Object.assign(f, update); const n = { id: 'f' + ++seq, ...create }; store.files.push(n); return n; },
    update: async ({ where, data }) => Object.assign(store.files.find((f) => f.id === where.id), data),
  };
  $transaction = async (ops) => Promise.all(ops);
  $disconnect = async () => {};
}
