// Crisol de Éter — Generación del mundo de vóxeles.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Mundo ================= */
const W=48,H=28,D=48,WATER=5;
const world=new Uint8Array(W*H*D);
const ix=(x,y,z)=>x+z*W+y*W*D;
function getB(x,y,z){ if(y<0) return 3; if(x<0||z<0||x>=W||y>=H||z>=D) return -1; return world[ix(x,y,z)]; }
function hash(x,z){ let h=(Math.imul(x,374761393)+Math.imul(z,668265263)+1013904223)|0; h=Math.imul(h^(h>>>13),1274126177); h^=h>>>16; return (h>>>0)/4294967295; }
function vnoise(x,z){ const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,s=t=>t*t*(3-2*t); const a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1),u=s(xf),v=s(zf); return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v; }
let wseed=4242; const wr=()=>{ wseed=(wseed*16807)%2147483647; return wseed/2147483647; };
const wri=n=>Math.floor(wr()*n);
const LAB={x:24,z:24,y:7};
const CRUC=[21,8,24], ALT=[27,8,24], PEDS=[[29,8,24],[25,8,24],[27,8,22],[27,8,26]], RIFT=[40,40], MESA_POS=[21,8,20], HORNO_POS=[27,8,20];
const heights=[];
function genWorld(){
  for(let x=0;x<W;x++) for(let z=0;z<D;z++){
    const n=vnoise(x/11,z/11)*.7+vnoise(x/4,z/4)*.3;
    let h=Math.round(5+n*5);
    const mt=Math.max(0,1-Math.hypot((x-41)/11,(z-8)/11)); h+=Math.round(mt*mt*13);
    const rd=Math.hypot(x-RIFT[0],z-RIFT[1]), rift=rd<8; if(rift) h-=Math.round((1-rd/8)*3);
    const rx=9+3*Math.sin(z/6), rv=Math.abs(x-rx), river=rv<2.2, bank=rv<3.6;
    if(river) h=3; else if(bank) h=Math.min(h,5);
    const ld=Math.max(Math.abs(x-LAB.x),Math.abs(z-LAB.z));
    if(ld<=7) h=LAB.y; else if(ld<=10) h=Math.round(h+(LAB.y-h)*(1-(ld-7)/3));
    h=Math.max(2,Math.min(H-8,h)); heights[x+z*W]=h;
    const mount=mt>.22;
    for(let y=0;y<=h;y++){
      let id = y<h-3?3 : y<h?2 : 1;
      if(y===h){ if(river||bank) id=4; else if(mount) id=3; else if(rift) id=15; }
      if(mount && y<h) id=3;
      if(rift && y<h && y>=h-2) id=wr()<.25?13:2;
      if(id===3 && y>0){ const p=mount?.13:.025; if(wr()<p){ const r=wr(); id = r<.35?10 : r<.65?9 : r<.87?11 : 12; } }
      if(ld<=5 && y===h) id=8;
      world[ix(x,y,z)]=id;
    }
    if(river) for(let y=h+1;y<=WATER;y++) world[ix(x,y,z)]=5;
    if(rift && !river && h+1<H){ const r=wr(); if(r<.16) world[ix(x,h+1,z)]=14; else if(r<.21){ const ph=1+wri(3); for(let k=1;k<=ph;k++) world[ix(x,h+k,z)]=13; } }
  }
  // robles
  for(let x=3;x<W-3;x++) for(let z=3;z<D-3;z++){
    const h=heights[x+z*W]; if(world[ix(x,h,z)]!==1) continue;
    const forest=z>29&&x<30, ld=Math.max(Math.abs(x-LAB.x),Math.abs(z-LAB.z));
    if(ld<=9) continue;
    if(wr()<(forest?.05:.008)){
      let ok=true; for(let dx=-3;dx<=3;dx++) for(let dz=-3;dz<=3;dz++) for(let dy=1;dy<=3;dy++) if(world[ix(x+dx,h+dy,z+dz)]===6) ok=false; if(!ok) continue;
      const th=4+wri(2);
      for(let k=1;k<=th;k++) world[ix(x,h+k,z)]=6;
      for(const dy of [th-1,th]) for(let dx=-2;dx<=2;dx++) for(let dz=-2;dz<=2;dz++){
        if(Math.abs(dx)===2&&Math.abs(dz)===2&&wr()<.6) continue; const y=h+dy; if(y<H&&world[ix(x+dx,y,z+dz)]===0) world[ix(x+dx,y,z+dz)]=7; }
      for(const dy of [th+1,th+2]) for(let dx=-1;dx<=1;dx++) for(let dz=-1;dz<=1;dz++){
        if(Math.abs(dx)===1&&Math.abs(dz)===1&&(dy===th+2||wr()<.5)) continue; const y=h+dy; if(y<H&&world[ix(x+dx,y,z+dz)]===0) world[ix(x+dx,y,z+dz)]=7; }
    }
  }
  // hierba alta y flores
  for(let x=0;x<W;x++) for(let z=0;z<D;z++){
    const h=heights[x+z*W]; if(h+1>=H||world[ix(x,h,z)]!==1||world[ix(x,h+1,z)]!==0) continue;
    if(Math.max(Math.abs(x-LAB.x),Math.abs(z-LAB.z))<=7) continue;
    const forest=z>29&&x<30, r=wr();
    const id = forest ? (r<.16?21:r<.19?22:r<.22?23:0) : (r<.11?21:r<.125?22:r<.14?23:0);
    if(id) world[ix(x,h+1,z)]=id;
  }
  // taller
  for(let x=LAB.x-6;x<=LAB.x+6;x++) for(let z=LAB.z-6;z<=LAB.z+6;z++) for(let y=LAB.y+1;y<H;y++) world[ix(x,y,z)]=0;
  for(const [cx,cz] of [[-5,-5],[5,-5],[-5,5],[5,5]]) for(let y=LAB.y+1;y<=LAB.y+3;y++) world[ix(LAB.x+cx,y,LAB.z+cz)]=20;
  for(let x=LAB.x-1;x<=LAB.x+1;x++) for(let y=LAB.y+1;y<=LAB.y+2;y++) world[ix(x,y,LAB.z-5)]=16;
  world[ix(...CRUC)]=17; world[ix(...ALT)]=18; PEDS.forEach(p=>world[ix(...p)]=19);
  world[ix(...MESA_POS)]=32; world[ix(...HORNO_POS)]=33;
  for(const [cx,cz] of [[-5,-5],[5,-5],[-5,5],[5,5]]) world[ix(LAB.x+cx,LAB.y+4,LAB.z+cz)]=TORCH; // antorchas sobre los pilares
  carveCaves();
}
// cuevas en la montaña: gusanos que excavan túneles; en sus paredes hay más menas y en el suelo, cúmulos de cristal.
// Usa su propio azar (cr) para no cambiar el resto del mundo, que se genera igual que siempre.
function carveCaves(){
  let cs=777; const cr=()=>{ cs=(cs*16807)%2147483647; return cs/2147483647; };
  const air=[];
  for(let w=0;w<7;w++){
    let x=31+cr()*14, z=2+cr()*16, y=3+cr()*8, a=cr()*6.28, b=(cr()-.5)*.6;
    if(w===0){ x=33; z=12; y=heights[33+12*W]-1; b=-.45; } // una entrada en la ladera
    for(let s=0;s<38;s++){
      const r=1.3+cr()*.6;
      for(let dx=-2;dx<=2;dx++) for(let dy=-2;dy<=2;dy++) for(let dz=-2;dz<=2;dz++){
        const cx=Math.floor(x+dx), cy=Math.floor(y+dy), cz=Math.floor(z+dz);
        if(cx<1||cz<1||cx>=W-1||cz>=D-1||cy<1||cy>=H-2||dx*dx+dy*dy*1.4+dz*dz>r*r) continue;
        if(Math.max(Math.abs(cx-LAB.x),Math.abs(cz-LAB.z))<=10||cx<17) continue; // lejos del taller y del río
        const id=world[ix(cx,cy,cz)]; if(id===2||id===3||(id>=9&&id<=12)){ world[ix(cx,cy,cz)]=0; air.push(ix(cx,cy,cz)); }
      }
      a+=(cr()-.5)*.9; b=Math.max(-.5,Math.min(.4,b+(cr()-.5)*.3));
      x+=Math.cos(a); z+=Math.sin(a); y+=b; y=Math.max(2,Math.min(heights[Math.floor(x)+Math.floor(z)*W]||12,y));
      if(x<18||x>W-2||z<1||z>D-2) break;
    }
  }
  for(const i of air){
    if(world[i]!==0) continue;
    const x=i%W, z=Math.floor(i/W)%D, y=Math.floor(i/(W*D));
    // menas en las paredes de roca
    for(const [dx,dy,dz] of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0]]){ const j=ix(x+dx,y+dy,z+dz); if(world[j]===3&&cr()<.09){ const r=cr(); world[j]=r<.3?10:r<.6?9:r<.85?11:12; } }
    // cristales en el suelo
    if(y>1&&world[ix(x,y-1,z)]===3&&cr()<.05) world[i]=CRYSTAL0+Math.floor(cr()*6);
  }
}
// mundo base (siempre el mismo) + los cambios guardados en S.world
function loadWorld(){ world.fill(0); wseed=4242; genWorld(); for(const [k,id] of Object.entries(S.world)){ const [x,y,z]=k.split(",").map(Number); if(getB(x,y,z)>=0) world[ix(x,y,z)]=id; } }
loadWorld();
