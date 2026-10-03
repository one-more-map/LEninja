// Builds leninja.html from template.html and a data file.
//   node build.mjs data/<file>.json [out.html]
// Accepts the normal {meta, rows} format, or the packed format exported from the browser
// ({meta, names, packed}) which it unpacks and saves alongside as the normal format.
import fs from 'node:fs';
import path from 'node:path';

const [, , file, outName = 'leninja.html', templateName = 'template.html'] = process.argv;
if (!file) { console.error('Usage: node build.mjs data/<file>.json [out.html] [template.html]'); process.exit(1); }
const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
let { meta, rows, names, packed } = JSON.parse(fs.readFileSync(file, 'utf8'));

if (packed) {
  const EQ = ['weapon1', 'weapon2', 'head', 'chest', 'hands', 'waist', 'feet', 'ring1', 'ring2', 'amulet', 'relic', 'idol_altar'];
  const item = code => { const m = /^([a-z])(\d+)(\*?)$/.exec(code); return [m[1], names[+m[2]], m[3] ? 1 : 0]; };
  rows = packed.map(([a, c, r, s, l, sk, f, eq, idols]) => {
    const row = { h: `/profile/${encodeURIComponent(a)}/character/${encodeURIComponent(c)}`, a, c, r, s, l, sk: sk.map(i => names[i]) };
    if (f === 0) row.ng = 1;
    else {
      row.f = f; row.e = {};
      eq.forEach((code, i) => { if (code) row.e[EQ[i]] = item(code); });
      row.i = idols.map(item);
    }
    return row;
  });
  const unpacked = file.replace(/\.packed\.json$|\.json$/, '') + '.json';
  fs.writeFileSync(unpacked, JSON.stringify({ meta, rows }));
  console.log('Unpacked to', unpacked);
}

const safe = s => JSON.stringify(s).replace(/</g, '\\u003c');
// Item icons (from icons.mjs), trimmed to the items this data set uses
let iconTag = '';
// Known characters (friends etc.) that load instantly in "Your character" without the import script
const knownFile = path.join(ROOT, 'data', 'known-characters.json');
const known = (fs.existsSync(knownFile) ? JSON.parse(fs.readFileSync(knownFile, 'utf8')) : []).filter(k => !k.cls || !meta.cls || k.cls === meta.cls);
const iconRows = [...rows, ...known];
const iconFile = path.join(ROOT, 'data', 'icons.json');
if (fs.existsSync(iconFile)) {
  const all = JSON.parse(fs.readFileSync(iconFile, 'utf8')), used = {};
  iconRows.forEach(r => { if (r.e) Object.values(r.e).forEach(x => { if (all[x[1]]) used[x[1]] = all[x[1]]; }); (r.i || []).forEach(x => { if (all[x[1]]) used[x[1]] = all[x[1]]; }); });
  iconTag = `\n<script id="icons" type="application/json">${safe(used)}</script>`;
  console.log(`Embedding ${Object.keys(used).length} icons`);
}
const skillFile = path.join(ROOT, 'data', 'skill-icons.json');
if (fs.existsSync(skillFile)) {
  const all = JSON.parse(fs.readFileSync(skillFile, 'utf8')), used = {};
  iconRows.forEach(r => [...(r.sk || []), ...(r.sp || []).map(x => x[0]), ...(r.hb || [])].forEach(n => { if (all[n]) used[n] = all[n]; }));
  iconTag += `\n<script id="skill-icons" type="application/json">${safe(used)}</script>`;
  console.log(`Embedding ${Object.keys(used).length} skill icons`);
}
if (known.length) { iconTag += `
<script id="known" type="application/json">${safe(known)}</script>`; console.log(`Embedding ${known.length} known character(s)`); }
const html = fs.readFileSync(path.join(ROOT, templateName), 'utf8')
  .replace('<!--DATA-->', `<script id="meta" type="application/json">${safe(meta)}</script>\n<script id="data" type="application/json">${safe(rows)}</script>${iconTag}`);
// Make the output pure ASCII so no host can mis-decode it (UTF-8 read as Latin-1 shows "Â·").
// Scripts get \u escapes, styles get CSS escapes, everything else gets HTML entities.
const esc = (s, mode) => s.replace(/[^\x00-\x7f]/gu, ch => {
  const cp = ch.codePointAt(0);
  if (mode === 'js') return cp > 0xffff ? ch.split('').map(u => '\\u' + u.charCodeAt(0).toString(16).padStart(4, '0')).join('') : '\\u' + cp.toString(16).padStart(4, '0');
  if (mode === 'css') return '\\' + cp.toString(16) + ' ';
  return '&#x' + cp.toString(16) + ';';
});
const ascii = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|([^<]+|<)/g,
  (m, so, sb, sc, to, tb, tc) => so ? so + esc(sb, 'js') + sc : to ? to + esc(tb, 'css') + tc : esc(m, 'html'));
fs.writeFileSync(path.join(ROOT, outName), ascii);
const left = [...ascii].filter(c => c.charCodeAt(0) > 127).length;
if (left) console.warn(`Warning: ${left} non-ASCII characters left`);
console.log(`Built ${outName}: ${rows.length} characters, ${rows.filter(r => !r.ng).length} with gear`);
