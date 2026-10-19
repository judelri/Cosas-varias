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
const CRUC=[21,8,24], ALT=[27,8,24], PEDS=[[29,8,24],[25,8,24],[27,8,22],[27,8,26]], RIFT=[40,40];
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
}
genWorld();
for(const [k,id] of Object.entries(S.world)){ const [x,y,z]=k.split(",").map(Number); if(getB(x,y,z)>=0) world[ix(x,y,z)]=id; }
