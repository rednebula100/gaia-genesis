import * as THREE from 'three';
export const PI=Math.PI,start=PI*.5,end=PI;
// Core radii approximate PREM proportions. The 1.5% crust is deliberately exaggerated.
export const bounds=[0,.1916,.546,.985,1];
export function sphere(radius:number,phi:number,length:number){
 const g=new THREE.SphereGeometry(radius,192,128,phi,length),uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setX(i,(phi+uv.getX(i)*length)/(PI*2));return g;
}
// Meridional half-annuli tessellated radially as well as angularly: each is a real
// cross-section of its curved shell, sharing precisely the same radial boundary.
export function cap(inner:number,outer:number,phi:number){
 const p:number[]=[],uv:number[]=[],idx:number[]=[],radial=40,angular=160;
 for(let j=0;j<=angular;j++)for(let k=0;k<=radial;k++){
  const t=j/angular*PI,r=THREE.MathUtils.lerp(inner,outer,k/radial);
  p.push(-r*Math.cos(phi)*Math.sin(t),r*Math.cos(t),r*Math.sin(phi)*Math.sin(t));uv.push(k/radial,j/angular);
  if(j<angular&&k<radial){const n=j*(radial+1)+k;idx.push(n,n+1,n+radial+1,n+1,n+radial+2,n+radial+1);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
