// LE Ninja scraper: pulls a lastepochtools ladder slice plus each character's gear,
// then builds leninja.html from template.html.
//
//   node scrape.mjs --class spellblade --pages 5
//   node scrape.mjs --class necromancer --skills "Summon Wraith,Dread Shade" --pages 2
//   node scrape.mjs --class spellblade --pages 5 --headed      (if Cloudflare blocks headless)
//
// Characters are fetched one at a time with a pause between them. Results are cached in
// .cache/profiles so re-runs only fetch characters older than --max-age hours.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SITE = 'https://www.lastepochtools.com';

// cls codes on the ladder are "<class>-<mastery>"
const CLASSES = {
  primalist: '0-0', beastmaster: '0-1', shaman: '0-2', druid: '0-3',
  mage: '1-0', sorcerer: '1-1', spellblade: '1-2', runemaster: '1-3',
  sentinel: '2-0', 'void-knight': '2-1', 'forge-guard': '2-2', paladin: '2-3',
  acolyte: '3-0', necromancer: '3-1', lich: '3-2', warlock: '3-3',
  rogue: '4-0', bladedancer: '4-1', marksman: '4-2', falconer: '4-3',
};
const BASE_CLASS = ['Primalist', 'Mage', 'Sentinel', 'Acolyte', 'Rogue'];

function parseArgs(argv) {
  const a = { class: 'spellblade', skills: '', pages: 5, perPage: 50, cycle: 'rage-of-the-frostborn', mode: 'softcore-1p', board: 'corruption', delay: 700, maxAge: 12, headed: false, out: 'leninja.html' };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    if (k === 'headed') { a.headed = true; continue; }
    const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!(key in a)) throw new Error(`Unknown option --${k}`);
    a[key] = typeof a[key] === 'number' ? Number(argv[++i]) : argv[++i];
  }
  a.class = a.class.toLowerCase().replace(/\s+/g, '-');
  if (!CLASSES[a.class]) throw new Error(`Unknown class "${a.class}". Use one of: ${Object.keys(CLASSES).join(', ')}`);
  a.skillList = a.skills ? a.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
  return a;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...m) => console.log(new Date().toLocaleTimeString(), ...m);

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  const cacheDir = path.join(ROOT, '.cache', 'profiles');
  fs.mkdirSync(cacheDir, { recursive: true });

  log(`Launching Edge (${opt.headed ? 'visible' : 'headless'})…`);
  const ctx = await chromium.launchPersistentContext(path.join(ROOT, '.cache', 'browser'), {
    channel: 'msedge', headless: !opt.headed, viewport: { width: 1280, height: 900 },
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  // Skip ads and images; we only need the site's own scripts and data.
  await page.route('**/*', route => {
    const u = route.request().url(), t = route.request().resourceType();
    const ok = u.startsWith(SITE) || /^https:\/\/([^/]*\.)?cloudflare\.com\//.test(u);
    if (!ok || ['image', 'media', 'font'].includes(t)) return route.abort();
    return route.continue();
  });

  try {
    // 1. Ladder page: season title and Cloudflare clearance
    const ladderUrl = `${SITE}/ladders/${opt.cycle}/latest/${opt.mode}/${opt.board}/all/`;
    log('Opening ladder', ladderUrl);
    await page.goto(ladderUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => /Ladder/i.test(document.title), null, { timeout: 60000 })
      .catch(async () => { throw new Error(`Ladder page did not load (page title: "${await page.title()}"). Cloudflare may be challenging the browser; re-run with --headed.`); });
    const seasonTitle = (await page.title()).split(' - ')[0];

    // 2. Ladder data
    const ladder = await page.evaluate(async ({ cycle, mode, board }) => {
      const r = await fetch(`/static_data/ladders/${cycle}/latest/${board}/${mode}.js?${Date.now()}`);
      if (!r.ok) throw new Error('Ladder file returned ' + r.status);
      return (await r.json()).data;
    }, opt);
    log(`Ladder has ${ladder.length} entries`);

    // 3. Any profile page gives us the item database, ability list and ID decoder
    const first = ladder.find(r => r.cls[0] === CLASSES[opt.class]) || ladder[0];
    await page.goto(`${SITE}/profile/${encodeURIComponent(first.account[0])}/character/${encodeURIComponent(first.character[0])}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.itemDB && window.LEAbilities && window.n_xqb, null, { timeout: 60000 })
      .catch(() => { throw new Error('Profile scripts did not load. The site may have changed its internals.'); });
    await page.evaluate(async () => {
      const m = [...document.scripts].map(s => s.src).find(s => /\/data\/version\d+\//.test(s));
      const ver = m ? m.match(/\/data\/(version\d+)\//)[1] : 'version150';
      window.__en = await fetch(`/data/${ver}/i18n/full/en.json`).then(r => r.json());
    });

    // 4. Pick the slice: class, optional skills, first N pages
    const skillIds = await page.evaluate(names => {
      const ab = Object.values(LEAbilities.abilityList);
      return names.map(n => {
        const hit = ab.find(a => (__en[a.nameKey] || '').toLowerCase() === n.toLowerCase());
        if (!hit) throw new Error(`Unknown skill "${n}"`);
        return hit.id;
      });
    }, opt.skillList);
    const slice = ladder
      .filter(r => r.cls[0] === CLASSES[opt.class] && skillIds.every(id => r.abilities[0].includes(id)))
      .slice(0, opt.pages * opt.perPage);
    log(`${slice.length} characters match (${opt.class}${opt.skillList.length ? ' + ' + opt.skillList.join(', ') : ''}, ${opt.pages} pages)`);

    // 5. Characters, one at a time
    const rows = [];
    let fetched = 0, cached = 0, missing = 0, failed = 0;
    const started = Date.now();
    for (let n = 0; n < slice.length; n++) {
      const L = slice[n];
      const account = L.account[0], character = L.character[0];
      const href = `/profile/${encodeURIComponent(account)}/character/${encodeURIComponent(character)}`;
      const cacheFile = path.join(cacheDir, `${account}__${character}.json`.replace(/[<>:"/\\|?*]/g, '_'));
      let prof = null;
      if (fs.existsSync(cacheFile)) {
        const c = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        if (Date.now() - c.at < opt.maxAge * 3600e3) { prof = c.data; cached++; }
      }
      if (!prof) {
        try {
          prof = await page.evaluate(scrapeProfile, href);
          fs.writeFileSync(cacheFile, JSON.stringify({ at: Date.now(), data: prof }));
          fetched++;
          await sleep(opt.delay);
        } catch (e) {
          failed++;
          log(`  ! ${character}: ${e.message.split('\n')[0]}`);
          await sleep(opt.delay * 3);
        }
      }
      const skills = await page.evaluate(ids => ids.map(id => (__en[LEAbilities.abilityList[id]?.nameKey] || id).replace(/''/g, "'")), L.abilities[0]);
      const row = { h: href, a: account, c: character, r: L.rank + 1, s: L.score, l: L.level[0], sk: skills };
      if (prof && !prof.ng) Object.assign(row, { e: prof.e, i: prof.i, f: prof.f });
      else { row.ng = 1; if (prof) missing++; }
      rows.push(row);
      if ((n + 1) % 10 === 0 || n === slice.length - 1) {
        const per = (Date.now() - started) / Math.max(1, fetched);
        const left = slice.length - n - 1;
        log(`  ${n + 1}/${slice.length}  fetched ${fetched}, cached ${cached}, not imported ${missing}, failed ${failed}${left ? `  ~${Math.ceil(left * per / 60000)} min left` : ''}`);
      }
    }

    // 6. Write data and build the page
    const [ci, mi] = CLASSES[opt.class].split('-').map(Number);
    const meta = {
      season: seasonTitle, cycle: opt.cycle, mode: opt.mode, board: opt.board,
      baseClass: BASE_CLASS[ci], mastery: mi ? opt.class.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null,
      skills: opt.skillList, pages: opt.pages, total: rows.length, scrapedAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
    const slug = [opt.cycle, opt.class, ...opt.skillList.map(s => s.toLowerCase().replace(/\W+/g, '-'))].join('_');
    const dataFile = path.join(ROOT, 'data', `${slug}.json`);
    fs.writeFileSync(dataFile, JSON.stringify({ meta, rows }));
    const tpl = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
    const safe = s => JSON.stringify(s).replace(/</g, '\\u003c');
    const html = tpl.replace('<!--DATA-->', `<script id="meta" type="application/json">${safe(meta)}</script>\n<script id="data" type="application/json">${safe(rows)}</script>`);
    fs.writeFileSync(path.join(ROOT, opt.out), html);
    log(`Done in ${Math.round((Date.now() - started) / 1000)}s. ${rows.length} characters, ${rows.length - rows.filter(r => r.ng).length} with gear.`);
    log(`Data: ${path.relative(ROOT, dataFile)}   Page: ${opt.out}`);
  } finally {
    await ctx.close();
  }
}

// Runs inside a lastepochtools profile page. Returns gear, idols and trade faction for one character.
async function scrapeProfile(href) {
  const html = await fetch(href).then(r => { if (!r.ok) throw new Error('profile page ' + r.status); return r.text(); });
  const tok = (html.match(/gv20rd6b\s*=\s*'([0-9a-f]+)'/) || [])[1];
  if (!tok) throw new Error('no profile token in page (site changed or rate limited)');
  const r = await fetch('/api/internal/profile_data/' + tok);
  if (!r.ok) throw new Error('profile_data ' + r.status);
  const d = await r.json();
  if (!d.buildInfo || !d.buildInfo.data) return { ng: 1 };

  const T = k => (k && __en[k] || '').replace(/''/g, "'").trim() || null;
  const U = itemDB.uniqueList.uniques, EQ = itemDB.itemList.equippable;
  const decode = id => {
    const s = n_xqb.Sg(id.slice(1)) || '';
    if (id[0] === 'U') { const u = U[+s.slice(3, 6)]; return { kind: u && u.isSetItem ? 's' : 'u', name: T(u && u.displayNameKey) }; }
    if (id[0] === 'I') { const si = EQ[+s.slice(1, 4)]?.subItems?.[+s.slice(4, 7)]; return { kind: 'b', name: T(si && si.displayNameKey) }; }
    return { kind: '?', name: null };
  };
  const item = e => {
    if (!e || !e.id) return null;
    const dc = decode(e.id), tiers = (e.affixes || []).map(a => a.tier);
    let k = dc.kind;
    if (k === 'u' && tiers.length) k = 'l';
    if (k === 'b') k = tiers.some(t => t >= 6) ? 'e' : 'r';
    return [k, dc.name || 'Unknown item', e.corruptedAffix ? 1 : 0];
  };
  const data = d.buildInfo.data, e = {};
  for (const [slot, it] of Object.entries(data.equipment || {})) { const x = item(it); if (x) e[slot] = x; }
  const fac = d.charInfo && d.charInfo.factions ? JSON.parse(d.charInfo.factions) : {};
  const m = Object.values(fac).find(x => (x.id === 0 || x.id === 1) && x.isMember == 1);
  return { e, i: (data.idols || []).map(item).filter(Boolean), f: m ? [m.id, m.rank] : null };
}

main().catch(e => { console.error('\nScrape failed:', e.message); process.exit(1); });
