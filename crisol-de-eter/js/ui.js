// Crisol de Éter — HUD, paneles (mochila, crisol, altar, investigación, grimorio, equipo) y controles táctiles/teclado.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= HUD y paneles ================= */
function hud(){
  $("fluxbar").style.width=Math.min(100,S.flux)+"%"; $("fluxval").textContent=`${S.flux}/100`;
  const fs=$("fstate"); fs.textContent = S.flux>=80?"Grieta inminente":S.flux>=50?"Bruma: puede corromper objetos":"Estable"; fs.style.color=S.flux>=80?"var(--bad)":S.flux>=50?"var(--flux)":"";
  $("goal").textContent = S.won ? "Corazón de Éter forjado" : busy ? "Infusión en curso…" : "Objetivo: el Corazón de Éter";
  $("clock").textContent=dayPart();
  // barra: primero los bloques para poner (se eligen), después los objetos de la mochila
  const bls=Object.keys(S.bl).map(Number); if(!S.bl[S.sel]) S.sel=bls[0]||0;
  const ids=Object.keys(ITEMS).filter(has).slice(0, Math.max(3,(isTouch?7:10)-bls.length));
  $("hotbar").innerHTML = bls.map((id,i)=>`<button class="slot bl${id===S.sel?" sel":""}" data-bl="${id}" title="${B[id].n}${isTouch?"":` (${i+1})`}" aria-pressed="${id===S.sel}">${bicon(id)}<span class="n">${S.bl[id]}</span></button>`).join("")
    + (bls.length&&ids.length?`<i class="sep"></i>`:"")
    + ids.map(i=>`<div class="slot" title="${ITEMS[i].n}">${icon(i)}<span class="n">${has(i)}</span></div>`).join("");
  $("mute").innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z" fill="currentColor"/><path d="${S.mute?"M16 9l5 6M21 9l-5 6":"M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  $("mute").setAttribute("aria-label",S.mute?"Activar el sonido":"Silenciar");
  teamHud(); updateCauldron();
}
function selectBlock(id){ if(!S.bl[id]||id===S.sel) return; S.sel=id; sfx("click"); hud(); save(); }
function cycleBlock(d){ const bls=Object.keys(S.bl).map(Number); if(bls.length<2) return; selectBlock(bls[(bls.indexOf(S.sel)+d+bls.length)%bls.length]); }
function openPanel(name){ panel=name; if(document.pointerLockElement) document.exitPointerLock?.(); mining=false; renderPanel(); $("panel").hidden=false; }
function closePanel(){ panel=null; $("panel").hidden=true; resetAsk=false; $("lockhint").hidden=locked||isTouch; }
let resetAsk=false, resetting=false;
function invRows(mode){
  const ids=Object.keys(ITEMS).filter(has);
  if(!ids.length) return `<p class="hint">Mochila vacía. Pica bloques del mundo: roca, menas, troncos, hojas… y recoge agua del río con «Usar».</p>`;
  const K=known();
  return `<div class="rows">${ids.map(id=>{
    const it=ITEMS[id], sc=S.scanned.includes(id); let acts="", note="";
    if(!sc) acts+=`<button class="btn pri" data-act="scan" data-id="${id}">Escanear</button>`;
    if(mode==="crisol" && sc){
      const recs=CRU.filter(r=>r.cat===id);
      acts+=`<button class="btn${recs.some(canCat)?"":" pri"}" data-act="dis" data-id="${id}">Disolver</button>`;
      recs.forEach(r=>{ if(!researched(r.id)){ note+=`Sirve de catalizador en una receta sin investigar (estantería del taller). `; return; }
        if(Object.keys(r.cost).every(e=>K.has(e))){ acts+=`<button class="btn${canCat(r)?" pri":""}" data-act="cat" data-id="${r.id}" ${canCat(r)?"":"disabled"}>Catalizar → ${ITEMS[r.id].n}</button>`; if(!canCat(r)) note+=`Para ${ITEMS[r.id].n}: ${Object.entries(r.cost).map(([e,n])=>`${ESS[e].n} ${S.cru[e]||0}/${n}`).join(", ")}. `; } });
    }
    if(mode==="mochila" && id==="sal") acts+=`<button class="btn pri" data-act="sal" ${S.flux?"":"disabled"}>Usar (−25 flux)</button>`;
    return `<div class="row">${icon(id)}<div style="min-width:0"><div class="nm">${it.n} <span class="mono" style="color:var(--muted)">×${has(id)}</span></div>
      <div class="chips">${sc?Object.entries(it.e).map(([e,n])=>chip(e,n)).join(""):`<span class="note">Sin escanear</span>`}</div>
      ${it.d?`<p class="note">${it.d}</p>`:""}${note?`<p class="note">${note}</p>`:""}${acts?`<div class="acts">${acts}</div>`:""}</div></div>`;
  }).join("")}</div>`;
}
function renderPanel(){
  const pb=$("pbody"); let h="";
  if(panel==="mochila"){ h=`<h2>Mochila</h2><p class="hint">Escanea aquí lo que lleves o apunta a un bloque del mundo y pulsa Escanear.</p>${invRows("mochila")}`; }
  else if(panel==="crisol"){
    const t=sum(S.cru), c=mixRGB().map(v=>Math.round(v*255));
    const chips=ESS_ORDER.filter(e=>S.cru[e]).map(e=>chip(e,S.cru[e])).join("")||`<span class="note">Vacío. Disuelve objetos escaneados.</span>`;
    h=`<h2>Crisol</h2><div class="cauldron"><div class="pot"><i style="height:${t/CAP*100}%;background:rgb(${c})"></i></div><div style="min-width:0"><div class="mono">${t} / ${CAP} de esencia</div><div class="chips">${chips}</div>${t?`<button class="btn" data-act="empty">Vaciar (+${Math.ceil(t/3)} flux)</button>`:""}</div></div>
      <h3>Echar al crisol</h3><p class="hint">Disolver libera las esencias. Con la esencia justa en el crisol, un catalizador se transforma.</p>${invRows("crisol")}`;
  }
  else if(panel==="altar"){
    h=`<h2>Altar de infusión</h2><p class="hint">Necesitas los objetos en la mochila y la esencia en el crisol. Cada pulso puede dar chispazos o fugas; si la matriz colapsa recuperas los objetos pero pierdes esencia.</p>`+
    INF.map(r=>{ const need=infNeeds(r), inst=instability(r);
      return `<div class="rcard${r.final?" final":""}"><div style="display:flex;gap:10px;align-items:center">${icon(r.id)}<div><h3 style="color:var(--fg)">${ITEMS[r.id].n}</h3><p class="note" style="margin:0">${ITEMS[r.id].d}${has(r.id)?` · tienes ${has(r.id)}`:""}</p></div></div>
      <div class="req">${Object.entries(need).map(([i,n])=>`<span class="it ${has(i)>=n?"ok":"no"}">${i===r.center?"Centro: ":""}${ITEMS[i].n}${n>1?" ×"+n:""} <span class="mono">${has(i)}/${n}</span></span>`).join("")}</div>
      <div class="chips">${Object.entries(r.cost).map(([e,n])=>chip(e,n,S.cru[e]||0)).join("")}</div>
      <div class="inst"><span>Inestabilidad</span><div class="bar"><i style="width:${inst}%"></i></div><span class="mono">${inst}%</span></div>
      <p class="note">${stabilizers(r)?`${stabilizers(r)} vela(s) estabilizando.`:"Sin velas estabilizadoras."}</p>
      <div style="margin-top:8px"><button class="btn pri" data-act="inf" data-id="${r.id}" ${canInfuse(r)&&!busy?"":"disabled"}>${!researched(r.id)?"Sin investigar: descífrala en la estantería":busy?"Hay una infusión en curso":"Iniciar infusión"}</button></div></div>`; }).join("");
  }
  else if(panel==="investigar"){
    h=`<h2>Mesa de investigación</h2><p class="hint">Cada receta resuena con una secuencia secreta de esencias. Escribe una nota (gasta 1 Pluma) y prueba secuencias: <span class="fbk f2">verde</span> está en su lugar, <span class="fbk f1">ámbar</span> está pero en otro lugar, <span class="fbk f0">gris</span> no está. Si se acaban los intentos, la nota se pierde.</p>`;
    const R=S.rsch;
    if(R){
      const r=recipe(R.id), n=resLen(r), tries=resTries(r), cell=(e,c="")=>`<span class="rc ${c}">${e?sig(e,22):""}</span>`;
      const rows=R.guesses.map(({g,fb})=>`<div class="rrow">${g.map((e,i)=>cell(e,"f"+fb[i])).join("")}</div>`).join("")
        + `<div class="rrow cur">${Array.from({length:n},(_,i)=>cell(R.cur[i],R.cur[i]?"on":"")).join("")}</div>`
        + Array.from({length:tries-R.guesses.length-1},()=>`<div class="rrow off">${Array.from({length:n},()=>cell()).join("")}</div>`).join("");
      h+=`<div class="rcard"><div style="display:flex;gap:10px;align-items:center">${icon(r.id)}<div><h3 style="color:var(--fg)">${ITEMS[r.id].n}</h3><p class="note" style="margin:0">Intento ${R.guesses.length+1} de ${tries} · secuencia de ${n} esencias (pueden repetirse)</p></div></div>
        <div class="rgrid">${rows}</div>
        <div class="pal">${resPool(r).map(e=>`<button class="btn" data-act="rpick" data-id="${e}" ${R.cur.length>=n?"disabled":""}>${sig(e,18)} ${ESS[e].n}</button>`).join("")}</div>
        <div class="acts"><button class="btn" data-act="rdel" ${R.cur.length?"":"disabled"}>Borrar</button> <button class="btn pri" data-act="rtry" ${R.cur.length===n?"":"disabled"}>Probar</button> <button class="btn" data-act="rquit">Abandonar la nota</button></div></div>`;
    } else {
      const K=known();
      h+=`<div class="rows">${[...CRU,...INF].map(r=>{ const pool=resPool(r), miss=pool.filter(e=>!K.has(e)).length;
        const body = researched(r.id) ? `<p class="note" style="color:var(--good)">Investigada</p>`
          : miss ? `<p class="note">Te faltan ${miss} esencia${miss>1?"s":""} por descubrir: escanea más materiales.</p>`
          : `<div class="chips"><span class="note" style="margin:0 4px 0 0">Resuena con</span>${pool.map(e=>`<span class="chip">${sig(e)} ${ESS[e].n}</span>`).join("")}</div>
             <div class="acts"><button class="btn pri" data-act="rstart" data-id="${r.id}" ${has("pluma")?"":"disabled"}>Escribir nota (−1 Pluma)</button></div>${has("pluma")?"":`<p class="note">Necesitas una Pluma: cae de las hojas y de los dientes de león.</p>`}`;
        return `<div class="row">${icon(r.id)}<div style="min-width:0"><div class="nm">${ITEMS[r.id].n} <span class="note">${r.cat?"crisol":"altar"} · ${resLen(r)} esencias, ${resTries(r)} intentos</span></div>${body}</div></div>`; }).join("")}</div>`;
    }
  }
  else if(panel==="equipo"){
    h=`<h2>Partida en equipo</h2><p class="hint">Todos los que abren el juego desde este servidor comparten el mundo, la mochila, los bloques, el crisol, el flux y las recetas. La partida se guarda en el equipo que corre el servidor.</p>
    <h3>Tu nombre</h3><div class="namerow"><input id="nameIn" maxlength="16" autocomplete="nickname" placeholder="Cómo te verán los demás" value="${esc(myName())}"><button class="btn pri" data-act="setname">Guardar</button></div>
    <h3>En línea</h3><div class="rows" id="teamList" style="margin:8px 0 14px"></div>
    <h3>Invitar</h3><p class="note">Conectados a la misma Wi-Fi, que abran en el navegador:</p>
    <div class="chips">${(NET.dirs.length?NET.dirs:[location.origin]).map(d=>`<span class="chip mono" style="padding:3px 10px">${esc(d)}</span>`).join("")}</div>
    <div style="margin-top:12px"><button class="btn pri" data-act="closep">Jugar</button></div>`;
  }
  else if(panel==="grimorio"){
    const K=known();
    h=`<h2>Grimorio</h2>
    <h3>Controles</h3>${isTouch?`<div class="keys"><kbd>Joystick</kbd><span>Moverte (salta solo al chocar con un bloque)</span><kbd>Arrastrar</kbd><span>Mirar alrededor</span><kbd>Picar</kbd><span>Mantén para romper el bloque al que apuntas</span><kbd>Usar</kbd><span>Abrir crisol, altar o estantería; recoger agua; poner el bloque elegido</span><kbd>Escanear</kbd><span>Aprender las esencias del bloque</span><kbd>Barra</kbd><span>Toca un bloque para elegirlo</span></div>`
      :`<div class="keys"><kbd>Clic</kbd><span>Capturar el ratón</span><kbd>WASD</kbd><span>Moverte</span><kbd>Espacio</kbd><span>Saltar o nadar</span><kbd>Clic izq.</kbd><span>Mantén para picar</span><kbd>Clic der. / E</kbd><span>Usar: crisol, altar, estantería, agua, o poner el bloque elegido</span><kbd>1–9 / rueda</kbd><span>Elegir bloque</span><kbd>F</kbd><span>Escanear el bloque apuntado</span><kbd>I</kbd><span>Mochila</span><kbd>G</kbd><span>Grimorio</span><kbd>M</kbd><span>Sonido sí / no</span><kbd>Esc / E</kbd><span>Cerrar el panel</span></div>`}
    <h3>El mundo</h3><ul class="rules"><li>Taller (centro): crisol a la izquierda, altar con 4 pedestales a la derecha, estantería de investigación al fondo.</li><li>Río (oeste): agua y arena.</li><li>Bosque (sur): troncos con ámbar, hojas con plumas y semillas.</li><li>Montaña (noreste): hierro, carbón, cuarzo y piedra chispa.</li><li>Grieta (sureste): ceniza, obsidiana y suelo corrupto. Picar ahí sube el flux.</li><li>Los recursos vuelven a aparecer al minuto.</li><li>Al picar tierra, roca, arena, troncos u hojas te llevas el bloque para ponerlo donde quieras. Lo que pones no suelta objetos ni reaparece.</li><li>Un día dura unos 6 minutos; la noche, más oscura, pasa más rápido. De noche la Grieta se agita: sus bloques sueltan el doble y dan el doble de flux.</li></ul>
    <h3>Esencias <span class="mono" style="font-size:.85rem;color:var(--muted)">${K.size}/${ESS_ORDER.length}</span></h3>
    <div class="egrid">${ESS_ORDER.map(e=>{ const E=ESS[e],k=K.has(e); const sub=!k?"Sin descubrir":E.from?(E.from.every(x=>K.has(x))?`${ESS[E.from[0]].n} + ${ESS[E.from[1]].n}`:"Compuesta"):"Primal · "+E.d; return `<div class="ess${k?"":" unk"}">${k?sig(e,24):`<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#3b3346" stroke-dasharray="2 3"/></svg>`}<div><strong>${k?E.n:"???"}</strong><small>${sub}</small></div></div>`; }).join("")}</div>
    <h3>Recetas del crisol</h3><div class="rows" style="margin:8px 0 16px">${CRU.map(r=>`<div class="row">${icon(r.id)}<div style="min-width:0"><div class="nm">${ITEMS[r.id].n}</div><p class="note">Catalizador: ${ITEMS[r.cat].n}${researched(r.id)?"":" · sin investigar: descífrala en la estantería del taller"}</p>${researched(r.id)?`<div class="chips">${Object.entries(r.cost).map(([e,n])=>chip(e,n)).join("")}</div>`:""}</div></div>`).join("")}</div>
    <h3>Investigación</h3><ul class="rules"><li>Al principio solo conoces la Sal purificadora y la Tiza arcana; las demás recetas se descifran en la estantería.</li><li>Necesitas conocer las esencias con las que resuena la receta y una Pluma para escribir la nota.</li><li>Una nota perdida suma 3 de flux.</li></ul>
    <h3>Flux</h3><ul class="rules"><li>Desbordar el crisol (más de ${CAP}) convierte el exceso en flux.</li><li>Vaciarlo genera un tercio de lo derramado.</li><li>Picar en la Grieta y las infusiones inestables suman flux.</li><li>Desde 50, cada medio minuto la bruma puede corromper un objeto.</li><li>A 100 se abre una grieta: pierdes el crisol y dos objetos.</li><li>Sal purificadora: −25. Amuleto de calma: generas la mitad.</li></ul>
    <h3>Partida</h3><p class="note">${S.mined} bloques picados · ${S.rifts} grietas · ${S.scanned.length} objetos escaneados · ${S.res.length}/${CRU.length+INF.length} recetas investigadas</p>
    ${teamMode?`<p class="note" style="margin-top:6px">Es una partida en equipo: vive en el servidor. Para empezar de cero, ciérralo y ábrelo con <span class="mono">python3 tools/servidor.py --nueva</span>.</p>`:`<div style="margin-top:8px">${resetAsk?`<button class="btn" data-act="reset2" style="border-color:var(--bad)">Sí, borrar la partida</button> <button class="btn" data-act="reset0">Cancelar</button>`:`<button class="btn" data-act="reset1">Empezar de nuevo</button>`}</div>`}`;
  }
  else if(panel==="win"){ h=`<h2>Corazón de Éter</h2><p class="hint" style="font-size:1rem">Lo forjaste tras picar ${S.mined} bloques${S.rifts?` y sobrevivir a ${S.rifts} grieta(s)`:" sin abrir ninguna grieta"}. El taller sigue abierto.</p><button class="btn pri" data-act="closep">Seguir explorando</button>`; }
  else if(panel==="help"){ h=`<h2>Crisol de Éter</h2><p class="hint" style="font-size:.95rem">Pica bloques para reunir materiales, escanéalos para descubrir sus esencias, disuélvelos en el crisol y forja objetos en el altar. Vigila el flux. La meta es el Corazón de Éter.</p>
    ${isTouch?`<div class="keys"><kbd>Joystick</kbd><span>Moverte</span><kbd>Arrastrar</kbd><span>Mirar</span><kbd>Picar</kbd><span>Mantener para romper</span><kbd>Usar</kbd><span>Crisol, altar, estantería, agua o poner un bloque</span></div>`:`<div class="keys"><kbd>WASD</kbd><span>Moverte · Espacio salta</span><kbd>Clic izq.</kbd><span>Mantén para picar</span><kbd>Clic der. / E</kbd><span>Usar o poner un bloque</span><kbd>1–9</kbd><span>Elegir bloque</span><kbd>F</kbd><span>Escanear</span><kbd>I · G</kbd><span>Mochila · Grimorio</span></div>`}
    <p class="note" style="margin-bottom:12px">Empiezas en el taller: el crisol está a tu izquierda, el altar a tu derecha y la estantería, donde se investigan las recetas, al fondo.</p><button class="btn pri" data-act="play">Jugar</button>`; }
  pb.innerHTML=h;
  if(panel==="equipo") teamList();
}
$("panel").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act,id=b.dataset.id;
  if(a==="closep") return closePanel();
  if(a==="play"){ closePanel(); if(!isTouch) canvas.requestPointerLock?.(); return; }
  if(a==="scan") scanItems([id]); else if(a==="dis") dissolve(id); else if(a==="cat") catalyze(id);
  else if(a==="sal") useSal(); else if(a==="empty") emptyCru(); else if(a==="inf") return infuse(id);
  else if(a==="rstart") startResearch(id); else if(a==="rtry") guessResearch(); else if(a==="rquit") quitResearch();
  else if(a==="rpick"){ const R=S.rsch; if(R&&R.cur.length<resLen(recipe(R.id))) R.cur.push(id); sfx("click"); }
  else if(a==="rdel"){ if(S.rsch) S.rsch.cur.pop(); sfx("click"); }
  else if(a==="reset1") resetAsk=true; else if(a==="reset0") resetAsk=false;
  else if(a==="setname"){ setName($("nameIn").value); hud(); teamList(); return; }
  else if(a==="reset2"&&!teamMode){ resetting=true; S=fresh(); save(); location.reload(); return; }
  hud(); save(); if(panel) renderPanel();
});
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>{ sfx("click"); openPanel(b.dataset.open); }));
$("mute").addEventListener("click",()=>{ setMute(!S.mute); hud(); save(); });
$("hotbar").addEventListener("click",e=>{ const b=e.target.closest("[data-bl]"); if(b) selectBlock(+b.dataset.bl); });

/* ================= Controles ================= */
document.addEventListener("pointerlockchange",()=>{ locked=document.pointerLockElement===canvas; $("lockhint").hidden = locked || !!panel || isTouch; if(!locked) mining=false; });
canvas.addEventListener("contextmenu",e=>e.preventDefault());
let look=null;
canvas.addEventListener("pointerdown",e=>{
  if(panel) return;
  if(e.pointerType==="mouse"){
    if(!locked){ const r=canvas.requestPointerLock?.(); if(r&&r.catch) r.catch(()=>{}); look={id:e.pointerId,x:e.clientX,y:e.clientY,mouse:1}; return; }
    if(e.button===0) mining=true; else if(e.button===2){ using=true; doUse(); }
  } else { look={id:e.pointerId,x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener("pointermove",e=>{ if(!look||look.id!==e.pointerId||locked) return; const s=look.mouse?.005:.006; P.yaw-=(e.clientX-look.x)*s; P.pitch-=(e.clientY-look.y)*s; look.x=e.clientX; look.y=e.clientY; });
const endLook=e=>{ if(look&&look.id===e.pointerId) look=null; if(e.pointerType==="mouse"&&e.button===0) mining=false; };
canvas.addEventListener("pointerup",endLook); canvas.addEventListener("pointercancel",endLook);
document.addEventListener("mousemove",e=>{ if(!locked) return; P.yaw-=e.movementX*.0025; P.pitch-=e.movementY*.0025; });
document.addEventListener("mouseup",e=>{ if(e.button===0) mining=false; if(e.button===2) using=false; });
document.addEventListener("wheel",e=>{ if(locked&&!panel&&e.deltaY) cycleBlock(Math.sign(e.deltaY)); },{passive:true});
document.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(e.target.tagName==="INPUT"){ if(k==="enter"&&e.target.id==="nameIn") $("panel").querySelector('[data-act="setname"]').click(); else if(k==="escape") closePanel(); return; }
  if(panel){ if(!e.repeat&&(k==="escape"||k==="e"||(k==="i"&&panel==="mochila")||(k==="g"&&panel==="grimorio"))) closePanel(); return; }
  keys[k]=true;
  if(k==="e") doUse(); else if(k==="f") doScan(); else if(k==="i") openPanel("mochila"); else if(k==="g") openPanel("grimorio"); else if(k==="q") mining=true;
  else if(k==="m"&&!e.repeat){ setMute(!S.mute); hud(); save(); }
  else if(/^[1-9]$/.test(k)){ const id=+Object.keys(S.bl)[k-1]; if(id) selectBlock(id); }
  if([" ","arrowup","arrowdown"].includes(k)) e.preventDefault();
});
document.addEventListener("keyup",e=>{ const k=e.key.toLowerCase(); keys[k]=false; if(k==="q") mining=false; });
window.addEventListener("blur",()=>{ for(const k in keys) keys[k]=false; mining=false; using=false; });
// joystick
const joyEl=$("joy"), knob=$("knob"); let joyId=null;
function joyMove(e){ const r=joyEl.getBoundingClientRect(); let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2); const m=Math.hypot(dx,dy), R=r.width/2; if(m>R){ dx*=R/m; dy*=R/m; } joy.x=dx/R; joy.y=dy/R; knob.style.transform=`translate(${dx}px,${dy}px)`; }
joyEl.addEventListener("pointerdown",e=>{ joyId=e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMove(e); });
joyEl.addEventListener("pointermove",e=>{ if(e.pointerId===joyId) joyMove(e); });
const joyEnd=e=>{ if(e.pointerId!==joyId) return; joyId=null; joy.x=joy.y=0; knob.style.transform=""; };
joyEl.addEventListener("pointerup",joyEnd); joyEl.addEventListener("pointercancel",joyEnd);
const hold=(id,on,off)=>{ const el=$(id); el.addEventListener("pointerdown",e=>{ e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add("on"); on(); }); const f=()=>{ el.classList.remove("on"); off&&off(); }; el.addEventListener("pointerup",f); el.addEventListener("pointercancel",f); };
hold("bMine",()=>mining=true,()=>mining=false);
hold("bJump",()=>jumpBtn=true,()=>jumpBtn=false);
hold("bUse",()=>{ using=true; doUse(); },()=>using=false); hold("bScan",doScan);
