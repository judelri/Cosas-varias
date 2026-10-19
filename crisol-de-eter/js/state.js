// Crisol de Éter — Estado guardado, utilidades, iconos pixelados y mecánicas (escaneo, crisol, flux, investigación).
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Estado ================= */
const KEY = "crisol-eter-3d-v1";
// bl: bloques para poner · sel: bloque elegido · placed: bloques puestos por el jugador · time: hora (0 amanecer, .5 anochecer)
// res: recetas investigadas · rsch: investigación en curso
const fresh = () => ({inv:{},scanned:[],cru:{},flux:5,world:{},resp:{},mined:0,rifts:0,won:false,player:null,
  bl:{},sel:0,placed:{},time:.06,mute:false,res:["sal","tiza"],rsch:null});
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch(e) {}
for (const k of Object.keys(S.inv)) if (!(S.inv[k]>0)) delete S.inv[k];
if (Array.isArray(S.resp)) S.resp = Object.fromEntries(S.resp.map(r=>[r.k,{id:r.id,t:r.t}])); // antes era una lista
// partidas de antes de la investigación: lo que ya forjaste queda investigado
S.scanned.forEach(i=>{ if((CRU.some(r=>r.id===i)||INF.some(r=>r.id===i)) && !S.res.includes(i)) S.res.push(i); });
if (window.claude?.hot?.data?.S) S = window.claude.hot.data.S;
window.claude?.hot?.snapshot?.(() => ({S}));
// En una partida en equipo (js/net.js) lo compartido vive en el servidor: aquí solo se guarda lo personal
let teamMode=false;
const save = () => { try { localStorage.setItem(teamMode?KEY+"-equipo":KEY, JSON.stringify(teamMode?{player:S.player,sel:S.sel,mute:S.mute}:S)); } catch(e) {} };

const $ = id => document.getElementById(id);
// cambia el HTML solo si es distinto: así no se reinician imágenes ni animaciones al refrescar
const setHTML = (el,h) => { if(el._h!==h){ el._h=h; el.innerHTML=h; } };
const sum = o => Object.values(o).reduce((a,b)=>a+b,0);
const rnd = n => Math.floor(Math.random()*n);
const has = id => (S.inv[id]||0);
const take = (id,n=1) => { S.inv[id]=(S.inv[id]||0)-n; if(!(S.inv[id]>0)) delete S.inv[id]; };
const give = (id,n=1) => { S.inv[id]=(S.inv[id]||0)+n; };
const h2a = h => [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
function sig(id,size=15){ const s=ESS[id]; return `<svg class="sig" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${PATHS[s.s]}" fill="none" stroke="${s.c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function known(){ const k=new Set(); S.scanned.forEach(i=>Object.keys(ITEMS[i].e).forEach(e=>k.add(e))); return k; }
function chip(id,n,have){ const K=known(); if(!K.has(id)) return `<span class="chip unk">??? <b>${n}</b></span>`; const short=have!==undefined&&have<n; return `<span class="chip${short?" short":""}">${sig(id)}<b>${have!==undefined?`${have}/${n}`:n}</b> ${ESS[id].n}</span>`; }
const itemColor = id => ESS[Object.keys(ITEMS[id].e)[0]].c;
/* iconos pixelados de los materiales (16×16) */
const ICONC={}, ICON={};
(function(){
  const nz=(x,y,s=0)=>{ const v=Math.sin(x*12.9898+y*78.233+s*37.7)*43758.5453; return v-Math.floor(v); };
  const sh=(hex,f)=>{ const n=parseInt(hex.slice(1),16); const c=v=>Math.max(0,Math.min(255,Math.round(v*f))); return `rgb(${c(n>>16)},${c(n>>8&255)},${c(n&255)})`; };
  function mk(mask,col){
    const c=document.createElement("canvas"); c.width=c.height=16; const g2=c.getContext("2d"); const m=[];
    for(let y=0;y<16;y++) for(let x=0;x<16;x++) m[y*16+x]=mask(x+.5,y+.5)?1:0;
    const on=(x,y)=>x>=0&&y>=0&&x<16&&y<16&&m[y*16+x];
    for(let y=0;y<16;y++) for(let x=0;x<16;x++){
      if(on(x,y)){ g2.fillStyle=col(x+.5,y+.5,x,y); g2.fillRect(x,y,1,1); }
      else if(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1)){ g2.fillStyle="#140f18"; g2.fillRect(x,y,1,1); }
    }
    return c;
  }
  const lump=(base,spot,sp=.82)=>mk((x,y)=>((x-8)/6.2)**2+((y-9)/5)**2<1-nz(x,y)*.22,
    (x,y,i,j)=> spot&&nz(i,j,3)>sp ? sh(spot,.9+nz(i,j,5)*.25) : sh(base,(1.18-(y-4)/14)*(.92+nz(i,j,1)*.16)));
  const crystal=(base)=>mk((x,y)=>{ const u=(x-8)*.7+(y-8)*.7, v=-(x-8)*.7+(y-8)*.7; return Math.abs(u)/7+Math.abs(v)/4<1; },
    (x,y)=>{ const v=-(x-8)*.7+(y-8)*.7; return sh(base, v<-.6?1.25: v<.6?1:.72); });
  const dust=(base,spk)=>mk((x,y)=>y>=6&&y<14.6&&((x-8)/7)**2+((y-14.6)/8.4)**2<1,
    (x,y,i,j)=> nz(i,j,2)>.82 ? sh(spk,1) : sh(base,(1.12-(y-7)/18)*(.93+nz(i,j,4)*.14)));
  const drop=(base)=>mk((x,y)=> y<9 ? (y>2&&Math.abs(x-8)<(y-2)*.62) : ((x-8)/4.8)**2+((y-10.3)/4.6)**2<1,
    (x,y)=> (x-6.3)**2+(y-10)**2<1.6 ? "#e6f2ff" : sh(base,1.15-(y-3)/20));
  const flame=(outer,mid,core)=>mk((x,y)=>{ const yy=16-y; return yy<9 ? (yy>2&&Math.abs(x-8)<(yy-2)*.62) : ((x-8)/4.8)**2+((yy-10.3)/4.6)**2<1; },
    (x,y)=>{ const d=Math.hypot(x-8,(y-10)*.8); return d<1.8?core:d<3.3?mid:outer; });
  const C={};
  C.piedra=lump("#8a8890"); C.carbon=lump("#3a3640","#15121a",.7); C.hierro=lump("#8a8890","#e0a878",.7);
  C.obsidiana=lump("#2a1d3a","#8a5ab8",.86); C.corrupta=lump("#6a3a80","#2a1638",.75);
  C.cuarzo=crystal("#ece7da"); C.chispa=crystal("#59d0d6");
  C.ceniza=dust("#6d6178","#b4a2c4"); C.sal=dust("#e9e6df","#ffffff");
  C.agua=drop("#4f8ad6");
  C.ambar=mk((x,y)=>((x-8)/5)**2+((y-8.5)/5.6)**2<1,(x,y)=>(x-6.5)**2+(y-6.5)**2<2?"#fff1b8":sh("#e8a33a",1.15-(y-3)/16));
  C.semilla=mk((x,y)=>[[5,10.5,1],[10.5,5.5,-1],[11,12,1]].some(([a,b,r])=>{ const u=(x-a)*.7+(y-b)*.7*r, v=-(x-a)*.7*r+(y-b)*.7; return (u/3)**2+(v/1.9)**2<1; }),(x,y)=>sh("#b8904e",1.05+((x+y)%4<1?.2:0)));
  C.pluma=mk((x,y)=>{ const t=((x-3)+(13-y))/20; const d=Math.abs((x-3)-(13-y))/1.414; return t>0&&t<1&&d<2.8*Math.sin(Math.PI*t)+.4; },
    (x,y)=>{ const d=Math.abs((x-3)-(13-y))/1.414; return d<.7?"#7a8a80":sh("#dce8e0",(Math.floor(x+y)%3?1:.86)); });
  C.tiza=mk((x,y)=>{ const t=Math.max(0,Math.min(1,((x-4)*8+(12-y)*8)/128)); return Math.hypot(x-(4+8*t),y-(12-8*t))<1.7; },(x,y)=>sh("#f2efe6",x<7?.88:1.05));
  C.laton=mk((x,y)=>y>=4.5&&y<12.5&&x>=1.5+(12.5-y)*.55&&x<14.5-(12.5-y)*.55,(x,y)=>sh("#d4a94c",y<6.5?1.3:y>11?.8:1));
  C.vela=mk((x,y)=>(x>=6&&x<10&&y>=7&&y<15)||(x>=7.5&&x<8.5&&y>=5&&y<7)||(((x-8)/1.6)**2+((y-3.4)/2.2)**2<1),
    (x,y)=> y<5.5 ? (Math.abs(x-8)<.8&&y>2.5?"#fff2a0":"#f0a03c") : y<7 ? "#2a2020" : sh("#f2d36b",x<7.5?1.15:.95));
  C.vial=mk((x,y)=>(x>=6.5&&x<9.5&&y>=2&&y<6)||((x-8)**2+(y-10.5)**2<4.8**2),
    (x,y)=> y<4 ? "#8a6b3f" : y<6 ? "#cfe3ee" : y>9.5 ? sh("#7476a8",(x<7?1.3:1)) : "#bcd2c4");
  C.fenix=flame("#e0743c","#f2b13c","#9fe07a");
  C.lente=mk((x,y)=>Math.hypot(x-8,y-8)<5.6,(x,y)=>{ const r=Math.hypot(x-8,y-8); return r>3.6?sh("#cfa75a",r>4.6?.8:1.1):(x+y<14?"#e8f6ff":"#9cc3e6"); });
  C.amuleto=mk((x,y)=>{ const r=Math.hypot(x-8,y-5.5); const chain=y<7&&r>3.8&&r<5; const hex=Math.abs(x-8)<4&&Math.abs(y-11)+Math.abs(x-8)*.5<4; return chain||hex; },
    (x,y)=> y<7.5 ? "#cfa75a" : (Math.abs(x-8)<2.2&&Math.abs(y-11)<2.2 ? sh("#7fbf5a",1.15) : "#cfa75a"));
  C.corazon=mk((x,y)=>Math.abs(x-8)+Math.abs(y-8)<7.2,(x,y)=>{ if(Math.abs(x-8)+Math.abs(y-8)<2) return "#ffffff"; const q=(x<8?0:1)+(y<8?0:2); return sh(["#f2d36b","#59d0d6","#7fbf5a","#7476a8"][q],1.1-(Math.abs(x-8)+Math.abs(y-8))/20); });
  for(const id of Object.keys(ITEMS)){ ICONC[id]=C[id]||lump(itemColor(id)); ICON[id]=ICONC[id].toDataURL(); }
})();
const icon = (id,cls="ic") => `<img class="${cls}" src="${ICON[id]}" alt="${ITEMS[id].n}" title="${ITEMS[id].n}">`;
function pick(m,k="",html){ const d=document.createElement("div"); d.className="pk "+k; if(html) d.innerHTML=html; else d.textContent=m; const p=$("picks"); p.appendChild(d); while(p.children.length>4) p.firstChild.remove(); setTimeout(()=>d.remove(),2700); }

/* ================= Mecánicas ================= */
function addFlux(n, why){
  if (n<=0) return;
  if (has("amuleto")) n = Math.ceil(n/2);
  S.flux += n; pick(`+${n} flux · ${why}`,"f");
  if (S.flux >= 100) rift();
  hud();
}
function rift(){
  sfx("rift"); S.rifts++; S.flux = 60; S.cru = {};
  const pool = Object.keys(S.inv).filter(i=>i!=="corazon"); const lost=[];
  for (let k=0;k<2&&pool.length;k++){ const p=pool[rnd(pool.length)]; take(p); lost.push(ITEMS[p].n); if(!has(p)) pool.splice(pool.indexOf(p),1); }
  pick("¡Se abrió una grieta! El crisol se vació"+(lost.length?" y perdiste "+lost.join(", "):""),"f"); teamSay("abrió una grieta: el crisol se vació");
  $("flash").style.opacity=.55; setTimeout(()=>$("flash").style.opacity=0,250); shake=.8;
}
let scanT;
function scanItems(ids){
  const before=known(), nuevosItems=[];
  ids.forEach(i=>{ if(!S.scanned.includes(i)){ S.scanned.push(i); nuevosItems.push(i); } });
  sfx("scan");
  const K=known(), nuevas=[...K].filter(e=>!before.has(e));
  const rows=ids.map(id=>{ const it=ITEMS[id], nw=nuevosItems.includes(id);
    return `<div class="srow">${icon(id,"ic lg")}<div style="min-width:0"><b>${it.n}</b><span class="tag${nw?" new":""}">${nw?"Nuevo":"Ya conocido"}</span>
      <div class="chips">${Object.entries(it.e).map(([e,n])=>`<span class="chip${nuevas.includes(e)?" nw":""}">${sig(e,18)}<b>${n}</b> ${ESS[e].n}</span>`).join("")}</div></div></div>`; }).join("");
  const desc=nuevas.map(e=>{ const E=ESS[e]; const f=E.from&&E.from.every(x=>K.has(x)) ? ` = ${sig(E.from[0],13)}${ESS[E.from[0]].n} + ${sig(E.from[1],13)}${ESS[E.from[1]].n}` : E.from ? " (compuesta)" : " (primal)"; return `<span>${sig(e,16)}<b>${E.n}</b>${f}</span>`; }).join("");
  let card=$("scard"); if(!card){ card=document.createElement("div"); card.id="scard"; card.className="scard"; card.addEventListener("click",()=>card.hidden=true); document.body.appendChild(card); }
  card.innerHTML=`<div class="sh">Escaneo${nuevas.length?` · ${nuevas.length===1?"esencia nueva":nuevas.length+" esencias nuevas"}`:""}</div>${rows}${nuevas.length?`<div class="snew">${desc}</div>`:""}`;
  card.hidden=false; card.style.animation="none"; void card.offsetWidth; card.style.animation="";
  clearTimeout(scanT); scanT=setTimeout(()=>card.hidden=true, nuevas.length?6000:4000);
  return nuevosItems.length>0;
}
function dissolve(id){
  take(id);
  for (const [e,n] of Object.entries(ITEMS[id].e)) S.cru[e]=(S.cru[e]||0)+n;
  crucibleSplash(ITEMS[id].e); sfx("dissolve");
  let over = sum(S.cru)-CAP;
  if (over>0){ const ex=over; while(over-->0){ const ks=Object.keys(S.cru); const k=ks[rnd(ks.length)]; if(--S.cru[k]<=0) delete S.cru[k]; } addFlux(ex,"el crisol se desbordó"); }
}
const canCat = r => researched(r.id) && has(r.cat)>0 && Object.entries(r.cost).every(([e,n])=>(S.cru[e]||0)>=n);
function catalyze(rid){
  const r=CRU.find(x=>x.id===rid); if(!canCat(r)) return;
  take(r.cat); for(const [e,n] of Object.entries(r.cost)){ S.cru[e]-=n; if(S.cru[e]<=0) delete S.cru[e]; }
  give(r.id); if(!S.scanned.includes(r.id)) S.scanned.push(r.id);
  pick(`El crisol forjó: ${ITEMS[r.id].n}`,"g"); crucibleSplash({luz:4,orden:4}); sfx("forge"); teamSay(`forjó ${ITEMS[r.id].n} en el crisol`);
}
function emptyCru(){ const t=sum(S.cru); S.cru={}; sfx("water"); addFlux(Math.ceil(t/3),"esencia derramada"); }
function useSal(){ take("sal"); const d=Math.min(25,S.flux); S.flux-=d; pick(`Sal purificadora: −${d} flux`,"g"); sfx("forge"); }
function infNeeds(r){ const n={}; [r.center,...r.peds].forEach(i=>n[i]=(n[i]||0)+1); return n; }
function stabilizers(r){ return Math.max(0, Math.min(2, has("vela")-(infNeeds(r).vela||0))); }
function instability(r){ return Math.max(5, Math.min(90, r.peds.length*8 + Math.round(sum(r.cost)/2) - stabilizers(r)*15)); }
const canInfuse = r => researched(r.id) && Object.entries(infNeeds(r)).every(([i,n])=>has(i)>=n) && Object.entries(r.cost).every(([e,n])=>(S.cru[e]||0)>=n);

/* ================= Investigación ================= */
// Cada receta resuena con una secuencia secreta de esencias, sacada de su costo y de su catalizador (o centro).
// Se descifra en la estantería del taller probando secuencias: 2 = en su lugar, 1 = está en otro lugar, 0 = no está.
const recipe = id => CRU.find(r=>r.id===id) || INF.find(r=>r.id===id);
const researched = id => S.res.includes(id);
function resPool(r){ const s=new Set([...Object.keys(r.cost),...Object.keys(ITEMS[r.cat||r.center].e)]); return ESS_ORDER.filter(e=>s.has(e)); }
const resLen = r => r.cat ? 3 : 4;
const resTries = r => r.cat ? 5 : r.final ? 7 : 6;
const canResearch = r => !researched(r.id) && resPool(r).every(e=>known().has(e));
function startResearch(id){
  const r=recipe(id); if(S.rsch||!canResearch(r)||!has("pluma")) return;
  take("pluma"); const pool=resPool(r);
  S.rsch={id,secret:Array.from({length:resLen(r)},()=>pool[rnd(pool.length)]),guesses:[],cur:[]}; sfx("scan");
}
function resFeedback(secret,guess){
  const fb=guess.map((e,i)=>e===secret[i]?2:0), left={};
  secret.forEach((e,i)=>{ if(fb[i]!==2) left[e]=(left[e]||0)+1; });
  guess.forEach((e,i)=>{ if(fb[i]!==2&&left[e]){ fb[i]=1; left[e]--; } });
  return fb;
}
function guessResearch(){
  const R=S.rsch; if(!R) return; const r=recipe(R.id); if(R.cur.length<resLen(r)) return;
  const fb=resFeedback(R.secret,R.cur); R.guesses.push({g:R.cur,fb}); R.cur=[];
  if(fb.every(v=>v===2)){ S.res.push(R.id); S.rsch=null; pick(`Investigación completa: ya puedes forjar ${ITEMS[r.id].n}`,"g"); sfx("success"); teamSay(`descifró la receta de ${ITEMS[r.id].n}`); return; }
  if(R.guesses.length>=resTries(r)){ S.rsch=null; pick("La nota se emborronó y la resonancia se perdió","f"); sfx("fail"); addFlux(3,"investigación fallida"); return; }
  sfx("pulse");
}
function quitResearch(){ if(!S.rsch) return; S.rsch=null; pick("Abandonaste la nota"); sfx("fail"); }

