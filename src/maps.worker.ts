// A shared spherical field drives the coast, relief, cooling and ocean fill.
// Baked once per seed, off the render thread. No fetched planet imagery.
const W=2048,H=1024;
let permutation=new Uint8Array(512);
function noise(x:number,y:number,z:number):number{
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);x-=ix;y-=iy;z-=iz;
 const X=ix&255,Y=iy&255,Z=iz&255;
 const u=x*x*x*(x*(x*6-15)+10),v=y*y*y*(y*(y*6-15)+10),w=z*z*z*(z*(z*6-15)+10);
 const p=permutation,A=p[X]+Y,B=p[X+1]+Y,AA=p[A]+Z,AB=p[A+1]+Z,BA=p[B]+Z,BB=p[B+1]+Z;
 const grad=(h:number,a:number,b:number,c:number)=>{h&=15;const u=h<8?a:b,v=h<4?b:(h===12||h===14?a:c);return ((h&1)?-u:u)+((h&2)?-v:v)};
 const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
 return lerp(lerp(lerp(grad(p[AA],x,y,z),grad(p[BA],x-1,y,z),u),lerp(grad(p[AB],x,y-1,z),grad(p[BB],x-1,y-1,z),u),v),lerp(lerp(grad(p[AA+1],x,y,z-1),grad(p[BA+1],x-1,y,z-1),u),lerp(grad(p[AB+1],x,y-1,z-1),grad(p[BB+1],x-1,y-1,z-1),u),v),w);
}
function fbm(x:number,y:number,z:number,n=6){let a=.5,s=0;for(let i=0;i<n;i++){s+=noise(x,y,z)*a;x=x*2.03+8.1;y=y*2.03+3.7;z=z*2.03+5.4;a*=.5}return s}
function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
self.onmessage=(ev:MessageEvent<number>)=>{
 const seed=ev.data,random=rng(seed),p=Uint8Array.from({length:256},(_,i)=>i);
 for(let i=255;i>0;i--){const j=Math.floor(random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}permutation=Uint8Array.from({length:512},(_,i)=>p[i&255]);
 const terrain=new Uint8Array(W*H*4),cloud=new Uint8Array(W*H*4),sea=.49+(random()-.5)*.055;
 for(let j=0;j<H;j++){
  const theta=j/(H-1)*Math.PI,sy=Math.cos(theta),st=Math.sin(theta);
  for(let i=0;i<W;i++){
   const phi=i/(W-1)*Math.PI*2,x=-Math.cos(phi)*st,y=sy,z=Math.sin(phi)*st;
   const warp=fbm(x*2.2+13,y*2.2,z*2.2,3);
   const h=.5+fbm(x*2.6+warp*.9,y*2.6+warp*.6,z*2.6,7)*.58;
   const detail=fbm(x*45,y*45,z*45,4)*.5+.5;
   const ridge=Math.pow(1-Math.abs(fbm(x*14+2,y*14,z*14,5)*2),3);
   const k=(j*W+i)*4;terrain[k]=Math.max(0,Math.min(255,h*255));terrain[k+1]=ridge*255;terrain[k+2]=detail*255;terrain[k+3]=255;
   const w=fbm(x*3+30,y*3+11,z*3,3);
   const qx=x*4+w*1.6,qy=y*5+w,qz=z*4+w*1.6;
   const broad=fbm(qx+10,qy,qz,6),cells=fbm(qx*7,qy*7,qz*7,4);
   const density=Math.max(0,Math.min(1,(broad+.08+Math.cos(y*10)*.035)*3.9));
   cloud[k]=Math.max(0,Math.min(255,(density*(.75+cells*.65))*255));cloud[k+1]=cells*100+128;cloud[k+2]=density*255;cloud[k+3]=255;
  }
 }
 let hash=2166136261;for(let k=0;k<terrain.length;k++){hash=Math.imul(hash^terrain[k],16777619);hash=Math.imul(hash^cloud[k],16777619);}
 self.postMessage({terrain,cloud,width:W,height:H,sea,seed,signature:(hash>>>0).toString(16)}, {transfer:[terrain.buffer,cloud.buffer]});
};
