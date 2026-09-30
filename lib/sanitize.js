// Retire les mentions d'appartenance (auteur d'origine) des fichiers texte importés.
// Les licences open source (Bootstrap, jQuery…) sont CONSERVÉES : elles sont obligatoires.
export const OWNER_TOKEN = '__OWNER__';
export const DEFAULT_TERMS = ['Coding Team', 'CodingTeam', 'Coding Tuto', 'CodingTuto', 'codingtemplate'];

const LICENSE = /licen[sc]e|permission notice|\bMIT\b|apache|\bgpl\b|\bbsd\b|copyright|©|\(c\)\s*\d{4}|@preserve/i;
const ATTRIB = /\b(coded|created|designed|made|developed|built|crafted)\s+by\b|\bt\.me\/|\btelegram\b|\bauthor\b\s*[:=]/i;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ext = (p) => (p.split('.').pop() || '').toLowerCase();
const short = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 120);

export function sanitizeText(path, input, terms = DEFAULT_TERMS) {
  const e = ext(path);
  const markup = ['html', 'htm', 'php', 'svg', 'xml'].includes(e);
  const code = ['css', 'scss', 'less', 'js', 'mjs', 'php', 'html', 'htm'].includes(e);
  const lineComments = ['js', 'mjs', 'scss', 'less', 'php'].includes(e);
  const list = terms.map((t) => t.trim()).filter(Boolean);
  const hasTerm = (s) => list.some((t) => s.toLowerCase().includes(t.toLowerCase()));
  const removed = [], kept = [];
  let text = input;

  const judge = (comment) => {
    if (hasTerm(comment)) { removed.push({ file: path, type: 'commentaire', snippet: short(comment) }); return true; }
    if (LICENSE.test(comment)) { if (ATTRIB.test(comment)) kept.push({ file: path, snippet: short(comment) }); return false; }
    if (ATTRIB.test(comment)) { removed.push({ file: path, type: 'commentaire', snippet: short(comment) }); return true; }
    return false;
  };

  if (markup) {
    text = text.replace(/<!--(?!\[if)[\s\S]*?-->/gi, (m) => (judge(m) ? '' : m));
    text = text.replace(/<meta\s+[^>]*name\s*=\s*["']author["'][^>]*>[ \t]*/gi, (m) => {
      removed.push({ file: path, type: 'meta auteur', snippet: short(m) }); return '';
    });
  }
  if (code) text = text.replace(/\/\*[\s\S]*?\*\//g, (m) => (judge(m) ? '' : m));
  if (lineComments) text = text.replace(/^[ \t]*\/\/.*(?:\r?\n|$)/gm, (m) => (judge(m) ? '' : m));

  for (const t of list) {
    const re = esc(t);
    if (markup) {
      text = text.replace(/\bhref\s*=\s*(["'])([^"']*)\1/gi, (m, q, v) => {
        if (!v.toLowerCase().includes(t.toLowerCase())) return m;
        removed.push({ file: path, type: 'lien', snippet: short(v) }); return `href=${q}#${q}`;
      });
    }
    text = text.replace(new RegExp(`(?<![="'(])https?:\\/\\/[^\\s"'<>)]*${re}[^\\s"'<>)]*`, 'gi'), () => {
      removed.push({ file: path, type: 'lien', snippet: t }); return '';
    });
    let n = 0;
    text = text.replace(new RegExp(`(?<![\\w/.@#-])${re}(?![\\w/-])`, 'gi'), () => { n++; return OWNER_TOKEN; });
    if (n) removed.push({ file: path, type: 'texte', snippet: `${t} ×${n} → vos initiales` });
  }
  return { text, removed, kept, changed: text !== input };
}
