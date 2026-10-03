// Turns a full browser export (data/full.packed.json) into the dataset, and updates the
// item sprite list, skill sprite list and LP odds so icons.mjs / build.mjs pick up new items.
//   node unpack-full.cjs data/<dataset>.json [data/<export>.packed.json]
const fs = require('fs');
const OUT = process.argv[2];
const P = JSON.parse(fs.readFileSync(process.argv[3] || 'data/full.packed.json', 'utf8'));
const s = P.s;
const mod = m => [s[m[0]], m[1]];
const item = x => {
  const out = [x[0], s[x[1]], x[2], x[3] ? x[3].map(mod) : null];
  if (x[4] || x[5] || x[6]) out.push(x[4] ? x[4].map(mod) : [], x[5] ? mod(x[5]) : null, x[6] ? mod(x[6]) : null);
  return out;
};
const rows = P.rows.map(([a, c, r, sc, l, sk, f, sp, hb, e, i]) => {
  const row = { h: `/profile/${encodeURIComponent(a)}/character/${encodeURIComponent(c)}`, a, c, r, s: sc, l, sk: sk.map(k => s[k]) };
  if (!e) { row.ng = 1; return row; }
  row.f = f || null;
  row.sp = (sp || []).map(x => [s[x[0]], x[1]]);
  row.hb = (hb || []).map(k => s[k]);
  row.e = Object.fromEntries(Object.entries(e).map(([slot, x]) => [slot, item(x)]));
  row.i = (i || []).map(item);
  return row;
});

// Sprites and odds: merge into the existing lists
const extra = fs.existsSync('data/sprites.extra.json') ? JSON.parse(fs.readFileSync('data/sprites.extra.json', 'utf8')) : {};
for (const [k, v] of Object.entries(P.spr)) if (v) extra[s[k]] = v;
fs.writeFileSync('data/sprites.extra.json', JSON.stringify(extra));
const skills = JSON.parse(fs.readFileSync('data/skill-sprites.map.json', 'utf8'));
Object.assign(skills, P.skspr);
fs.writeFileSync('data/skill-sprites.map.json', JSON.stringify(skills));
const odds = JSON.parse(fs.readFileSync('data/lp-odds.json', 'utf8'));
Object.assign(odds, P.odds);
fs.writeFileSync('data/lp-odds.json', JSON.stringify(odds));

// Build details come from the export (P.meta); the first export predates that, so it falls back to Spellblade
const meta = Object.assign({
  season: 'Season 5: Rage of the Frostborn / Softcore / Corruption Ladder', cycle: 'rage-of-the-frostborn', mode: 'softcore-1p', board: 'corruption',
  baseClass: 'Mage', mastery: 'Spellblade', skills: ['Surge', 'Firebrand'], pages: 4,
}, P.meta || {}, { total: rows.length, scrapedAt: P.scrapedAt, lpOdds: odds, lpArea: 100 });
fs.writeFileSync(OUT, JSON.stringify({ meta, rows }));
console.log(`${rows.length} characters, ${rows.filter(r => !r.ng).length} with gear; ${Object.keys(P.spr).length} item sprites, ${Object.keys(P.odds).length} unique odds`);
