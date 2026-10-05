// Packs one finished build from window.__runs (see scrape.js) into gzip+base64 chunks for transfer.
// Set SLUG, run, then read __chunks[0..n] and check each against the printed hashes.
const SLUG = 'sb';
const META = {
  sb: { baseClass: 'Mage', mastery: 'Spellblade', cls: '1-2', skills: ['Surge', 'Firebrand'] },
  vk: { baseClass: 'Sentinel', mastery: 'Void Knight', cls: '2-1', skills: ['Shield Throw'] },
  bd: { baseClass: 'Rogue', mastery: 'Bladedancer', cls: '4-1', skills: ['Dreamslash', 'Shift', 'Shadow Cascade'] },
  lich: { baseClass: 'Acolyte', mastery: 'Lich', cls: '3-2', skills: ['Flay'] },
  pal: { baseClass: 'Sentinel', mastery: 'Paladin', cls: '2-3', skills: ['Hammer Throw'] },
};
const run = __runs[SLUG];
const s = [], si = new Map(), S = v => { if (!si.has(v)) { si.set(v, s.length); s.push(v) } return si.get(v) };
const m = x => [S(x[0]), x[1]];
const it = x => [x[0], S(x[1]), x[2], x[3] ? x[3].map(m) : 0, x[4] ? x[4].map(m) : 0, x[5] ? m(x[5]) : 0, x[6] ? m(x[6]) : 0, x[7] ? S(x[7]) : 0];
const rows = run.rows.map(r => [r.a, r.c, r.r, r.s, r.l, r.sk.map(S), r.ng ? 0 : (r.f || 0), r.ng ? 0 : r.sp.map(m), r.ng ? 0 : r.hb.map(S), r.ng ? 0 : Object.fromEntries(Object.entries(r.e).map(([k, x]) => [k, it(x)])), r.ng ? 0 : r.i.map(it)]);
const spr = {}; for (const [n, v] of Object.entries(__spr)) if (si.has(n) && v) spr[si.get(n)] = v;
const EQ = itemDB.itemList.equippable, IDOL = [25, 26, 27, 28, 29, 30, 31, 32, 33], odds = {};
for (const [n, u] of Object.entries(__uq)) {
  if (!si.has(n)) continue;
  let lvl = u.levelRequirement; if (!u.overrideLevelRequirement) { const x = EQ[u.baseTypeId]?.subItems?.[(u.subTypeIds || [])[0]]; if (x) lvl = x.levelRequirement } lvl = lvl || 0;
  const why = u.isSetItem || u.setId ? 'set' : u.legendaryType == 1 ? 'weavers will' : IDOL.includes(u.baseTypeId) ? 'idol' : lvl >= 120 ? 'level' : null;
  odds[n] = why || [lvl, uniqueMinLP[u.uniqueId] || 0, ...n_xob(lvl, uniqueMinLP[u.uniqueId] || 0).map(p => +p.toPrecision(4))]
}
const meta = { ...META[SLUG], pages: Math.ceil(run.rows.length / 50) };
window.__fp = JSON.stringify({ scrapedAt: new Date(run.start).toISOString(), meta, s, rows, spr, skspr: __skspr, odds });
const cs = new Blob([__fp]).stream().pipeThrough(new CompressionStream('gzip')); const buf = new Uint8Array(await new Response(cs).arrayBuffer());
let bin = ''; for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192)); window.__fz = btoa(bin);
const hs = str => { let h = 0; for (const c of str) h = (h * 31 + c.codePointAt(0)) | 0; return h };
window.__chunks = []; for (let i = 0; i < __fz.length; i += 11600) __chunks.push(__fz.slice(i, i + 11600));
({ slug: SLUG, json: __fp.length, chunks: __chunks.length, hashes: __chunks.map(c => hs(c)), jsonHash: hs(__fp), rows: rows.length, gear: run.rows.filter(r => !r.ng).length, err: run.err.length })
