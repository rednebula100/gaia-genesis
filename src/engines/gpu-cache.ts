/** GPU prepass boundary. CPU snapshots are states, never rendered frames.
 * Upstream simulation code is MIT; exact sources and modifications are in SOURCE_PROVENANCE.md.
 */
import math from '../vendor/collisions/math.js?raw';
import bodies from '../vendor/collisions/bodies.js?raw';
import common from '../vendor/collisions/glsl-common.js?raw';
import sim from '../vendor/collisions/glsl-sim.js?raw';
import draw from '../vendor/collisions/glsl-draw.js?raw';
import plumbing from '../vendor/collisions/gl.js?raw';
import nbody from '../vendor/collisions/nbody.js?raw';
import {VS_FULL,FS_FORCE,FS_INTEGRATE} from '../vendor/cosmos/shaders';
import {rng} from '../geology';
export type Frame={time:number;pos:Float32Array;vel:Float32Array;aux:Float32Array};
export type BirthCache={disk:Frame[];impact:Frame[];home:Float32Array;mass:Float32Array;radius:number;width:number;height:number;contact:number;mergers:number;maxHeat:number;shader:Record<string,string>};
// The upstream IIFEs receive a private namespace, not the application's window.
// Their shell, listeners, UI, analytics, mobile rules and quality governor are never loaded.
export function collisionSource(seed:number){
 const CC:any={seed,SLOTS:8,N_CHOICES:[32768],setSim:()=>{},setReport:()=>{}};
 const host={CC};
 for(const code of [math,bodies,common,sim,draw,plumbing,nbody.replace('mulberry(1234567)','mulberry(CC.seed)').replace('mulberry(99)','mulberry(CC.seed ^ 99)')])new Function('window',code)(host);
 return CC;
}
const yieldUI=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
export type ImpactOptions={ratio:number;speed:number;angle:number;metal:number};
export async function prewarmBirth(seed:number,progress:(s:string)=>void,options?:ImpactOptions):Promise<BirthCache>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
 const gl=canvas.getContext('webgl2',{antialias:false,powerPreference:'high-performance'})!;
 if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw new Error('Floating-point WebGL2 render targets are required for the source physics.');
 const floatBlend=!!gl.getExtension('EXT_float_blend');
 try{
  progress('GRAVITY / SEEDING THE DISK');await yieldUI();
  const disk=options?{frames:[],mergers:0}:await cosmosCache(gl,seed,progress);
  progress('IMPACT / COMPILING MATERIAL PHYSICS');await yieldUI();
  const cc=collisionSource(seed);cc.gl.init({gl,floatBlend});cc.nbody.init({gl,floatBlend});
  const random=rng(seed^0x12abc);
  const s=cc.nbody.build({nIdx:0,q:options?.ratio??.14,dens:1,core:options?.metal??.32,coreImp:options?.metal??.28,spin0:.12,spin1:.08,vfac:options?.speed??1.12,angle:options?.angle??(34+random()*7),incl:12,rest:.15});
  const read=(attachment:number)=>{const data=new Float32Array(s.N*4);gl.readBuffer(gl.COLOR_ATTACHMENT0+attachment);gl.readPixels(0,0,s.W,s.H,gl.RGBA,gl.FLOAT,data);return data;};
  while(s.settleLeft>0){cc.nbody.settleSome(Math.min(12,s.settleLeft));progress(`IMPACT / SETTLING ${Math.round(100*(1-s.settleLeft/s.settleTotal))}%`);await yieldUI();}
  const impact:Frame[]=[];const start=s.t,offset=s.cen0.slice();let maxHeat=0;
  const capture=()=>{gl.bindFramebuffer(gl.FRAMEBUFFER,s.src.fbo);const pos=read(0),vel=read(1),aux=read(2);for(let i=0;i<s.N;i++){for(let k=0;k<3;k++)pos[i*4+k]-=offset[k];maxHeat=Math.max(maxHeat,vel[i*4+3]);}impact.push({time:s.t-start,pos,vel,aux});};
  capture();let next=start+.055;
  while(s.phase==='approach'){cc.nbody.rigidStep(.0275);if(s.t>=next){capture();next=s.t+.055;}if(impact.length%8===0)await yieldUI();}
  const contact=s.t-start;
  capture();next=s.t+.055;const end=s.t+2.15;let count=0;
  while(s.t<end){cc.nbody.step(false,false);s.t+=s.dt;count++;if(s.t>=next){capture();next=s.t+.055;progress(`IMPACT / CACHING ${Math.min(100,Math.round(100*(s.t-(end-2.15))/2.15))}%`);await yieldUI();}else if(count%24===0)await yieldUI();}
  capture();
  // Only state crosses this temporary context's boundary. All GPU resources are
  // reclaimed below, including upstream private grids, PBOs and shader programs.
  return {disk:disk.frames,impact,home:s.homeArr.slice(),mass:s.matR.slice(),radius:s.a,width:s.W,height:s.H,contact,mergers:disk.mergers,maxHeat,shader:cc.glsl};
 }finally{gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.width=canvas.height=1;}
}
async function cosmosCache(gl:WebGL2RenderingContext,seed:number,progress:(s:string)=>void){
 const W=32,H=16,N=W*H,random=rng(seed),pos=new Float32Array(N*4),vel=pos.slice(),col=pos.slice();
 // GAIA's bounded rocky cloud: a selected massive seed, not Cosmos's default stellar core.
 for(let i=0;i<N;i++){
  const a=random()*Math.PI*2,r=.65+Math.pow(random(),.65)*3.6,m=i===0?38:.06+random()*.5,o=i*4;
  pos.set(i===0?[0,0,0,m]:[Math.cos(a)*r,(random()-.5)*.35,Math.sin(a)*r,m],o);
  const v=Math.sqrt(.025*38/r)*(.62+random()*.14);if(i)vel.set([-Math.sin(a)*v,(random()-.5)*.025,Math.cos(a)*v,0],o);
  col.set([.045+random()*.055,.035+random()*.035,.025+random()*.022,random()*.06],o);
 }
 const tex=(data:Float32Array|null)=>{const t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,W,H,0,gl.RGBA,gl.FLOAT,data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);return t;};
 const fbo=(textures:WebGLTexture[])=>{const f=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,f);textures.forEach((t,i)=>gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,t,0));gl.drawBuffers(textures.map((_,i)=>gl.COLOR_ATTACHMENT0+i));if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Cosmos framebuffer incomplete');return f;};
 const program=(fs:string)=>{const p=gl.createProgram()!;for(const [type,source]of [[gl.VERTEX_SHADER,VS_FULL],[gl.FRAGMENT_SHADER,fs]]as const){const sh=gl.createShader(type)!;gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh)!);gl.attachShader(p,sh);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)!);return p;};
 const states=[{textures:[tex(pos),tex(vel),tex(col)],f:null as WebGLFramebuffer|null},{textures:[tex(null),tex(null),tex(null)],f:null as WebGLFramebuffer|null}];states.forEach(s=>s.f=fbo(s.textures));
 const info=tex(null),fi=fbo([info]),force=program(FS_FORCE),integrate=program(FS_INTEGRATE);gl.bindVertexArray(gl.createVertexArray());
 const bind=(p:WebGLProgram,n:string,t:WebGLTexture,u:number)=>{gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(gl.getUniformLocation(p,n),u);};
 const f=(p:WebGLProgram,n:string,v:number)=>gl.uniform1f(gl.getUniformLocation(p,n),v);
 let cur=0;const frames:Frame[]=[];
 const capture=(time:number)=>{gl.bindFramebuffer(gl.FRAMEBUFFER,states[cur].f);const arrays=[0,1,2].map(i=>{const d=new Float32Array(N*4);gl.readBuffer(gl.COLOR_ATTACHMENT0+i);gl.readPixels(0,0,W,H,gl.RGBA,gl.FLOAT,d);return d;});frames.push({time,pos:arrays[0],vel:arrays[1],aux:arrays[2]});};
 capture(0);
 for(let step=0;step<300;step++){
  const a=states[cur],b=states[1-cur];gl.viewport(0,0,W,H);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
  gl.useProgram(force);gl.bindFramebuffer(gl.FRAMEBUFFER,fi);bind(force,'uPos',a.textures[0],0);gl.uniform2i(gl.getUniformLocation(force,'uSize'),W,H);f(force,'uG',.025);f(force,'uEps2',.012);f(force,'uK',.13);f(force,'uRmax',1);gl.drawArrays(gl.TRIANGLES,0,3);
  gl.useProgram(integrate);gl.bindFramebuffer(gl.FRAMEBUFFER,b.f);['uPos','uVel','uCol'].forEach((n,i)=>bind(integrate,n,a.textures[i],i));bind(integrate,'uInfo',info,3);gl.uniform2i(gl.getUniformLocation(integrate,'uSize'),W,H);f(integrate,'uDt',.018);f(integrate,'uFlashDecay',.955);f(integrate,'uGas',0);f(integrate,'uG',.32);f(integrate,'uGM',0);gl.uniform3f(gl.getUniformLocation(integrate,'uStarPos'),0,0,0);gl.drawArrays(gl.TRIANGLES,0,3);cur=1-cur;
  if(step%5===4)capture((step+1)*.018);if(step%30===29){progress(`GRAVITY / CACHING ${Math.round((step+1)/3)}%`);await yieldUI();}
 }
 const alive=frames.at(-1)!.pos.filter((_,i)=>i%4===3&&frames.at(-1)!.pos[i]>0).length;
 return {frames,mergers:N-alive};
}
