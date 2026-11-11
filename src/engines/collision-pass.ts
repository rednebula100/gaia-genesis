import * as THREE from 'three';
import {Pass} from 'postprocessing';
import type {BirthCache,Frame} from './gpu-cache';
const full=/*glsl*/`precision highp float;in vec3 position;void main(){gl_Position=vec4(position.xy,0.,1.);}`;
const strip=(s:string)=>s.replace('#version 300 es','');
const uniform=(value:unknown)=>({value});
const material=(vs:string,fs:string,u:Record<string,THREE.IUniform>)=>new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:strip(vs),fragmentShader:strip(fs),uniforms:u,depthTest:false,depthWrite:false});
export function floatMap(data:Float32Array,w:number,h:number){const t=new THREE.DataTexture(data,w,h,THREE.RGBAFormat,THREE.FloatType);t.needsUpdate=true;return t;}
export function sampleFrames(frames:Frame[],t:number,out:{pos:Float32Array;vel:Float32Array;aux:Float32Array}){
 let i=0;while(i<frames.length-2&&frames[i+1].time<t)i++;
 const a=frames[i],b=frames[i+1],mix=THREE.MathUtils.clamp((t-a.time)/(b.time-a.time),0,1);
 for(const key of ['pos','vel','aux']as const){const A=a[key],B=b[key],O=out[key];for(let j=0;j<O.length;j++){const v=key==='pos'&&j%4===3?A[j]:A[j]+(B[j]-A[j])*mix;O[j]=key==='aux'&&j%4===3?Math.round(v):v;}}
}
/** The original Cosmic Collisions sphere-impostor → bilateral skin → material
 * shade path. Its own film/FXAA/quality governor are replaced by GAIA's one AgX output. */
export class CollisionPass extends Pass{
 private targets:THREE.WebGLRenderTarget[]=[];private cache?:BirthCache;
 private maps:THREE.DataTexture[]=[];private states?:{pos:Float32Array;vel:Float32Array;aux:Float32Array};
 private pointScene=new THREE.Scene();private pointCamera=new THREE.Camera();private point?:THREE.Points;
 private skin?:THREE.RawShaderMaterial;private blur?:THREE.RawShaderMaterial;private shade?:THREE.RawShaderMaterial;
 private copy=material(full,`precision highp float;uniform sampler2D uScene;uniform vec2 uRes;out vec4 o;void main(){o=texture(uScene,gl_FragCoord.xy/uRes);}`,{uScene:uniform(null),uRes:uniform(new THREE.Vector2())});
 private width=1;private height=1;private time=-1;private last=-1;
 private experimentTime:number|null=null;
 constructor(private view:THREE.PerspectiveCamera,private sun:THREE.Vector3){super('Cosmic Collisions / source fluid skin');this.enabled=false;}
 setCache(cache:BirthCache){
  this.clearCache();this.cache=cache;const {width:w,height:h,shader:g}=cache;
  this.states={pos:new Float32Array(w*h*4),vel:new Float32Array(w*h*4),aux:new Float32Array(w*h*4)};
  this.maps=[floatMap(this.states.pos,w,h),floatMap(this.states.vel,w,h),floatMap(this.states.aux,w,h),floatMap(cache.home,w,h),floatMap(Float32Array.from({length:w*h*4},(_,i)=>i%4===0?cache.mass[i/4]:0),w,h)];
  const U:Record<string,THREE.IUniform>={};
  Object.entries({uPos:this.maps[0],uVel:this.maps[1],uAux:this.maps[2],uHome:this.maps[3],uHomeOn:1,uSize:new THREE.Vector2(w,h),uView:this.view.matrixWorldInverse,uProj:this.view.projectionMatrix,uRad:cache.radius,uMat:this.maps[4],uRadPow:0,uPx:1,uMaxPt:1024,uFat:1.3,uKind:[-1,0,1,0,-1,0,1,0],uPal:[new THREE.Vector3(.32,.27,.22),new THREE.Vector3(.23,.13,.075),new THREE.Vector3(.12,.105,.09),new THREE.Vector3(),new THREE.Vector3(.43,.25,.10),new THREE.Vector3(.26,.16,.09),new THREE.Vector3(.15,.12,.09),new THREE.Vector3()],uP22:0,uP32:0}).forEach(([k,v])=>U[k]=uniform(v));
  this.skin=material(g.G_VS,g.G_FS,U);this.skin.depthTest=true;this.skin.depthWrite=true;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(w*h*3),3));
  this.point=new THREE.Points(geo,this.skin);this.point.frustumCulled=false;this.pointScene.add(this.point);
  this.blur=material(full,g.BLUR_FS,{uMat:uniform(null),uDep:uniform(null),uHome:uniform(null),uDir:uniform(new THREE.Vector2()),uTaps:uniform(4),uStep:uniform(1),uRange:uniform(cache.radius*4),uRes:uniform(new THREE.Vector2())});
  const S:Record<string,THREE.IUniform>={};Object.entries({uMat:null,uDep:null,uDepRaw:null,uHome:null,uInvP:new THREE.Vector2(),uRes:new THREE.Vector2(),uSunEye:new THREE.Vector3(),uGlow:.8,uGlowT:18000,uWhite:65000,uNL:0,uLPos:[new THREE.Vector3(),new THREE.Vector3()],uLCol:[new THREE.Vector3(),new THREE.Vector3()],uLR2:[1,1],uLBall:[-1,-1],uReach2:4,uEmberMax:6,uRad:cache.radius,uEdge:.82,uEdgeSoft:.12,uDbg:0,uNO:0,uOcc:[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()],uNB:0,uBall:[new THREE.Vector4(),new THREE.Vector4()],uBallK:.6,uCut:0,uDetail:1,uBump:1.2,uFull:1,uShadow:0,uConv:.65,uInvRot:new THREE.Matrix3(),uMeltRot:new THREE.Matrix3(),uEyeW:this.view.position,uSparkOn:0,uTime:0,uP22:0,uP32:0}).forEach(([k,v])=>S[k]=uniform(v));
  this.shade=material(full,g.SHADE_FS.replace('uniform float uDetail;','const float uDetail = 1.0;').replace('o = vec4(col + emis, alpha);','o = vec4((col + emis) * 1.65, alpha * uStageAlpha);').replace('uniform float uGlow;','uniform float uGlow;uniform float uStageAlpha;'),{...S,uStageAlpha:uniform(1)});this.shade.transparent=true;this.shade.blending=THREE.NormalBlending;
  this.setSize(this.width,this.height);this.last=-1;
 }
 seek(time:number){this.experimentTime=null;this.time=time;this.enabled=time>=4.6&&time<10.25;}
 seekExperiment(time:number){this.experimentTime=time;this.time=time;this.enabled=true;}
 async prewarm(renderer:THREE.WebGLRenderer){
  await renderer.compileAsync(this.pointScene,this.pointCamera);
  for(const m of [this.blur,this.shade,this.copy]){if(!m)continue;this.fullscreenMaterial=m;await renderer.compileAsync(this.scene,this.camera);}
 }
 override setSize(w:number,h:number){this.width=w;this.height=h;this.copy.uniforms.uRes.value.set(w,h);if(!this.cache)return;
  for(const t of this.targets)t.dispose();this.targets=Array.from({length:3},(_,i)=>{const t=new THREE.WebGLRenderTarget(w,h,{count:3,type:THREE.FloatType,depthBuffer:i===0});t.textures[0].type=THREE.HalfFloatType;return t;});
  this.blur!.uniforms.uRes.value.set(w,h);this.shade!.uniforms.uRes.value.set(w,h);
 }
 override render(renderer:THREE.WebGLRenderer,input:THREE.WebGLRenderTarget|null,output:THREE.WebGLRenderTarget|null){
  if(!this.cache||!this.states||!this.skin||!this.blur||!this.shade)return;
  const cache=this.cache,camera=this.view,phase=THREE.MathUtils.clamp((this.time-4.6)/5.4,0,1);
  // Approach receives anticipation; the actual contact is at 6.65s.
  const simTime=this.experimentTime??(phase<2.05/5.4?cache.contact*phase/(2.05/5.4):cache.contact+(cache.impact.at(-1)!.time-cache.contact)*(phase-2.05/5.4)/(1-2.05/5.4));
  if(this.time!==this.last){sampleFrames(cache.impact,simTime,this.states);this.maps.slice(0,3).forEach(t=>t.needsUpdate=true);this.last=this.time;}
  const P=camera.projectionMatrix.elements;this.skin.uniforms.uPx.value=P[5]*this.height*.5;this.skin.uniforms.uP22.value=P[10];this.skin.uniforms.uP32.value=P[14];
  const su=this.shade.uniforms;su.uInvP.value.set(1/P[0],1/P[5]);su.uP22.value=P[10];su.uP32.value=P[14];su.uSunEye.value.copy(this.sun).transformDirection(camera.matrixWorldInverse);su.uInvRot.value.setFromMatrix4(camera.matrixWorld);su.uMeltRot.value.setFromMatrix4(camera.matrixWorld);su.uTime.value=simTime*.15;
  renderer.setRenderTarget(this.targets[0]);const old=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();renderer.setClearColor(0,0);renderer.clear();renderer.render(this.pointScene,this.pointCamera);
  // Source view.js: four alternating bilateral passes, with a dense prepass
  // when close-up particles require a widely spaced comb. A fixed four-pixel
  // blur leaves the individual impostors visible instead of a continuous skin.
  const rpx=cache.radius*P[5]*this.height/camera.position.length(),taps=Math.max(1,Math.min(12,Math.round(rpx))),step=Math.max(1,rpx/taps),pre=step>1.5?Math.ceil(step):0;
  const passes: [number,number][]=[];if(pre)passes.push([pre,1],[pre,1]);for(let k=0;k<4;k++)passes.push([taps,step]);
  let src=this.targets[0];for(let i=0;i<passes.length;i++){const u=this.blur.uniforms;u.uTaps.value=passes[i][0];u.uStep.value=passes[i][1];u.uMat.value=src.textures[0];u.uDep.value=src.textures[1];u.uHome.value=src.textures[2];u.uDir.value.set(1-(i&1),i&1);this.fullscreenMaterial=this.blur;const dst=this.targets[1+(i&1)];renderer.setRenderTarget(dst);renderer.render(this.scene,this.camera);src=dst;}
  su.uStageAlpha.value=this.experimentTime===null?1-THREE.MathUtils.smoothstep(this.time,10,10.25):1;
  su.uMat.value=src.textures[0];su.uDep.value=src.textures[1];su.uHome.value=src.textures[2];su.uDepRaw.value=this.targets[0].textures[1];
  this.copy.uniforms.uScene.value=input!.texture;this.fullscreenMaterial=this.copy;renderer.setRenderTarget(output);renderer.render(this.scene,this.camera);
  this.fullscreenMaterial=this.shade;const clear=renderer.autoClear;renderer.autoClear=false;renderer.render(this.scene,this.camera);renderer.autoClear=clear;renderer.setClearColor(old,alpha);
 }
 private clearCache(){this.maps.forEach(t=>t.dispose());this.maps=[];if(this.point){this.pointScene.remove(this.point);this.point.geometry.dispose();}this.skin?.dispose();this.blur?.dispose();this.shade?.dispose();this.targets.forEach(t=>t.dispose());this.targets=[];}
 override dispose(){this.clearCache();this.copy.dispose();super.dispose();}
}
