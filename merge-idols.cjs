// Merges data/idols.packed.json (from the browser) into the dataset.
// Each idol gets item[4] = [[mod, tier], ...] and item[5] = [corruptionMod, tier] | null.
// An idol is only updated when the fresh profile still has the same idol at that position.
const fs = require('fs');
const F = process.argv[2];
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const { mods, names, data } = JSON.parse(fs.readFileSync('data/idols.packed.json', 'utf8'));
const mt = s => s ? s.split('|').map(p => { const [i, t] = p.split('.'); return [mods[+i], +t]; }) : [];
let ok = 0, skipped = 0;
for (const r of d.rows) {
  if (r.ng || !r.i) continue;
  const k = data[`${r.a}/${r.c}`];
  if (k == null) continue;
  const fresh = k ? k.split(';').map(s => { const [n, rest] = s.split(':'); const [m, c] = (rest || '').split('^'); return { name: names[+n], mods: mt(m), cor: c ? mt(c)[0] : null }; }) : [];
  r.i.forEach((x, i) => {
    const f = fresh[i];
    if (f && f.name === x[1]) { x[3] = x[3] || null; x[4] = f.mods; x[5] = f.cor; ok++; } else skipped++;
  });
}
fs.writeFileSync(F, JSON.stringify(d));
console.log(`Idol mods added to ${ok} idols, ${skipped} skipped (idol changed since the main scrape)`);
