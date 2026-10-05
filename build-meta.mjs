// Builds meta.html: masteries and skill setups across the top 10,000 of the ladder (newest data/ladder/*.json),
// linking setups that match a build page.
//   node build-meta.mjs   (build-all.mjs runs it)
// data/ladder/<date>.json comes from the scrape tab: {fetchedAt, s: skill names, u: [[classCode, ...skillIdx]] setups,
// d: delta-encoded scores in rank order, l: levels, k: setup index per character}.
import fs from 'node:fs';
import path from 'node:path';

const files = fs.readdirSync('data/ladder').filter(f => f.endsWith('.json')).sort();
const ladder = JSON.parse(fs.readFileSync(path.join('data/ladder', files[files.length - 1]), 'utf8'));
const skillIcons = fs.existsSync('data/skill-icons.json') ? JSON.parse(fs.readFileSync('data/skill-icons.json', 'utf8')) : {};
const icons = Object.fromEntries(ladder.s.filter(n => skillIcons[n]).map(n => [n, skillIcons[n]]));

// Build pages: mastery class code (meta.cls "2-3" -> 23) and the skills the build requires
const builds = JSON.parse(fs.readFileSync('builds.json', 'utf8')).map(b => {
  const dir = path.join('data', 'snapshots', b.slug);
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).filter(f => f.endsWith('.json'))[0];
  const { meta } = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const [base, mastery] = String(meta.cls || '').split('-').map(Number);
  return { out: b.out, cls: base * 10 + mastery, skills: meta.skills || [] };
}).filter(Boolean);

const safe = s => JSON.stringify(s).replace(/</g, '\\u003c').replace(/[^\x00-\x7f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const html = fs.readFileSync('meta-template.html', 'utf8').replace('<!--DATA-->',
  `<script id="ladder" type="application/json">${safe(ladder)}</script>\n<script id="builds" type="application/json">${safe(builds)}</script>\n<script id="icons" type="application/json">${safe(icons)}</script>`);
// Pure ASCII output, same as build-uniques.mjs
const esc = (s, mode) => s.replace(/[^\x00-\x7f]/gu, ch => {
  const cp = ch.codePointAt(0);
  if (mode === 'js') return cp > 0xffff ? ch.split('').map(u => '\\u' + u.charCodeAt(0).toString(16).padStart(4, '0')).join('') : '\\u' + cp.toString(16).padStart(4, '0');
  if (mode === 'css') return '\\' + cp.toString(16) + ' ';
  return '&#x' + cp.toString(16) + ';';
});
const ascii = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|([^<]+|<)/g,
  (m, so, sb, sc, to, tb, tc) => so ? so + esc(sb, 'js') + sc : to ? to + esc(tb, 'css') + tc : esc(m, 'html'));
fs.writeFileSync('meta.html', ascii);
console.log(`meta.html: ${ladder.k.length} characters, ${ladder.u.length} setups, ${builds.length} build pages linked, ${Math.round(ascii.length / 1024)} KB`);
