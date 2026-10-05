// Builds uniques.html: every unique (data/uniques-db.json) grouped by type, with LP odds and how many players
// on each build (latest snapshot) wear it.
//   node build-uniques.mjs   (build-all.mjs runs it)
import fs from 'node:fs';
import path from 'node:path';

const db = JSON.parse(fs.readFileSync('data/uniques-db.json', 'utf8'));
const icons = JSON.parse(fs.readFileSync('data/icons.json', 'utf8'));
const links = JSON.parse(fs.readFileSync('data/let-links.json', 'utf8')); // name -> lastepochtools /db/items/ id
const builds = JSON.parse(fs.readFileSync('builds.json', 'utf8')).map(b => {
  const dir = path.join('data', 'snapshots', b.slug);
  if (!fs.existsSync(dir)) return null;
  const snaps = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .sort((x, y) => (x.meta.order || 0) - (y.meta.order || 0) || new Date(x.meta.scrapedAt) - new Date(y.meta.scrapedAt));
  return snaps.length ? { ...b, data: snaps[snaps.length - 1] } : null;
}).filter(Boolean);

// [name] -> per build [characters wearing it, LP counts 0..4]
const usage = {};
builds.forEach((b, bi) => {
  b.data.rows.forEach(r => {
    if (r.ng) return;
    const seen = new Map();
    [...Object.values(r.e), ...r.i].forEach(x => {
      if (!'uls'.includes(x[0])) return;
      const lp = x[0] === 'l' && x[3] ? Math.min(4, x[3].length) : 0;
      seen.set(x[1], Math.max(seen.get(x[1]) ?? 0, lp));
    });
    for (const [name, lp] of seen) {
      const u = (usage[name] ??= []);
      const c = (u[bi] ??= [0, [0, 0, 0, 0, 0]]);
      c[0]++; c[1][lp]++;
    }
  });
});

const uniques = db.filter(x => !x[8]).map(([name, type, base, , lvl, set, ww, random, , , odds]) => ({
  name, type, base, lvl, set, ww, random, odds, let: links[name] || null, use: builds.map((_, i) => usage[name]?.[i] || null),
}));
const meta = {
  builds: builds.map(b => ({ label: b.data.meta.mastery + ' ' + (b.data.meta.skills || []).join(' + '), out: b.out, gear: b.data.rows.filter(r => !r.ng).length })),
};
const usedIcons = Object.fromEntries(uniques.filter(u => icons[u.name]).map(u => [u.name, icons[u.name]]));

const safe = s => JSON.stringify(s).replace(/</g, '\\u003c').replace(/[^\x00-\x7f]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const html = fs.readFileSync('uniques-template.html', 'utf8').replace('<!--DATA-->',
  `<script id="meta" type="application/json">${safe(meta)}</script>\n<script id="uniques" type="application/json">${safe(uniques)}</script>\n<script id="icons" type="application/json">${safe(usedIcons)}</script>`);
// Pure ASCII output: \u escapes inside scripts, CSS escapes in styles, HTML entities elsewhere (same as build.mjs)
const esc = (s, mode) => s.replace(/[^\x00-\x7f]/gu, ch => {
  const cp = ch.codePointAt(0);
  if (mode === 'js') return cp > 0xffff ? ch.split('').map(u => '\\u' + u.charCodeAt(0).toString(16).padStart(4, '0')).join('') : '\\u' + cp.toString(16).padStart(4, '0');
  if (mode === 'css') return '\\' + cp.toString(16) + ' ';
  return '&#x' + cp.toString(16) + ';';
});
const ascii = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|([^<]+|<)/g,
  (m, so, sb, sc, to, tb, tc) => so ? so + esc(sb, 'js') + sc : to ? to + esc(tb, 'css') + tc : esc(m, 'html'));
fs.writeFileSync('uniques.html', ascii);
console.log(`uniques.html: ${uniques.length} uniques, ${Object.keys(usage).length} used by ${builds.length} builds, ${Math.round(ascii.length / 1024)} KB`);
