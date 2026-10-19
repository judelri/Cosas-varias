// Crisol de Éter — Bucle principal de juego: movimiento, minado, tiempo del mundo, día y noche, sonido de ambiente.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Bucle ================= */
function resize(){ const w=innerWidth,h=innerHeight; renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); ARM_BASE.x=Math.min(.42,.58*Math.tan(35*Math.PI/180)*camera.aspect*.62); ARM_BASE.y=camera.aspect<1?-.27:-.4; armG.scale.setScalar(camera.aspect<1?.55:1);
  // hombro desplazado para que, en reposo, el brazo quede donde siempre
  ARM_BASE.sh=new THREE.Vector3(0,0,-SH_D).applyEuler(new THREE.Euler(ARM_BASE.rx,ARM_BASE.ry,0)).multiplyScalar(armG.scale.x); }
addEventListener("resize",resize); resize();
let last=performance.now(), tick1=0, tick30=0, savet=0, lastStep=0;
function persist(){ if(resetting) return; S.player={x:P.x,y:P.y,z:P.z,yaw:P.yaw,pitch:P.pitch}; save(); }
addEventListener("pagehide",persist); document.addEventListener("visibilitychange",()=>{ if(document.hidden) persist(); });
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  if(!panel){
    let f=0,s=0;
    if(keys["w"]||keys["arrowup"]) f+=1; if(keys["s"]||keys["arrowdown"]) f-=1;
    if(keys["d"]||keys["arrowright"]) s+=1; if(keys["a"]||keys["arrowleft"]) s-=1;
    f-=joy.y; s+=joy.x;
    const m=Math.hypot(f,s); if(m>1){ f/=m; s/=m; } moveAmt=P.ground?Math.min(1,m):0;
    const inW=getB(Math.floor(P.x),Math.floor(P.y+.4),Math.floor(P.z))===5;
    const sp=inW?2.6:4.4, sy=Math.sin(P.yaw), cy=Math.cos(P.yaw);
    // kx/kz: empujón (al tocarte una sombra), que se apaga solo
    const vx=(-sy*f+cy*s)*sp+P.kx, vz=(-cy*f-sy*s)*sp+P.kz; P.kx*=Math.max(0,1-dt*6); P.kz*=Math.max(0,1-dt*6);
    P.vy-=(inW?9:24)*dt; P.vy=Math.max(P.vy,inW?-2.5:-20);
    const jump=keys[" "]||jumpBtn;
    if(jump){ if(P.ground){ P.vy=7.6; exhaust(.05); } else if(inW) P.vy=3.2; }
    let bumped=false;
    const nx=P.x+vx*dt; if(!collides(nx,P.y,P.z)) P.x=nx; else bumped=true;
    const nz=P.z+vz*dt; if(!collides(P.x,P.y,nz)) P.z=nz; else bumped=true;
    if(bumped && P.ground && m>.2 && !collides(P.x+vx*.12,P.y+1.05,P.z+vz*.12)) P.vy=7.6;
    const ny=P.y+P.vy*dt, wasAir=!P.ground;
    if(collides(P.x,ny,P.z)){ if(P.vy<0){ P.ground=true; const top=Math.floor(ny)+1; if(top<P.y&&!collides(P.x,top,P.z)) P.y=top; } P.vy=0; } else { P.y=ny; P.ground=false; }
    if(P.y<-6){ P.x=24.5;P.y=9;P.z=27.5;P.vy=0; }
    vitals(dt,wasAir&&P.ground,inW);
  } else vitals(dt,false,true);
  P.pitch=Math.max(-1.55,Math.min(1.55,P.pitch));
  shake=Math.max(0,shake-dt);
  camera.position.set(P.x+(Math.random()-.5)*shake*.15,P.y+EYE,P.z+(Math.random()-.5)*shake*.15);
  camera.rotation.set(P.pitch,P.yaw,0);

  target=panel?null:raycast();
  targetMob=panel?null:mobRay(target?target.t:9); // una criatura delante del bloque tiene prioridad
  if(targetMob){ const M=MOB[targetMob.type]; sel.visible=false; $("tgtName").textContent=M.n; $("tgtHint").textContent=M.hostile?"¡Hostil! Picar: golpear":"Picar: golpear · Escanear"; }
  else if(target){ sel.visible=true; sel.position.set(target.x+.5,target.y+.5,target.z+.5);
    const b=B[target.id]; $("tgtName").textContent=b.n;
    $("tgtHint").textContent = b.use ? "Usar: abrir" : b.water ? "Usar: recoger agua" : b.unbreak ? "" : `Picar${b.drop?" · Escanear":""}`;
  } else { sel.visible=false; $("tgtName").textContent=""; $("tgtHint").textContent=""; }
  if(mining&&targetMob){ if(atkCd<=0){ atkCd=.45; attackMob(targetMob); exhaust(.1); } mine.k=null; mine.p=0; }
  else if(mining && target && !B[target.id].unbreak && !B[target.id].water && !B[target.id].custom){
    const k=`${target.x},${target.y},${target.z}`; if(mine.k!==k){ mine.k=k; mine.p=0; }
    mine.p+=dt/B[target.id].hard*(has("lente")?2:1);
    if(Math.random()<.3) burst(target.x,target.y,target.z,B[target.id].c,1);
    if(mine.p>=1){ breakBlock(target); mine.k=null; mine.p=0; }
  } else { mine.k=null; mine.p=0; }
  $("mineWrap").hidden=!mine.k; $("mineBar").style.width=(mine.p*100)+"%";
  if(mine.k&&target&&!B[target.id].plant){ crackMesh.visible=true; crackMesh.position.set(target.x+.5,target.y+.5,target.z+.5); crackTex.offset.x=Math.min(9,Math.floor(mine.p*10))/10; } else crackMesh.visible=false;
  useCd=Math.max(0,useCd-dt);
  // mantener Usar pone bloques seguidos (o sigue recogiendo agua)
  if(using&&!panel&&useCd<=0&&target&&(target.id===5||(S.bl[S.sel]&&!B[target.id].use))) doUse();

  // tiempo del mundo
  tick1+=dt; tick30+=dt; savet+=dt;
  if(tick1>1){ tick1=0; const now2=Date.now();
    // en equipo, las reapariciones y la bruma las hace un solo jugador (el guía) para que no se repitan
    if(!teamMode||NET.leader) for(const [k,r] of Object.entries(S.resp)){ if(now2<r.t) continue; const [x,y,z]=k.split(",").map(Number);
      if(getB(x,y,z)!==0){ delete S.resp[k]; continue; } if(inBody(x,y,z)||netInBody(x,y,z)) continue; setBlock(x,y,z,r.id); delete S.resp[k]; }
    if($("clock").textContent!==dayPart()) hud(); }
  if(tick30>30){ tick30=0; if((!teamMode||NET.leader) && S.flux>=50 && Math.random()<.35){ const raws=Object.keys(S.inv).filter(i=>!ITEMS[i].crafted&&i!=="corrupta"); if(raws.length){ const v=raws[rnd(raws.length)]; take(v); give("corrupta"); pick(`La bruma corrompió: ${ITEMS[v].n}`,"f"); sfx("corrupt"); teamSay(`vio cómo la bruma corrompía: ${ITEMS[v].n}`); hud(); } } }
  if(savet>5){ savet=0; persist(); }

  // ambiente
  S.time=(S.time+dt/DAY_LEN*(daylight<.5?2:1))%1;
  skyG.position.copy(camera.position); updateSky(); cloudTex.offset.x+=dt*.0015;
  ambient(dt,daylight,Math.hypot(P.x-CRUC[0]-.5,P.z-CRUC[2]-.5)<6,sum(S.cru)>0);
  updateDrops(dt); netTick(dt); mobsTick(dt,now);
  // brazo
  walkPh+=dt*moveAmt*9;
  const st=Math.floor(walkPh/Math.PI); if(st!==lastStep){ lastStep=st; const u=getB(Math.floor(P.x),Math.floor(P.y-.05),Math.floor(P.z)); if(u>0) sfx("step",u); }
  // golpe: al picar se repite; al soltar termina la vuelta en curso en vez de saltar a la posición de reposo
  const swinging=mining&&(target||targetMob)&&!panel, prevSw=swing;
  if(swinging&&swing===0) swing=1e-4;
  if(swing>0){ swing+=dt*2.6; if(swing>=1) swing=swinging?swing-1:0; }
  if(swinging&&target&&!targetMob&&prevSw<.25&&swing>=.25) sfx("hit",target.id); // el golpe suena cuando el pico llega abajo
  const sw=swing>0?strike(swing):0;
  bobA+=(moveAmt-bobA)*Math.min(1,dt*8);
  armG.visible=!panel;
  { const L=brightAt(P.x,P.y+EYE,P.z); worldMats.forEach(w=>w.m.color.copy(w.c).multiplyScalar(L)); } // la mano se ve con la luz del lugar
  armG.rotation.set(ARM_BASE.rx-sw*.6,ARM_BASE.ry+sw*.3,0);
  const sh=ARM_BASE.sh; armG.position.set(ARM_BASE.x-sh.x+Math.cos(walkPh)*.015*bobA,ARM_BASE.y-sh.y+Math.abs(Math.sin(walkPh))*.03*bobA-sw*.02,ARM_BASE.z-sh.z-sw*.14);
  // chispas de las antorchas cercanas
  for(const i of LIGHTS){ if(world[i]!==TORCH||Math.random()>dt*3) continue; const x=i%W, z=Math.floor(i/W)%D, y=Math.floor(i/(W*D)); if(Math.abs(x-P.x)<16&&Math.abs(z-P.z)<16) spawn(x+.5+(Math.random()-.5)*.1,y+.82,z+.5+(Math.random()-.5)*.1,0,.5,0,h2a(Math.random()<.5?"#f2b13c":"#e0743c"),.5); }
  if(Math.random()<(daylight<.3?.95:.5)) spawn(RIFT[0]+(Math.random()-.5)*12,4+Math.random()*2,RIFT[1]+(Math.random()-.5)*12,0,.5+Math.random()*.6,0,h2a(Math.random()<.5?"#9a62b0":"#7476a8"),3);
  if(S.flux>=50 && Math.random()<S.flux/150) spawn(P.x+(Math.random()-.5)*14,P.y+Math.random()*4,P.z+(Math.random()-.5)*14,0,.2,0,h2a("#c4579f"),2.5);
  if(sum(S.cru)&&Math.random()<.25){ const c=mixRGB(); spawn(CRUC[0]+.3+Math.random()*.4,liquid.position.y+CRUC[1]+.05,CRUC[2]+.3+Math.random()*.4,0,.5,0,c,.8); }
  floaters.forEach((fl2,i)=>{ fl2.m.position.y=fl2.base+Math.sin(now/400+i)*.06; });

  for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life-=dt; if(p.life<=0){ parts.splice(i,1); continue; } p.vy-=p.grav*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt; }
  for(let i=0;i<parts.length;i++){ const p=parts[i]; pPos[i*3]=p.x; pPos[i*3+1]=p.y; pPos[i*3+2]=p.z; pCol[i*3]=p.c[0]; pCol[i*3+1]=p.c[1]; pCol[i*3+2]=p.c[2]; }
  pGeo.setDrawRange(0,parts.length); pGeo.attributes.position.needsUpdate=true; pGeo.attributes.color.needsUpdate=true;

  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
updateSky(); hud();
if(!S.player) openPanel("help");
else if(!isTouch) $("lockhint").hidden=false;
requestAnimationFrame(frame);
