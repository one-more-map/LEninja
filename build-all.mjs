// Builds every build listed in builds.json, then index.html (a card per build).
// Each build keeps its scrapes in data/snapshots/<slug>/*.json. Every snapshot gets its own page
// (<out>-dayN.html, oldest = Day 1) and the build's main page (<out>) always shows the newest one.
//   node build-all.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const builds = JSON.parse(fs.readFileSync('builds.json', 'utf8')).map(b => {
  const dir = path.join('data', 'snapshots', b.slug);
  const snaps = (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')) : [])
    .map(f => { const file = path.join(dir, f); const { meta } = JSON.parse(fs.readFileSync(file, 'utf8')); return { file, date: meta.scrapedAt, total: meta.total, order: meta.order || 0, sub: meta.snapSub }; })
    // meta.order lets past-ladder snapshots (day-1, day-2) scraped on the same day sort before the live one
    .sort((x, y) => x.order - y.order || new Date(x.date) - new Date(y.date));
  return { ...b, snaps };
}).filter(b => b.snaps.length);
const skillIcons = fs.existsSync('data/skill-icons.json') ? JSON.parse(fs.readFileSync('data/skill-icons.json', 'utf8')) : {};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[^\x00-\x7f]/g, c => '&#x' + c.codePointAt(0).toString(16) + ';');

const cards = builds.map(b => {
  const base = b.out.replace(/\.html$/, ''), last = b.snaps.length - 1;
  const pageOf = i => `${base}-day${i + 1}.html`;
  const list = cur => b.snaps.map((s, i) => ({ label: `Day ${i + 1}`, date: s.date, total: s.total, sub: s.sub, href: i === last ? b.out : pageOf(i), on: i === cur }));
  b.snaps.forEach((s, i) => {
    const env = { ...process.env, LENINJA_SNAPSHOTS: JSON.stringify(list(i)) };
    execFileSync(process.execPath, ['build.mjs', s.file, i === last ? b.out : pageOf(i)], { stdio: 'inherit', env });
  });
  // the newest snapshot also gets a permanent dayN page, so links to a given day keep working
  fs.copyFileSync(b.out, pageOf(last));
  const { meta, rows } = JSON.parse(fs.readFileSync(b.snaps[last].file, 'utf8'));
  const gear = rows.filter(r => !r.ng);
  const top = Math.max(...rows.map(r => r.s));
  const sorted = rows.map(r => r.s).sort((x, y) => x - y), med = sorted[Math.floor(sorted.length / 2)];
  // three most-used uniques across all slots
  const count = new Map();
  gear.forEach(r => { const seen = new Set(); Object.values(r.e).forEach(x => { if ('uls'.includes(x[0]) && !seen.has(x[1])) { seen.add(x[1]); count.set(x[1], (count.get(x[1]) || 0) + 1); } }); });
  const uniq = [...count].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `<li>${esc(n)} <span>${Math.round(c / gear.length * 100)}%</span></li>`).join('');
  const skills = (meta.skills || []).map(s => `<span class="sk">${skillIcons[s] ? `<img src="${skillIcons[s]}" alt="">` : ''}${esc(s)}</span>`).join('');
  const date = new Date(meta.scrapedAt).toISOString().slice(0, 10);
  return `<a class="card" href="${b.out}">
    <div class="cls">${esc(meta.baseClass)}</div>
    <h2>${esc(meta.mastery || meta.baseClass)}</h2>
    <div class="skills">${skills}</div>
    <dl><div><dt>Characters</dt><dd>${rows.length}</dd></div><div><dt>Top corruption</dt><dd>${top}</dd></div><div><dt>Median</dt><dd>${med}</dd></div></dl>
    <ul class="uniq">${uniq}</ul>
    <div class="foot">${gear.length} with gear &middot; scraped ${date}${b.snaps.length > 1 ? ` &middot; ${b.snaps.length} snapshots` : ''}</div>
  </a>`;
}).join('\n');

const season = (JSON.parse(fs.readFileSync(builds[0].snaps[0].file, 'utf8')).meta.season || '').split(' / ')[0];
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LE Ninja</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Barlow+Semi+Condensed:wght@400;500;600;700&display=swap">
<style>
:root{color-scheme:dark;--void:#070a10;--panel:#0e131c;--panel-2:#131a26;--line:#212b3b;--gold:#c9a45c;--gold-dim:#5e4c2c;--gold-hi:#efd59a;--rift:#62d6ea;--frost:#a9e6f2;--text:#e2e7ef;--dim:#8a95a8;--faint:#5b6577;--uniq:#f0913a}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--text);font-family:"Barlow Semi Condensed",system-ui,sans-serif;
  background-image:radial-gradient(800px 300px at 50% -60px,rgba(98,214,234,.12),transparent 70%)}
.wrap{max-width:1100px;margin:0 auto;padding:40px 16px 60px}
header{text-align:center;margin-bottom:28px}
.brand{font-family:Cinzel,Georgia,serif;font-weight:700;font-size:clamp(34px,6vw,52px);letter-spacing:.08em;background:linear-gradient(180deg,#f6e7c2,#c9a45c 70%,#8d6f37);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--dim);font-size:15px;margin-top:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{display:flex;flex-direction:column;gap:10px;padding:18px;border:1px solid var(--gold-dim);border-radius:4px;background:linear-gradient(180deg,var(--panel-2),var(--panel));color:inherit;text-decoration:none;transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--gold);transform:translateY(-2px)}
.card:focus-visible{outline:2px solid var(--rift);outline-offset:2px}
.cls{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
h2{margin:0;font-family:Cinzel,Georgia,serif;font-weight:600;font-size:26px;color:var(--gold-hi)}
.skills{display:flex;flex-wrap:wrap;gap:6px}
.sk{display:inline-flex;align-items:center;gap:6px;padding:2px 10px 2px 2px;border:1px solid #1c4a56;border-radius:14px;color:var(--frost);font-weight:600;font-size:14px}
.sk img{width:24px;height:24px;border-radius:50%}
dl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:4px 0 0}
dl div{background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:3px;padding:6px 8px}
dt{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint)}
dd{margin:0;font-size:20px;font-weight:600;color:var(--frost);font-variant-numeric:tabular-nums}
.uniq{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;font-size:14px;color:var(--uniq);font-weight:600}
.uniq span{color:var(--dim);font-weight:500;margin-left:4px}
.foot{font-size:13px;color:var(--faint);margin-top:auto}
footer{margin-top:28px;text-align:center;font-size:13px;color:var(--faint)}
</style></head>
<body><div class="wrap">
<header><div class="brand">LE NINJA</div><div class="sub">${esc(season)} &middot; corruption ladder builds</div></header>
<div class="grid">
${cards}
</div>
<footer>Data from lastepochtools.com &middot; item and skill art &copy; Eleventh Hour Games</footer>
</div></body></html>
`;
fs.writeFileSync('index.html', html);
console.log(`index.html: ${builds.length} builds`);
