// Retires the public site: index.html becomes one big link to the Last Epoch Tools ladders (which are getting
// these features), and every other generated page just forwards to it, so old shared links land there too.
// Templates, data and build scripts are untouched; run `node build-all.mjs` to bring the full site back.
//   node retire.mjs
import fs from 'node:fs';

const TARGET = 'https://www.lastepochtools.com/ladders/';
const keep = f => f === 'index.html' || f === 'template.html' || f.endsWith('-template.html') || f.startsWith('template-');

const index = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LE Ninja</title>
<script data-goatcounter="https://leninja.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600&family=Barlow:wght@400;500&display=swap">
<style>
:root{color-scheme:dark;--void:#070a10;--gold:#c9a45c;--gold-dim:#5e4c2c;--gold-hi:#efd59a;--rift:#62d6ea;--frost:#a9e6f2;--dim:#8a95a8;--faint:#5b6577}
*{box-sizing:border-box}
html,body{height:100%;margin:0}
body{background:var(--void);color:var(--dim);font-family:"Barlow",system-ui,sans-serif;display:grid;place-items:center;padding:24px 16px;
  background-image:radial-gradient(700px 320px at 50% 60%,rgba(98,214,234,.12),transparent 70%),radial-gradient(900px 320px at 50% 0,rgba(201,164,92,.08),transparent 70%)}
main{max-width:760px;text-align:center}
.brand{font-family:"Cinzel",Georgia,serif;font-weight:600;letter-spacing:.14em;font-size:14px;color:var(--gold)}
a.go{display:block;margin:22px 0;padding:clamp(28px,6vw,56px) clamp(18px,4vw,40px);border:1px solid var(--gold);border-radius:4px;text-decoration:none;
  font-family:"Cinzel",Georgia,serif;font-weight:600;font-size:clamp(28px,6vw,54px);line-height:1.1;letter-spacing:.04em;text-wrap:balance;
  color:var(--gold-hi);background:linear-gradient(180deg,rgba(201,164,92,.10),rgba(201,164,92,.02));box-shadow:0 0 60px rgba(98,214,234,.08);transition:border-color .15s,box-shadow .15s}
a.go:hover,a.go:focus-visible{border-color:var(--gold-hi);box-shadow:0 0 80px rgba(98,214,234,.18);outline:none}
a.go span{display:block;margin-top:14px;font-family:"Barlow",system-ui,sans-serif;font-weight:500;font-size:clamp(15px,2.4vw,19px);letter-spacing:0;color:var(--frost)}
p{margin:0 auto;max-width:56ch;font-size:16px;line-height:1.5;text-wrap:balance}
</style>
<main>
  <div class="brand">LE NINJA</div>
  <a class="go" href="${TARGET}">Go to the Last Epoch Tools ladders &rarr;<span>lastepochtools.com/ladders</span></a>
  <p>The Last Epoch Tools developer has seen what LE Ninja was doing, and these features are being built into Last Epoch Tools shortly. Thanks to everyone who checked it out.</p>
</main>
`;
fs.writeFileSync('index.html', index);

// Every other page forwards to the notice
const stub = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LE Ninja</title>
<meta http-equiv="refresh" content="0; url=index.html">
<link rel="canonical" href="index.html">
<a href="index.html">LE Ninja has moved &rarr;</a>
`;
const pages = fs.readdirSync('.').filter(f => f.endsWith('.html') && !keep(f));
pages.forEach(f => fs.writeFileSync(f, stub));
console.log(`index.html is the notice; ${pages.length} pages forward to it`);
