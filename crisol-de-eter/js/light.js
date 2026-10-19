// Crisol de Éter — Luz por celda al estilo Minecraft: luz del cielo y luz de bloques (antorchas, cristales), de 0 a 15.
// Script clásico (sin módulos): comparte el ámbito global con los demás archivos de js/.

/* ================= Luz ================= */
// La del cielo baja sin perder fuerza hasta el primer bloque opaco y después se esparce perdiendo 1 por celda
// (hojas y agua restan 1 más). La de bloques sale de B[id].light y se esparce igual. Se recalcula entera en cada
// cambio (el mundo es chico: unos milisegundos) y solo se rehacen los chunks donde algo cambió.
const SKY=new Uint8Array(W*H*D), BLK=new Uint8Array(W*H*D);
const opaqueL=id=>id>0&&!B[id].water&&!B[id].plant&&!B[id].custom&&!B[id].leaves;
const lightCost=id=>id>0&&(B[id].leaves||B[id].water)?2:1;
let LIGHTS=[], CAVES=[]; // celdas que dan luz (chispas de antorchas) · suelo de cueva sin cielo (donde aparecen sombras)
const LQ=new Int32Array(W*H*D*2);
function spread(arr,head,tail){
  while(head<tail){
    const i=LQ[head++], l=arr[i]; if(l<=1) continue;
    const x=i%W, z=Math.floor(i/W)%D, y=Math.floor(i/(W*D));
    for(let k=0;k<6;k++){
      const nx=x+(k===0)-(k===1), ny=y+(k===2)-(k===3), nz=z+(k===4)-(k===5);
      if(nx<0||nz<0||ny<0||nx>=W||nz>=D||ny>=H) continue;
      const j=ix(nx,ny,nz), id=world[j]; if(opaqueL(id)) continue;
      const nl=l-lightCost(id); if(nl>arr[j]){ arr[j]=nl; if(tail<LQ.length) LQ[tail++]=j; }
    }
  }
}
function computeLight(){
  SKY.fill(0); BLK.fill(0); LIGHTS=[];
  let tail=0;
  for(let x=0;x<W;x++) for(let z=0;z<D;z++){
    let l=15;
    for(let y=H-1;y>=0;y--){ const i=ix(x,y,z), id=world[i]; if(opaqueL(id)) break; if(id>0&&(B[id].leaves||B[id].water)) l=Math.max(0,l-1); SKY[i]=l; if(l>1) LQ[tail++]=i; }
  }
  spread(SKY,0,tail);
  tail=0;
  for(let i=0;i<world.length;i++){ const id=world[i]; if(id>0&&B[id].light){ BLK[i]=B[id].light; LQ[tail++]=i; LIGHTS.push(i); } }
  spread(BLK,0,tail);
  CAVES=[];
  for(let i=W*D;i<world.length-W*D;i++) if(world[i]===0&&SKY[i]===0&&BLK[i]<7&&world[i+W*D]===0&&opaqueL(world[i-W*D])) CAVES.push(i);
}
// recalcula y suma al conjunto los chunks donde cambió la luz
function relight(dirty){
  const os=SKY.slice(), ob=BLK.slice(); computeLight();
  for(let i=0;i<SKY.length;i++) if(SKY[i]!==os[i]||BLK[i]!==ob[i]) chunksOf(i%W,Math.floor(i/W)%D,dirty);
}
// [cielo, bloques] de una celda; fuera del mundo hay cielo pleno, bajo el suelo nada
const lightAt=(x,y,z)=>{ if(x<0||z<0||x>=W||z>=D||y>=H) return [15,0]; if(y<0) return [0,0]; const i=ix(x,y,z); return [SKY[i],BLK[i]]; };
// brillo (0-1) en un punto, con la misma curva que el sombreador del terreno; uSky baja de noche
const uSky={value:1};
const curveL=l=>Math.pow(l/15,1.4);
function brightAt(x,y,z){ const [s,b]=lightAt(Math.floor(x),Math.floor(y),Math.floor(z)); return Math.min(1,Math.max(curveL(s)*uSky.value,curveL(b))+.035); }
// materiales Lambert de criaturas y compañeros: se oscurecen en cuevas (de día y de noche ya los apagan las luces de la escena)
function shadeMats(list,x,y,z){ const [s,b]=lightAt(Math.floor(x),Math.floor(y+.5),Math.floor(z)), k=Math.min(1,Math.max(curveL(s),curveL(b)*1.1)+.08); for(const w of list) w.m.color.copy(w.c).multiplyScalar(k); }
// el sombreador del terreno: color × max(cielo × uSky, antorchas en tono cálido)
function litMaterial(mat){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uSky=uSky;
    sh.vertexShader=sh.vertexShader.replace("#include <common>","#include <common>\nattribute vec2 light;\nvarying vec2 vLight;").replace("#include <begin_vertex>","#include <begin_vertex>\nvLight=light;");
    sh.fragmentShader=sh.fragmentShader.replace("#include <common>","#include <common>\nuniform float uSky;\nvarying vec2 vLight;")
      .replace("#include <color_fragment>","#include <color_fragment>\nfloat lSky=pow(vLight.x,1.4)*uSky; float lBlk=pow(vLight.y,1.4);\ndiffuseColor.rgb*=max(vec3(lSky),lBlk*vec3(1.,.86,.66))+.035;");
  };
  return mat;
}
