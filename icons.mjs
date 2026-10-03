// Cuts item icons out of the lastepochtools sprite sheet for every item in a data file.
//   node icons.mjs data/<file>.packed.json
// Writes data/icons.json: { "Item Name": "data:image/webp;base64,..." }
import fs from 'node:fs';
import sharp from 'sharp';

const SHEET = 'https://www.lastepochtools.com/data/version150/db/res/1a7cff36df3b418a1e516fbb181aba56';
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36 Edg/140' };
const SIZE = 56; // displayed at 28-40px, so 2x for sharp edges

const { names } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const map = JSON.parse(fs.readFileSync('data/sprites.map.json', 'utf8'));
fs.mkdirSync('.cache/sprites', { recursive: true });

async function cached(url, file) {
  if (!fs.existsSync(file)) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${url} returned ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(file);
}

const css = (await cached(SHEET + '.css', '.cache/sprites/itemdb.css')).toString();
const sheet = await cached(SHEET + '.webp', '.cache/sprites/itemdb.webp');
const pos = {};
for (const m of css.matchAll(/\.itemdb-I(\d+)\{background-position:(-?\d+)(?:px)? (-?\d+)(?:px)?;width:(\d+)px;height:(\d+)px/g)) {
  pos[m[1]] = { left: -+m[2], top: -+m[3], width: +m[4], height: +m[5] };
}
console.log(`Sheet has ${Object.keys(pos).length} icons`);

const out = {};
let miss = 0;
for (const [i, sprite] of Object.entries(map)) {
  const p = pos[sprite];
  if (!p) { miss++; continue; }
  const buf = await sharp(sheet).extract(p).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer();
  out[names[i]] = 'data:image/webp;base64,' + buf.toString('base64');
}
// Items added after the original scrape, keyed by name
if (fs.existsSync('data/sprites.extra.json')) {
  for (const [name, sprite] of Object.entries(JSON.parse(fs.readFileSync('data/sprites.extra.json', 'utf8')))) {
    const p = pos[sprite];
    if (!p || out[name]) continue;
    const buf = await sharp(sheet).extract(p).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toBuffer();
    out[name] = 'data:image/webp;base64,' + buf.toString('base64');
  }
}
fs.writeFileSync('data/icons.json', JSON.stringify(out));
const kb = Math.round(fs.statSync('data/icons.json').size / 1024);
console.log(`Wrote ${Object.keys(out).length} icons (${kb} KB), ${miss} sprites not found`);

// Skill icons live on the planner sheet as .icons-r-<n>; abilitySprite "a-r-<n>" points at them
const PLANNER = 'https://www.lastepochtools.com/data/version150/planner/res/e8f2803b4c790ce8cfb2cdbf6e6921f9';
const pcss = (await cached(PLANNER + '.css', '.cache/sprites/planner.css')).toString();
const psheet = await cached(PLANNER + '.webp', '.cache/sprites/planner.webp');
const ppos = {};
for (const m of pcss.matchAll(/\.icons-r-(\d+)\{background-position:(-?\d+)(?:px)? (-?\d+)(?:px)?;width:(\d+)px;height:(\d+)px/g)) {
  ppos[m[1]] = { left: -+m[2], top: -+m[3], width: +m[4], height: +m[5] };
}
const skillMap = JSON.parse(fs.readFileSync('data/skill-sprites.map.json', 'utf8'));
const skills = {};
for (const [name, n] of Object.entries(skillMap)) {
  if (!ppos[n]) { console.log('  no skill sprite for', name); continue; }
  const buf = await sharp(psheet).extract(ppos[n]).resize(SIZE, SIZE).webp({ quality: 82 }).toBuffer();
  skills[name] = 'data:image/webp;base64,' + buf.toString('base64');
}
fs.writeFileSync('data/skill-icons.json', JSON.stringify(skills));
console.log(`Wrote ${Object.keys(skills).length} skill icons`);
