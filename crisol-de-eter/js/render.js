// Crisol de Éter — Escena Three.js: cielo, mallado con oclusión ambiental, taller, partículas, grietas, brazo y drops.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Three.js ================= */
const canvas=$("c");
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:false}); }
catch(e){ document.body.innerHTML='<div class="err"><div><h2>Tu navegador no pudo iniciar WebGL</h2><p class="hint">El mundo 3D necesita aceleración gráfica. Prueba con otro navegador o dispositivo.</p></div></div>'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();
const SKY_TOP=new THREE.Color("#78a7ff"), SKY_HOR=new THREE.Color("#c3d9ff"), FLUX_TOP=new THREE.Color("#2e1a3e"), FLUX_HOR=new THREE.Color("#7a4a8a");
scene.background=SKY_HOR.clone(); scene.fog=new THREE.Fog(SKY_HOR.clone(),34,96);
const camera=new THREE.PerspectiveCamera(70,1,.05,400); camera.rotation.order="YXZ"; scene.add(camera);
scene.add(new THREE.AmbientLight(0xffffff,.62));
const sunL=new THREE.DirectionalLight(0xfff2dd,.55); sunL.position.set(.5,1,.3); scene.add(sunL);

/* cielo, sol y nubes */
const skyG=new THREE.Group(); scene.add(skyG);
const skyGeo=new THREE.SphereGeometry(180,24,12);
skyGeo.setAttribute("color",new THREE.Float32BufferAttribute(new Float32Array(skyGeo.attributes.position.count*3),3));
const skyMesh=new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false}));
skyMesh.renderOrder=-2; skyG.add(skyMesh);
let skyFlux=-1;
function paintSky(f){
  const top=SKY_TOP.clone().lerp(FLUX_TOP,f), hor=SKY_HOR.clone().lerp(FLUX_HOR,f), p=skyGeo.attributes.position, c=skyGeo.attributes.color, tmp=new THREE.Color();
  for(let i=0;i<p.count;i++){ const t=Math.max(0,Math.min(1,p.getY(i)/180*2.2)); tmp.copy(hor).lerp(top,t); c.setXYZ(i,tmp.r,tmp.g,tmp.b); }
  c.needsUpdate=true; scene.fog.color.copy(hor); scene.background.copy(hor);
}
const sunDir=new THREE.Vector3(.45,.72,-.52).normalize();
const sunMesh=new THREE.Mesh(new THREE.PlaneGeometry(22,22),new THREE.MeshBasicMaterial({color:"#fff7d0",fog:false,depthWrite:false}));
const sunHalo=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshBasicMaterial({color:"#fff2b0",fog:false,transparent:true,opacity:.22,depthWrite:false}));
sunMesh.position.copy(sunDir).multiplyScalar(165); sunHalo.position.copy(sunDir).multiplyScalar(166);
sunMesh.lookAt(0,0,0); sunHalo.lookAt(0,0,0); sunMesh.renderOrder=sunHalo.renderOrder=-1; skyG.add(sunHalo,sunMesh);
const cloudC=document.createElement("canvas"); cloudC.width=cloudC.height=32;
{ const cg=cloudC.getContext("2d"); for(let y=0;y<32;y++) for(let x=0;x<32;x++){ const v=vnoise(x/4.2+50,y/4.2+50)*.7+vnoise(x/2+9,y/2+9)*.3; if(v>.6){ cg.fillStyle="#ffffff"; cg.fillRect(x,y,1,1); } } }
const cloudTex=new THREE.CanvasTexture(cloudC); cloudTex.magFilter=cloudTex.minFilter=THREE.NearestFilter; cloudTex.wrapS=cloudTex.wrapT=THREE.RepeatWrapping; cloudTex.repeat.set(5,5);
const clouds=new THREE.Mesh(new THREE.PlaneGeometry(480,480),new THREE.MeshBasicMaterial({map:cloudTex,transparent:true,opacity:.82,fog:false,depthWrite:false,side:THREE.DoubleSide}));
clouds.rotation.x=-Math.PI/2; clouds.position.set(24,40,24); scene.add(clouds);

/* materiales y mallado con luz suave (oclusión ambiental) */
const atex=new THREE.CanvasTexture(atlas); atex.magFilter=THREE.NearestFilter; atex.minFilter=THREE.NearestFilter;
const solidMat=new THREE.MeshBasicMaterial({map:atex,vertexColors:true,alphaTest:.5});
const plantMat=new THREE.MeshBasicMaterial({map:atex,vertexColors:true,alphaTest:.5,side:THREE.DoubleSide});
const waterMat=new THREE.MeshBasicMaterial({map:atex,vertexColors:true,transparent:true,opacity:.74,depthWrite:false});
const FACES=[
  {d:[-1,0,0],sh:.6,c:[[0,1,0,0,1],[0,0,0,0,0],[0,1,1,1,1],[0,0,1,1,0]]},
  {d:[1,0,0],sh:.6,c:[[1,1,1,0,1],[1,0,1,0,0],[1,1,0,1,1],[1,0,0,1,0]]},
  {d:[0,-1,0],sh:.5,c:[[1,0,1,1,0],[0,0,1,0,0],[1,0,0,1,1],[0,0,0,0,1]]},
  {d:[0,1,0],sh:1,c:[[0,1,1,1,1],[1,1,1,0,1],[0,1,0,1,0],[1,1,0,0,0]]},
  {d:[0,0,-1],sh:.8,c:[[1,0,0,0,0],[0,0,0,1,0],[1,1,0,0,1],[0,1,0,1,1]]},
  {d:[0,0,1],sh:.8,c:[[0,0,1,0,0],[1,0,1,1,0],[0,1,1,0,1],[1,1,1,1,1]]}
];
const AOC=[.42,.62,.8,1];
const isOpaque=id=>id>0&&!B[id].water&&!B[id].plant&&!B[id].custom&&!B[id].leaves;
function vao(x,y,z,f,c){
  const d=f.d, a=d[0]?0:d[1]?1:2, t=[0,1,2].filter(i=>i!==a), o1=[0,0,0], o2=[0,0,0];
  o1[t[0]]=c[t[0]]?1:-1; o2[t[1]]=c[t[1]]?1:-1;
  const bx=x+d[0],by=y+d[1],bz=z+d[2];
  const s1=isOpaque(getB(bx+o1[0],by+o1[1],bz+o1[2]))?1:0, s2=isOpaque(getB(bx+o2[0],by+o2[1],bz+o2[2]))?1:0;
  const cr=isOpaque(getB(bx+o1[0]+o2[0],by+o1[1]+o2[1],bz+o1[2]+o2[2]))?1:0;
  return s1&&s2?0:3-(s1+s2+cr);
}
const CH=16, chunks={};
function geo(a){ const gm=new THREE.BufferGeometry(); gm.setAttribute("position",new THREE.Float32BufferAttribute(a[0],3)); gm.setAttribute("uv",new THREE.Float32BufferAttribute(a[2],2)); gm.setAttribute("color",new THREE.Float32BufferAttribute(a[3],3)); gm.setIndex(a[4]); return gm; }
const uvOf=(tile,u,v)=>[(tile+.002+u*.996)/NT,.002+v*.996];
function buildChunk(cx,cz){
  const s=[[],[],[],[],[]], w=[[],[],[],[],[]], p=[[],[],[],[],[]];
  for(let y=0;y<H;y++) for(let z=cz*CH;z<cz*CH+CH;z++) for(let x=cx*CH;x<cx*CH+CH;x++){
    const id=world[ix(x,y,z)]; if(!id||B[id].custom) continue;
    const bd=B[id];
    if(bd.plant){
      const tile=TI[bd.t[0]], j=(hash(x*7+y,z*13)-.5)*.3;
      for(const [ax,az,bx,bz] of [[.15,.15,.85,.85],[.15,.85,.85,.15]]){
        const base=p[0].length/3;
        p[0].push(x+ax+j,y,z+az+j, x+bx+j,y,z+bz+j, x+ax+j,y+1,z+az+j, x+bx+j,y+1,z+bz+j);
        p[2].push(...uvOf(tile,0,0),...uvOf(tile,1,0),...uvOf(tile,0,1),...uvOf(tile,1,1));
        for(let k=0;k<4;k++) p[3].push(.92,.92,.92);
        p[4].push(base,base+1,base+2,base+2,base+1,base+3);
      }
      continue;
    }
    const isW=!!bd.water;
    for(const f of FACES){
      const n=getB(x+f.d[0],y+f.d[1],z+f.d[2]);
      if(isW){ if(n!==0&&!(n>0&&B[n].plant)) continue; }
      else if(n!==-1 && isOpaque(n)) continue;
      const t=bd.t, tile=TI[t.length===1?t[0]:f.d[1]===1?t[0]:f.d[1]===-1?t[2]:t[1]];
      const a=isW?w:s, base=a[0].length/3, ao=[];
      for(const c of f.c){
        let yy=y+c[1]; if(isW&&c[1]===1&&getB(x,y+1,z)!==5) yy-=.12;
        a[0].push(x+c[0],yy,z+c[2]); a[2].push(...uvOf(tile,c[3],c[4]));
        const o=isW?3:vao(x,y,z,f,c); ao.push(o); const b=f.sh*AOC[o]; a[3].push(b,b,b);
      }
      if(ao[0]+ao[3]>ao[1]+ao[2]) a[4].push(base,base+1,base+2,base+2,base+1,base+3);
      else a[4].push(base,base+1,base+3,base,base+3,base+2);
    }
  }
  const key=cx+","+cz, old=chunks[key];
  if(old){ for(const m of [old.s,old.w,old.p]){ scene.remove(m); m.geometry.dispose(); } }
  const ms=new THREE.Mesh(geo(s),solidMat), mw=new THREE.Mesh(geo(w),waterMat), mp=new THREE.Mesh(geo(p),plantMat); mw.renderOrder=1;
  scene.add(ms,mw,mp); chunks[key]={s:ms,w:mw,p:mp};
}
for(let cx=0;cx<W/CH;cx++) for(let cz=0;cz<D/CH;cz++) buildChunk(cx,cz);
function setBlock(x,y,z,id){
  world[ix(x,y,z)]=id; S.world[`${x},${y},${z}`]=id;
  const cx=Math.floor(x/CH), cz=Math.floor(z/CH); buildChunk(cx,cz);
  if(x%CH===0&&cx>0) buildChunk(cx-1,cz); if(x%CH===CH-1&&cx<W/CH-1) buildChunk(cx+1,cz);
  if(z%CH===0&&cz>0) buildChunk(cx,cz-1); if(z%CH===CH-1&&cz<D/CH-1) buildChunk(cx,cz+1);
}

/* objetos del taller */
const lam=(o)=>new THREE.MeshLambertMaterial(o);
const metalTex=tileTex("metal"), altarTex=tileTex("altar"), brickTex=tileTex("bricks");
const cauldron=new THREE.Group(); cauldron.position.set(CRUC[0]+.5,CRUC[1],CRUC[2]+.5); scene.add(cauldron);
{ const m=lam({map:metalTex});
  const add=(w,h,d,x,y,z)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); cauldron.add(b); };
  add(.9,.12,.9,0,.12,0); add(.1,.75,.9,-.4,.5,0); add(.1,.75,.9,.4,.5,0); add(.9,.75,.1,0,.5,-.4); add(.9,.75,.1,0,.5,.4);
  [[-.35,-.35],[.35,-.35],[-.35,.35],[.35,.35]].forEach(([x,z])=>add(.12,.12,.12,x,.03,z));
  const fire=new THREE.Mesh(new THREE.BoxGeometry(.5,.04,.5),new THREE.MeshBasicMaterial({color:"#e0743c"})); fire.position.y=.02; cauldron.add(fire);
}
const liquid=new THREE.Mesh(new THREE.BoxGeometry(.7,.02,.7),new THREE.MeshLambertMaterial({color:"#2a2433",emissive:"#000",transparent:true,opacity:.92}));
cauldron.add(liquid);
function mixRGB(){ const t=sum(S.cru); if(!t) return [.16,.14,.2]; let r=0,gg=0,b=0; for(const [e,n] of Object.entries(S.cru)){ const c=h2a(ESS[e].c); r+=c[0]*n; gg+=c[1]*n; b+=c[2]*n; } return [r/t,gg/t,b/t]; }
function updateCauldron(){ const f=sum(S.cru)/CAP; liquid.position.y=.2+.6*f; liquid.visible=f>0; const c=mixRGB(); liquid.material.color.setRGB(...c); liquid.material.emissive.setRGB(c[0]*.35,c[1]*.35,c[2]*.35); }
const altarG=new THREE.Group(); scene.add(altarG);
{ const mA=lam({map:altarTex}), mB=lam({map:brickTex}), gold=lam({color:"#cfa75a",emissive:"#3a2a10"});
  const box=(w,h,d,m,x,y,z)=>{ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); altarG.add(b); };
  box(.86,.8,.86,mB,ALT[0]+.5,ALT[1]+.4,ALT[2]+.5); box(.96,.14,.96,mA,ALT[0]+.5,ALT[1]+.87,ALT[2]+.5); box(.3,.05,.3,gold,ALT[0]+.5,ALT[1]+.96,ALT[2]+.5);
  PEDS.forEach(p=>{ box(.46,.7,.46,mB,p[0]+.5,p[1]+.35,p[2]+.5); box(.6,.12,.6,mA,p[0]+.5,p[1]+.76,p[2]+.5); });
}
const floaters=[];
function clearFloaters(){ floaters.forEach(f=>scene.remove(f.m)); floaters.length=0; }
function addFloater(item,pos,center){ const tx=new THREE.CanvasTexture(ICONC[item]); tx.magFilter=tx.minFilter=THREE.NearestFilter; const m=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true})); m.scale.set(.5,.5,.5); m.position.set(pos[0]+.5,pos[1]+(center?1.35:1.15),pos[2]+.5); scene.add(m); floaters.push({m,base:m.position.y,pos,center}); }

/* partículas */
const MAXP=700, pPos=new Float32Array(MAXP*3), pCol=new Float32Array(MAXP*3), parts=[];
const pGeo=new THREE.BufferGeometry(); pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3)); pGeo.setAttribute("color",new THREE.BufferAttribute(pCol,3));
const points=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.11,vertexColors:true,transparent:true,depthWrite:false}));
points.frustumCulled=false; scene.add(points);
function spawn(x,y,z,vx,vy,vz,c,life,grav=0){ if(parts.length>=MAXP) parts.shift(); parts.push({x,y,z,vx,vy,vz,c,life,grav}); }
function burst(x,y,z,hex,n=14){ const c=h2a(hex); for(let i=0;i<n;i++) spawn(x+.5,y+.5,z+.5,(Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3,c,.6+Math.random()*.4,9); }
function crucibleSplash(e){ for(const k of Object.keys(e)){ const c=h2a(ESS[k].c); for(let i=0;i<8;i++) spawn(CRUC[0]+.5+(Math.random()-.5)*.5,CRUC[1]+.8,CRUC[2]+.5+(Math.random()-.5)*.5,(Math.random()-.5),1.5+Math.random()*1.5,(Math.random()-.5),c,.9,3); } }
const sel=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01)),new THREE.LineBasicMaterial({color:0x000000,transparent:true,opacity:.55}));
scene.add(sel); sel.visible=false;

/* grietas al picar (10 etapas) */
const crackC=document.createElement("canvas"); crackC.width=160; crackC.height=16;
{ const cg=crackC.getContext("2d"), pts=[]; let cs=99; const cr=()=>{ cs=(cs*16807)%2147483647; return cs/2147483647; };
  for(let w=0;w<7;w++){ let x=7+Math.round(cr()*2),y=7+Math.round(cr()*2),dx=cr()<.5?-1:1,dy=cr()<.5?-1:1; if(cr()<.5) dx=0; else if(cr()<.5) dy=0;
    for(let k=0;k<10;k++){ pts.push([x,y]); if(cr()<.35){ if(cr()<.5) dx=dx?0:(cr()<.5?-1:1); else dy=dy?0:(cr()<.5?-1:1); if(!dx&&!dy) dx=1; } x+=dx; y+=dy; if(x<0||y<0||x>15||y>15) break; } }
  for(let s=0;s<10;s++){ const n=Math.ceil(pts.length*(s+1)/10); for(let i=0;i<n;i++){ cg.fillStyle="rgba(18,14,20,.85)"; cg.fillRect(s*16+pts[i][0],pts[i][1],1,1); } } }
const crackTex=new THREE.CanvasTexture(crackC); crackTex.magFilter=crackTex.minFilter=THREE.NearestFilter; crackTex.repeat.set(.1,1);
const crackMesh=new THREE.Mesh(new THREE.BoxGeometry(1.006,1.006,1.006),new THREE.MeshBasicMaterial({map:crackTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
crackMesh.visible=false; scene.add(crackMesh);

/* brazo y pico en primera persona */
const pickC=document.createElement("canvas"); pickC.width=pickC.height=16;
{ const pg2=pickC.getContext("2d"), m=[];
  const segD=(x,y,ax,ay,bx,by)=>{ const vx=bx-ax,vy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy))); return Math.hypot(x-(ax+vx*t),y-(ay+vy*t)); };
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const cx=x+.5,cy=y+.5, r=Math.hypot(cx-6,cy-10);
    if(r>7.9&&r<10.1&&cx>4&&cy<12) m[y*16+x]="h"; else if(segD(cx,cy,1.5,14.5,10.5,5.5)<.85) m[y*16+x]="w"; }
  const on=(x,y)=>x>=0&&y>=0&&x<16&&y<16&&m[y*16+x];
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const k=on(x,y);
    if(k==="h"){ pg2.fillStyle=Math.hypot(x+.5-6,y+.5-10)<9?"#c9c9d2":"#8d8d98"; pg2.fillRect(x,y,1,1); }
    else if(k==="w"){ pg2.fillStyle=(x+y)%3?"#7a5634":"#5e4127"; pg2.fillRect(x,y,1,1); }
    else if(on(x-1,y)||on(x+1,y)||on(x,y-1)||on(x,y+1)){ pg2.fillStyle="#1a1418"; pg2.fillRect(x,y,1,1); } } }
const pickTex=new THREE.CanvasTexture(pickC); pickTex.magFilter=pickTex.minFilter=THREE.NearestFilter;
const armG=new THREE.Group(); camera.add(armG);
const ARM_BASE={x:.42,y:-.4,z:-.58,rx:.15,ry:-.25};
armG.position.set(ARM_BASE.x,ARM_BASE.y,ARM_BASE.z);
{ const skin=new THREE.MeshBasicMaterial({color:"#c38c62"}), sleeve=new THREE.MeshBasicMaterial({color:"#3b5e8c"});
  const a=new THREE.Mesh(new THREE.BoxGeometry(.15,.15,.5),skin); a.position.z=-.05; armG.add(a);
  const sl=new THREE.Mesh(new THREE.BoxGeometry(.165,.165,.22),sleeve); sl.position.z=.22; armG.add(sl);
  const pick=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.MeshBasicMaterial({map:pickTex,alphaTest:.5,side:THREE.DoubleSide}));
  pick.position.set(-.02,.2,-.3); pick.rotation.set(-.2,Math.PI-.55,-.15); armG.add(pick); }
armG.traverse(o=>{ if(o.material){ o.material.depthTest=false; o.material.fog=false; o.renderOrder=10; } });
let useSwing=0, walkPh=0, moveAmt=0;

/* objetos que saltan del bloque y vuelan hacia ti */
const drops=[], dropTex={};
function spawnDrop(item,x,y,z){
  if(!dropTex[item]){ const t=new THREE.CanvasTexture(ICONC[item]); t.magFilter=t.minFilter=THREE.NearestFilter; dropTex[item]=t; }
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:dropTex[item],transparent:true})); sp.scale.set(.32,.32,.32);
  sp.position.set(x+.5,y+.5,z+.5); scene.add(sp);
  drops.push({sp,vx:(Math.random()-.5)*2,vy:3.2,vz:(Math.random()-.5)*2,t:0});
}
function updateDrops(dt){
  for(let i=drops.length-1;i>=0;i--){ const d=drops[i]; d.t+=dt; const p=d.sp.position;
    if(d.t<.35){ d.vy-=14*dt; p.x+=d.vx*dt; p.y+=d.vy*dt; p.z+=d.vz*dt; }
    else { const tx=P.x,ty=P.y+.9,tz=P.z, k=Math.min(1,dt*9); p.x+=(tx-p.x)*k; p.y+=(ty-p.y)*k; p.z+=(tz-p.z)*k; }
    if(d.t>1.1||(d.t>.35&&Math.hypot(p.x-P.x,p.y-P.y-.9,p.z-P.z)<.35)){ scene.remove(d.sp); d.sp.material.dispose(); drops.splice(i,1); } }
}
