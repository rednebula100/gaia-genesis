/** Independent spherical ray quadrature: p = r sin(i)/v is conserved.
 * This is a 1-D educational direct-ray model, not a travel-time prediction service.
 * No paths, code or data copied from world-layers. Reflections/conversions omitted.
 */
import * as THREE from 'three';
import {R,velocity,drawnRadius,layers,unitAt} from './model';
import type {LabState} from './state';
type Sample={r:number;angle:number;time:number};
export type Ray={kind:'P'|'S';points:Sample[];arrival:number|null;duration:number;stopped:boolean};
export function trace(kind:'P'|'S',launch:number):Ray{
 const p=R*Math.sin(launch)/velocity(R,kind),points:Sample[]=[{r:R,angle:0,time:0}];let r=R,angle=0,time=0,turned=false,stopped=false;
 // Integrate within each continuous region. A velocity jump that cannot transmit
 // terminates this direct branch; it must not masquerade as a smooth turning ray.
 const nodes=[-.8611363116,-.3399810436,.3399810436,.8611363116],weights=[.3478548451,.6521451549,.6521451549,.3478548451];
 for(let step=0;step<4000;step++){
  const region=layers[unitAt(r-1e-6)],v=velocity(r-1e-6,kind);
  if(v<.01||p*v/r>=1){stopped=true;break;}
  let next=Math.max(region.a,r-4,.0001),turn=p*velocity(next+1e-6,kind)/next>=1;
  if(turn){let lo=next,hi=r;for(let j=0;j<36;j++){const m=(lo+hi)*.5;if(p*velocity(m,kind)/m>1)lo=m;else hi=m;}next=(lo+hi)*.5;}
  let da=0,dt=0;
  // r = r_turn + u² removes the square-root singularity at a turning point.
  const span=turn?Math.sqrt(r-next):r-next;
  for(let j=0;j<4;j++){const u=(nodes[j]+1)*span*.5,rr=turn?next+u*u:next+u,vv=velocity(rr,kind),sin=p*vv/rr,ds=weights[j]*span*.5*(turn?2*u:1)/Math.sqrt(Math.max(1e-14,1-sin*sin));da+=ds*sin/rr;dt+=ds/vv;}
  angle+=da;time+=dt;r=next;
  if(step%2===0||turn||r===region.a)points.push({r,angle,time});
  if(turn){turned=true;break;}
 }
 if(turned){const inward=points.slice();for(let j=inward.length-2;j>=0;j--){const q=inward[j];points.push({r:q.r,angle:2*angle-q.angle,time:2*time-q.time});}time*=2;angle*=2;}
 return{kind,points,arrival:turned?Math.acos(Math.cos(angle))*180/Math.PI:null,duration:time,stopped};
}
const vs=`attribute float travel;varying float t;void main(){t=travel;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fs=`uniform float clock;uniform vec3 tint;varying float t;void main(){if(t>clock)discard;float front=exp(-pow((clock-t)/18.,2.));gl_FragColor=vec4(tint*(.65+front*1.7),.38+front*.60);}`;
export class Seismic{
 readonly group=new THREE.Group();readonly rays:Ray[]=[];readonly shadows:{P:number[];S:number[]}={P:[],S:[]};
 private paths:{ray:Ray;line:THREE.Line;sign:number}[]=[];private lastScale=-1;
 private source:THREE.Mesh;private arrivals:THREE.Points;
 constructor(world:THREE.Group){
  world.add(this.group);this.group.visible=false;
  for(const kind of ['P','S'] as const){const critical=Math.asin(3480/velocity(3480.1,kind)*velocity(R,kind)/R)*180/Math.PI;const angles=[...Array.from({length:44},(_,i)=>1+i*2),critical+.02,critical+.08,critical+.2,critical+.5];for(const deg of angles){const ray=trace(kind,deg*Math.PI/180);this.rays.push(ray);for(const sign of [-1,1]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(ray.points.length*3),3));g.setAttribute('travel',new THREE.Float32BufferAttribute(ray.points.map(p=>p.time),1));const m=new THREE.ShaderMaterial({vertexShader:vs,fragmentShader:fs,uniforms:{clock:{value:0},tint:{value:new THREE.Color(kind==='P'?'#e8c485':'#7cbfbc')}},transparent:true,depthTest:false,depthWrite:false});const line=new THREE.Line(g,m);line.renderOrder=25;line.frustumCulled=false;this.paths.push({ray,line,sign});this.group.add(line);}}}
  for(const k of ['P','S'] as const){const a:number[]=[];for(let launch=.1;launch<89;launch+=.1){const r=trace(k,launch*Math.PI/180);if(r.arrival!==null&&(k==='S'||Math.min(...r.points.map(p=>p.r))>=1221))a.push(r.arrival);}a.sort((a,b)=>a-b);let lo=0,hi=0,gap=0;for(let i=1;i<a.length;i++)if(a[i]-a[i-1]>gap){gap=a[i]-a[i-1];lo=a[i-1];hi=a[i];}if(k==='S'){lo=a.at(-1)??0;hi=180;}this.shadows[k]=[lo,hi];
   for(const sign of [-1,1]){const points=Array.from({length:101},(_,i)=>{const a=(lo+(hi-lo)*i/100)*Math.PI/180;return new THREE.Vector3(Math.sin(a)*1.028*sign,Math.cos(a)*1.028,.003);});const mat=new THREE.LineDashedMaterial({color:k==='P'?0xc09e63:0x658e8d,transparent:true,opacity:.5,dashSize:.018,gapSize:.012,depthTest:false});const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat);l.computeLineDistances();l.userData.kind=k;this.group.add(l);}
  }
  this.source=new THREE.Mesh(new THREE.SphereGeometry(.013,16,12),new THREE.MeshBasicMaterial({color:0xffd995,depthTest:false}));this.source.position.set(0,1.01,.005);this.source.renderOrder=30;this.group.add(this.source);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.rays.length*2*3),3));this.arrivals=new THREE.Points(g,new THREE.PointsMaterial({color:0xf4dfaa,size:.015,depthTest:false,transparent:true}));this.arrivals.renderOrder=26;this.group.add(this.arrivals);
 }
 update(s:LabState,scale:number){
  this.group.visible=s.mode==='seismic';if(!this.group.visible)return;
  const changed=Math.abs(scale-this.lastScale)>1e-5;this.paths.forEach(({ray,line,sign})=>{line.visible=s.quakeActive&&(s.wave==='both'||s.wave===ray.kind);(line.material as THREE.ShaderMaterial).uniforms.clock.value=s.quakeClock;
   if(changed){const p=line.geometry.getAttribute('position') as THREE.BufferAttribute;ray.points.forEach((v,i)=>{const r=drawnRadius(v.r,scale);p.setXYZ(i,Math.sin(v.angle)*r*sign,Math.cos(v.angle)*r,.008);});p.needsUpdate=true;}
  });this.lastScale=scale;this.source.scale.setScalar(1+Math.exp(-s.quakeClock/40)*Math.sin(s.quakeClock*.18)*.5);
  const p=this.arrivals.geometry.getAttribute('position') as THREE.BufferAttribute;let n=0;for(const r of this.rays)if(s.quakeActive&&r.arrival!==null&&r.duration<=s.quakeClock&&(s.wave==='both'||s.wave===r.kind))for(const sign of [-1,1]){const a=r.points.at(-1)!.angle;p.setXYZ(n++,Math.sin(a)*1.015*sign,Math.cos(a)*1.015,.01);}p.needsUpdate=true;this.arrivals.geometry.setDrawRange(0,n);
 }
 dispose(){this.group.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(m.material as THREE.Material).dispose();});this.group.removeFromParent();}
}
