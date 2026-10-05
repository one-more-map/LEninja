# LE Ninja

A poe.ninja-style build explorer for Last Epoch ladders: gear usage by slot, Legendary Potential, skills, trade factions and a "compare with my character" view, built as a single static HTML page.

Data comes from lastepochtools.com (ladder file, character profiles and item database). Item and skill art belongs to Eleventh Hour Games. This is a private prototype; check with lastepochtools and EHG's fan content policy before publishing data or art.

## Pages

- `leninja.html`: the built page (frost theme)
- `leninja-ingame.html`: alternate build styled after the in-game UI
- `template.html` / `template-ingame.html`: page templates the build fills with data

## Rebuilding

The scrape runs in a browser session on lastepochtools (automated/headless access is blocked). It produces `data/full.packed.json`; then:

```
npm install
node unpack-full.cjs data/rage-of-the-frostborn_spellblade_surge_firebrand.json
node icons.mjs data/rage-of-the-frostborn_spellblade_surge_firebrand.packed.json
node build.mjs data/rage-of-the-frostborn_spellblade_surge_firebrand.json
```

`build.mjs` takes optional `[out.html] [template.html]` arguments, e.g. `node build.mjs <data> leninja-ingame.html template-ingame.html`.

## Files

- `build.mjs`: data + template + icons -> HTML (output is pure ASCII)
- `icons.mjs`: cuts item and skill icons from the lastepochtools sprite sheets
- `unpack-full.cjs`: turns a full browser export into the dataset and updates sprite/odds lists
- `merge-*.cjs`: older incremental merges (LP, idols, exalted mods, refresh)
- `scrape.mjs`: headless scraper (blocked by lastepochtools with a 403; kept for reference)
- `data/`: datasets, sprite maps, LP odds and embedded icons

## Retired (2026-10-06)

The public site now points to https://www.lastepochtools.com/ladders/ (the Last Epoch Tools developer is building these features in). `node retire.mjs` writes that notice to index.html and turns every other page into a redirect to it. Templates, data and scripts are unchanged: `node build-all.mjs` restores the full site.
