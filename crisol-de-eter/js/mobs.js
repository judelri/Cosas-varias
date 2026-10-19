// Crisol de Éter — Criaturas: gallinas y polillas de luz (pacíficas) y sombras de bruma (hostiles de noche o con flux alto).
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.
// Las simula un solo jugador (tú si juegas solo; el guía en equipo) y los demás las dibujan con lo que él manda,
// interpolando como a los compañeros (sampleAt en net.js).

/* ================= Criaturas ================= */
// drop: [objeto, probabilidad, cantidad]
const MOB={
  gallina:{n:"Gallina",hp:3,speed:1.4,w:.45,h:.75,c:"#f4f0e6",drop:[["pluma",1,2],["pollo",1,1],["semilla",.3,1]]},
  polilla:{n:"Polilla de luz",hp:1,speed:1.8,w:.5,h:.4,fly:1,c:"#f2d36b",drop:[["polvo",1,1]]},
  sombra:{n:"Sombra de bruma",hp:4,speed:2.4,w:.6,h:1.7,hostile:1,c:"#9a62b0",drop:[["ceniza",.8,1],["corrupta",.5,1]]},
  // mini jefe: la mascota de Claude (cuerpo naranja, ojos negros, bracitos y cuatro patas). touch: daño al tocarte
  mascota:{n:"Mascota de Claude",hp:24,speed:2,w:1.6,h:1.35,hostile:1,boss:1,touch:2,c:"#e8833a",
    drop:[["nucleo",1,1],["cr_brasa",1,2],["cr_orden",1,2],["cr_cefiro",1,1],["pollo_asado",1,2]]},
  mascotita:{n:"Mascotita",hp:3,speed:2.8,w:.5,h:.45,hostile:1,touch:1,c:"#e8833a",drop:[["cr_brasa",.5,1]]},
  // fuegos fatuos: orbes de una esencia primal; sueltan su cristal
  ...Object.fromEntries(PRIMAL.map(e=>["fatuo_"+e,{n:"Fuego fatuo de "+ESS[e].n,hp:2,speed:1.6,w:.45,h:.45,fly:1,wisp:1,c:ESS[e].c,drop:[["cr_"+e,1,1],["cr_"+e,.5,1]]}]))
};
const grp=t=>MOB[t].wisp?"fatuo":t;
let bossNight=false; // ya salió la mascota esta noche
const mobs={}, mobEvents=[];
let mobSeq=0, mobSpawnT=0, mobSendT=0, mobOff=null, atkCd=0, targetMob=null, wasSim=true;
const simMobs=()=>!teamMode||NET.leader;
const myId=()=>teamMode?NET.id:0;
const inLab=(x,z,r)=>Math.hypot(x-LAB.x-.5,z-LAB.z-.5)<r; // el taller es zona segura

/* modelos de bloques */
function mobMesh(type){
  const g=new THREE.Group(), parts={}, mats=[];
  const L=c=>{ const m=lam({color:c}); m.userData.c=m.color.clone(); mats.push(m); return m; };
  const Bs=(c,o={})=>{ const m=new THREE.MeshBasicMaterial({color:c,...o}); m.userData.c=m.color.clone(); mats.push(m); return m; };
  const box=(w,h,d,mat,x,y,z,parent=g)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); b.position.set(x,y,z); parent.add(b); return b; };
  const piv=(x,y,z,parent=g)=>{ const p=new THREE.Group(); p.position.set(x,y,z); parent.add(p); return p; };
  if(type==="gallina"){
    const white=L("#f4f0e6"), orange=L("#e0a03c"), red=L("#d9534f"), dark=L("#2a2433");
    box(.36,.3,.46,white,0,.38,0);
    parts.head=piv(0,.5,-.2); box(.2,.24,.18,white,0,.12,0,parts.head); box(.1,.06,.1,orange,0,.08,-.13,parts.head);
    box(.06,.08,.12,red,0,.28,0,parts.head); box(.04,.04,.02,dark,-.07,.16,-.095,parts.head); box(.04,.04,.02,dark,.07,.16,-.095,parts.head);
    parts.legL=piv(-.08,.23,0); box(.05,.23,.05,orange,0,-.115,0,parts.legL);
    parts.legR=piv(.08,.23,0); box(.05,.23,.05,orange,0,-.115,0,parts.legR);
    parts.wingL=piv(-.19,.5,0); box(.04,.2,.32,white,0,-.08,0,parts.wingL);
    parts.wingR=piv(.19,.5,0); box(.04,.2,.32,white,0,-.08,0,parts.wingR);
  } else if(type==="polilla"){
    const body=Bs("#fff0b0"), wing=Bs("#f2d36b",{transparent:true,opacity:.85,side:THREE.DoubleSide});
    box(.08,.08,.22,body,0,0,0); box(.02,.02,.08,body,-.03,.03,-.14); box(.02,.02,.08,body,.03,.03,-.14);
    parts.wingL=piv(-.04,0,0); box(.3,.01,.2,wing,-.15,0,0,parts.wingL);
    parts.wingR=piv(.04,0,0); box(.3,.01,.2,wing,.15,0,0,parts.wingR);
  } else if(type==="mascota"||type==="mascotita"){
    // como la foto: caja naranja ancha, dos ojos negros verticales, bracitos a los lados y cuatro patas en dos pares
    const s=type==="mascota"?1:.3, o=L("#e8833a"), od=L("#c8682a"), ink=Bs("#141016");
    parts.body=piv(0,.36*s,0);
    box(1.5*s,.95*s,.9*s,o,0,.48*s,0,parts.body);
    parts.eyeL=box(.13*s,.28*s,.02*s,ink,-.33*s,.58*s,-.455*s,parts.body); parts.eyeR=box(.13*s,.28*s,.02*s,ink,.33*s,.58*s,-.455*s,parts.body);
    parts.armL=piv(-.75*s,.4*s,0,parts.body); box(.28*s,.22*s,.42*s,o,-.14*s,0,0,parts.armL);
    parts.armR=piv(.75*s,.4*s,0,parts.body); box(.28*s,.22*s,.42*s,o,.14*s,0,0,parts.armR);
    parts.legs=[-.6,-.38,.38,.6].map(x=>{ const p=piv(x*s,.36*s,0); box(.16*s,.36*s,.22*s,od,0,-.18*s,0,p); return p; });
  } else if(MOB[type].wisp){
    const c=MOB[type].c, core=Bs("#ffffff"), glow=Bs(c,{transparent:true,opacity:.75}), halo=Bs(c,{transparent:true,opacity:.25,depthWrite:false});
    parts.core=piv(0,0,0); box(.14,.14,.14,core,0,0,0,parts.core); box(.28,.28,.28,glow,0,0,0,parts.core); box(.46,.46,.46,halo,0,0,0,parts.core);
  } else {
    const dark=Bs("#1d1426",{transparent:true,opacity:.85}), wisp=Bs("#2e1a3e",{transparent:true,opacity:.55}), eye=Bs("#f05fd0");
    box(.36,.5,.22,wisp,0,.45,0); box(.5,.8,.3,dark,0,1.05,0);
    parts.head=piv(0,1.45,0); box(.42,.42,.42,dark,0,.21,0,parts.head);
    box(.1,.05,.02,eye,-.1,.24,-.215,parts.head); box(.1,.05,.02,eye,.1,.24,-.215,parts.head);
    parts.armL=piv(-.33,1.38,0); box(.14,.7,.14,dark,0,-.33,0,parts.armL);
    parts.armR=piv(.33,1.38,0); box(.14,.7,.14,dark,0,-.33,0,parts.armR);
  }
  return {g,parts,mats};
}
function addMob(id,type,x,y,z){
  const {g,parts,mats}=mobMesh(type); g.position.set(x,y,z); scene.add(g);
  return mobs[id]={id,type,x,y,z,yaw:Math.random()*6.28,vx:0,vy:0,vz:0,kx:0,kz:0,hp:MOB[type].hp,ground:false,
    g,parts,mats,ph:Math.random()*6,vis:0,hurt:0,ai:0,dir:[0,0],go:0,dy:0,flee:0,fx:0,fz:0,buf:[],gone:false};
}
function removeMob(id){
  const m=mobs[id]; if(!m) return; scene.remove(m.g);
  m.g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); m.mats.forEach(x=>x.dispose());
  delete mobs[id];
}
function clearMobs(){ for(const id in mobs) removeMob(id); }

/* aparecer y desaparecer */
const players=()=>[[P.x,P.y,P.z],...Object.values(NET.players).filter(a=>a.target).map(a=>a.target)];
function nearestPlayer(x,z){ let best=null, bd=1e9; for(const p of players()){ const d=Math.hypot(p[0]-x,p[2]-z); if(d<bd){ bd=d; best=p; } } return [best,bd]; }
function surface(x,z){ for(let y=H-1;y>=0;y--){ const id=getB(x,y,z); if(id>0&&!B[id].plant) return {y:y+1,id}; } return null; }
function mobCaps(){
  const night=daylight<.3, f=S.flux;
  // sombras: siempre hasta 2 en las cuevas oscuras; de noche 3 más en la superficie; más con flux alto
  return {gallina:5, polilla:night?5:0, sombra:2+(night?3:0)+(f>=50?2:0)+(f>=80?2:0), fatuo:3, mascota:1, mascotita:99};
}
function trySpawn(type){
  if(type==="mascotita") return; // solo las invoca la mascota
  if(type==="mascota"){ // de noche, a veces, una vez por noche, cerca de la montaña o la Grieta
    if(daylight>=.3){ bossNight=false; return; } if(bossNight||Math.random()>.05) return;
    for(let k=0;k<20;k++){ const x=Math.random()<.5?RIFT[0]-10+rnd(15):30+rnd(14), z=Math.random()<.5?RIFT[1]-10+rnd(15):4+rnd(18);
      const s=surface(x,z); if(!s||s.id===5||inLab(x+.5,z+.5,11)) continue; const [,d]=nearestPlayer(x+.5,z+.5); if(d<14||d>34) continue;
      if(mobHits(x+.5,s.y,z+.5,MOB.mascota)) continue;
      addMob(`${myId()}.${++mobSeq}`,type,x+.5,s.y,z+.5); bossNight=true; bossAnnounce(); return; }
    return;
  }
  // fuegos fatuos: en las cuevas o sobre la montaña y la Grieta
  if(type==="fatuo"){
    const t="fatuo_"+PRIMAL[rnd(6)];
    for(let k=0;k<12;k++){
      let x,y,z; if(CAVES.length&&Math.random()<.6){ const i=CAVES[rnd(CAVES.length)]; x=i%W; z=Math.floor(i/W)%D; y=Math.floor(i/(W*D))+.8; }
      else { x=Math.random()<.5?RIFT[0]-8+rnd(17):30+rnd(16); z=Math.random()<.5?RIFT[1]-8+rnd(17):1+rnd(20); const s=surface(x,z); if(!s||s.id===5) continue; y=s.y+1.5+Math.random()*1.5; }
      const [,d]=nearestPlayer(x+.5,z+.5); if(d<8||d>32) continue;
      addMob(`${myId()}.${++mobSeq}`,t,x+.5,y,z+.5); return;
    }
    return;
  }
  // las sombras nacen en la oscuridad: suelo de cueva, o la superficie de noche (o con flux alto) lejos de antorchas
  if(type==="sombra"&&(!(daylight<.3||S.flux>=50)||Math.random()<.4)){
    for(let k=0;k<10&&CAVES.length;k++){ const i=CAVES[rnd(CAVES.length)], x=i%W, z=Math.floor(i/W)%D, y=Math.floor(i/(W*D));
      const [,d]=nearestPlayer(x+.5,z+.5); if(d<10||d>32) continue; addMob(`${myId()}.${++mobSeq}`,type,x+.5,y,z+.5); return; }
    if(!(daylight<.3||S.flux>=50)) return;
  }
  for(let k=0;k<14;k++){
    const nearRift=type==="sombra"&&Math.random()<.5;
    const x=nearRift?RIFT[0]-8+rnd(17):1+rnd(W-2), z=nearRift?RIFT[1]-8+rnd(17):1+rnd(D-2);
    const s=surface(x,z); if(!s||s.id===5) continue;
    const [,d]=nearestPlayer(x+.5,z+.5); if(d<(type==="polilla"?6:12)||d>32) continue;
    if(type==="gallina"&&(s.id!==1||inLab(x+.5,z+.5,8))) continue;
    if(type==="sombra"&&(inLab(x+.5,z+.5,9.5)||lightAt(x,s.y,z)[1]>=7)) continue;
    if(solidAt(x,s.y,z)||solidAt(x,s.y+1,z)) continue;
    addMob(`${myId()}.${++mobSeq}`,type,x+.5,type==="polilla"?s.y+1.5+Math.random()*2:s.y,z+.5);
    return;
  }
}
function spawnTick(){
  const caps=mobCaps(), count={gallina:[],polilla:[],sombra:[],fatuo:[],mascota:[],mascotita:[]};
  for(const m of Object.values(mobs)) count[grp(m.type)].push(m);
  // el sol disuelve a las sombras que están a cielo abierto (salvo con flux alto)
  if(daylight>.6&&S.flux<50) for(const m of count.sombra){ if(lightAt(Math.floor(m.x),Math.floor(m.y+1),Math.floor(m.z))[0]>=12){ killMob(m,0,false); count.sombra.splice(count.sombra.indexOf(m),1); break; } }
  for(const type in caps){
    if(count[type].length<caps[type]) trySpawn(type);
    else if(count[type].length>caps[type]){ // sobran (amaneció o bajó el flux): se deshace la más lejana
      const far=count[type].sort((a,b)=>nearestPlayer(b.x,b.z)[1]-nearestPlayer(a.x,a.z)[1])[0];
      killMob(far,0,false);
    }
  }
}

/* inteligencia y física (solo quien simula) */
function think(m,dt){
  const D=MOB[m.type]; m.ai-=dt;
  if(m.type==="mascota"||m.type==="mascotita"){
    const [p,d]=nearestPlayer(m.x,m.z), big=m.type==="mascota", angry=big&&m.hp<=D.hp/2;
    if(p&&d<22&&!inLab(p[0],p[2],8.5)){ const dx=p[0]-m.x, dz=p[2]-m.z, l=Math.hypot(dx,dz)||1; m.dir=[dx/l,dz/l]; m.go=angry?1.35:1; }
    else if(m.ai<=0){ m.ai=2+Math.random()*3; const a=Math.random()*6.28; m.dir=[Math.cos(a),Math.sin(a)]; m.go=Math.random()<.5?.6:0; }
    const lx=m.x-LAB.x-.5, lz=m.z-LAB.z-.5, ld=Math.hypot(lx,lz)||1; if(ld<10){ m.dir=[lx/ld,lz/ld]; m.go=.8; } // tampoco entra al taller
    if(big){
      m.slamCd=(m.slamCd??4)-dt; m.hopT=(m.hopT||0)-dt;
      // a media vida se enoja: más rápida e invoca tres mascotitas
      if(angry&&!m.angry){ m.angry=true; for(let i=0;i<3;i++){ const a=i/3*6.28; addMob(`${myId()}.${++mobSeq}`,"mascotita",m.x+Math.cos(a)*1.6,m.y+.5,m.z+Math.sin(a)*1.6); } const ev=["angry",m.id,m.type,+m.x.toFixed(2),+m.y.toFixed(2),+m.z.toFixed(2)]; mobEvent(ev); if(teamMode) mobEvents.push(ev); }
      if(m.ground&&p&&d<5.5&&m.slamCd<=0){ m.slamCd=angry?4.5:6.5; m.vy=10.5; m.slam=true; m.go=.6; mobEvent(["boing",m.id,m.type,m.x,m.y,m.z]); if(teamMode) mobEvents.push(["boing",m.id,m.type,+m.x.toFixed(2),+m.y.toFixed(2),+m.z.toFixed(2)]); }
      else if(m.ground&&m.go>0&&m.hopT<=0){ m.hopT=.8; m.vy=5; } // camina a saltitos
    }
  } else if(m.type==="sombra"){
    const [p,d]=nearestPlayer(m.x,m.z);
    if(p&&d<16&&!inLab(p[0],p[2],8.5)){ const dx=p[0]-m.x, dz=p[2]-m.z, l=Math.hypot(dx,dz)||1; m.dir=[dx/l,dz/l]; m.go=1; }
    else if(m.ai<=0){ m.ai=2+Math.random()*3; const a=Math.random()*6.28; m.dir=[Math.cos(a),Math.sin(a)]; m.go=Math.random()<.6?.5:0; }
    const lx=m.x-LAB.x-.5, lz=m.z-LAB.z-.5, ld=Math.hypot(lx,lz)||1; if(ld<9.5){ m.dir=[lx/ld,lz/ld]; m.go=.7; } // no entra al taller
  } else if(m.flee>0){ m.flee-=dt; const dx=m.x-m.fx, dz=m.z-m.fz, l=Math.hypot(dx,dz)||1; m.dir=[dx/l,dz/l]; m.go=1.8; }
  else if(m.ai<=0){ m.ai=1.5+Math.random()*3.5; const a=Math.random()*6.28; m.dir=[Math.cos(a),Math.sin(a)];
    m.go=Math.random()<(D.fly?.9:.55)?1:0; m.dy=(Math.random()-.5)*.8; }
  // los hostiles se detienen pegados a ti (alcanzan a tocarte sin meterse dentro)
  if(D.hostile){ const [p,d]=nearestPlayer(m.x,m.z); if(p&&d<D.w/2+.35&&!m.slam) m.go=0; }
  m.vx=m.dir[0]*D.speed*m.go; m.vz=m.dir[1]*D.speed*m.go;
}
function mobHits(x,y,z,D){
  const r=D.w/2, y0=D.fly?y-D.h/2:y, y1=y0+D.h-.001;
  for(let bx=Math.floor(x-r);bx<=Math.floor(x+r);bx++) for(let by=Math.floor(y0);by<=Math.floor(y1);by++) for(let bz=Math.floor(z-r);bz<=Math.floor(z+r);bz++) if(solidAt(bx,by,bz)) return true;
  return false;
}
function physics(m,dt){
  const D=MOB[m.type], vx=m.vx+m.kx, vz=m.vz+m.kz; let bump=false;
  m.kx*=Math.max(0,1-dt*5); m.kz*=Math.max(0,1-dt*5);
  if(D.fly){ // revolotea entre 1,2 y 4 bloques sobre el suelo; si choca, cambia de rumbo
    let fy=Math.floor(m.y); while(fy>0&&!solidAt(Math.floor(m.x),fy-1,Math.floor(m.z))) fy--; const floor=fy+(D.wisp?.8:1.2);
    m.vy=m.dy+(m.y<floor?1.2:m.y>floor+2.8?-1:0)+Math.sin(performance.now()/260+m.ph)*.5;
  } else {
    const inW=getB(Math.floor(m.x),Math.floor(m.y+.2),Math.floor(m.z))===5;
    if(inW) m.vy=1.2; else m.vy=Math.max(m.vy-24*dt,-20);
  }
  const nx=m.x+vx*dt; if(!mobHits(nx,m.y,m.z,D)) m.x=nx; else bump=true;
  const nz=m.z+vz*dt; if(!mobHits(m.x,m.y,nz,D)) m.z=nz; else bump=true;
  if(D.fly){ const ny=m.y+m.vy*dt; if(!mobHits(m.x,ny,m.z,D)) m.y=ny; if(bump) m.ai=0; }
  else {
    if(bump&&m.ground&&m.go>0&&!mobHits(m.x,m.y+1.05,m.z,D)) m.vy=6.4; // salta un escalón
    const ny=m.y+m.vy*dt;
    if(mobHits(m.x,ny,m.z,D)){ if(m.vy<0&&m.slam){ m.slam=false; const ev=["slam",m.id,m.type,+m.x.toFixed(2),+m.y.toFixed(2),+m.z.toFixed(2)]; mobEvent(ev); if(teamMode) mobEvents.push(ev); }
      if(m.vy<0){ m.ground=true; const top=Math.floor(ny)+1; if(top<m.y&&!mobHits(m.x,top,m.z,D)) m.y=top; } m.vy=0; }
    else { m.y=ny; m.ground=false; }
    if(mobHits(m.x,m.y,m.z,D)) m.y=Math.floor(m.y)+1; // quedó dentro de un bloque (reapareció uno): sube
  }
  if(m.y<-4) killMob(m,0,false);
  if(Math.hypot(vx,vz)>.15){ let d=Math.atan2(-vx,-vz)-m.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); m.yaw+=d*Math.min(1,dt*8); }
}

/* golpes, muertes y botín */
function hurtMob(m,dmg,fromX,fromZ,by){
  if(!m||m.gone) return;
  m.hp-=dmg; m.hurt=.25;
  const D=MOB[m.type], kb=D.boss?1.2:5, dx=m.x-fromX, dz=m.z-fromZ, l=Math.hypot(dx,dz)||1; m.kx=dx/l*kb; m.kz=dz/l*kb; if(!D.fly&&!D.boss) m.vy=Math.max(m.vy,4);
  if(!D.hostile){ m.flee=3; m.fx=fromX; m.fz=fromZ; }
  if(m.hp<=0) killMob(m,by,true);
}
function killMob(m,by,drops){
  if(!m||!mobs[m.id]) return;
  const got=[];
  if(drops){ for(const [it,p,n] of MOB[m.type].drop) if(Math.random()<p){ give(it,n); got.push([it,n]); } hud(); save(); }
  const ev=[drops?"die":"puff",m.id,m.type,+m.x.toFixed(2),+m.y.toFixed(2),+m.z.toFixed(2),by,got];
  mobEvent(ev); if(teamMode) mobEvents.push(ev);
  removeMob(m.id);
}
// efecto de una muerte o de una sombra que se deshace; si la mató este jugador, el botín vuela hacia él
function mobEvent([k,id,type,x,y,z,by,got]){
  const D=MOB[type]; if(!D) return;
  if(k==="boing"){ if(Math.hypot(x-P.x,z-P.z)<24) sfx("boing"); return; }
  if(k==="angry"){ pick("¡La Mascota de Claude se enoja y llama a sus mascotitas!","f"); sfx("roar"); burst(x-.5,y+.5,z-.5,D.c,30); return; }
  if(k==="slam"){ // onda de choque: daña y empuja a quien esté cerca (cada jugador revisa la suya)
    for(let i=0;i<40;i++){ const a=i/40*6.28; spawn(x+Math.cos(a)*.8,y+.1,z+Math.sin(a)*.8,Math.cos(a)*5,.8,Math.sin(a)*5,h2a(i%2?"#e8833a":"#a8935c"),.6); }
    const d=Math.hypot(x-P.x,z-P.z); if(d<12){ sfx("slam"); shake=Math.max(shake,.6*(1-d/12)); }
    if(d<3.2&&Math.abs(P.y-y)<2&&S.hp>0){ const l=d||1; P.kx=(P.x-x)/l*9; P.kz=(P.z-z)/l*9; P.vy=Math.max(P.vy,5); hurtPlayer(4,"la onda de la Mascota de Claude"); }
    return;
  }
  const near=Math.hypot(x-P.x,z-P.z)<18;
  burst(x-.5,y+(D.fly?-.3:D.h/2-.5),z-.5,k==="puff"?"#7a4a8a":D.c,k==="die"?22:16);
  if(near) sfx(k==="puff"?"poof":type==="polilla"||D.wisp?"chime":"poof");
  if(k==="die"&&D.boss){ pick("¡La Mascota de Claude fue derrotada!","g"); sfx("roar"); for(let i=0;i<3;i++) setTimeout(()=>burst(x-.5+(Math.random()-.5)*2,y+.5,z-.5+(Math.random()-.5)*2,i%2?"#f2d36b":D.c,30),i*150); }
  if(k==="die"&&by===myId()&&Array.isArray(got)&&got.length){
    got.forEach(([it,n])=>{ if(ITEMS[it]) for(let i=0;i<n;i++) spawnDrop(it,x-.5,y,z-.5); });
    pick("","","+ "+got.filter(([it])=>ITEMS[it]).map(([it,n])=>icon(it,"ic sm")+" "+ITEMS[it].n+(n>1?" ×"+n:"")).join(", ")); sfx("pickup");
  }
  if(mobs[id]) mobs[id].gone=true;
}
// golpe del jugador local a la criatura que apunta
function attackMob(m,dmg=1){
  m.hurt=.25; sfx("thud"); if(m.type==="gallina") sfx("cluck"); else if(m.type==="polilla") sfx("flutter");
  const p=m.g.position; burst(p.x-.5,p.y-.3,p.z-.5,MOB[m.type].c,5);
  if(simMobs()) hurtMob(m,dmg,P.x,P.z,myId()); else netSend({t:"mobhit",id:m.id,k:"golpe",dmg,x:+P.x.toFixed(2),z:+P.z.toFixed(2)});
}
// un hostil que te alcanza te golpea y te empuja; vuelve a golpear cada segundo mientras te toque
function hostileHit(m){
  const D=MOB[m.type]; m.atk=1; const p=m.g.position, dx=P.x-p.x, dz=P.z-p.z, l=Math.hypot(dx,dz)||1; P.kx=dx/l*6; P.kz=dz/l*6; P.vy=Math.max(P.vy,3.5);
  sfx(m.type==="sombra"?"corrupt":"thud"); hurtPlayer(D.touch||3,m.type==="sombra"?"una sombra de bruma":D.boss?"la Mascota de Claude":"una mascotita");
}
function touching(m){ const D=MOB[m.type], g=m.g.position; return Math.hypot(g.x-P.x,g.z-P.z)<D.w/2+.55&&g.y<P.y+HT&&g.y+D.h>P.y; }
// la criatura más cercana que cruza la mira, si está antes que el bloque apuntado
function mobRay(maxT,reach=3.8){
  const o=camera.position, d=new THREE.Vector3(); camera.getWorldDirection(d);
  const O=[o.x,o.y,o.z], Dd=[d.x,d.y,d.z]; let best=null, bt=Math.min(maxT,reach);
  for(const m of Object.values(mobs)){
    if(m.gone||!m.g.visible) continue;
    const M=MOB[m.type], p=m.g.position, r=M.w/2+.1, y0=M.fly?p.y-M.h/2-.15:p.y, lo=[p.x-r,y0,p.z-r], hi=[p.x+r,y0+M.h+.25,p.z+r];
    let t0=0, t1=bt;
    for(let i=0;i<3&&t0<=t1;i++){
      if(Math.abs(Dd[i])<1e-9){ if(O[i]<lo[i]||O[i]>hi[i]) t0=Infinity; continue; }
      let a=(lo[i]-O[i])/Dd[i], b=(hi[i]-O[i])/Dd[i]; if(a>b) [a,b]=[b,a]; t0=Math.max(t0,a); t1=Math.min(t1,b);
    }
    if(t0<=t1&&t0<bt){ bt=t0; best=m; }
  }
  return best;
}

/* cada fotograma */
function mobsTick(dt,now){
  const sim=simMobs();
  if(sim&&!wasSim) for(const m of Object.values(mobs)){ const p=m.g.position; Object.assign(m,{x:p.x,y:m.base??p.y,z:p.z,yaw:m.g.rotation.y,vx:0,vy:0,vz:0,buf:[]}); } // ahora simulo yo
  if(!sim&&wasSim) mobOff=null;
  wasSim=sim;
  atkCd-=dt;
  if(sim){
    mobSpawnT-=dt; if(mobSpawnT<=0){ mobSpawnT=2; spawnTick(); }
    for(const m of Object.values(mobs)){ think(m,dt); physics(m,dt); }
    if(teamMode){ mobSendT+=dt; if(mobSendT>=.1){ mobSendT=0;
      netSend({t:"mobs",ms:Math.round(now),ev:mobEvents.splice(0),
        list:Object.values(mobs).filter(m=>!m.gone).map(m=>[m.id,m.type,+m.x.toFixed(2),+m.y.toFixed(2),+m.z.toFixed(2),+m.yaw.toFixed(2),m.hurt>0?1:0,MOB[m.type].boss?m.hp:0])}); } }
  }
  bossBar();
  for(const m of Object.values(mobs)){
    const g=m.g, D=MOB[m.type], ox=g.position.x, oz=g.position.z;
    // base: altura sin el vaivén de la sombra (que se suma abajo)
    if(sim){ g.position.set(m.x,m.y,m.z); g.rotation.y=m.yaw; m.base=m.y; }
    else if(m.buf.length){ const q=sampleAt(m.buf,now-mobOff-LAG); g.position.set(q[0],q[1],q[2]); g.rotation.y=q[3]; m.base=q[1]; }
    // animación según lo que se movió de verdad
    const sp=Math.hypot(g.position.x-ox,g.position.z-oz)/Math.max(dt,1e-3), k=Math.min(1,dt*10);
    m.vis+=(Math.min(sp,5)-m.vis)*k; m.ph+=dt*(4+m.vis*3);
    const P2=m.parts, sw=Math.sin(m.ph*1.6)*Math.min(1,m.vis/1.2)*.8;
    if(m.type==="gallina"){ P2.legL.rotation.x=sw; P2.legR.rotation.x=-sw; P2.head.position.z=-.2-Math.abs(sw)*.04;
      const flap=m.vis>2?Math.abs(Math.sin(m.ph*5))*1.1:0; P2.wingL.rotation.z=-flap; P2.wingR.rotation.z=flap; }
    else if(m.type==="polilla"){ const f=Math.sin(m.ph*6)*.9; P2.wingL.rotation.z=f; P2.wingR.rotation.z=-f; }
    else if(D.wisp){}
    else if(m.type==="mascota"||m.type==="mascotita"){
      P2.legs.forEach((l,i)=>l.rotation.x=(i%2?sw:-sw)*.9); const wig=Math.sin(m.ph*1.3)*.25+(m.angry?Math.sin(m.ph*6)*.35:0); P2.armL.rotation.z=wig; P2.armR.rotation.z=-wig;
      P2.body.position.y=(m.type==="mascota"?.36:.108)+Math.abs(sw)*.04; P2.body.rotation.z=sw*.05;
      const blink=(m.ph%7)<.15?.15:1; P2.eyeL.scale.y=P2.eyeR.scale.y=blink;
      m.atk=Math.max(0,(m.atk||0)-dt); if(!m.gone&&m.atk<=0&&S.hp>0&&touching(m)) hostileHit(m);
      if(Math.hypot(g.position.x-P.x,g.position.z-P.z)<12&&Math.random()<dt*.25) sfx("bip");
    }
    else { g.position.y=(m.base??g.position.y)+.15+Math.sin(m.ph*.8)*.08; P2.armL.rotation.x=-.3+Math.sin(m.ph*.9)*.25+sw*.4; P2.armR.rotation.x=-.3-Math.sin(m.ph*.9)*.25-sw*.4;
      m.atk=Math.max(0,(m.atk||0)-dt);
      if(!m.gone&&m.atk<=0&&S.hp>0&&touching(m)) hostileHit(m);
      if(Math.random()<dt*.6) spawn(g.position.x+(Math.random()-.5)*.5,g.position.y+.3,g.position.z+(Math.random()-.5)*.5,0,.4,0,h2a("#7a4a8a"),1.2); }
    if(m.type==="polilla"&&Math.random()<dt*2) spawn(g.position.x,g.position.y,g.position.z,0,-.15,0,h2a("#f2d36b"),.9);
    if(D.wisp){ P2.core.rotation.y+=dt*2; P2.core.rotation.x+=dt*1.3; P2.core.scale.setScalar(1+Math.sin(m.ph*2)*.12); if(Math.random()<dt*5) spawn(g.position.x+(Math.random()-.5)*.3,g.position.y+(Math.random()-.5)*.3,g.position.z+(Math.random()-.5)*.3,0,.15,0,h2a(D.c),.8); }
    // destello al recibir un golpe
    m.hurt=Math.max(0,m.hurt-dt); const red=m.hurt>0?m.hurt/.25:0;
    const dk=m.type==="gallina"?Math.min(1,Math.max(curveL(lightAt(Math.floor(g.position.x),Math.floor(g.position.y+.4),Math.floor(g.position.z))[0]),curveL(lightAt(Math.floor(g.position.x),Math.floor(g.position.y+.4),Math.floor(g.position.z))[1]))+.1):1; // en cuevas, más oscura
    for(const mt of m.mats){ if(mt.emissive){ mt.emissive.setRGB(red*.8,0,0); mt.color.copy(mt.userData.c).multiplyScalar(dk); } else mt.color.copy(mt.userData.c).lerp(HURT,red*.7); }
    // sonidos de cerca
    const dist=Math.hypot(g.position.x-P.x,g.position.z-P.z);
    if(dist<9&&Math.random()<dt*(m.type==="gallina"?.12:m.type==="sombra"?.15:0)) sfx(m.type==="gallina"?"cluck":"whisper");
  }
}
const HURT=new THREE.Color("#ff3030");
function bossAnnounce(){ pick("¡La Mascota de Claude anda suelta esta noche!","f"); teamSay("vio a la Mascota de Claude rondando"); }
// barra de jefe arriba, como Minecraft, si hay uno cerca
function bossBar(){
  const b=Object.values(mobs).find(m=>MOB[m.type].boss&&!m.gone&&Math.hypot(m.g.position.x-P.x,m.g.position.z-P.z)<30), el=$("bossbar");
  el.hidden=!b; if(!b) return; const D=MOB[b.type];
  setHTML(el,`<b>${D.n}${b.hp<=D.hp/2?" · enojada":""}</b><div class="bar"><i style="width:${Math.max(0,b.hp)/D.hp*100}%"></i></div>`);
}

/* equipo: el guía manda las criaturas; los demás golpean a través de él */
NET_ON.mobs=m=>{
  if(simMobs()||!Array.isArray(m.list)||!Number.isFinite(m.ms)) return;
  const d=performance.now()-m.ms; mobOff=mobOff===null?d:Math.min(mobOff,d);
  (m.ev||[]).forEach(e=>{ if(Array.isArray(e)) mobEvent(e); });
  const seen=new Set();
  for(const e of m.list){
    if(!Array.isArray(e)) continue; const [id,type,x,y,z,yaw,fl,hp]=e; if(!MOB[type]||![x,y,z,yaw].every(Number.isFinite)) continue;
    seen.add(id); const mb=mobs[id]||addMob(id,type,x,y,z); if(mb.gone) continue;
    mb.buf.push({t:m.ms,p:[x,y,z,yaw,0]}); if(mb.buf.length>20) mb.buf.shift(); if(fl&1) mb.hurt=Math.max(mb.hurt,.2); if(MOB[type].boss&&Number.isFinite(hp)) mb.hp=hp;
  }
  for(const id in mobs) if(!seen.has(id)) removeMob(id);
};
NET_ON.mobhit=m=>{
  const mb=mobs[m.id]; if(!simMobs()||!mb) return;
  hurtMob(mb,Math.max(1,Math.min(3,m.dmg|0||1)),m.x,m.z,m.from);
};
