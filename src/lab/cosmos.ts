/** Live GPU experiment using Cosmos's MIT force, merger, integrator and body shaders.
 * © 2026 A. Burak Soyak. Full license: src/vendor/cosmos/LICENSE.
 * GAIA adapter: bounded seeded rocky disk, Three MRT lifecycle and sampled trails.
 */
import * as THREE from 'three';
import {VS_FULL,FS_FORCE,FS_INTEGRATE,VS_BODY,FS_BODY} from '../vendor/cosmos/shaders';
import {floatMap} from '../engines/collision-pass';
import {rng} from '../geology';
const strip=(s:string)=>s.replace('#version 300 es','');
export class LiveCosmos{
 readonly group=new THREE.Group();time=0;alive=0;count=512;gravity=1;speed=1;paused=false;
 private targets:THREE.WebGLRenderTarget[]=[];private forceTarget:THREE.WebGLRenderTarget;
 private init:THREE.DataTexture[]=[];private current:THREE.Texture[]=[];private index=0;private w=32;private h=16;
 private compute=new THREE.Scene();private computeCamera=new THREE.Camera();private tri:THREE.Mesh;private force:THREE.RawShaderMaterial;private integrate:THREE.RawShaderMaterial;private body:THREE.RawShaderMaterial;private mesh:THREE.Mesh;
 private trail:THREE.LineSegments;private histories:Float32Array[]=[];private readAt=0;private acc=0;private readback=new Float32Array(0);
 constructor(private renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.PerspectiveCamera,sun:THREE.Vector3,seed:number,count=512){
  this.count=count;this.h=count/32;this.alive=count;const tex=(d:Float32Array)=>floatMap(d,this.w,this.h),random=rng(seed^0x99ab32),p=new Float32Array(count*4),v=p.slice(),c=p.slice();
  for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=.9+random()**.6*3.0,m=i===0?24:.018+random()*.13,o=i*4; p.set(i?[Math.cos(a)*r,(random()-.5)*.35,Math.sin(a)*r,m]:[0,0,0,m],o);const speed=Math.sqrt(.025*24/r)*(.93+random()*.15);if(i)v.set([-Math.sin(a)*speed,(random()-.5)*.018,Math.cos(a)*speed,0],o);c.set([.1+random()*.15,.07+random()*.09,.035+random()*.06,random()],o);}
  this.init=[tex(p),tex(v),tex(c)];this.current=this.init;this.readback=p.slice();
  this.targets=Array.from({length:2},()=>new THREE.WebGLRenderTarget(this.w,this.h,{count:3,type:THREE.FloatType,depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter}));
  this.forceTarget=new THREE.WebGLRenderTarget(this.w,this.h,{type:THREE.FloatType,depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  const create=(fs:string,u:Record<string,unknown>)=>new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:strip(VS_FULL),fragmentShader:strip(fs),uniforms:Object.fromEntries(Object.entries(u).map(([k,value])=>[k,{value}])),depthTest:false,depthWrite:false});
  this.force=create(FS_FORCE,{uPos:this.current[0],uSize:new THREE.Vector2(this.w,this.h),uG:.025,uEps2:.012,uK:.075,uRmax:.3});
  this.integrate=create(FS_INTEGRATE,{uPos:this.current[0],uVel:this.current[1],uCol:this.current[2],uInfo:this.forceTarget.texture,uSize:new THREE.Vector2(this.w,this.h),uDt:.009,uFlashDecay:.97,uGas:0,uG:.025,uGM:0,uStarPos:new THREE.Vector3()});
  const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0],3));this.tri=new THREE.Mesh(tg,this.force);this.tri.frustumCulled=false;this.compute.add(this.tri);
  let vs=VS_BODY.replace('int id = gl_InstanceID','int id = gl_VertexID / 6').replace('vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;','int k=gl_VertexID%6;int ci=k==0?0:k==1?1:k==2?2:k==3?2:k==4?1:3;vec2 corner=vec2(float(ci&1),float((ci>>1)&1))*2.-1.;').replace('float heat = smoothstep(uStarFrac * 0.6, uStarFrac * 1.5, frac);','float heat = 0.0;');
  this.body=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:strip(vs),fragmentShader:strip(FS_BODY).replace('fract(seed * 7.31)','0.2'),transparent:true,uniforms:{uPos:{value:this.current[0]},uVel:{value:this.current[1]},uCol:{value:this.current[2]},uSize:{value:new THREE.Vector2(this.w,this.h)},uView:{value:camera.matrixWorldInverse},uProj:{value:camera.projectionMatrix},uViewport:{value:new THREE.Vector2()},uK:{value:.075},uMinPx:{value:1.5},uTotalMass:{value:60},uStarFrac:{value:2},uSunPos:{value:sun.clone().multiplyScalar(10000)},uHalo:{value:0},uTime:{value:0},uSunLit:{value:1}}});
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*18),3));this.mesh=new THREE.Mesh(bg,this.body);this.mesh.frustumCulled=false;this.group.add(this.mesh);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*12*6),3));this.trail=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x806b45,transparent:true,opacity:.22,depthWrite:false}));this.trail.frustumCulled=false;this.group.add(this.trail);scene.add(this.group);
 }
 update(dt:number,width:number,height:number){
  if(!this.paused){this.acc+=Math.min(dt,.1)*this.speed;const step=.009;while(this.acc>=step){this.acc-=step;this.force.uniforms.uPos.value=this.current[0];this.force.uniforms.uG.value=.025*this.gravity;this.tri.material=this.force;this.renderer.setRenderTarget(this.forceTarget);this.renderer.render(this.compute,this.computeCamera);
    ['uPos','uVel','uCol'].forEach((n,i)=>this.integrate.uniforms[n].value=this.current[i]);this.tri.material=this.integrate;const dst=this.targets[this.index];this.renderer.setRenderTarget(dst);this.renderer.render(this.compute,this.computeCamera);this.current=dst.textures;this.index=1-this.index;this.time+=step;
   }
   if(this.time>=this.readAt){this.readAt=this.time+.22;const target=this.targets[1-this.index];if(this.time>0){this.renderer.readRenderTargetPixels(target,0,0,this.w,this.h,this.readback);this.alive=0;for(let i=3;i<this.readback.length;i+=4)if(this.readback[i]>0)this.alive++;this.histories.unshift(this.readback.slice());this.histories.length=Math.min(13,this.histories.length);const p=this.trail.geometry.getAttribute('position') as THREE.BufferAttribute;let n=0;for(let j=0;j<this.histories.length-1;j++)for(let i=1;i<this.count;i++){const a=this.histories[j],b=this.histories[j+1],o=i*4;if(a[o+3]<=0||b[o+3]<=0)continue;p.setXYZ(n++,a[o],a[o+1],a[o+2]);p.setXYZ(n++,b[o],b[o+1],b[o+2]);}p.needsUpdate=true;this.trail.geometry.setDrawRange(0,n);}}
  }
  ['uPos','uVel','uCol'].forEach((n,i)=>this.body.uniforms[n].value=this.current[i]);this.body.uniforms.uTime.value=this.time;this.body.uniforms.uViewport.value.set(width,height);this.renderer.setRenderTarget(null);
 }
 dispose(){this.targets.forEach(t=>t.dispose());this.forceTarget.dispose();this.init.forEach(t=>t.dispose());this.force.dispose();this.integrate.dispose();this.body.dispose();this.tri.geometry.dispose();this.mesh.geometry.dispose();this.trail.geometry.dispose();(this.trail.material as THREE.Material).dispose();this.group.removeFromParent();}
}
