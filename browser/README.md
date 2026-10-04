Taking a new snapshot (run in the in-app browser on any lastepochtools.com profile page via javascript_tool):

1. `scrape.js` - edit `BUILDS` if needed (class code, ladder skill ids, limit) and run. Scrapes every build in one pass
   into `window.__runs[slug]`; about 1-2 characters/sec.
2. `pack.js` - set `SLUG`, run once that build is done. Gives gzip+base64 chunks plus hashes.
3. Copy each chunk to `.cache/<name>.b64.N`, then `node browser/receive.cjs <name> <jsonHash> <chunkHashes...>`
   which writes `data/<name>.packed.json`.
4. `node unpack-full.cjs data/snapshots/<build-slug>/<YYYY-MM-DDTHHMM>.json data/<name>.packed.json`
5. `node icons.mjs data/rage-of-the-frostborn_spellblade_surge_firebrand.packed.json` then `node build-all.mjs`.

Every file in `data/snapshots/<build-slug>/` becomes a snapshot: oldest = Day 1, each gets `<page>-dayN.html`,
and the build's main page always shows the newest. Builds are listed in `builds.json`.

Ladder file (v2): `{s: string table, e: [[score, ?, account, character, classCode, level, [skill idx into s], ...]]}`,
sorted by rank. classCode = base*10 + mastery: Spellblade 12, Void Knight 21, Bladedancer 41.
Skill ids: look up in `LEAbilities.abilityList` (Surge su5g3, Firebrand f1b4d, Shield Throw st31io,
Dreamslash dr4sl, Shift shiif, Shadow Cascade dagg3).
