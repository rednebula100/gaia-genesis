/** Adapted GPU assembly/shading: Stardust, Copyright (c) 2026 Victor Kiselev, MIT.
 * See ../vendor/stardust/LICENSE. GAIA supplies all targets and colors; no original imagery. */
import * as THREE from 'three';
import {VSH,FSH} from '../vendor/stardust/shaders';
import {rng} from '../geology';
import {floatMap,sampleFrames} from './collision-pass';
import type {BirthCache} from './gpu-cache';
import {VS_BODY,FS_BODY} from '../vendor/cosmos/shaders';
export class BirthObjects{
 readonly disk=new THREE.Group();readonly assembly=new THREE.Group();
 private rocks?:THREE.Mesh;private trails?:THREE.LineSegments;private particles?:THREE.Points;private maps:THREE.DataTexture[]=[];
 private states?:{pos:Float32Array;vel:Float32Array;aux:Float32Array};private cache?:BirthCache;private last=-1;
 constructor(private scene:THREE.Scene,private world:THREE.Group,private camera:THREE.PerspectiveCamera,private sun:THREE.Vector3){scene.add(this.disk);world.add(this.assembly);}
 setSeed(cache:BirthCache,seed:number,terrain:Uint8Array,biome:Uint8Array,width:number,height:number,sea:number){
  this.disposeSeed();this.cache=cache;const random=rng(seed^0xa81c),N=cache.disk[0].pos.length/4;
  this.states={pos:new Float32Array(N*4),vel:new Float32Array(N*4),aux:new Float32Array(N*4)};
  this.maps=[floatMap(this.states.pos,32,16),floatMap(this.states.vel,32,16),floatMap(this.states.aux,32,16)];
  // Cosmos's authored rocky impostor appearance, instanced six-vertex triangles.
  let vs=VS_BODY.replace('#version 300 es','').replace('int id = gl_InstanceID','int id = gl_VertexID / 6').replace('vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;','int k=gl_VertexID%6;int ci=k==0?0:k==1?1:k==2?2:k==3?2:k==4?1:3;vec2 corner=vec2(float(ci&1),float((ci>>1)&1))*2.-1.;');
  // Stellar palette/classification is intentionally disabled; all bodies remain rocky.
  vs=vs.replace('float heat = smoothstep(uStarFrac * 0.6, uStarFrac * 1.5, frac);','float heat = 0.0;');
  // Preserve source merger timing while keeping a local hot scar: its stellar
  // full-disc flash otherwise overwhelms the shaded rocky surface. Scar direction
  // is seeded art direction, not a resolved physical contact normal.
  const rockFS=FS_BODY.replace('#version 300 es','').replace('fract(seed * 7.31)','0.2')
   .replace('flash * vec3(1.0, 0.6, 0.25) * 0.9','flash * vec3(1.0, 0.38, 0.08) * 0.7 * pow(max(dot(n, normalize(vec3(cos(seed*91.0),sin(seed*91.0),0.35))),0.0),12.0)');
  const mat=new THREE.RawShaderMaterial({glslVersion:THREE.GLSL3,vertexShader:vs,fragmentShader:rockFS,uniforms:{uPos:{value:this.maps[0]},uVel:{value:this.maps[1]},uCol:{value:this.maps[2]},uSize:{value:new THREE.Vector2(32,16)},uView:{value:this.camera.matrixWorldInverse},uProj:{value:this.camera.projectionMatrix},uViewport:{value:new THREE.Vector2()},uK:{value:.13},uMinPx:{value:1.1},uTotalMass:{value:250},uStarFrac:{value:2},uSunPos:{value:this.sun.clone().multiplyScalar(10000)},uHalo:{value:0},uTime:{value:0},uSunLit:{value:1}},transparent:true,depthTest:true,depthWrite:true});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*6*3),3));this.rocks=new THREE.Mesh(geo,mat);this.rocks.frustumCulled=false;this.disk.add(this.rocks);
  const tg=new THREE.BufferGeometry(),ta=new Float32Array(N*10*2);tg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*10*6),3).setUsage(THREE.DynamicDrawUsage));for(let i=0;i<N;i++)for(let j=0;j<10;j++)ta.set([(1-j/10)*.24,(1-(j+1)/10)*.24],(i*10+j)*2);tg.setAttribute('aTrail',new THREE.BufferAttribute(ta,1));
  this.trails=new THREE.LineSegments(tg,new THREE.ShaderMaterial({vertexShader:'attribute float aTrail;varying float vTrail;void main(){vTrail=aTrail;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying float vTrail;void main(){gl_FragColor=vec4(.36,.25,.14,vTrail);}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.trails.frustumCulled=false;this.disk.add(this.trails);
  const count=420000,attrs={aTargetQ:new Float32Array(count*3),aNormal:new Float32Array(count*3),aScatterQ:new Float32Array(count*3),aShade:new Float32Array(count),aTint:new Float32Array(count*4),aLabTint:new Float32Array(count*4),aExtra:new Float32Array(count),aSeed:new Float32Array(count*2)};
  const end=cache.impact.at(-1)!.pos,inverse=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0,-.25,.14)).invert(),scatter=new THREE.Vector3();
  // Stardust's spherical shape sampler and quantization contract, driven by a seeded
  // RNG and GAIA's exact atlas instead of landAt/ETOPO/cityAt or Math.random.
  for(let i=0;i<count;i++){
   const y=random()*2-1,a=random()*Math.PI*2,s=Math.sqrt(1-y*y),x=-Math.cos(a)*s,z=Math.sin(a)*s;
   const j=(Math.min(height-1,Math.floor(Math.acos(y)/Math.PI*height))*width+Math.min(width-1,Math.floor(a/(2*Math.PI)*width)))*4;
   const h=(terrain[j]*256+terrain[j+1])/65535,land=h>sea;
   attrs.aTargetQ.set([x*.5,y*.5,z*.5],i*3);attrs.aNormal.set([x,y,z],i*3);
   const e=(i%(end.length/4))*4;scatter.set(end[e],end[e+1],end[e+2]).applyMatrix4(inverse).multiplyScalar(1/4.5);attrs.aScatterQ.set(scatter.toArray(),i*3);
   attrs.aShade[i]=.85;attrs.aSeed.set([random()*.965,.6+Math.pow(random(),2)*1.9],i*2);
   const rgb=land?[biome[j]/255,biome[j+1]/255,biome[j+2]/255]:[.02,.10,.19];
   attrs.aTint.set([.20+rgb[0]*.15,.035+rgb[1]*.08,.006+rgb[2]*.03,1],i*4);
   attrs.aLabTint.set([rgb[0],rgb[1],rgb[2],1],i*4);
  }
  let av=VSH.replace('uniform mat3 uRot;','uniform mat3 uRot;uniform vec3 uSunDirection;uniform float uLaboratory;uniform float uLabPalette;attribute vec4 aLabTint;')
   .replaceAll('aTint.rgb','mix(aTint.rgb,mix(aLabTint.rgb,aLabTint.bgr*vec3(.6,1.2,1.5),step(1.5,uLabPalette)),uLaboratory)')
   .replace('float w = uDist - p.z;','float w = -(modelViewMatrix*vec4(p,1.)).z;')
   .replace('gl_Position = vec4(p.x*uFovF/uAspect, p.y*uFovF + uYOff*w, 0.0, w);','gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);')
   .replace('vec3 n = uRot * nm;','vec3 n = normalize(mat3(modelMatrix)*nm);')
   .replace('normalize(vec3(-0.45, 0.65, 0.62))','uSunDirection')
   .replace('normalize(camPos - p)','normalize(cameraPosition-(modelMatrix*vec4(p,1.)).xyz)');
  const u:Record<string,THREE.IUniform>={};
  const params={uRot:new THREE.Matrix3(),uScatRot:new THREE.Matrix3(),uSunDirection:this.sun,uTime:0,uAssemble:0,uDist:5,uAspect:1,uPxScale:4,uPxRef:4,uTwinkle:0,uAlpha:.52,uRepulse:0,uPal0:new THREE.Vector3(.4,.055,.006),uPal1:new THREE.Vector3(.7,.18,.018),uPal2:new THREE.Vector3(.3,.08,.012),uPal3:new THREE.Vector3(.6,.22,.035),uSwellAmp:0,uLift:0,uPush:0,uRipSpeed:1,uRipWidth:1,uSpread:0,uSizeMul:1,uSoft:.3,uPuff:0,uSwirl:0,uTurb:0,uDrag:0,uSpec:.05,uMoveVel:new THREE.Vector3(),uCursorPos:new THREE.Vector3(),uFovF:3,uHand:1,uDofPx:0,uFocusW:4,uSun:0,uYOff:0,uCity:0,uAtmo:0,uActive:0,uRipples:Array.from({length:16},()=>new THREE.Vector4()),uRipAxis:Array.from({length:16},()=>new THREE.Vector4()),uFlareA:Array.from({length:3},()=>new THREE.Vector4()),uFlareB:Array.from({length:3},()=>new THREE.Vector4()),uFlareS:Array.from({length:3},()=>new THREE.Vector4()),uVortC:Array.from({length:8},()=>new THREE.Vector4()),uVortW:Array.from({length:8},()=>new THREE.Vector4())};Object.entries(params).forEach(([k,value])=>u[k]={value});
  u.uLaboratory={value:0};u.uLabPalette={value:0};
  const am=new THREE.ShaderMaterial({vertexShader:av,fragmentShader:FSH,uniforms:u,transparent:true,depthWrite:false,depthTest:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor});
  const ag=new THREE.BufferGeometry();for(const[name,data]of Object.entries(attrs))ag.setAttribute(name,new THREE.BufferAttribute(data,name==='aSeed'?2:name==='aTint'||name==='aLabTint'?4:name==='aShade'||name==='aExtra'?1:3));ag.setAttribute('position',new THREE.BufferAttribute(attrs.aTargetQ,3));
  this.particles=new THREE.Points(ag,am);this.particles.frustumCulled=false;this.assembly.add(this.particles);this.last=-1;
 }
 update(t:number,physicalWidth:number,physicalHeight:number){
  if(this.particles){const u=(this.particles.material as THREE.ShaderMaterial).uniforms;u.uLaboratory.value=0;u.uSizeMul.value=1;u.uTurb.value=0;u.uSwirl.value=0;u.uSpec.value=.05;const palettes=[[.4,.055,.006],[.7,.18,.018],[.3,.08,.012],[.6,.22,.035]];for(let i=0;i<4;i++)u[`uPal${i}`].value.fromArray(palettes[i]);}
  this.disk.visible=t<4.6;this.assembly.visible=t>=10&&t<12.5;
  if(this.cache&&this.states&&this.rocks&&this.disk.visible){
   if(t!==this.last){const simT=Math.min(t/4.6,1)*this.cache.disk.at(-1)!.time;sampleFrames(this.cache.disk,simT,this.states);
    const scale=THREE.MathUtils.lerp(1,1/(.13*Math.cbrt(this.states.pos[3])),THREE.MathUtils.smoothstep(t,2.7,4.6));
    const center=this.states.pos.slice(0,3);for(let i=0;i<this.states.pos.length;i+=4){for(let k=0;k<3;k++)this.states.pos[i+k]=(this.states.pos[i+k]-center[k])*scale;}
    const frames=this.cache.disk;let fi=0;while(fi<frames.length-1&&frames[fi+1].time<simT)fi++;const trail=this.trails!.geometry.getAttribute('position')as THREE.BufferAttribute;
    for(let i=0;i<this.states.pos.length/4;i++)for(let j=0;j<10;j++){const a=frames[Math.max(0,fi-j)],b=frames[Math.max(0,fi-j-1)],o=(i*10+j)*2;const alive=i>0&&a.pos[i*4+3]>0&&b.pos[i*4+3]>0&&this.states.pos[i*4+3]>0;for(let k=0;k<2;k++){const f=k?b:a;trail.setXYZ(o+k,alive?(f.pos[i*4]-center[0])*scale:0,alive?(f.pos[i*4+1]-center[1])*scale:0,alive?(f.pos[i*4+2]-center[2])*scale:0);}}trail.needsUpdate=true;
    this.maps.forEach(v=>v.needsUpdate=true);const m=this.rocks.material as THREE.RawShaderMaterial;m.uniforms.uK.value=.13*scale;this.last=t;
   }
   const u=(this.rocks.material as THREE.RawShaderMaterial).uniforms;u.uViewport.value.set(physicalWidth,physicalHeight);u.uTime.value=t;
  }
  if(this.particles&&this.assembly.visible){const u=(this.particles.material as THREE.ShaderMaterial).uniforms;u.uTime.value=t;u.uAssemble.value=THREE.MathUtils.smoothstep(t,10,12.3);u.uAlpha.value=.45*(1-THREE.MathUtils.smoothstep(t,11.9,12.5));u.uDist.value=this.camera.position.z;u.uAspect.value=this.camera.aspect;u.uPxScale.value=u.uPxRef.value=physicalHeight*.006;}
 }
 hide(){this.disk.visible=this.assembly.visible=false;}
 laboratory(assemble:number,time:number,physicalHeight:number,palette:number,size:number){
  this.disk.visible=false;this.assembly.visible=true;if(!this.particles)return;
  const u=(this.particles.material as THREE.ShaderMaterial).uniforms;u.uLaboratory.value=palette===1?0:1;u.uLabPalette.value=palette;
  u.uTime.value=time;u.uAssemble.value=assemble;u.uAlpha.value=.68;u.uDist.value=this.camera.position.z;u.uAspect.value=this.camera.aspect;u.uPxScale.value=u.uPxRef.value=physicalHeight*.006;
  u.uSizeMul.value=size;u.uTurb.value=.12;u.uSwirl.value=.1;u.uSpec.value=.22;
  const palettes=palette===2?[[.08,.19,.25],[.25,.65,.7],[.1,.25,.4],[.5,.65,.7]]:[[.4,.055,.006],[.7,.18,.018],[.3,.08,.012],[.6,.22,.035]];
  for(let i=0;i<4;i++)u[`uPal${i}`].value.fromArray(palettes[i]);
 }
 private disposeSeed(){for(const g of [this.disk,this.assembly]){for(const m of [...g.children]){g.remove(m);const mesh=m as THREE.Mesh;mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}}this.maps.forEach(t=>t.dispose());this.maps=[];}
 dispose(){this.disposeSeed();this.scene.remove(this.disk);this.world.remove(this.assembly);this.cache=undefined;}
}
