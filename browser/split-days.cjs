// Splits a combined past-ladder export (profiles fetched once + per-ladder-day rank lists) into one standard
// packed export per day, then unpacks each into data/snapshots/<slug>/.
// lastepochtools keeps ladder history (rank, corruption, skills) but profiles only show current gear,
// so day-1/day-2 snapshots get a "Gear as of" note.
//   node browser/split-days.cjs data/<name>.packed.json <slug> '<meta json>'
const fs = require('fs');
const { execFileSync } = require('child_process');
const [, , file, slug, metaJson] = process.argv;
const P = JSON.parse(fs.readFileSync(file, 'utf8'));
const base = JSON.parse(metaJson);
const DAYS = [['day-1', 'Ladder day 1'], ['day-2', 'Ladder day 2'], ['latest', 'Ladder latest']];
const scraped = new Date(P.scrapedAt);
const gearDate = scraped.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
DAYS.forEach(([day, sub], order) => {
  const rows = (P.days[day] || []).map(([a, c, r, s, l, sk]) => {
    const p = P.profiles[a + '/' + c];
    if (!p) return [a, c, r, s, l, sk, 0, 0, 0, 0, 0];
    const [f, sp, hb, e, i, pl] = p;
    return [a, c, r, s, pl || l, sk, f, sp, hb, e, i];
  });
  if (!rows.length) return;
  const meta = { ...base, pages: Math.ceil(rows.length / 50), ladderDay: day, order: order + 1, snapSub: sub,
    ...(day === 'latest' ? {} : { gearNote: `Gear as of ${gearDate}` }) };
  // offset by order so the three snapshots keep distinct timestamps
  const out = { scrapedAt: new Date(scraped.getTime() + order * 1000).toISOString(), meta, s: P.s, rows, spr: P.spr, skspr: P.skspr, odds: P.odds };
  const tmp = file.replace(/\.packed\.json$/, `.${day}.packed.json`);
  fs.writeFileSync(tmp, JSON.stringify(out));
  const iso = scraped.toISOString();
  const dest = `data/snapshots/${slug}/${iso.slice(0, 13)}${iso.slice(14, 16)}-${day}.json`;
  execFileSync(process.execPath, ['unpack-full.cjs', dest, tmp], { stdio: 'inherit' });
});
