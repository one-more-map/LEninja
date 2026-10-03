while(!__fullDone) await new Promise(r=>setTimeout(r,500));
const s=[],si=new Map(),S=v=>{if(!si.has(v)){si.set(v,s.length);s.push(v)}return si.get(v)};
const m=x=>[S(x[0]),x[1]];
const it=x=>[x[0],S(x[1]),x[2],x[3]?x[3].map(m):0,x[4]?x[4].map(m):0,x[5]?m(x[5]):0,x[6]?m(x[6]):0];
const rows=__full.map(r=>[r.a,r.c,r.r,r.s,r.l,r.sk.map(S),r.ng?0:(r.f||0),r.ng?0:r.sp.map(m),r.ng?0:r.hb.map(S),r.ng?0:Object.fromEntries(Object.entries(r.e).map(([k,x])=>[k,it(x)])),r.ng?0:r.i.map(it)]);
const spr={};for(const[n,v]of Object.entries(__spr))if(si.has(n)&&v)spr[si.get(n)]=v;
const EQ=itemDB.itemList.equippable,IDOL=[25,26,27,28,29,30,31,32,33],odds={};
for(const[n,u]of Object.entries(__uq)){let lvl=u.levelRequirement;if(!u.overrideLevelRequirement){const x=EQ[u.baseTypeId]?.subItems?.[(u.subTypeIds||[])[0]];if(x)lvl=x.levelRequirement}lvl=lvl||0;
 const why=u.isSetItem||u.setId?'set':u.legendaryType==1?'weavers will':IDOL.includes(u.baseTypeId)?'idol':lvl>=120?'level':null;
 odds[n]=why||[lvl,uniqueMinLP[u.uniqueId]||0,...n_xob(lvl,uniqueMinLP[u.uniqueId]||0).map(p=>+p.toPrecision(4))]}
const meta={baseClass:'Rogue',mastery:'Bladedancer',cls:'4-1',skills:['Dreamslash','Shift','Shadow Cascade'],pages:4};
window.__fp=JSON.stringify({scrapedAt:new Date(__fullStart).toISOString(),meta,s,rows,spr,skspr:__skspr,odds});
const cs=new Blob([__fp]).stream().pipeThrough(new CompressionStream('gzip'));const buf=new Uint8Array(await new Response(cs).arrayBuffer());
let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode(...buf.subarray(i,i+8192));window.__fz=btoa(bin);
const hs=str=>{let h=0;for(const c of str)h=(h*31+c.codePointAt(0))|0;return h};
window.__chunks=[];for(let i=0;i<__fz.length;i+=11600)__chunks.push(__fz.slice(i,i+11600));
({json:__fp.length, b64:__fz.length, chunks:__chunks.length, hashes:__chunks.map(c=>[c.length,hs(c)]), jsonHash:hs(__fp), gear:__full.filter(r=>!r.ng).length, err:__fullErr.length})