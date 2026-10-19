// Crisol de Éter — Jugador, física, raycast, picar/poner/usar/escanear e infusión en el altar.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Jugador ================= */
const P = Object.assign({x:24.5,y:8,z:27.5,yaw:0,pitch:-.12}, S.player||{}); P.vy=0; P.ground=false; P.kx=0; P.kz=0;
const RAD=.3, HT=1.75, EYE=1.6;
function solidAt(x,y,z){ const id=getB(x,y,z); return id===-1 || (id>0 && !B[id].water && !B[id].plant); }
function collides(px,py,pz){
  for(let x=Math.floor(px-RAD);x<=Math.floor(px+RAD);x++) for(let y=Math.floor(py);y<=Math.floor(py+HT-.001);y++) for(let z=Math.floor(pz-RAD);z<=Math.floor(pz+RAD);z++) if(solidAt(x,y,z)) return true;
  return false;
}
// ¿la celda toca el cuerpo del jugador?
const inBody=(x,y,z)=>x>=Math.floor(P.x-RAD)&&x<=Math.floor(P.x+RAD)&&z>=Math.floor(P.z-RAD)&&z<=Math.floor(P.z+RAD)&&y>=Math.floor(P.y)&&y<=Math.floor(P.y+HT-.001);
const keys={}; let mining=false, using=false, jumpBtn=false, joy={x:0,y:0}, shake=0, mine={k:null,p:0}, target=null, useCd=0;
let panel=null, busy=null, locked=false;
const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
if(isTouch) document.body.classList.add("touch");

function raycast(reach=5.5){
  const o=camera.position, d=new THREE.Vector3(); camera.getWorldDirection(d);
  let x=Math.floor(o.x),y=Math.floor(o.y),z=Math.floor(o.z);
  const sx=Math.sign(d.x),sy=Math.sign(d.y),sz=Math.sign(d.z);
  const tdx=d.x?Math.abs(1/d.x):Infinity,tdy=d.y?Math.abs(1/d.y):Infinity,tdz=d.z?Math.abs(1/d.z):Infinity;
  let tmx=sx>0?(x+1-o.x)*tdx:(o.x-x)*tdx, tmy=sy>0?(y+1-o.y)*tdy:(o.y-y)*tdy, tmz=sz>0?(z+1-o.z)*tdz:(o.z-z)*tdz;
  const inW=getB(x,y,z)===5;
  let t=0, px=x, py=y, pz=z;
  while(t<=reach){
    const id=getB(x,y,z);
    if(id>0 && !(id===5&&inW)) return {x,y,z,id,px,py,pz,t};
    if(id===-1) return null;
    px=x; py=y; pz=z;
    if(tmx<tmy){ if(tmx<tmz){ x+=sx;t=tmx;tmx+=tdx; } else { z+=sz;t=tmz;tmz+=tdz; } }
    else { if(tmy<tmz){ y+=sy;t=tmy;tmy+=tdy; } else { z+=sz;t=tmz;tmz+=tdz; } }
  }
  return null;
}
// rapidez de picado: el pico acelera mucho la roca y algo lo demás; sin el pico necesario es lentísimo
function mineSpeed(b){
  const t=toolTier(), stone=b.m==="roca"||b.m==="cristal";
  let s=stone?[.3,1,1.5,2.2,3.2][t]:[1,1.15,1.3,1.45,1.8][t]; if(b.tier&&t<b.tier) s=Math.min(s,.3);
  return s*(has("lente")?2:1);
}
function breakBlock(t,tier=toolTier()){
  const b=B[t.id], k=`${t.x},${t.y},${t.z}`, placed=S.placed[k]; setBlock(t.x,t.y,t.z,0); burst(t.x,t.y,t.z,b.c); S.mined++; sfx("break",t.id); exhaust(.025);
  const got=[];
  const weak=b.tier&&tier<b.tier; // sin el pico necesario no suelta nada (como Minecraft)
  if(weak) pick(`Necesitas un ${ITEMS[TOOLS[b.tier]].n.toLowerCase()} para sacar algo de aquí.`,"f");
  // una antorcha encima se cae con el bloque
  if(getB(t.x,t.y+1,t.z)===TORCH){ setBlock(t.x,t.y+1,t.z,0); delete S.placed[`${t.x},${t.y+1},${t.z}`]; S.bl[TORCH]=(S.bl[TORCH]||0)+1; }
  if(placed) delete S.placed[k]; // un bloque puesto solo devuelve el bloque: ni objetos, ni flux, ni reaparece
  else if(!weak){
    const night=daylight<.3&&b.flux; // de noche la Grieta suelta el doble y reacciona el doble
    (b.drop||[]).forEach(([it,p])=>{ if(Math.random()<p){ const n=night?2:1; give(it,n); got.push([it,n]); spawnDrop(it,t.x,t.y,t.z); } });
    if(b.resp) S.resp[k]={id:t.id,t:Date.now()+60000};
    if(b.flux) addFlux(b.flux*(night?2:1),night?"la grieta se agita de noche":"la grieta reacciona");
  }
  const parts=got.map(([i,n])=>icon(i,"ic sm")+" "+ITEMS[i].n+(n>1?" ×"+n:""));
  if(b.bl&&!weak){ S.bl[b.bl]=(S.bl[b.bl]||0)+1; if(!S.bl[S.sel]) S.sel=b.bl; parts.push(bicon(b.bl,"ic sm")+" "+B[b.bl].n); }
  if(parts.length){ pick("","","+ "+parts.join(", ")); sfx("pickup"); }
  hud(); save();
}
function placeBlock(t){
  const id=S.sel; if(!id||!S.bl[id]) return false;
  const {px:x,py:y,pz:z}=t, cur=getB(x,y,z);
  if((x===t.x&&y===t.y&&z===t.z)||cur<0||(cur>0&&!B[cur].water&&!B[cur].plant)) return false;
  if(id===TORCH&&!solidAt(x,y-1,z)){ if(useCd<=0){ useCd=.6; pick("La antorcha necesita un bloque debajo."); } return true; }
  if(useCd>0) return true;
  if(inBody(x,y,z)||netInBody(x,y,z)){ useCd=.6; pick("Ahí hay alguien: apártate para poner el bloque."); return true; }
  useCd=.25; swingStart();
  setBlock(x,y,z,id); S.placed[`${x},${y},${z}`]=1; sfx("place",id);
  if(--S.bl[id]<=0){ delete S.bl[id]; S.sel=+Object.keys(S.bl)[0]||0; }
  hud(); save(); return true;
}
function doUse(){
  if(panel||!target) return;
  swingStart();
  const b=B[target.id];
  if(target.id===5){ if(useCd>0) return; useCd=.35; give("agua"); pick("","","+ "+icon("agua","ic sm")+" Agua de manantial"); burst(target.x,target.y,target.z,"#5b9bd5",8); sfx("water"); hud(); save(); return; }
  if(b.use){ using=false; sfx("click"); return openPanel(b.use); }
  if(placeBlock(target)) return;
  if(useCd>0) return; useCd=.6;
  pick(Object.keys(S.bl).length ? "Ahí no cabe un bloque." : "Nada que usar aquí. Pica tierra, roca o troncos para tener bloques que poner.");
}
function doScan(){
  if(panel) return;
  if(targetMob){ scanItems(MOB[targetMob.type].drop.map(d=>d[0])); hud(); save(); return; } // escanear una criatura enseña lo que suelta
  if(!target){ pick("Apunta a un bloque para escanearlo."); return; }
  const b=B[target.id];
  if(b.custom||b.use){ pick("Es parte del taller: usa «Usar» para abrirlo."); return; }
  const its = target.id===5 ? ["agua"] : (b.drop||[]).map(d=>d[0]);
  if(!its.length){ pick(`${b.n}: nada que aprender aquí.`); return; }
  scanItems(its);
  for(let i=0;i<12;i++) spawn(target.x+Math.random(),target.y+Math.random(),target.z+Math.random(),0,.6,0,h2a("#cfa75a"),.8);
  hud(); save();
}

/* ================= Varita ================= */
// R lanza el foco elegido con vis del aura; V cambia de foco. Cada lanzamiento puede dejar un poco de flux.
const FOCI=["foco_chispa","foco_excava","foco_luz"];
const myFoci=()=>FOCI.filter(has);
let castCd=0;
function cycleFocus(){ const f=myFoci(); if(!f.length) return; S.focus=f[(f.indexOf(S.focus)+1)%f.length]; sfx("click"); hud(); save(); }
// partículas en línea desde la mano hasta el punto
function beam(to,hex){ const o=camera.position, c=h2a(hex), n=18; for(let i=0;i<n;i++){ const k=i/n; spawn(o.x+(to.x-o.x)*k+(Math.random()-.5)*.08,o.y-.25+(to.y-o.y+.25)*k,o.z+(to.z-o.z)*k+(Math.random()-.5)*.08,0,.2,0,c,.35+k*.3); } }
function cast(){
  if(panel||castCd>0||S.hp<=0) return;
  if(!has("varita")){ pick("Necesitas una varita de éter (mesa arcana)."); return; }
  if(!has(S.focus)) S.focus=myFoci()[0]||"";
  if(!S.focus){ pick("La varita no tiene foco: fabrica uno en la mesa arcana."); return; }
  const F=ITEMS[S.focus].focus; if(S.vis<F.cost){ pick("El aura no tiene vis suficiente: espera a que se recargue.","f"); castCd=.6; return; }
  const d=new THREE.Vector3(); camera.getWorldDirection(d); const o=camera.position;
  let ok=false;
  if(S.focus==="foco_chispa"){
    const t=raycast(16), m=mobRay(t?t.t:16,16);
    const end=m?m.g.position.clone().add(new THREE.Vector3(0,MOB[m.type].fly?0:.6,0)):o.clone().add(d.clone().multiplyScalar(t?t.t:16));
    beam(end,"#f2b13c"); sfx("spark"); burst(end.x-.5,end.y-.5,end.z-.5,"#e0743c",10);
    if(m) attackMob(m,2); ok=true;
  } else if(S.focus==="foco_excava"){
    const t=raycast(10); const b=t&&B[t.id];
    if(!t||b.unbreak||b.water||b.custom){ pick("Apunta a un bloque que se pueda romper (hasta 10 bloques)."); castCd=.4; return; }
    beam({x:t.x+.5,y:t.y+.5,z:t.z+.5},"#a8935c"); breakBlock(t,Math.max(3,toolTier())); ok=true;
  } else {
    const t=raycast(10); let c;
    if(t) c=[t.px,t.py,t.pz]; else { const e=o.clone().add(d.clone().multiplyScalar(6)); c=[Math.floor(e.x),Math.floor(e.y),Math.floor(e.z)]; }
    if(getB(...c)!==0||inBody(...c)){ pick("Ahí no cabe un orbe de luz."); castCd=.4; return; }
    beam({x:c[0]+.5,y:c[1]+.5,z:c[2]+.5},"#f2d36b"); setBlock(...c,ORB); sfx("chime"); ok=true;
  }
  if(ok){ S.vis-=F.cost; castCd=.5; swingStart(); if(Math.random()<.25) addFlux(1,"residuo de vis"); hud(); save(); }
}

/* ================= Vida y hambre ================= */
// 20 puntos de vida (10 corazones) y 20 de comida, como Minecraft. ex acumula el cansancio: cada 1 entero es un punto de comida.
const SPAWN=[24.5,8,27.5];
let hurtCd=0, regenT=0, starveT=0, fallTop=0;
function hurtPlayer(n,why){
  if(S.hp<=0||hurtCd>0||panel==="muerte") return;
  hurtCd=.5; S.hp=Math.max(0,S.hp-n); sfx("hurt"); shake=.35;
  const f=$("flash"); f.style.background="#d9534f"; f.style.opacity=.4; setTimeout(()=>{ f.style.opacity=0; setTimeout(()=>f.style.background="",600); },180);
  if(S.hp<=0) die(why); hud(); save();
}
function die(why){
  S.hp=0; S.deaths=(S.deaths||0)+1; mining=using=false; sfx("death"); deathWhy=why;
  teamSay(`cayó: ${why}`); openPanel("muerte");
}
let deathWhy="";
// reaparecer en el taller con todo lo que llevabas
function respawn(){
  Object.assign(P,{x:SPAWN[0],y:SPAWN[1],z:SPAWN[2],vy:0,kx:0,kz:0,yaw:0,pitch:-.12}); fallTop=SPAWN[1];
  S.hp=20; S.food=20; S.ex=0; hud(); save();
}
const exhaust=n=>{ S.ex+=n; while(S.ex>=1&&S.food>0){ S.ex-=1; S.food--; hud(); } };
// come lo que más llena sin desperdiciar (o lo que haya)
function eat(id){
  if(S.food>=20){ pick("No tienes hambre."); return; }
  if(!id){ const foods=Object.keys(S.inv).filter(i=>ITEMS[i].food); if(!foods.length){ pick("No tienes comida: caza gallinas, busca manzanas o haz pan."); return; }
    const need=20-S.food; foods.sort((a,b)=>Math.abs(ITEMS[a].food-need)-Math.abs(ITEMS[b].food-need)); id=foods[0]; }
  if(!has(id)||!ITEMS[id].food) return;
  take(id); S.food=Math.min(20,S.food+ITEMS[id].food); S.ex=0; sfx("eat"); setTimeout(()=>sfx("burp"),420);
  for(let i=0;i<8;i++) spawn(P.x+(Math.random()-.5)*.3,P.y+1.35,P.z+(Math.random()-.5)*.3,(Math.random()-.5),1+Math.random(),(Math.random()-.5),h2a("#c8783c"),.5,9);
  pick(`Comiste: ${ITEMS[id].n} (+${ITEMS[id].food/2} de comida)`,"g"); hud(); save();
}
// cada fotograma: hambre, recuperarse, inanición y caídas
function vitals(dt,landed,inW){
  hurtCd=Math.max(0,hurtCd-dt);
  if(S.hp<=0) return;
  exhaust(dt/45);
  if(S.food>=18&&S.hp<20){ regenT+=dt; if(regenT>=3){ regenT=0; S.hp++; exhaust(.6); hud(); } } else regenT=0;
  if(S.food<=0){ starveT+=dt; if(starveT>=4){ starveT=0; if(S.hp>1){ S.hp--; sfx("hurt"); hud(); pick("Tienes hambre: come algo (C o la mochila)","f"); } } } else starveT=0;
  if(inW||P.ground&&!landed) fallTop=P.y; else if(!P.ground) fallTop=Math.max(fallTop,P.y);
  if(landed){ const h=fallTop-P.y; fallTop=P.y; if(h>3.4) hurtPlayer(Math.floor(h-3),"una caída"); }
}

/* ================= Infusión ================= */
function infuse(rid){
  const r=INF.find(x=>x.id===rid); if(!canInfuse(r)||busy) return;
  const inst=instability(r); closePanel();
  busy={rid,t:0}; clearFloaters();
  addFloater(r.center,ALT,true); r.peds.forEach((p,i)=>addFloater(p,PEDS[i],false));
  pick(`Infusión iniciada: ${ITEMS[r.id].n} (${inst}% de inestabilidad)`);
  const step=()=>{
    busy.t++;
    floaters.filter(f=>!f.center).forEach(f=>{ const c=h2a(itemColor(rid==="corazon"?"vial":r.center)); for(let i=0;i<14;i++){ const sx=f.m.position.x,sy=f.m.position.y,sz=f.m.position.z; spawn(sx,sy,sz,(ALT[0]+.5-sx)/.7,(ALT[1]+1.35-sy)/.7,(ALT[2]+.5-sz)/.7,h2a(itemColor(Object.keys(infNeeds(r))[i%Object.keys(infNeeds(r)).length])),.7); } });
    sfx("pulse"); const roll=Math.random()*100;
    if(roll<inst*.07) return finish(false,"La matriz colapsó");
    if(roll<inst*.4){
      if(Math.random()<.5){ addFlux(5,"chispazo de la infusión"); sfx("spark"); burst(ALT[0],ALT[1]+.5,ALT[2],"#c4579f",20); }
      else { const ks=Object.keys(S.cru); if(ks.length){ const k=ks[rnd(ks.length)]; S.cru[k]-=2; if(S.cru[k]<=0) delete S.cru[k]; pick(`Fuga de ${ESS[k].n} en el crisol`,"f"); updateCauldron(); } }
    }
    if(busy.t>=6) return finish(true);
    setTimeout(step,700);
  };
  const finish=(ok,why)=>{
    if(ok && !Object.entries(infNeeds(r)).every(([i,n])=>has(i)>=n)){ ok=false; why="Faltaron objetos al final"; }
    if(ok && !Object.entries(r.cost).every(([e,n])=>(S.cru[e]||0)>=n)){ ok=false; why="Faltó esencia al final"; }
    if(ok){
      for(const [i,n] of Object.entries(infNeeds(r))) take(i,n);
      for(const [e,n] of Object.entries(r.cost)){ S.cru[e]-=n; if(S.cru[e]<=0) delete S.cru[e]; }
      give(r.id); if(!S.scanned.includes(r.id)) S.scanned.push(r.id);
      pick(`Infusión completa: ${ITEMS[r.id].n}`,"g"); sfx("success"); teamSay(`completó la infusión: ${ITEMS[r.id].n}`); burst(ALT[0],ALT[1]+.8,ALT[2],"#f2d36b",40);
      if(r.final && !S.won){ S.won=true; setTimeout(()=>openPanel("win"),600); }
    } else {
      for(const [e,n] of Object.entries(r.cost)) if(S.cru[e]){ S.cru[e]=Math.max(0,S.cru[e]-Math.ceil(n/2)); if(!S.cru[e]) delete S.cru[e]; }
      pick(`${why}: recuperas los objetos, pierdes esencia.`,"f"); sfx("fail"); teamSay(`falló una infusión (${why.toLowerCase()})`); burst(ALT[0],ALT[1]+.8,ALT[2],"#c4579f",40); addFlux(10,"infusión fallida");
    }
    clearFloaters(); busy=null; hud(); save();
  };
  setTimeout(step,700);
}
