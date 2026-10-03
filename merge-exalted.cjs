// Merges data/exalted.packed.json (from the browser) into the dataset.
// Exalted/rare gear gets item[4] = [[mod, tier], ...], item[5] = corruption mod, item[6] = sealed mod.
// A slot is only updated when the fresh profile still has the same base item there.
const fs = require('fs');
const F = process.argv[2];
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const { mods, names, data } = JSON.parse(fs.readFileSync('data/exalted.packed.json', 'utf8'));
const mt = s => s ? s.split('|').map(p => { const [i, t] = p.split('.'); return [mods[+i], +t]; }) : [];
let ok = 0, skipped = 0;
for (const r of d.rows) {
  if (r.ng) continue;
  const k = data[`${r.a}/${r.c}`];
  if (k == null) continue;
  const fresh = Object.fromEntries((k || '').split(';').filter(Boolean).map(s => {
    const [slot, rest] = s.split('=');
    const [n, m, c, sl] = rest.split(':');
    return [slot, { name: names[+n], mods: mt(m), cor: c ? mt(c)[0] : null, sealed: sl ? mt(sl)[0] : null }];
  }));
  for (const [slot, x] of Object.entries(r.e)) {
    if (x[0] !== 'e' && x[0] !== 'r') continue;
    const f = fresh[slot];
    if (f && f.name === x[1]) { x[3] = x[3] || null; x[4] = f.mods; x[5] = f.cor; x[6] = f.sealed; ok++; } else skipped++;
  }
}
fs.writeFileSync(F, JSON.stringify(d));
console.log(`Mods added to ${ok} exalted/rare items, ${skipped} skipped (item changed since the main scrape)`);
