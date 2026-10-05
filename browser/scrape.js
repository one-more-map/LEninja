// Scrapes every build in BUILDS in one pass (run in the in-app browser on a lastepochtools.com profile page).
// Ladder file format v2: {s: string table, e: [[score, ?, account, character, classCode, level, [skill idx into s], ...]]},
// sorted by rank. classCode = base*10 + mastery (Spellblade 12, Void Knight 21, Bladedancer 41).
// Results: window.__runs[slug] = {rows, err, done, start}; window.__allDone when finished.
const BUILDS = [
  { slug: 'sb', cls: 12, skills: ['su5g3', 'f1b4d'], limit: 500 },
  { slug: 'vk', cls: 21, skills: ['st31io'], limit: 500 },
  { slug: 'bd', cls: 41, skills: ['dr4sl', 'shiif', 'dagg3'], limit: 500 },
  { slug: 'lich', cls: 32, skills: ['fl44'], limit: 500 },
  { slug: 'pal', cls: 23, skills: ['ht16aw'], limit: 500 },
];
if (!window.__en) window.__en = await fetch('/data/version150/i18n/full/en.json').then(r => r.json());
const T = k => ((__en[k] || '') + '').replace(/''/g, "'").trim();
const U = itemDB.uniqueList.uniques, EQ = itemDB.itemList.equippable, AL = itemDB.affixList, AM = {};
for (const g of ['singleAffixes', 'multiAffixes']) (Array.isArray(AL[g]) ? AL[g] : Object.values(AL[g])).forEach(a => { if (a) AM[a.affixId] = a });
const aff = a => AM[+n_xqb.Sg(a.id.slice(1))]; const mn = f => [aff(f) ? T(aff(f).affixDisplayNameKey) : 'Unknown mod', f.tier];
window.__spr = {}; window.__uq = {}; window.__skspr = {};
const item = e => {
  if (!e || !e.id) return null; const s = n_xqb.Sg(e.id.slice(1)) || ''; const af = e.affixes || [];
  if (e.id[0] === 'U') {
    const u = U[+s.slice(3, 6)]; const n = T(u && u.displayNameKey) || 'Unknown item'; if (u) { __spr[n] = String(u.sprite || '').replace(/^I/, ''); __uq[n] = u }
    const ww = !!u && u.legendaryType == 1; const lp = af.filter(a => { const A = aff(a); return !A || A.specialAffixType != 7 });
    const k = u && u.isSetItem ? 's' : lp.length ? 'l' : 'u';
    // Special affixes (type 7) are the unique's variant, e.g. Unsated Rage's "You have Predator Rage"; not LP
    const vr = af.filter(a => { const A = aff(a); return A && A.specialAffixType == 7 }).map(a => T(aff(a).affixDisplayNameKey)).join(' / ') || null;
    return [k, n, e.corruptedAffix ? 1 : 0, k === 'l' && !ww ? lp.map(mn) : null, null, null, null, vr]
  }
  const si = EQ[+s.slice(1, 4)]?.subItems?.[+s.slice(4, 7)]; const n = T(si && si.displayNameKey) || 'Unknown item'; if (si) __spr[n] = String(si.sprite || '').replace(/^I/, '');
  return [af.some(a => a.tier >= 6) ? 'e' : 'r', n, e.corruptedAffix ? 1 : 0, null, af.map(mn), e.corruptedAffix ? mn(e.corruptedAffix) : null, e.sealedAffix ? mn(e.sealedAffix) : null]
};
const AB = LEAbilities.abilityList;
const SK = id => { const a = AB[id]; const n = a && a.nameKey ? T(a.nameKey) : (id === 'arcas' ? 'Arcane Ascendance' : null); if (n && a && a.abilitySprite) __skspr[n] = +String(a.abilitySprite).replace('a-r-', ''); return n };
const lad = await fetch('/static_data/ladders/rage-of-the-frostborn/latest/corruption/softcore-1p.js?' + Date.now()).then(r => r.json());
const ab = e => e[6].map(i => lad.s[i]);
window.__runs = {}; window.__allDone = false;
const jobs = BUILDS.map(b => {
  const slice = []; lad.e.forEach((e, i) => { if (slice.length < b.limit && e[4] === b.cls && b.skills.every(k => ab(e).includes(k))) slice.push([i, e]) });
  __runs[b.slug] = { rows: [], err: [], done: false, start: Date.now(), total: slice.length };
  return [b, slice];
});
(async () => {
  for (const [b, slice] of jobs) {
    const run = __runs[b.slug]; run.start = Date.now();
    for (const [i, L] of slice) {
      const a = L[2], c = L[3];
      const row = { a, c, r: i + 1, s: L[0], l: L[5], sk: ab(L).map(SK).filter(Boolean) };
      try {
        const html = await fetch(`/profile/${encodeURIComponent(a)}/character/${encodeURIComponent(c)}`).then(r => r.text());
        const tok = (html.match(/gv20rd6b\s*=\s*'([0-9a-f]+)'/) || [])[1]; if (!tok) throw new Error('no token');
        const d = await fetch('/api/internal/profile_data/' + tok).then(r => { if (!r.ok) throw new Error('pd ' + r.status); return r.json() }); const data = d.buildInfo?.data;
        if (!data) row.ng = 1; else {
          const e = {}; for (const [s, v] of Object.entries(data.equipment || {})) { const x = item(v); if (x) e[s] = x }
          const fac = d.charInfo && d.charInfo.factions ? JSON.parse(d.charInfo.factions) : {}; const m = Object.values(fac).find(x => (x.id === 0 || x.id === 1) && x.isMember == 1);
          Object.assign(row, {
            l: d.buildInfo.level || row.l, f: m ? [m.id, m.rank] : null, e, i: (data.idols || []).filter(v => v && v.id).map(item),
            sp: (data.skillTrees || []).slice().sort((x, y) => x.slotNumber - y.slotNumber).map(t => [SK(t.treeID), t.level]).filter(x => x[0]), hb: [...new Set((data.hud || []).map(SK).filter(Boolean))]
          })
        }
      } catch (err) { row.ng = 1; run.err.push([c, String(err)]) }
      run.rows.push(row); await new Promise(r => setTimeout(r, 800));
    }
    run.done = true;
  }
  __allDone = true;
})();
Object.fromEntries(Object.entries(__runs).map(([k, v]) => [k, v.total]))
