// Replaces whole kits (gear, idols, skills, faction) for characters re-pulled in one consistent pass.
// data/refresh.packed.json: { s: [strings], d: { "account/character": [level, faction, sp, hb, equipment, idols] } }
// Items are [kind, nameIdx, corrupted, lpMods|0, mods|0, corruptionMod|0, sealedMod|0]; mods are [modIdx, tier].
const fs = require('fs');
const F = process.argv[2];
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const { s, d: data } = JSON.parse(fs.readFileSync('data/refresh.packed.json', 'utf8'));
const mod = m => [s[m[0]], m[1]];
const item = x => {
  const out = [x[0], s[x[1]], x[2], x[3] ? x[3].map(mod) : null];
  if (x[4] || x[5] || x[6]) out.push(x[4] ? x[4].map(mod) : [], x[5] ? mod(x[5]) : null, x[6] ? mod(x[6]) : null);
  return out;
};
let n = 0;
for (const r of d.rows) {
  const k = data[`${r.a}/${r.c}`];
  if (!k) continue;
  const [l, f, sp, hb, e, i] = k;
  r.l = l; r.f = f || null;
  r.sp = sp.map(x => [s[x[0]], x[1]]);
  r.hb = hb.map(x => s[x]);
  r.e = Object.fromEntries(Object.entries(e).map(([slot, x]) => [slot, item(x)]));
  r.i = i.map(item);
  delete r.ng;
  n++;
}
fs.writeFileSync(F, JSON.stringify(d));
console.log(`Refreshed ${n} characters`);
