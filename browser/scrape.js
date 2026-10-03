const T=k=>((__en[k]||'')+'').replace(/''/g,"'").trim();
const U=itemDB.uniqueList.uniques,EQ=itemDB.itemList.equippable,AL=itemDB.affixList,AM={};
for(const g of ['singleAffixes','multiAffixes'])(Array.isArray(AL[g])?AL[g]:Object.values(AL[g])).forEach(a=>{if(a)AM[a.affixId]=a});
const aff=a=>AM[+n_xqb.Sg(a.id.slice(1))]; const mn=f=>[aff(f)?T(aff(f).affixDisplayNameKey):'Unknown mod',f.tier+1];
window.__spr={}; window.__uq={};
const item=e=>{if(!e||!e.id)return null;const s=n_xqb.Sg(e.id.slice(1))||'';const af=e.affixes||[];
 if(e.id[0]==='U'){const u=U[+s.slice(3,6)];const n=T(u&&u.displayNameKey)||'Unknown item';if(u){__spr[n]=String(u.sprite||'').replace(/^I/,'');__uq[n]=u}
  const ww=!!u&&u.legendaryType==1;const lp=af.filter(a=>{const A=aff(a);return !A||A.specialAffixType!=7});
  const k=u&&u.isSetItem?'s':lp.length?'l':'u';return[k,n,e.corruptedAffix?1:0,k==='l'&&!ww?lp.map(mn):null,null,null,null]}
 const si=EQ[+s.slice(1,4)]?.subItems?.[+s.slice(4,7)];const n=T(si&&si.displayNameKey)||'Unknown item';if(si)__spr[n]=String(si.sprite||'').replace(/^I/,'');
 return[af.some(a=>a.tier+1>=6)?'e':'r',n,e.corruptedAffix?1:0,null,af.map(mn),e.corruptedAffix?mn(e.corruptedAffix):null,e.sealedAffix?mn(e.sealedAffix):null]};
const AB=LEAbilities.abilityList; window.__skspr={};
const SK=id=>{const a=AB[id];const n=a&&a.nameKey?T(a.nameKey):(id==='arcas'?'Arcane Ascendance':null);if(n&&a&&a.abilitySprite)__skspr[n]=+String(a.abilitySprite).replace('a-r-','');return n};
const lad=(await fetch('/static_data/ladders/rage-of-the-frostborn/latest/corruption/softcore-1p.js?'+Date.now()).then(r=>r.json())).data;
const slice=lad.filter(r=>r.cls[0]==='4-1'&&['dr4sl','shiif','dagg3'].every(i=>r.abilities[0].includes(i))).slice(0,200);
window.__full=[]; window.__fullErr=[]; window.__fullDone=false; window.__fullStart=Date.now();
(async()=>{for(const L of slice){const a=L.account[0],c=L.character[0];
 const row={a,c,r:L.rank+1,s:L.score,l:L.level[0],sk:L.abilities[0].map(SK).filter(Boolean)};
 try{const html=await fetch(`/profile/${encodeURIComponent(a)}/character/${encodeURIComponent(c)}`).then(r=>r.text());const tok=(html.match(/gv20rd6b\s*=\s*'([0-9a-f]+)'/)||[])[1];if(!tok)throw new Error('no token');
  const d=await fetch('/api/internal/profile_data/'+tok).then(r=>{if(!r.ok)throw new Error('pd '+r.status);return r.json()});const data=d.buildInfo?.data;
  if(!data)row.ng=1;else{const e={};for(const[s,v]of Object.entries(data.equipment||{})){const x=item(v);if(x)e[s]=x}
   const fac=d.charInfo&&d.charInfo.factions?JSON.parse(d.charInfo.factions):{};const m=Object.values(fac).find(x=>(x.id===0||x.id===1)&&x.isMember==1);
   Object.assign(row,{l:d.buildInfo.level||row.l,f:m?[m.id,m.rank]:null,e,i:(data.idols||[]).filter(v=>v&&v.id).map(item),
    sp:(data.skillTrees||[]).slice().sort((x,y)=>x.slotNumber-y.slotNumber).map(t=>[SK(t.treeID),t.level]).filter(x=>x[0]),hb:[...new Set((data.hud||[]).map(SK).filter(Boolean))]})}
 }catch(err){row.ng=1;__fullErr.push([c,String(err)])}
 __full.push(row); await new Promise(r=>setTimeout(r,800));}
 __fullDone=true;})();
({matched:slice.length})