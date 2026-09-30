// Applique la signature (initiales) à la lecture : un changement dans l'admin
// se répercute instantanément sur tous les templates, aperçu, code et ZIP.
import { OWNER_TOKEN } from './sanitize.js';

const MIME = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript',
  json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain', md: 'text/markdown',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf',
};
const TEXT = new Set(['html','htm','css','scss','less','js','mjs','ts','jsx','json','svg','xml','txt','md','php','py','rb','yml','yaml','csv','map','sass','vue','ini','env','htaccess']);

export const extOf = (p) => (p.split('.').pop() || '').toLowerCase();
export const mimeOf = (p) => MIME[extOf(p)] || 'application/octet-stream';
export const isTextPath = (p) => TEXT.has(extOf(p));

const POS = {
  'top-left': 'top:14px;left:14px', 'top-right': 'top:14px;right:14px',
  'bottom-left': 'bottom:14px;left:14px', 'bottom-right': 'bottom:14px;right:14px',
};
const html = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Dans l'aperçu (iframe sandboxée) localStorage est indisponible : on le remplace par une version en mémoire.
const STORAGE_SHIM = `<script>try{localStorage.getItem('x')}catch(e){['localStorage','sessionStorage'].forEach(function(n){var m={};Object.defineProperty(window,n,{configurable:true,value:{getItem:function(k){return k in m?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}})})}</script>`;

export function applySignature(path, text, s, { preview = false } = {}) {
  const e = extOf(path);
  const owner = s.displayName || s.initials || '';
  let out = text.split(OWNER_TOKEN).join(owner);
  const isHtml = e === 'html' || e === 'htm';

  if (s.commentHeader && s.initials) {
    const tag = `© ${s.initials}`;
    if (isHtml) {
      const dt = out.match(/^\s*<!doctype[^>]*>\s*/i);
      out = dt ? dt[0].trimEnd() + `\n<!-- ${tag} -->\n` + out.slice(dt[0].length) : `<!-- ${tag} -->\n` + out;
    } else if (['css', 'scss', 'less', 'js', 'mjs'].includes(e)) out = `/* ${tag} */\n` + out;
  }
  if (isHtml && s.badgeEnabled && s.initials && !out.includes('data-tpl-signature')) {
    const pos = POS[s.badgePosition] || POS['bottom-right'];
    const col = /^#[0-9a-f]{3,8}$/i;
    const badge = `<div data-tpl-signature style="position:fixed;${pos};z-index:2147483647;font:600 12px/1 system-ui,sans-serif;letter-spacing:.04em;padding:7px 11px;border-radius:999px;background:${col.test(s.badgeBg) ? s.badgeBg : '#111'};color:${col.test(s.badgeColor) ? s.badgeColor : '#fff'};box-shadow:0 2px 10px rgba(0,0,0,.25);pointer-events:none">${html(s.initials)}</div>\n`;
    const i = out.toLowerCase().lastIndexOf('</body>');
    out = i >= 0 ? out.slice(0, i) + badge + out.slice(i) : out + '\n' + badge;
  }
  if (isHtml && preview) {
    const m = out.match(/<head[^>]*>/i);
    out = m ? out.replace(m[0], m[0] + STORAGE_SHIM) : STORAGE_SHIM + out;
  }
  return out;
}
