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

function raycast(){
  const o=camera.position, d=new THREE.Vector3(); camera.getWorldDirection(d);
  let x=Math.floor(o.x),y=Math.floor(o.y),z=Math.floor(o.z);
  const sx=Math.sign(d.x),sy=Math.sign(d.y),sz=Math.sign(d.z);
  const tdx=d.x?Math.abs(1/d.x):Infinity,tdy=d.y?Math.abs(1/d.y):Infinity,tdz=d.z?Math.abs(1/d.z):Infinity;
  let tmx=sx>0?(x+1-o.x)*tdx:(o.x-x)*tdx, tmy=sy>0?(y+1-o.y)*tdy:(o.y-y)*tdy, tmz=sz>0?(z+1-o.z)*tdz:(o.z-z)*tdz;
  const inW=getB(x,y,z)===5;
  let t=0, px=x, py=y, pz=z;
  while(t<=5.5){
    const id=getB(x,y,z);
    if(id>0 && !(id===5&&inW)) return {x,y,z,id,px,py,pz,t};
    if(id===-1) return null;
    px=x; py=y; pz=z;
    if(tmx<tmy){ if(tmx<tmz){ x+=sx;t=tmx;tmx+=tdx; } else { z+=sz;t=tmz;tmz+=tdz; } }
    else { if(tmy<tmz){ y+=sy;t=tmy;tmy+=tdy; } else { z+=sz;t=tmz;tmz+=tdz; } }
  }
  return null;
}
function breakBlock(t){
  const b=B[t.id], k=`${t.x},${t.y},${t.z}`, placed=S.placed[k]; setBlock(t.x,t.y,t.z,0); burst(t.x,t.y,t.z,b.c); S.mined++; sfx("break",t.id);
  const got=[];
  if(placed) delete S.placed[k]; // un bloque puesto solo devuelve el bloque: ni objetos, ni flux, ni reaparece
  else {
    const night=daylight<.3&&b.flux; // de noche la Grieta suelta el doble y reacciona el doble
    (b.drop||[]).forEach(([it,p])=>{ if(Math.random()<p){ const n=night?2:1; give(it,n); got.push([it,n]); spawnDrop(it,t.x,t.y,t.z); } });
    if(b.resp) S.resp[k]={id:t.id,t:Date.now()+60000};
    if(b.flux) addFlux(b.flux*(night?2:1),night?"la grieta se agita de noche":"la grieta reacciona");
  }
  const parts=got.map(([i,n])=>icon(i,"ic sm")+" "+ITEMS[i].n+(n>1?" ×"+n:""));
  if(b.bl){ S.bl[b.bl]=(S.bl[b.bl]||0)+1; if(!S.bl[S.sel]) S.sel=b.bl; parts.push(bicon(b.bl,"ic sm")+" "+B[b.bl].n); }
  if(parts.length){ pick("","","+ "+parts.join(", ")); sfx("pickup"); }
  hud(); save();
}
function placeBlock(t){
  const id=S.sel; if(!id||!S.bl[id]) return false;
  const {px:x,py:y,pz:z}=t, cur=getB(x,y,z);
  if((x===t.x&&y===t.y&&z===t.z)||cur<0||(cur>0&&!B[cur].water&&!B[cur].plant)) return false;
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
