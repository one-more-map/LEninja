Browser-side scraper (run in the in-app browser on any lastepochtools.com profile page via javascript_tool):

1. `scrape.js` - edit the `slice` filter (class code e.g. '4-1', ability ids) and run. Fills `window.__full`; ~1 character/sec.
2. `pack.js` - edit `meta`, run once `__fullDone` is true. Produces gzip+base64 `__chunks` with hashes.
3. Copy each chunk to `.cache/<name>.b64.N`, verify hashes, gunzip to `data/<name>.packed.json`,
   then `node unpack-full.cjs data/<dataset>.json data/<name>.packed.json`, `node icons.mjs data/rage-of-the-frostborn_spellblade_surge_firebrand.packed.json`, `node build-all.mjs`.

Class codes: Spellblade 1-2, Void Knight 2-1, Bladedancer 4-1. Skill ids: look up in `LEAbilities.abilityList`.
