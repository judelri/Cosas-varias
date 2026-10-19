// Crisol de Éter — Sonido: efectos sintetizados con Web Audio (sin archivos de audio) y ambiente de día y de noche.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Sonido ================= */
let AC=null, master=null, noiseBuf=null;
// El navegador solo deja crear el audio tras un gesto del jugador
function audioInit(){
  if(AC){ if(AC.state==="suspended") AC.resume(); return; }
  const C=window.AudioContext||window.webkitAudioContext; if(!C) return;
  try { AC=new C(); } catch(e){ return; }
  master=AC.createGain(); master.gain.value=S.mute?0:.55; master.connect(AC.destination);
  noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
}
addEventListener("pointerdown",audioInit,true); addEventListener("keydown",audioInit,true);
function setMute(m){ S.mute=m; if(master) master.gain.setTargetAtTime(m?0:.55,AC.currentTime,.03); }
function env(g,t,vol,att,dur){ g.gain.setValueAtTime(.0001,t); g.gain.linearRampToValueAtTime(vol,t+att); g.gain.exponentialRampToValueAtTime(.0001,t+dur); }
function tone(f,dur,o={}){
  const t=AC.currentTime+(o.at||0), os=AC.createOscillator(), g=AC.createGain();
  os.type=o.type||"sine"; os.frequency.setValueAtTime(f,t); if(o.to) os.frequency.exponentialRampToValueAtTime(o.to,t+dur);
  env(g,t,o.vol||.12,o.att||.005,dur); os.connect(g).connect(master); os.start(t); os.stop(t+dur+.05);
}
function noise(dur,o={}){
  const t=AC.currentTime+(o.at||0), s=AC.createBufferSource(), f=AC.createBiquadFilter(), g=AC.createGain();
  s.buffer=noiseBuf; s.loop=true; f.type=o.type||"bandpass"; f.frequency.setValueAtTime(o.f||1000,t); if(o.to) f.frequency.exponentialRampToValueAtTime(o.to,t+dur); f.Q.value=o.q||1;
  env(g,t,o.vol||.2,o.att||.003,dur); s.connect(f).connect(g).connect(master); s.start(t,Math.random()*.5); s.stop(t+dur+.05);
}
// timbre de cada material (filtro del ruido, resonancia, golpe tonal)
const MAT={cristal:{f:3600,q:8,k:1250},roca:{f:1700,q:2.2,k:180},tierra:{f:420,q:.9},arena:{f:2600,q:.5},madera:{f:650,q:3,k:240},hoja:{f:4200,q:.7},agua:{f:700,q:.6}};
const mat = id => MAT[(B[id]&&B[id].m)||"roca"];
const SFX={
  hit(id){ const m=mat(id); noise(.07,{f:m.f*(.9+Math.random()*.2),q:m.q,vol:.14}); if(m.k) tone(m.k*(.9+Math.random()*.2),.05,{type:"triangle",vol:.05}); },
  break(id){ const m=mat(id); noise(.22,{f:m.f,to:m.f*.6,q:m.q,vol:.28}); if(m.k) tone(m.k,.12,{type:"triangle",to:m.k*.7,vol:.09}); },
  place(id){ const m=mat(id); noise(.1,{f:m.f*.7,q:m.q,vol:.22}); tone(120,.09,{type:"triangle",to:80,vol:.12}); },
  step(id){ const m=mat(id); noise(.06,{f:m.f*.8,q:m.q,vol:.06}); },
  pickup(){ tone(700,.07,{type:"square",to:1050,vol:.035}); tone(1400,.08,{at:.06,vol:.04}); },
  water(){ noise(.3,{type:"lowpass",f:1400,to:300,vol:.16}); for(let i=0;i<3;i++) tone(300+Math.random()*200,.08,{at:i*.06,to:900,vol:.05}); },
  scan(){ [523,659,784,1047].forEach((f,i)=>tone(f,.25,{at:i*.06,type:"triangle",vol:.05})); },
  dissolve(){ for(let i=0;i<4;i++) tone(180+Math.random()*120,.12,{at:i*.07+Math.random()*.03,to:520,vol:.07}); },
  forge(){ tone(784,.9,{vol:.08}); tone(1175,.8,{at:.04,vol:.06}); tone(1568,.6,{at:.1,vol:.04}); },
  pulse(){ tone(196,.5,{type:"triangle",to:294,vol:.08}); tone(392,.4,{at:.05,vol:.03}); },
  spark(){ noise(.18,{type:"highpass",f:3000,vol:.16}); tone(1800,.12,{type:"square",to:300,vol:.03}); },
  success(){ [523,659,784,1047].forEach((f,i)=>tone(f,1.1-i*.1,{at:i*.09,vol:.07})); },
  fail(){ tone(220,.5,{type:"sawtooth",to:98,vol:.05}); noise(.4,{type:"lowpass",f:500,to:120,vol:.12}); },
  rift(){ noise(1.2,{type:"lowpass",f:260,to:60,vol:.45,att:.05}); tone(70,1.1,{type:"sawtooth",to:32,vol:.08}); },
  corrupt(){ noise(.6,{f:900,to:200,q:4,vol:.1,att:.1}); },
  click(){ tone(900,.03,{type:"square",vol:.02}); },
  bird(){ const f=2200+Math.random()*900, n=2+rnd(3); for(let i=0;i<n;i++) tone(f,.07,{at:i*.11,to:f*1.35,vol:.018}); },
  cricket(){ const f=4300+Math.random()*400; for(let i=0;i<3;i++) tone(f,.025,{at:i*.05,type:"square",vol:.006}); },
  bubble(){ tone(140+Math.random()*90,.1,{to:360,vol:.03}); },
  // criaturas
  thud(){ noise(.08,{type:"lowpass",f:700,vol:.26}); tone(150,.08,{type:"triangle",to:90,vol:.1}); },
  cluck(){ const f=650+Math.random()*120; tone(f,.06,{type:"square",to:f*.75,vol:.025}); tone(f*1.25,.05,{at:.09,type:"square",to:f*.9,vol:.02}); },
  flutter(){ for(let i=0;i<4;i++) noise(.03,{at:i*.045,f:2600,q:2,vol:.025}); },
  whisper(){ noise(.9,{f:450,to:950,q:7,vol:.06,att:.25}); },
  poof(){ noise(.35,{f:1300,to:280,q:1.4,vol:.18}); },
  chime(){ tone(1568,.35,{vol:.04}); tone(2093,.3,{at:.05,vol:.03}); },
  // la mascota
  boing(){ tone(180,.22,{to:520,vol:.07}); },
  slam(){ noise(.5,{type:"lowpass",f:400,to:80,vol:.45}); tone(90,.4,{type:"triangle",to:45,vol:.15}); },
  bip(){ tone(880,.07,{type:"square",vol:.025}); tone(660,.09,{at:.09,type:"square",vol:.025}); },
  roar(){ [440,554,659].forEach((f,i)=>tone(f,.2,{at:i*.08,type:"square",vol:.04})); },
  // jugador
  hurt(){ tone(240,.18,{type:"square",to:150,vol:.05}); noise(.12,{type:"lowpass",f:900,vol:.18}); },
  eat(){ for(let i=0;i<3;i++) noise(.06,{at:i*.11,f:1800+Math.random()*600,q:1.5,vol:.12}); },
  burp(){ tone(140,.25,{type:"sawtooth",to:90,vol:.04}); },
  death(){ tone(330,.6,{type:"triangle",to:110,vol:.08}); tone(220,.7,{at:.15,type:"triangle",to:70,vol:.06}); }
};
function sfx(name,...a){ if(!AC||S.mute||AC.state!=="running") return; try { SFX[name](...a); } catch(e) {} }
// pájaros de día, grillos de noche, burbujas cerca del crisol
function ambient(dt,daylight,nearCrucible,hasEssence){
  if(Math.random()<dt*(daylight>.6?.12:0)) sfx("bird");
  if(Math.random()<dt*(daylight<.3?.8:0)) sfx("cricket");
  if(nearCrucible&&hasEssence&&Math.random()<dt*2.2) sfx("bubble");
}
