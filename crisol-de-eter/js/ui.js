// Crisol de Éter — HUD, paneles (mochila, crisol, altar, grimorio) y controles táctiles/teclado.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= HUD y paneles ================= */
function hud(){
  $("fluxbar").style.width=Math.min(100,S.flux)+"%"; $("fluxval").textContent=`${S.flux}/100`;
  const fs=$("fstate"); fs.textContent = S.flux>=80?"Grieta inminente":S.flux>=50?"Bruma: puede corromper objetos":"Estable"; fs.style.color=S.flux>=80?"var(--bad)":S.flux>=50?"var(--flux)":"";
  $("goal").textContent = S.won ? "Corazón de Éter forjado" : busy ? "Infusión en curso…" : "Objetivo: el Corazón de Éter";
  const ids=Object.keys(ITEMS).filter(has).slice(0, isTouch?6:9);
  $("hotbar").innerHTML = ids.map(i=>`<div class="slot" title="${ITEMS[i].n}">${icon(i)}<span class="n">${has(i)}</span></div>`).join("");
  updateCauldron();
}
function openPanel(name){ panel=name; if(document.pointerLockElement) document.exitPointerLock?.(); mining=false; renderPanel(); $("panel").hidden=false; }
function closePanel(){ panel=null; $("panel").hidden=true; resetAsk=false; }
let resetAsk=false;
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
      recs.forEach(r=>{ if(Object.keys(r.cost).every(e=>K.has(e))){ acts+=`<button class="btn${canCat(r)?" pri":""}" data-act="cat" data-id="${r.id}" ${canCat(r)?"":"disabled"}>Catalizar → ${ITEMS[r.id].n}</button>`; if(!canCat(r)) note+=`Para ${ITEMS[r.id].n}: ${Object.entries(r.cost).map(([e,n])=>`${ESS[e].n} ${S.cru[e]||0}/${n}`).join(", ")}. `; } });
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
      <div style="margin-top:8px"><button class="btn pri" data-act="inf" data-id="${r.id}" ${canInfuse(r)&&!busy?"":"disabled"}>${busy?"Hay una infusión en curso":"Iniciar infusión"}</button></div></div>`; }).join("");
  }
  else if(panel==="grimorio"){
    const K=known();
    h=`<h2>Grimorio</h2>
    <h3>Controles</h3>${isTouch?`<div class="keys"><kbd>Joystick</kbd><span>Moverte (salta solo al chocar con un bloque)</span><kbd>Arrastrar</kbd><span>Mirar alrededor</span><kbd>Picar</kbd><span>Mantén para romper el bloque al que apuntas</span><kbd>Usar</kbd><span>Abrir crisol, altar o estantería; recoger agua</span><kbd>Escanear</kbd><span>Aprender las esencias del bloque</span></div>`
      :`<div class="keys"><kbd>Clic</kbd><span>Capturar el ratón</span><kbd>WASD</kbd><span>Moverte</span><kbd>Espacio</kbd><span>Saltar o nadar</span><kbd>Clic izq.</kbd><span>Mantén para picar</span><kbd>Clic der. / E</kbd><span>Usar: crisol, altar, estantería, agua</span><kbd>F</kbd><span>Escanear el bloque apuntado</span><kbd>I</kbd><span>Mochila</span><kbd>G</kbd><span>Grimorio</span></div>`}
    <h3>El mundo</h3><ul class="rules"><li>Taller (centro): crisol a la izquierda, altar con 4 pedestales a la derecha, estantería al fondo.</li><li>Río (oeste): agua y arena.</li><li>Bosque (sur): troncos con ámbar, hojas con plumas y semillas.</li><li>Montaña (noreste): hierro, carbón, cuarzo y piedra chispa.</li><li>Grieta (sureste): ceniza, obsidiana y suelo corrupto. Picar ahí sube el flux.</li><li>Los recursos vuelven a aparecer al minuto.</li></ul>
    <h3>Esencias <span class="mono" style="font-size:.85rem;color:var(--muted)">${K.size}/${ESS_ORDER.length}</span></h3>
    <div class="egrid">${ESS_ORDER.map(e=>{ const E=ESS[e],k=K.has(e); const sub=!k?"Sin descubrir":E.from?(E.from.every(x=>K.has(x))?`${ESS[E.from[0]].n} + ${ESS[E.from[1]].n}`:"Compuesta"):"Primal · "+E.d; return `<div class="ess${k?"":" unk"}">${k?sig(e,24):`<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#3b3346" stroke-dasharray="2 3"/></svg>`}<div><strong>${k?E.n:"???"}</strong><small>${sub}</small></div></div>`; }).join("")}</div>
    <h3>Recetas del crisol</h3><div class="rows" style="margin:8px 0 16px">${CRU.map(r=>`<div class="row">${icon(r.id)}<div style="min-width:0"><div class="nm">${ITEMS[r.id].n}</div><p class="note">Catalizador: ${ITEMS[r.cat].n}</p><div class="chips">${Object.entries(r.cost).map(([e,n])=>chip(e,n)).join("")}</div></div></div>`).join("")}</div>
    <h3>Flux</h3><ul class="rules"><li>Desbordar el crisol (más de ${CAP}) convierte el exceso en flux.</li><li>Vaciarlo genera un tercio de lo derramado.</li><li>Picar en la Grieta y las infusiones inestables suman flux.</li><li>Desde 50, cada medio minuto la bruma puede corromper un objeto.</li><li>A 100 se abre una grieta: pierdes el crisol y dos objetos.</li><li>Sal purificadora: −25. Amuleto de calma: generas la mitad.</li></ul>
    <h3>Partida</h3><p class="note">${S.mined} bloques picados · ${S.rifts} grietas · ${S.scanned.length} objetos escaneados</p>
    <div style="margin-top:8px">${resetAsk?`<button class="btn" data-act="reset2" style="border-color:var(--bad)">Sí, borrar la partida</button> <button class="btn" data-act="reset0">Cancelar</button>`:`<button class="btn" data-act="reset1">Empezar de nuevo</button>`}</div>`;
  }
  else if(panel==="win"){ h=`<h2>Corazón de Éter</h2><p class="hint" style="font-size:1rem">Lo forjaste tras picar ${S.mined} bloques${S.rifts?` y sobrevivir a ${S.rifts} grieta(s)`:" sin abrir ninguna grieta"}. El taller sigue abierto.</p><button class="btn pri" data-act="closep">Seguir explorando</button>`; }
  else if(panel==="help"){ h=`<h2>Crisol de Éter</h2><p class="hint" style="font-size:.95rem">Pica bloques para reunir materiales, escanéalos para descubrir sus esencias, disuélvelos en el crisol y forja objetos en el altar. Vigila el flux. La meta es el Corazón de Éter.</p>
    ${isTouch?`<div class="keys"><kbd>Joystick</kbd><span>Moverte</span><kbd>Arrastrar</kbd><span>Mirar</span><kbd>Picar</kbd><span>Mantener para romper</span><kbd>Usar</kbd><span>Crisol, altar, estantería, agua</span></div>`:`<div class="keys"><kbd>WASD</kbd><span>Moverte · Espacio salta</span><kbd>Clic izq.</kbd><span>Mantén para picar</span><kbd>Clic der. / E</kbd><span>Usar</span><kbd>F</kbd><span>Escanear</span><kbd>I · G</kbd><span>Mochila · Grimorio</span></div>`}
    <p class="note" style="margin-bottom:12px">Empiezas en el taller: el crisol está a tu izquierda y el altar a tu derecha.</p><button class="btn pri" data-act="play">Jugar</button>`; }
  pb.innerHTML=h;
}
$("panel").addEventListener("click",ev=>{
  const b=ev.target.closest("[data-act]"); if(!b) return; const a=b.dataset.act,id=b.dataset.id;
  if(a==="closep") return closePanel();
  if(a==="play"){ closePanel(); if(!isTouch) canvas.requestPointerLock?.(); return; }
  if(a==="scan") scanItems([id]); else if(a==="dis") dissolve(id); else if(a==="cat") catalyze(id);
  else if(a==="sal") useSal(); else if(a==="empty") emptyCru(); else if(a==="inf") return infuse(id);
  else if(a==="reset1") resetAsk=true; else if(a==="reset0") resetAsk=false;
  else if(a==="reset2"){ S=fresh(); save(); location.reload(); return; }
  hud(); save(); if(panel) renderPanel();
});
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openPanel(b.dataset.open)));

/* ================= Controles ================= */
document.addEventListener("pointerlockchange",()=>{ locked=document.pointerLockElement===canvas; $("lockhint").hidden = locked || !!panel || isTouch; if(!locked) mining=false; });
canvas.addEventListener("contextmenu",e=>e.preventDefault());
let look=null;
canvas.addEventListener("pointerdown",e=>{
  if(panel) return;
  if(e.pointerType==="mouse"){
    if(!locked){ const r=canvas.requestPointerLock?.(); if(r&&r.catch) r.catch(()=>{}); look={id:e.pointerId,x:e.clientX,y:e.clientY,mouse:1}; return; }
    if(e.button===0) mining=true; else if(e.button===2) doUse();
  } else { look={id:e.pointerId,x:e.clientX,y:e.clientY}; canvas.setPointerCapture(e.pointerId); }
});
canvas.addEventListener("pointermove",e=>{ if(!look||look.id!==e.pointerId||locked) return; const s=look.mouse?.005:.006; P.yaw-=(e.clientX-look.x)*s; P.pitch-=(e.clientY-look.y)*s; look.x=e.clientX; look.y=e.clientY; });
const endLook=e=>{ if(look&&look.id===e.pointerId) look=null; if(e.pointerType==="mouse"&&e.button===0) mining=false; };
canvas.addEventListener("pointerup",endLook); canvas.addEventListener("pointercancel",endLook);
document.addEventListener("mousemove",e=>{ if(!locked) return; P.yaw-=e.movementX*.0025; P.pitch-=e.movementY*.0025; });
document.addEventListener("mouseup",e=>{ if(e.button===0) mining=false; });
document.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(k==="escape"&&panel){ closePanel(); return; }
  if(panel) return;
  keys[k]=true;
  if(k==="e") doUse(); else if(k==="f") doScan(); else if(k==="i") openPanel("mochila"); else if(k==="g") openPanel("grimorio"); else if(k==="q") mining=true;
  if([" ","arrowup","arrowdown"].includes(k)) e.preventDefault();
});
document.addEventListener("keyup",e=>{ const k=e.key.toLowerCase(); keys[k]=false; if(k==="q") mining=false; });
window.addEventListener("blur",()=>{ for(const k in keys) keys[k]=false; mining=false; });
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
hold("bUse",doUse); hold("bScan",doScan);
