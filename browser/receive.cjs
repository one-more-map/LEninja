// Joins chunks copied from the browser (.cache/<name>.b64.1..N), checks them against pack.js's hashes,
// gunzips and writes data/<name>.packed.json.
//   node browser/receive.cjs <name> <jsonHash> <chunkHash1> <chunkHash2> ...
const fs = require('fs'), zlib = require('zlib');
const [, , name, jsonHash, ...hashes] = process.argv;
const H = s => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) | 0; return h };
let ok = true;
const parts = hashes.map((want, i) => {
  const s = fs.readFileSync(`.cache/${name}.b64.${i + 1}`, 'utf8').trim();
  const good = H(s) === +want; ok = ok && good;
  console.log(`chunk ${i + 1}: ${s.length} chars ${good ? 'ok' : 'MISMATCH'}`);
  return s;
});
if (!ok) process.exit(1);
const json = zlib.gunzipSync(Buffer.from(parts.join(''), 'base64')).toString('utf8');
if (H(json) !== +jsonHash) { console.log('JSON hash MISMATCH'); process.exit(1); }
fs.writeFileSync(`data/${name}.packed.json`, json);
console.log(`data/${name}.packed.json: ${json.length} chars, verified`);
