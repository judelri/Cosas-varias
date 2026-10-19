// Crisol de Éter — Atlas de texturas procedurales 16×16, definición de bloques e iconos de bloque.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Atlas de texturas ================= */
const TILES=["grass_top","grass_side","dirt","stone","sand","water","log_side","log_top","leaves","planks","ore_iron","ore_coal","ore_quartz","ore_spark","obsidian","ash","corrupt_top","corrupt_side","bookshelf","bricks","altar","metal","tallgrass","flower_red","flower_yellow","torch","crystal","craft_top","craft_side","furnace_front","furnace_top"];
const TI={}; TILES.forEach((t,i)=>TI[t]=i); const NT=TILES.length;
const atlas=document.createElement("canvas"); atlas.width=16*NT; atlas.height=16;
const g=atlas.getContext("2d");
let tseed=11; const tr=()=>{ tseed=(tseed*16807)%2147483647; return tseed/2147483647; };
const ti=n=>Math.floor(tr()*n), pk=a=>a[ti(a.length)];
function shade(hex,f){ const n=parseInt(hex.slice(1),16); const c=v=>Math.max(0,Math.min(255,Math.round(v*f))); return `rgb(${c(n>>16)},${c(n>>8&255)},${c(n&255)})`; }
const px=(t,x,y,c)=>{ if(x<0||y<0||x>15||y>15) return; g.fillStyle=c; g.fillRect(TI[t]*16+x,y,1,1); };
const clr=(t,x,y)=>g.clearRect(TI[t]*16+x,y,1,1);
function pal(t,p,y0=0,y1=16){ for(let y=y0;y<y1;y++) for(let x=0;x<16;x++) px(t,x,y,pk(p)); }
const GRASS=["#5d9b3a","#679f44","#71ad4b","#57913a","#7cb854","#4f8a33"];
const DIRT=["#866043","#79553a","#966c4a","#8b6346","#6f4e36"];
const STONE=["#7f7f7f","#777777","#888888","#7b7b7b","#717171"];
function stone(t){ pal(t,STONE); for(let k=0;k<9;k++){ const x=ti(16),y=ti(16),l=1+ti(4),c=tr()<.6?"#656565":"#979797"; for(let i=0;i<l;i++) px(t,x+i,y,c); } }
function oreT(t,main){ stone(t); const hi=shade(main,1.3), lo=shade(main,.68);
  [[2,2],[10,1],[1,9],[8,8],[12,12],[5,13],[12,5]].forEach(([cx,cy])=>{ if(tr()<.2) return; const w=2+ti(2),h=2+ti(2);
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ if(tr()<.12) continue; px(t,cx+x,cy+y, x===0&&y===0?hi:(x===w-1||y===h-1)?lo:main); } }); }
pal("grass_top",GRASS);
pal("dirt",DIRT); for(let k=0;k<12;k++) px("dirt",ti(16),ti(16),pk(["#5a3e2b","#a67c56"]));
pal("grass_side",DIRT); for(let k=0;k<8;k++) px("grass_side",ti(16),4+ti(12),pk(["#5a3e2b","#a67c56"]));
for(let x=0;x<16;x++){ const d=2+ti(3)+(tr()<.2?2:0); for(let y=0;y<d;y++) px("grass_side",x,y,pk(GRASS)); }
stone("stone");
pal("sand",["#dbd3a0","#e3dbb0","#d6cd96","#e8e2bd","#cfc58e"]);
pal("water",["#2f5fc4","#3466cc","#2c5ab9","#3870d4"]); for(let k=0;k<6;k++){ const x=ti(12),y=ti(16); for(let i=0;i<4;i++) px("water",x+i,y,"#4d86e6"); }
for(let x=0;x<16;x++){ const dark=x%5===0||tr()<.12; for(let y=0;y<16;y++) px("log_side",x,y, dark&&tr()<.85?pk(["#4b3721","#56402a"]):pk(["#6b5132","#735836","#664c2e"])); }
for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const d=Math.max(Math.abs(x-7.5),Math.abs(y-7.5)); px("log_top",x,y, d>6.5?pk(["#6b5132","#5c4428"]):(Math.floor(d)%2?pk(["#a2804c","#9a7845"]):pk(["#b8945c","#bf9b62"]))); }
pal("leaves",["#3b7a26","#2f6b1f","#4a8c30","#367222","#28601a"]); for(let y=0;y<16;y++) for(let x=0;x<16;x++) if(tr()<.2) clr("leaves",x,y);
for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const row=Math.floor(y/4), seam=(y%4===3)||((x+row*5)%16===0); px("planks",x,y, seam?"#6b5330":pk(["#a1834f","#b08f5a","#9b7c4a","#a88a55"])); }
oreT("ore_iron","#d8a97c"); oreT("ore_coal","#262626"); oreT("ore_quartz","#efe9df"); oreT("ore_spark","#4fd0d8");
pal("obsidian",["#14101e","#1c1529","#100c18","#18122a"]); for(let k=0;k<8;k++){ const x=ti(14),y=ti(16); px("obsidian",x,y,"#3b2a56"); px("obsidian",x+1,y,"#5a3f80"); }
pal("ash",["#5a4d63","#4d4256","#665870","#544860"]); for(let k=0;k<4;k++){ const x=1+ti(12),y=1+ti(12); px("ash",x,y,"#2e2636"); px("ash",x+2,y,"#2e2636"); px("ash",x+1,y+2,"#2e2636"); }
pal("corrupt_top",["#6b4a7a","#5d3f6b","#7a5689","#4f3460"]); for(let k=0;k<16;k++) px("corrupt_top",ti(16),ti(16),pk(["#b9a3c9","#9a62b0"]));
pal("corrupt_side",DIRT); for(let x=0;x<16;x++){ const d=2+ti(3)+(tr()<.25?2:0); for(let y=0;y<d;y++) px("corrupt_side",x,y,pk(["#6b4a7a","#5d3f6b","#7a5689"])); }
{ const books=["#8e2a2a","#2a4a8e","#2f6b2f","#8e6a2a","#5a2a6b","#2a6b6b","#8a8a8a"];
  for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const shelf=y<1||y>14||y===7||y===8||x===0||x===15; px("bookshelf",x,y, shelf?pk(["#a1834f","#9b7c4a"]):"#2a1d12"); }
  for(const [y0,y1] of [[1,7],[9,15]]){ let x=1; while(x<15){ const w=1+ti(2), c=pk(books), top=y0+ti(2); for(let i=0;i<w&&x<15;i++,x++) for(let y=top;y<y1;y++) px("bookshelf",x,y, y===top?shade(c,1.3):i===0?shade(c,.8):c); if(tr()<.25) x++; } } }
for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const r=Math.floor(y/8), m=(y%8===7)||((x+r*8)%16===15); px("bricks",x,y, m?"#5e5e5e":pk(["#8a8a8a","#828282","#909090","#7d7d7d"])); }
for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const edge=x===0||y===0||x===15||y===15; px("altar",x,y, edge?pk(["#cfa75a","#b88f45"]):pk(["#d2cbb6","#c9c2ad","#dad3be"])); }
pal("metal",["#3a3a42","#33333a","#404049"]); for(let x=0;x<16;x++){ px("metal",x,0,"#5a5a64"); px("metal",x,15,"#22222a"); }
for(let b=0;b<9;b++){ let x=1+ti(14); const h=6+ti(8), lean=tr()<.5?-1:1; for(let k=0;k<h;k++){ if(k>h*.6&&tr()<.4) x+=lean; px("tallgrass",x,15-k,pk(GRASS)); } }
for(let y=8;y<16;y++) px("flower_red",7,y,"#3f7a26"); px("flower_red",6,11,"#4a8c30"); px("flower_red",8,12,"#4a8c30");
for(let y=3;y<8;y++) for(let x=5;x<10;x++) if(!((x===5||x===9)&&(y===3||y===7))) px("flower_red",x,y,pk(["#c8202c","#b01824","#d8303a"])); px("flower_red",7,5,"#2a1a10");
for(let y=8;y<16;y++) px("flower_yellow",8,y,"#3f7a26"); px("flower_yellow",7,12,"#4a8c30"); px("flower_yellow",9,10,"#4a8c30");
for(let y=4;y<8;y++) for(let x=6;x<11;x++) if(!((x===6||x===10)&&(y===4||y===7))) px("flower_yellow",x,y,pk(["#f2d33a","#e6c22a","#f7e060"]));
// antorcha: palo con llama
for(let y=6;y<16;y++){ px("torch",7,y,y%3?"#7a5634":"#5e4127"); px("torch",8,y,y%4?"#8a6440":"#6b4a2b"); }
for(const [x,y,c] of [[7,3,"#f2b13c"],[8,3,"#f2b13c"],[7,4,"#fff2a0"],[8,4,"#ffd860"],[7,5,"#f2b13c"],[8,5,"#e0743c"],[6,4,"#e0743c"],[9,4,"#e0743c"],[7,2,"#e0743c"],[8,6,"#f2b13c"]]) px("torch",x,y,c);
// cristal en gris (se tiñe con el color de la esencia al mallar)
for(const [cx,top,w] of [[4,7,2],[8,2,3],[12,6,2]]) for(let y=top;y<16;y++) for(let x=cx-w;x<=cx+w;x++){ const taper=Math.max(0,w-Math.floor((y-top)/1.5)); if(Math.abs(x-cx)>w-taper) continue; px("crystal",x,y, x<cx?"#f4f4f4":x===cx?"#ffffff":"#b8b8b8"); }
// mesa de trabajo: tablones con cuadrícula arriba y herramientas a los lados
pal("craft_top",["#a1834f","#b08f5a","#9b7c4a"]); for(let i=0;i<16;i++){ px("craft_top",i,0,"#6b5330"); px("craft_top",i,15,"#6b5330"); px("craft_top",0,i,"#6b5330"); px("craft_top",15,i,"#6b5330"); }
for(let i=2;i<14;i++) for(const k of [2,6,10,13]){ px("craft_top",i,k,"#5e4127"); px("craft_top",k,i,"#5e4127"); }
for(let y=0;y<16;y++) for(let x=0;x<16;x++){ const row=Math.floor(y/4), seam=(y%4===3)||((x+row*5)%16===0); px("craft_side",x,y, seam?"#6b5330":pk(["#a1834f","#b08f5a","#9b7c4a"])); }
for(let y=4;y<11;y++) px("craft_side",4,y,"#5e4127"); for(let x=2;x<7;x++) px("craft_side",x,4,"#8d8d98"); for(let y=4;y<12;y++) px("craft_side",11,y,"#5e4127"); px("craft_side",10,4,"#c9c9d2"); px("craft_side",12,4,"#c9c9d2"); px("craft_side",11,3,"#c9c9d2");
// horno: piedra con boca encendida
stone("furnace_top"); stone("furnace_front"); for(let y=8;y<14;y++) for(let x=4;x<12;x++) px("furnace_front",x,y, y<10?"#1a1418":pk(["#e0743c","#f2b13c","#c8501c"])); for(let x=3;x<13;x++){ px("furnace_front",x,7,"#5a5a5a"); px("furnace_front",x,14,"#5a5a5a"); }
function tileTex(name){ const c=document.createElement("canvas"); c.width=c.height=16; c.getContext("2d").drawImage(atlas,TI[name]*16,0,16,16,0,0,16,16); const t=new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; t.minFilter=THREE.NearestFilter; return t; }

/* ================= Bloques ================= */
// bl: bloque que te llevas al picarlo (para ponerlo después) · m: material, para el sonido
const B = [
  null,
  {n:"Hierba",bl:2,m:"tierra",t:["grass_top","grass_side","dirt"],drop:[["semilla",.5]],hard:.5,resp:1,c:"#5f9e3f"},
  {n:"Tierra",bl:2,m:"tierra",t:["dirt"],hard:.5,c:"#7a5634"},
  {n:"Roca",tier:1,bl:3,m:"roca",t:["stone"],drop:[["piedra",1]],hard:1.1,c:"#7f7d82"},
  {n:"Arena",bl:4,m:"arena",t:["sand"],hard:.5,c:"#d9c98f"},
  {n:"Agua",m:"agua",t:["water"],water:1,c:"#3f72c0"},
  {n:"Tronco",bl:6,m:"madera",t:["log_top","log_side","log_top"],drop:[["ambar",.4]],hard:1,resp:1,c:"#6b4a2b"},
  {n:"Hojas",bl:7,m:"hoja",t:["leaves"],leaves:1,drop:[["pluma",.4],["semilla",.2],["manzana",.05]],hard:.25,resp:1,c:"#3e7a2c"},
  {n:"Tablones del taller",m:"madera",t:["planks"],unbreak:1,c:"#a8824f"},
  {n:"Mena de hierro",tier:2,bl:3,m:"roca",t:["ore_iron"],drop:[["hierro",1]],hard:1.6,resp:1,c:"#d9a77a"},
  {n:"Veta de carbón",tier:1,bl:3,m:"roca",t:["ore_coal"],drop:[["carbon",1]],hard:1.3,resp:1,c:"#333"},
  {n:"Veta de cuarzo",tier:2,bl:3,m:"roca",t:["ore_quartz"],drop:[["cuarzo",1]],hard:1.5,resp:1,c:"#f4f0e6"},
  {n:"Piedra chispa",tier:2,bl:3,m:"roca",t:["ore_spark"],drop:[["chispa",1]],hard:1.6,resp:1,c:"#59d0d6"},
  {n:"Obsidiana",tier:3,bl:13,m:"roca",t:["obsidian"],drop:[["obsidiana",1]],hard:2.4,resp:1,flux:1,c:"#3a2650"},
  {n:"Ceniza de grieta",m:"arena",t:["ash"],drop:[["ceniza",1]],hard:.7,resp:1,flux:2,c:"#8a7898"},
  {n:"Suelo corrupto",bl:2,m:"tierra",t:["corrupt_top","corrupt_side","dirt"],drop:[["corrupta",.25]],hard:.8,resp:1,flux:1,c:"#7a4590"},
  {n:"Estantería",m:"madera",t:["planks","bookshelf","planks"],unbreak:1,use:"investigar",c:"#a8824f"},
  {n:"Crisol",m:"roca",custom:1,unbreak:1,use:"crisol"},
  {n:"Altar de infusión",m:"roca",custom:1,unbreak:1,use:"altar"},
  {n:"Pedestal",m:"roca",custom:1,unbreak:1,use:"altar"},
  {n:"Ladrillo del taller",m:"roca",t:["bricks"],unbreak:1,c:"#8e867b"},
  {n:"Hierba alta",m:"hoja",t:["tallgrass"],plant:1,drop:[["semilla",.35]],hard:.05,resp:1,c:"#5d9b3a"},
  {n:"Amapola",m:"hoja",t:["flower_red"],plant:1,drop:[["semilla",.5]],hard:.05,resp:1,c:"#c8202c"},
  {n:"Diente de león",m:"hoja",t:["flower_yellow"],plant:1,drop:[["pluma",.5]],hard:.05,resp:1,c:"#f2d33a"},
  {n:"Tablones",bl:24,m:"madera",t:["planks"],hard:.8,c:"#a8824f"},
  {n:"Antorcha",bl:25,m:"madera",t:["torch"],plant:1,torch:1,light:14,hard:.05,c:"#f2b13c"},
  ...PRIMAL.map(e=>({n:"Cúmulo de cristal de "+ESS[e].n,m:"cristal",t:["crystal"],plant:1,tint:ESS[e].c,light:7,tier:1,drop:[["cr_"+e,1],["cr_"+e,.5]],hard:.9,resp:1,c:ESS[e].c})),
  {n:"Mesa de trabajo",m:"madera",t:["craft_top","craft_side","planks"],unbreak:1,use:"mesa",c:"#a8824f"},
  {n:"Horno",m:"roca",t:["furnace_top","furnace_front","furnace_top"],unbreak:1,use:"horno",light:0,c:"#7f7d82"}
];
// light: luz que da el bloque (0-15) · tier: pico mínimo para que suelte algo (1 madera, 2 piedra, 3 hierro)
const CRYSTAL0=26, TORCH=25;

/* iconos isométricos de los bloques que se pueden poner (32×32) */
const BICON={};
for(const id of new Set(B.filter(b=>b&&b.bl).map(b=>b.bl))){
  const t=B[id].t, top=TI[t[0]], side=TI[t.length===1?t[0]:t[1]];
  const c=document.createElement("canvas"); c.width=c.height=32; const x=c.getContext("2d"); x.imageSmoothingEnabled=false;
  if(B[id].plant){ x.drawImage(atlas,top*16,0,16,16,0,0,32,32); BICON[id]=c.toDataURL(); continue; }
  const face=(tile,m,dark)=>{ x.setTransform(...m); x.drawImage(atlas,tile*16,0,16,16,0,0,16,16); x.fillStyle=`rgba(0,0,0,${dark})`; x.fillRect(0,0,16,16); };
  face(top,[15/16,7.5/16,-15/16,7.5/16,16,1],0); face(side,[15/16,7.5/16,0,15/16,1,8.5],.25); face(side,[15/16,-7.5/16,0,15/16,16,16],.42);
  BICON[id]=c.toDataURL();
}
const bicon = (id,cls="ic") => `<img class="${cls}" src="${BICON[id]}" alt="${B[id].n}" title="${B[id].n}">`;
