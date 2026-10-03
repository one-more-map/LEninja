// Merges data/lp.packed.json (from the browser) into the dataset:
//  - legendaries get their pink LP mods as item[3] = [[mod, tier], ...]
//  - non-unique gear and idols are re-labelled exalted (best affix T6+) or rare
const fs = require('fs');
const F = process.argv[2];
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const { mods, data } = JSON.parse(fs.readFileSync('data/lp.packed.json', 'utf8'));
// specialAffixType 7: the unique's own rolled lines (shown orange on lastepochtools), not Legendary Potential
const NOT_LP = new Set(['You have Predator Rage', 'You have Feasting Rage', 'You have Berserking Rage', 'You have Explosive Rage', 'You have Crescendoing Rage',
  'Increased Attack Speed per 5% Overcapped Physical Resistance (up to 200% Overcapped Physical Resistance)',
  'Reduced Bonus Damage Taken from Critical Strikes per 4% Overcapped Physical Resistance (up to 200% Overcapped Physical Resistance)']);
const parse = s => Object.fromEntries((s || '').split(';').filter(Boolean).map(p => p.split('=')));
let lpItems = 0, relabel = 0, missing = 0;
for (const r of d.rows) {
  if (r.ng) continue;
  const k = data[`${r.a}/${r.c}`];
  if (!k) { missing++; continue; }
  const [lpStr, mtStr, itStr] = k;
  const lp = parse(lpStr), mt = parse(mtStr);
  for (const [slot, item] of Object.entries(r.e)) {
    if (lp[slot] && item[0] === 'l') {
      item[3] = lp[slot].split('|').map(m => { const [i, t] = m.split('.'); return [mods[+i], +t]; }).filter(m => !NOT_LP.has(m[0]));
      if (!item[3].length) delete item[3]; else lpItems++;
    }
    if (slot in mt && (item[0] === 'e' || item[0] === 'r')) {
      const kind = +mt[slot] >= 6 ? 'e' : 'r';
      if (kind !== item[0]) { item[0] = kind; relabel++; }
    }
  }
  const it = (itStr || '').split(',').filter(x => x !== '').map(Number);
  (r.i || []).forEach((item, i) => {
    if (it[i] >= 0 && (item[0] === 'e' || item[0] === 'r')) {
      const kind = it[i] >= 6 ? 'e' : 'r';
      if (kind !== item[0]) { item[0] = kind; relabel++; }
    }
  });
}
fs.writeFileSync(F, JSON.stringify(d));
console.log(`LP mods on ${lpItems} legendaries, ${relabel} items re-labelled exalted/rare, ${missing} characters missing`);
