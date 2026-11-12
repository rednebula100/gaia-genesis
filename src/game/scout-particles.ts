/** Stardust GPU assembly, Victor Kiselev (MIT). Original vendor shaders stay intact.
 * Game-owned seeded sphere targets and projection adapter; no source imagery. */
import * as T from 'three';
import {VSH,FSH} from '../vendor/stardust/shaders';
import {rng} from './model';
export class ScoutParticles{
 readonly points:T.Points;
 private uniforms:Record<string,T.IUniform>;
 constructor(scene:T.Scene){
  const rand=rng(918273),count=120000,g=new T.BufferGeometry();
  const attrs:Record<string,[Float32Array,number]>={aTargetQ:[new Float32Array(count*3),3],aNormal:[new Float32Array(count*3),3],aScatterQ:[new Float32Array(count*3),3],aShade:[new Float32Array(count),1],aTint:[new Float32Array(count*4),4],aExtra:[new Float32Array(count),1],aSeed:[new Float32Array(count*2),2]};
  for(let i=0;i<count;i++){const y=rand()*2-1,a=rand()*Math.PI*2,h=Math.sqrt(1-y*y),x=h*Math.cos(a),z=h*Math.sin(a);attrs.aTargetQ[0].set([x*.5,y*.5,z*.5],i*3);attrs.aNormal[0].set([x,y,z],i*3);attrs.aScatterQ[0].set([x*(.4+rand()*.5),y*.8,z*.7],i*3);attrs.aShade[0][i]=.8;attrs.aSeed[0].set([rand()*.96,.7+rand()],i*2);}
  for(const[name,[data,size]]of Object.entries(attrs))g.setAttribute(name,new T.BufferAttribute(data,size));g.setAttribute('position',new T.BufferAttribute(attrs.aTargetQ[0],3));
  const params:Record<string,unknown>={uRot:new T.Matrix3(),uScatRot:new T.Matrix3(),uTime:0,uAssemble:0,uDist:9,uAspect:1,uPxScale:8,uPxRef:8,uTwinkle:0,uAlpha:.55,uRepulse:0,uPal0:new T.Vector3(.21,.46,.53),uPal1:new T.Vector3(.68,.8,.49),uPal2:new T.Vector3(.5,.65,.7),uPal3:new T.Vector3(.8,.84,.68),uSwellAmp:0,uLift:0,uPush:0,uRipSpeed:1,uRipWidth:1,uSpread:0,uSizeMul:1,uSoft:.6,uPuff:0,uSwirl:0,uTurb:0,uDrag:0,uSpec:0,uMoveVel:new T.Vector3(),uCursorPos:new T.Vector3(),uFovF:3,uHand:1,uDofPx:0,uFocusW:4,uSun:0,uYOff:0,uCity:0,uAtmo:0,uActive:0,uRipples:Array.from({length:16},()=>new T.Vector4()),uRipAxis:Array.from({length:16},()=>new T.Vector4()),uFlareA:Array.from({length:3},()=>new T.Vector4()),uFlareB:Array.from({length:3},()=>new T.Vector4()),uFlareS:Array.from({length:3},()=>new T.Vector4()),uVortC:Array.from({length:8},()=>new T.Vector4()),uVortW:Array.from({length:8},()=>new T.Vector4())};
  this.uniforms=Object.fromEntries(Object.entries(params).map(([k,value])=>[k,{value}]));
  const v=VSH.replace('float w = uDist - p.z;','float w = -(modelViewMatrix*vec4(p,1.)).z;').replace('gl_Position = vec4(p.x*uFovF/uAspect, p.y*uFovF + uYOff*w, 0.0, w);','gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);');
  this.points=new T.Points(g,new T.ShaderMaterial({vertexShader:v,fragmentShader:FSH,uniforms:this.uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.points.frustumCulled=false;this.points.visible=false;scene.add(this.points);
 }
 update(age:number,body:T.Group|undefined){this.points.visible=!!body&&age>=0&&age<1.8;if(!this.points.visible)return;this.points.position.copy(body!.position);this.points.scale.copy(body!.scale);this.points.rotation.copy(body!.rotation);this.uniforms.uTime.value=age;this.uniforms.uAssemble.value=Math.min(1,age/1.4);this.uniforms.uAlpha.value=Math.max(0,1-age/1.8)*.35;}
}
