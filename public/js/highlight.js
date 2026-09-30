// Coloration syntaxique légère (HTML, CSS, JS) — sans dépendance.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Un token multi-lignes est découpé ligne par ligne pour garder la numérotation.
const span = (c, t) => t.split('\n').map((l) => (l ? `<span class="tk-${c}">${esc(l)}</span>` : '')).join('\n');

function run(code, re, names, fn) {
  let out = '', last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const i = m.findIndex((v, k) => k > 0 && v !== undefined);
    out += fn && names[i - 1] === 'tag' ? fn(m[0]) : span(names[i - 1], m[0]);
    last = m.index + m[0].length;
    if (!m[0].length) re.lastIndex++;
  }
  return out + esc(code.slice(last));
}

const JS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`)|((?<![\w$])\d[\d._]*\b)|(\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|export|from|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false|void|delete|yield|static)\b)|(\b[A-Za-z_$][\w$]*(?=\())/g;
const CSS = /(\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|((?<![\w-])-?\d*\.?\d+(?:px|r?em|%|vh|vw|s|ms|deg|fr)?(?![\w-]))|([\w-]+(?=\s*:(?!:)))/g;
const HTML = /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][^>]*>)/g;

function tag(t) {
  const m = /^(<\/?)([\w:-]+)([\s\S]*?)(\/?>)$/.exec(t);
  if (!m) return esc(t);
  let out = span('p', m[1]) + span('t', m[2]), last = 0, a;
  const re = /([\w:@.-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)?/g;
  while ((a = re.exec(m[3]))) {
    out += esc(m[3].slice(last, a.index)) + span('a', a[1]) + esc(a[2] || '') + (a[3] ? span('s', a[3]) : '');
    last = a.index + a[0].length;
  }
  return out + esc(m[3].slice(last)) + span('p', m[4]);
}

export function langOf(path) {
  const e = (path.split('.').pop() || '').toLowerCase();
  if (['html', 'htm', 'xml', 'svg', 'php', 'vue'].includes(e)) return 'html';
  if (['css', 'scss', 'less'].includes(e)) return 'css';
  if (['js', 'mjs', 'json', 'ts', 'jsx'].includes(e)) return 'js';
  return 'text';
}

export function highlight(code, lang) {
  let html;
  if (code.length > 400000 || lang === 'text') html = esc(code);
  else if (lang === 'html') html = run(code, HTML, ['c', 'tag'], tag);
  else if (lang === 'css') html = run(code, CSS, ['c', 's', 'k', 'n', 'n', 'a']);
  else html = run(code, JS, ['c', 's', 'n', 'k', 'f']);
  return html.split('\n').map((l) => `<span class="l">${l}</span>`).join('');
}
