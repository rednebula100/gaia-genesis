/** Plain-math closed Catmull-Rom tracks shared by the race sim (corners) and the 3D scene (geometry). */
export type V3=[number,number,number];
export type TrackSample={p:V3;t:V3;n:V3;curv:number};
const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],len=(a:V3)=>Math.hypot(a[0],a[1],a[2]),norm=(a:V3):V3=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l];};
function cr(p0:V3,p1:V3,p2:V3,p3:V3,t:number):V3{const t2=t*t,t3=t2*t;return[0,1,2].map(i=>.5*(2*p1[i]+(-p0[i]+p2[i])*t+(2*p0[i]-5*p1[i]+4*p2[i]-p3[i])*t2+(-p0[i]+3*p1[i]-3*p2[i]+p3[i])*t3)) as V3;}
export class Track{readonly samples:TrackSample[]=[];readonly length:number;readonly n=1200;
 constructor(readonly points:V3[]){const raw:V3[]=[];const k=points.length;const per=Math.ceil(4000/k);for(let i=0;i<k;i++)for(let j=0;j<per;j++)raw.push(cr(points[(i-1+k)%k],points[i],points[(i+1)%k],points[(i+2)%k],j/per));
  const cum=[0];for(let i=1;i<=raw.length;i++)cum.push(cum[i-1]+len(sub(raw[i%raw.length],raw[i-1])));this.length=cum[raw.length];
  let r=0;for(let s=0;s<this.n;s++){const d=s/this.n*this.length;while(cum[r+1]<d)r++;const u=(d-cum[r])/((cum[r+1]-cum[r])||1),a=raw[r],b=raw[(r+1)%raw.length];const p:V3=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];this.samples.push({p,t:[0,0,0],n:[0,0,0],curv:0});}
  for(let s=0;s<this.n;s++){const a=this.samples[(s-1+this.n)%this.n].p,b=this.samples[(s+1)%this.n].p;const t=norm(sub(b,a));this.samples[s].t=t;this.samples[s].n=norm([-t[2],0,t[0]]);}
  for(let s=0;s<this.n;s++){const a=this.samples[(s-3+this.n)%this.n].t,b=this.samples[(s+3)%this.n].t;this.samples[s].curv=Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[2]*b[2])))/(6*this.length/this.n);}}
 at(f:number){f=((f%1)+1)%1;const x=f*this.n,i=Math.floor(x),u=x-i,a=this.samples[i],b=this.samples[(i+1)%this.n];const mix=(p:V3,q:V3):V3=>[p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u];return{p:mix(a.p,b.p),t:norm(mix(a.t,b.t)),n:norm(mix(a.n,b.n)),curv:a.curv+(b.curv-a.curv)*u};}
 /** Signed lateral bank in radians, for visuals. */
 bank(f:number){const a=this.at(f-.004).t,b=this.at(f+.004).t;const cross=a[2]*b[0]-a[0]*b[2];return Math.max(-.35,Math.min(.35,cross*6));}
 corners(threshold:number):[number,number][]{const out:[number,number][]=[];let start=-1;for(let s=0;s<=this.n;s++){const c=this.samples[s%this.n].curv>threshold;if(c&&start<0)start=s;if(!c&&start>=0){if(s-start>this.n*.03)out.push([start/this.n,s/this.n]);start=-1;}}return out;}
 nearest(q:V3){let best=0,d=1e9;for(let s=0;s<this.n;s++){const e=len(sub(this.samples[s].p,q));if(e<d){d=e;best=s;}}return best/this.n;}
}
