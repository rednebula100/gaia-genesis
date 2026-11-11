import {rng,plates,clamp,smooth} from './geology';
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

self.onmessage=(ev:MessageEvent<{seed:number;job:number}>)=>{
 const {seed,job}=ev.data,random=rng(seed),p=Uint8Array.from({length:256},(_,i)=>i);
 for(let i=255;i>0;i--){const j=Math.floor(random()*(i+1));[p[i],p[j]]=[p[j],p[i]]}permutation=Uint8Array.from({length:512},(_,i)=>p[i&255]);
 const regions=plates(random),sea=.46+(random()-.5)*.055;
 const terrain=new Uint8Array(W*H*4),biome=new Uint8Array(W*H*4),cloud=new Uint8Array(W*H*4);
 const tilt=random()*.2-.1;
 for(let j=0;j<H;j++){
  const theta=j/(H-1)*Math.PI,y=Math.cos(theta),st=Math.sin(theta);
  for(let i=0;i<W;i++){
   const phi=i/(W-1)*Math.PI*2,x=-Math.cos(phi)*st,z=Math.sin(phi)*st;
   const warp=fbm(x*2+13,y*2,z*2,3),wx=x+warp*.28,wy=y+fbm(x*2,y*2+33,z*2,3)*.23,wz=z+fbm(x*2,y*2,z*2+61,3)*.28;
   let continent=0,near=10,second=10,stress=0;
   for(const q of regions){
    const d=1-(wx*q.x+wy*q.y+wz*q.z),t=(wx*q.tx+wy*q.ty+wz*q.tz);
    if(q.continental)continent=Math.max(continent,Math.exp(-(d+t*t*(q.stretch-1))*2/q.size));
    if(d<near){second=near;near=d;stress=q.stress}else if(d<second)second=d;
   }
   const coast=.48+fbm(wx*2.6,wy*2.6,wz*2.6,6)*.58+(continent-.5)*.08+fbm(x*14,y*14,z*14,3)*.02;
   const landmass=smooth(.23,.68,coast);
   const boundary=Math.exp(-Math.abs(second-near)*45)*(0.35+stress*.65);
   const fold=1-Math.abs(fbm(x*17+warp*2,y*17,z*17,4)*2);
   const uplift=Math.pow(clamp(fold),3)*boundary*landmass;
   const hills=fbm(x*47,y*47,z*47,4);
   const h=clamp(.28+landmass*.31+uplift*.13+hills*.018+fbm(x*110,y*110,z*110,3)*.005);
   const land=smooth(sea-.001,sea+.003,h),elevation=Math.max(0,h-sea);
   // Distance to the continental interior and orographic rain shadow couple humidity to the same terrain.
   const maritime=1-smooth(.45,.85,coast),lat=Math.abs(y+tilt),temp=1-lat*.88-elevation*2.1;
   const trades=.5+.5*Math.cos(y*11+tilt);
   const humidity=clamp(.38+maritime*.35+trades*.21+fbm(x*6+42,y*6,z*6,3)*.6-uplift*.35);
   const dry=smooth(.5,.8,temp)*(1-smooth(.26,.58,humidity));
   const vegetation=smooth(.22,.62,humidity)*smooth(.12,.5,temp);
   const detail=fbm(x*130,y*130,z*130,3)*.5+.5;
   let color=[.38,.35,.24].map((v,k)=>v*(1-vegetation)+[.13,.24,.15][k]*vegetation);
   color=color.map((v,k)=>v*(1-dry)+[.53,.43,.28][k]*dry);
   const alpine=smooth(.075,.17,elevation)*(.4+uplift*.6);
   color=color.map((v,k)=>v*(1-alpine)+[.37,.35,.31][k]*alpine);
   const snow=smooth(.83,.98,lat+elevation*1.2)*(1-dry*.25);
   color=color.map((v,k)=>(v*(1-snow)+[.82,.86,.85][k]*snow)*(.92+detail*.16));
   const k=(j*W+i)*4,hi=Math.round(h*65535);
   terrain[k]=hi>>8;terrain[k+1]=hi&255;terrain[k+2]=uplift*255;terrain[k+3]=humidity*255;
   biome[k]=color[0]*255;biome[k+1]=color[1]*255;biome[k+2]=color[2]*255;biome[k+3]=land*255;
   // Wind shear bends the weather field into fronts; separate coverage, type and cirrus channels.
   const w=fbm(x*3+30,y*3+11,z*3,3);
   const qx=x*4+w*1.6,qy=y*5+w,qz=z*4+w*1.6;
   const front=fbm(qx+10,qy,qz,6),swirl=fbm(qx*7,qy*7,qz*7,4);
   const coverage=clamp((front+.08+Math.cos(y*10)*.035)*3.9)*(.75+swirl*.65);
   const convective=smooth(.5,.85,humidity)*(1-lat)*.06;
   cloud[k]=clamp(coverage+convective)*255;
   cloud[k+1]=clamp(.5+swirl*.392)*255;
   cloud[k+2]=clamp((fbm(x*16+80,y*3,z*16,4)+.05)*2.1)*255;
   cloud[k+3]=clamp(.5+swirl)*255;
  }
 }
 // Tileable 3-D Perlin-like/value + Worley hybrid. A real density volume, not a cloud colour atlas.
 const size=64,volume=new Uint8Array(size**3*4);
 const cell=(x:number,y:number,z:number,n:number)=>{x=(x%n+n)%n;y=(y%n+n)%n;z=(z%n+n)%n;let h=Math.imul(x+seed,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
 const value=(x:number,y:number,z:number,n:number)=>{const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);x-=ix;y-=iy;z-=iz;x=x*x*(3-2*x);y=y*y*(3-2*y);z=z*z*(3-2*z);let s=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)s+=cell(ix+a,iy+b,iz+c,n)*(a?x:1-x)*(b?y:1-y)*(c?z:1-z);return s};
 for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=x/size*8,py=y/size*8,pz=z/size*8,ix=Math.floor(px),iy=Math.floor(py),iz=Math.floor(pz);let d=10;
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){
   const cx=ix+a,cy=iy+b,cz=iz+c,dx=cx+cell(cx,cy,cz,8)-px,dy=cy+cell(cx+19,cy,cz,8)-py,dz=cz+cell(cx,cy+31,cz,8)-pz;d=Math.min(d,dx*dx+dy*dy+dz*dz);
  }
  const k=((z*size+y)*size+x)*4;
  const perlin=value(px,py,pz,8)*.57+value(px*2,py*2,pz*2,16)*.28+value(px*4,py*4,pz*4,32)*.15;
  volume[k]=clamp(perlin*.65+(1-Math.sqrt(d))*.35)*255;
  volume[k+1]=value(px*4,py*4,pz*4,32)*255;volume[k+2]=clamp(1-Math.sqrt(d))*255;volume[k+3]=255;
 }
 let hash=2166136261;for(let k=0;k<terrain.length;k++){hash=Math.imul(hash^terrain[k],16777619);hash=Math.imul(hash^cloud[k]^biome[k],16777619);}for(const v of volume)hash=Math.imul(hash^v,16777619);
 self.postMessage({terrain,biome,cloud,volume,size,width:W,height:H,sea,seed,job,signature:(hash>>>0).toString(16)}, {transfer:[terrain.buffer,biome.buffer,cloud.buffer,volume.buffer]});
};
