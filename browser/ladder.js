// Exports the whole ladder (top 10,000: rank, corruption, level, mastery, equipped skills) for meta.html.
// Run in the in-app browser on a lastepochtools.com profile page, then move the chunks across like a scrape:
//   write window.__cs.ladder[0..] to .cache/ladder.b64.N, run node browser/receive.cjs ladder <jsonHash> <chunkHashes...>,
//   then move data/ladder.packed.json to data/ladder/<fetchedAt as YYYY-MM-DDTHHMM>.json and run node build-all.mjs.
// Format: {fetchedAt, s: skill names, u: [[classCode, ...skillIdx]] distinct setups, d: scores delta-encoded in rank order,
// l: levels, k: setup index per character}. Storing each setup once keeps it to ~3 chunks.
if (!window.__en) window.__en = await fetch('/data/version150/i18n/full/en.json').then(r => r.json());
const lad = await fetch('/static_data/ladders/rage-of-the-frostborn/latest/corruption/softcore-1p.js?' + Date.now()).then(r => r.json());
const AB = LEAbilities.abilityList;
const SN = id => { const a = AB[id]; if (id === 'arcas') return 'Arcane Ascendance'; return a && a.nameKey ? ((__en[a.nameKey] || id) + '').replace(/''/g, "'").trim() : id };
const names = [], ix = {}; const si = id => { const n = SN(id); if (!(n in ix)) { ix[n] = names.length; names.push(n) } return ix[n] };
const setups = [], sx = {};
const e = lad.e.map(x => {
  const k = [x[4], ...[...new Set(x[6].map(i => si(lad.s[i])))].sort((a, b) => a - b)]; const key = k.join(',');
  if (!(key in sx)) { sx[key] = setups.length; setups.push(k) }
  return [x[0], x[5], sx[key]];
});
const sc = e.map(x => x[0]);
const out = JSON.stringify({ ladder: 'rage-of-the-frostborn/latest/corruption/softcore-1p', fetchedAt: new Date().toISOString(), s: names, u: setups,
  d: sc.map((v, i) => i ? sc[i - 1] - v : v), l: e.map(x => x[1]), k: e.map(x => x[2]) });
const H = s => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) | 0; return h };
const gz = await new Response(new Blob([out]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
let b = ''; const u8 = new Uint8Array(gz); for (let i = 0; i < u8.length; i += 8192) b += String.fromCharCode(...u8.subarray(i, i + 8192));
const b64 = btoa(b), ch = []; for (let i = 0; i < b64.length; i += 11600) ch.push(b64.slice(i, i + 11600));
window.__cs = { ...(window.__cs || {}), ladder: ch };
JSON.stringify({ characters: e.length, setups: setups.length, jsonHash: H(out), chunks: ch.length, hashes: ch.map(H) });
