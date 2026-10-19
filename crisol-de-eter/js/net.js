// Crisol de Éter — Partida en equipo por la red local: sincroniza lo compartido con tools/servidor.py y dibuja a los compañeros.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.
// Solo conecta si tools/servidor.py sirvió js/equipo.js con EQUIPO=true; si no (file://, otro servidor, artifact), es de un jugador.

/* ================= Red ================= */
// Lo compartido se sincroniza por diferencias: cada 0,1 s se compara con NET.base (lo último que el servidor confirmó
// más lo ya enviado) y se mandan ops. Mismas reglas que apply_op en tools/servidor.py:
//   n: número que suma · m: cantidad por clave (se borra al llegar a 0) · s: valor por clave (gana el último)
//   u: lista sin repetidos · v: valor entero (gana el último)
const SH={n:["flux","mined","rifts"],m:["inv","cru","bl"],s:["world","placed","resp"],u:["scanned","res"],v:["won","rsch"]};
const SHARED=Object.values(SH).flat();
const NET={ws:null,id:0,color:"",leader:false,base:null,seq:0,pending:[],players:{},dirs:[],up:false,ever:false,sendT:0,tErr:0,panelT:0,panelDirty:false};
const clone=o=>JSON.parse(JSON.stringify(o));
const sharedOf=s=>clone(Object.fromEntries(SHARED.map(f=>[f,s[f]])));
const NAME_KEY="crisol-nombre";
const myName=()=>{ try { return localStorage.getItem(NAME_KEY)||""; } catch(e) { return ""; } };

function diffShared(a,b){
  const ops=[];
  for(const f of SH.n) if(b[f]!==a[f]) ops.push(["n",f,b[f]-a[f]]);
  for(const f of SH.m) for(const k of new Set([...Object.keys(a[f]),...Object.keys(b[f])])){ const d=(b[f][k]||0)-(a[f][k]||0); if(d) ops.push(["m",f,k,d]); }
  for(const f of SH.s){
    for(const k in b[f]){ const x=a[f][k], y=b[f][k]; if(x!==y&&JSON.stringify(x)!==JSON.stringify(y)) ops.push(["s",f,k,y]); }
    for(const k in a[f]) if(!(k in b[f])) ops.push(["s",f,k,null]);
  }
  for(const f of SH.u) for(const v of b[f]) if(!a[f].includes(v)) ops.push(["u",f,v]);
  for(const f of SH.v) if(JSON.stringify(a[f])!==JSON.stringify(b[f])) ops.push(["v",f,clone(b[f])]);
  return ops;
}
// valida y aplica una op; con live=true además actualiza el mundo y avisa lo que ven los demás
const OK_KEY={inv:k=>k in ITEMS,cru:k=>k in ESS,bl:k=>B.some(b=>b&&b.bl===+k),scanned:k=>k in ITEMS,res:k=>!!recipe(k)};
function applyOp(s,op,live,dirty){
  const [kind,f,k,v]=op;
  if(kind==="n"&&SH.n.includes(f)&&Number.isFinite(k)) s[f]+=k;
  else if(kind==="m"&&SH.m.includes(f)&&OK_KEY[f](k)&&Number.isFinite(v)){ const n=(s[f][k]||0)+v; if(n>0) s[f][k]=n; else delete s[f][k]; }
  else if(kind==="s"&&SH.s.includes(f)&&typeof k==="string"){
    if(f==="world"){ const [x,y,z]=k.split(",").map(Number), id=v===null?null:+v; if(getB(x,y,z)<0||(id!==null&&!(id>=0&&id<B.length))) return;
      if(live&&id!==null) cellChanged(x,y,z,id,dirty); if(id===null) delete s.world[k]; else s.world[k]=id; }
    else if(v===null) delete s[f][k]; else s[f][k]=v;
  }
  else if(kind==="u"&&SH.u.includes(f)&&OK_KEY[f](k)){ if(!s[f].includes(k)) s[f].push(k); }
  else if(kind==="v"&&SH.v.includes(f)){
    if(f==="rsch"&&k&&!(recipe(k.id)&&Array.isArray(k.secret)&&Array.isArray(k.guesses)&&Array.isArray(k.cur))) return;
    if(live&&f==="won"&&k&&!s.won) setTimeout(()=>openPanel("win"),300);
    s[f]=k;
  }
}
// una celda cambió por otro jugador: mundo, chunks, polvo y sonido si está cerca
function cellChanged(x,y,z,id,dirty){
  const old=getB(x,y,z); if(old===id) return;
  world[ix(x,y,z)]=id; chunksOf(x,z,dirty);
  if(Math.hypot(x+.5-P.x,y-P.y,z+.5-P.z)<18){ if(id===0&&old>0){ burst(x,y,z,B[old].c||"#888"); sfx("break",old); } else if(id>0) sfx("place",id); }
}
function flushChunks(dirty){ if(dirty.size) relight(dirty); for(const k of dirty){ const [cx,cz]=k.split(",").map(Number); buildChunk(cx,cz); } }
function afterRemote(){ hud(); if(panel&&panel!=="equipo") NET.panelDirty=true; }

/* conexión */
function netSend(m){ if(NET.up) NET.ws.send(JSON.stringify(m)); }
function netConnect(){
  if(!EQUIPO) return;
  let ws; try { ws=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host+"/equipo"); } catch(e) { return; }
  NET.ws=ws;
  ws.onopen=()=>{ NET.up=true; ws.send(JSON.stringify({t:"hola",name:myName()})); };
  ws.onmessage=e=>{ let m; try { m=JSON.parse(e.data); } catch(err) { return; } const h=NET_ON[m.t]; if(h) h(m); };
  ws.onclose=()=>{ const was=NET.up; NET.up=false;
    if(was){ pick("Se perdió la conexión con el servidor: reintentando…","f"); hud(); }
    setTimeout(netConnect,2000); };
}
function netFlush(){
  if(!NET.up||!NET.base) return;
  const ops=diffShared(NET.base,S); if(!ops.length) return;
  NET.seq++; netSend({t:"ops",seq:NET.seq,ops}); ops.forEach(o=>applyOp(NET.base,o)); NET.pending.push({seq:NET.seq,ops});
}
// reemplaza lo compartido por el estado del servidor (más lo que mandé y aún no confirmó)
function adoptState(st,ack){
  netFlush();
  NET.pending=NET.pending.filter(p=>p.seq>ack);
  const base=sharedOf(st); NET.pending.forEach(p=>p.ops.forEach(o=>applyOp(base,o)));
  NET.base=base;
  const next=clone(base), dirty=new Set();
  for(const k of new Set([...Object.keys(S.world),...Object.keys(next.world)])){ const [x,y,z]=k.split(",").map(Number);
    const id=k in next.world?next.world[k]:null; if(id!==null&&getB(x,y,z)!==id) cellChanged(x,y,z,id,dirty); }
  if(next.won&&!S.won) setTimeout(()=>openPanel("win"),300);
  for(const f of SHARED) S[f]=next[f];
  flushChunks(dirty); afterRemote();
}
const NET_ON={
  bienvenida(m){
    const first=!teamMode;
    teamMode=true; NET.ever=true; NET.id=m.id; NET.color=m.color; NET.dirs=m.dirs||[]; NET.leader=m.leader===m.id;
    NET.pending=[]; NET.seq=0;
    for(const id in NET.players) removeAvatar(id);
    m.players.forEach(p=>{ if(p.id!==NET.id) addAvatar(p); });
    if(first){
      // el mundo del equipo empieza del mundo base: se regenera entero
      for(const f of SHARED) S[f]=clone(m.state[f]); NET.base=sharedOf(S);
      loadWorld(); buildAll(); clearFloaters(); busy=null; clearMobs(); // las criaturas del juego solo no pasan al equipo
      let me={}; try { me=JSON.parse(localStorage.getItem(KEY+"-equipo"))||{}; } catch(e) {}
      Object.assign(P,{x:24.5,y:8,z:27.5,yaw:0,pitch:-.12},me.player||{}); P.vy=0;
      if(me.sel) S.sel=me.sel; if(typeof me.mute==="boolean") setMute(me.mute);
      S.time=m.state.time; save();
      if(!myName()) openPanel("equipo"); else if(panel) renderPanel();
      pick("Conectado a la partida en equipo","g");
    } else { adoptState(m.state,0); pick("Conexión recuperada","g"); }
    S.time=m.state.time; hud();
  },
  ops(m){ const dirty=new Set(); m.ops.forEach(o=>{ applyOp(NET.base,o); applyOp(S,o,true,dirty); }); flushChunks(dirty); afterRemote(); },
  estado(m){ adoptState(m.state,m.ack); },
  // la hora del servidor se alcanza de a poco (si no, el sol da saltitos); solo salta si la diferencia es grande
  hora(m){ if(!Number.isFinite(m.time)) return; let d=m.time-S.time; d-=Math.round(d); if(Math.abs(d)>.01){ S.time=m.time; NET.tErr=0; } else NET.tErr=d; },
  // cada posición trae la hora de quien la mandó (ms); se guarda para interpolar (ver updateAvatars)
  pos(m){ const a=NET.players[m.id]; if(!a||!Number.isFinite(m.ms)) return; const d=performance.now()-m.ms;
    a.off=a.buf.length?Math.min(a.off,d):d; a.buf.push({t:m.ms,p:m.p}); if(a.buf.length>20) a.buf.shift(); a.target=m.p; a.a=m.a; },
  entra(m){ addAvatar(m.player); pick(`${m.player.name} se unió al equipo`,"g"); hud(); teamList(); },
  sale(m){ const a=NET.players[m.id]; if(a){ pick(`${a.name} salió de la partida`); removeAvatar(m.id); hud(); teamList(); } },
  nombre(m){ const a=NET.players[m.id]; if(a){ a.name=m.name; setLabel(a); } hud(); teamList(); },
  lider(m){ NET.leader=m.id===NET.id; },
  aviso(m){ const a=NET.players[m.id]; pick(a?`${a.name} ${m.text}`:m.text,"g"); }
};
// mensaje para el resto del equipo (con el nombre de quien lo hizo delante)
function teamSay(text){ if(teamMode) netSend({t:"aviso",text}); }
function setName(n){ n=n.replace(/[\u0000-\u001f]/g,"").trim().slice(0,16); if(!n) return; try { localStorage.setItem(NAME_KEY,n); } catch(e) {} netSend({t:"nombre",name:n}); }

/* compañeros: muñecos de bloques con el nombre encima */
function faceTex(){
  const c=document.createElement("canvas"); c.width=c.height=8; const x=c.getContext("2d");
  x.fillStyle="#c38c62"; x.fillRect(0,0,8,8); x.fillStyle="#3b2a1e"; x.fillRect(0,0,8,2); x.fillRect(0,2,1,1); x.fillRect(7,2,1,1);
  x.fillStyle="#f4f0e6"; x.fillRect(1,4,2,1); x.fillRect(5,4,2,1); x.fillStyle="#2a2433"; x.fillRect(2,4,1,1); x.fillRect(5,4,1,1); x.fillStyle="#8a5a40"; x.fillRect(3,6,2,1);
  const t=new THREE.CanvasTexture(c); t.magFilter=t.minFilter=THREE.NearestFilter; return t;
}
const FACE=faceTex();
function setLabel(a){
  const c=document.createElement("canvas"), x=c.getContext("2d"), font="500 26px 'Pixelify Sans', monospace"; x.font=font;
  const w=Math.ceil(x.measureText(a.name).width)+20; c.width=w; c.height=38; x.font=font;
  x.fillStyle="#0009"; x.fillRect(0,0,w,38); x.fillStyle=a.color; x.fillRect(0,34,w,4); x.fillStyle="#fff"; x.textBaseline="middle"; x.fillText(a.name,10,18);
  if(a.label.material.map) a.label.material.map.dispose();
  const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; a.label.material.map=t; a.label.material.needsUpdate=true; a.label.scale.set(w/38*.3,.3,1);
}
function addAvatar(p){
  if(NET.players[p.id]) removeAvatar(p.id);
  const g=new THREE.Group(), skin=lam({color:"#c38c62"}), shirt=lam({color:p.color}), pants=lam({color:"#3a3346"}), hair=lam({color:"#3b2a1e"});
  const part=(w,h,d,mat,x,y,z,pivotY)=>{ const piv=new THREE.Group(); piv.position.set(x,pivotY,z); const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.y=y-pivotY; piv.add(m); g.add(piv); return piv; };
  const legL=part(.24,.7,.24,pants,-.12,.35,0,.7), legR=part(.24,.7,.24,pants,.12,.35,0,.7);
  part(.48,.65,.26,shirt,0,1.025,0,1.025);
  const armL=part(.2,.62,.2,shirt,-.34,1.04,0,1.33), armR=part(.2,.62,.2,shirt,.34,1.04,0,1.33);
  const head=new THREE.Mesh(new THREE.BoxGeometry(.44,.44,.44),[skin,skin,hair,skin,hair,lam({map:FACE})]); head.position.y=1.57; g.add(head);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthTest:false,fog:false})); label.position.y=2.1; label.renderOrder=5; g.add(label);
  scene.add(g);
  const a=NET.players[p.id]={id:p.id,name:p.name,color:p.color,g,head,legL,legR,armL,armR,label,target:p.p,a:0,
    buf:[],off:0,vis:0,ph:0,sw:0,armRx:0};
  setLabel(a); g.visible=!!p.p;
}
function removeAvatar(id){
  const a=NET.players[id]; if(!a) return; scene.remove(a.g);
  a.g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material) [].concat(o.material).forEach(m=>{ if(m.map&&m.map!==FACE) m.map.dispose(); m.dispose(); }); });
  delete NET.players[id];
}
// Los compañeros se dibujan LAG ms en el pasado, interpolando entre las posiciones guardadas con la hora de quien
// las mandó (off = menor diferencia vista entre relojes): el movimiento sale parejo aunque los mensajes lleguen a destiempo.
const LAG=120;
function sampleAt(b,rt){
  if(rt<=b[0].t) return b[0].p;
  for(let i=b.length-1;i>=0;i--) if(b[i].t<=rt){ const n=b[i+1]; if(!n) return b[i].p;
    const k=(rt-b[i].t)/(n.t-b[i].t||1), p=b[i].p, q=n.p; let dy=q[3]-p[3]; dy=Math.atan2(Math.sin(dy),Math.cos(dy));
    return [p[0]+(q[0]-p[0])*k,p[1]+(q[1]-p[1])*k,p[2]+(q[2]-p[2])*k,p[3]+dy*k,p[4]+(q[4]-p[4])*k]; }
}
function updateAvatars(dt,now){
  for(const a of Object.values(NET.players)){
    const q=a.buf.length?sampleAt(a.buf,now-a.off-LAG):a.target; if(!q){ a.g.visible=false; continue; }
    const g=a.g, ox=g.position.x, oz=g.position.z, first=!g.visible;
    g.visible=true; g.position.set(q[0],q[1],q[2]); g.rotation.y=q[3]; a.head.rotation.x=q[4]*.8;
    // pasos según lo que de verdad se movió en este fotograma, suavizado
    const sp=first?0:Math.hypot(q[0]-ox,q[2]-oz)/Math.max(dt,1e-3), s=Math.min(1,dt*10);
    a.vis+=(Math.min(sp,5)-a.vis)*s; a.ph+=dt*a.vis*2.4;
    const sw=Math.sin(a.ph)*Math.min(1,a.vis/2.5)*.7; a.legL.rotation.x=sw; a.legR.rotation.x=-sw; a.armL.rotation.x=-sw;
    // picar: el brazo derecho, levantado hacia adelante, golpea hacia abajo y termina la vuelta al soltar
    if(a.a) a.sw=(a.sw+dt*2.6)%1; else if(a.sw>0){ a.sw+=dt*2.6; if(a.sw>=1) a.sw=0; }
    a.armRx+=((a.a||a.sw>0?1.6-strike(a.sw)*1.1:sw)-a.armRx)*Math.min(1,dt*14); a.armR.rotation.x=a.armRx;
  }
}
// ¿la celda toca el cuerpo de algún compañero?
function netInBody(x,y,z){
  for(const a of Object.values(NET.players)){ const t=a.target; if(!t) continue;
    if(x>=Math.floor(t[0]-RAD)&&x<=Math.floor(t[0]+RAD)&&z>=Math.floor(t[2]-RAD)&&z<=Math.floor(t[2]+RAD)&&y>=Math.floor(t[1])&&y<=Math.floor(t[1]+HT-.001)) return true; }
  return false;
}
/* cada fotograma: mandar cambios y posición, mover a los compañeros, refrescar el panel abierto */
function netTick(dt){
  if(!teamMode) return;
  const now=performance.now();
  updateAvatars(dt,now);
  if(NET.tErr){ const c=NET.tErr*Math.min(1,dt*2); S.time=(S.time+c+1)%1; NET.tErr-=c; }
  NET.sendT+=dt; if(NET.sendT<.1) return; NET.sendT=0;
  netFlush();
  // la posición va siempre (10 por segundo), también quieto: así los demás interpolan sin huecos
  const p=[P.x,P.y,P.z,P.yaw,P.pitch].map(v=>Math.round(v*100)/100);
  netSend({t:"pos",p,a:(mining||using)&&!panel?1:0,ms:Math.round(now)});
  if(NET.panelDirty&&panel&&now-NET.panelT>250){ NET.panelDirty=false; NET.panelT=now; renderPanel(); }
}
// la fila del equipo en el HUD y la lista del panel
function teamHud(){
  const el=$("team"); el.hidden=!teamMode; if(!teamMode) return;
  const dot=(c,n)=>`<span><i style="background:${c}"></i>${esc(n)}</span>`;
  setHTML(el, NET.up ? dot(NET.color,myName()||"Tú")+Object.values(NET.players).map(a=>dot(a.color,a.name)).join("") : `<span class="off">Sin conexión: reintentando…</span>`);
}
function teamList(){
  const el=$("teamList"); if(!el) return;
  el.innerHTML=[`<div class="row tm"><i style="background:${NET.color}"></i><div class="nm">${esc(myName()||"Tú")} <span class="note">(tú)</span></div></div>`,
    ...Object.values(NET.players).map(a=>`<div class="row tm"><i style="background:${a.color}"></i><div class="nm">${esc(a.name)}</div></div>`)].join("");
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
netConnect();
