// SPDX-License-Identifier: GPL-3.0-only
// Standalone WebGL2 program. Original GLSL: Julien Sulpis, revision cfa2776.
// No Three.js, GSAP, GAIA shaders or postprocessing are linked into this worker.
import vertex from '../vendor/jsulpis/vertex.glsl?raw';
import earth from '../vendor/jsulpis/earth.fragment.glsl?raw';
import procedural from '../vendor/jsulpis/procedural.fragment.glsl?raw';
import planet from '../vendor/jsulpis/planet.fragment.glsl?raw';
import type {Body,Uniforms} from './protocol';

let canvas:OffscreenCanvas,gl:WebGL2RenderingContext,base='',width=1920,height=1080,dpr=1,seed=162711;
let active=false,ready=false,body:Body='earth',uniforms:Uniforms={},program:WebGLProgram,vao:WebGLVertexArrayObject;
let frames=0,request=0,last=0,velocity=0,damping=.94,fixed=false,token=0,quality=1;
const programs=new Map<string,WebGLProgram>(),textures=new Map<string,Promise<WebGLTexture>>(),locations=new Map<WebGLProgram,Map<string,WebGLUniformLocation|null>>();
let bound:Record<string,WebGLTexture>={},noise:WebGLTexture|undefined,buffer:WebGLBuffer;
const saved=new Map<Body,Uniforms>();
const maps:Partial<Record<Body,string>>={moon:'2k_moon.jpeg',mercury:'2k_mercury.jpg',venus:'2k_venus.jpg',mars:'2k_mars.jpg',jupiter:'2k_jupiter.jpg'};
function preset(b:Body):Uniforms{
 const u:Uniforms={uTime:0,uRotationSpeed:1,uPlanetPosition:[0,0,-10],uRotationOffset:.6,uPlanetRadius:2,uBumpStrength:.01,uNoiseStrength:.2,uTerrainScale:.8,uCloudsDensity:.5,uCloudsScale:1,uCloudsSpeed:1.5,uAtmosphereColor:[.05,.3,.9],uAtmosphereDensity:.3,uAmbientLight:.01,uSunIntensity:3,sunDirectionXY:[1,1]};
 if(b==='earth')Object.assign(u,{uAmbientLight:.002,uCloudsScale:-1,uCloudsSpeed:-1});
 if(b==='procedural')Object.assign(u,{uPlanetPosition:[0,0,0],uPlanetRadius:1.9});
 if(b==='moon'||b==='mercury')Object.assign(u,{uAtmosphereColor:[1,1,1],uAtmosphereDensity:.05});
 if(b==='venus')Object.assign(u,{uAtmosphereColor:[.9,.3,0],uAtmosphereDensity:.1,uBumpStrength:.005});
 if(b==='mars')Object.assign(u,{uAtmosphereColor:[.9,.15,0],uAtmosphereDensity:.2});
 if(b==='jupiter')Object.assign(u,{uAtmosphereColor:[.36,.92,.95],uAtmosphereDensity:.05,uBumpStrength:.003});
 return u;
}
function state(){self.postMessage({type:'state',body,ready,active,frames,time:uniforms.uTime,quality,width:canvas.width,height:canvas.height,seed,uniforms});}
function fail(e:unknown){ready=false;self.postMessage({type:'error',error:String(e)});}
function shader(type:number,source:string){const s=gl.createShader(type)!;gl.shaderSource(s,'#version 300 es\n'+source.replace(/#version 300 es\s*/,''));gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??'Shader compile failed');return s;}
function getProgram(b:Body){const key=b==='earth'?'earth':b==='procedural'?'procedural':'planet';let p=programs.get(key);if(p)return p;p=gl.createProgram()!;const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,{earth,procedural,planet}[key]!);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)??'Shader link failed');programs.set(key,p);locations.set(p,new Map());return p;}
function loc(name:string){const m=locations.get(program)!;if(!m.has(name))m.set(name,gl.getUniformLocation(program,name));return m.get(name)!;}
async function texture(name:string){if(textures.has(name))return textures.get(name)!;const task=(async()=>{const response=await fetch(base+name);if(!response.ok)throw new Error(`Atlas texture ${name}: ${response.status}`);const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'});const t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);bitmap.close();gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);const mip=name.includes('night')||name.includes('stars');gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,name.includes('stars')?gl.LINEAR_MIPMAP_LINEAR:mip?gl.NEAREST_MIPMAP_LINEAR:gl.NEAREST);if(mip)gl.generateMipmap(gl.TEXTURE_2D);return t;})();textures.set(name,task);return task;}
function makeNoise(){if(noise)gl.deleteTexture(noise);const data=new Uint8Array(32**3);let s=seed||0x6d2b79f5;for(let i=0;i<data.length;i++){s^=s<<13;s^=s>>>17;s^=s<<5;data[i]=s>>>24;}noise=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_3D,noise);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage3D(gl.TEXTURE_3D,0,gl.R8,32,32,32,0,gl.RED,gl.UNSIGNED_BYTE,data);for(const v of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_3D,v,gl.LINEAR);for(const v of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_3D,v,gl.REPEAT);}
function resize(){quality=body==='procedural'?2:Math.min(dpr,2);canvas.width=Math.round(width*quality);canvas.height=Math.round(height*quality);gl.viewport(0,0,canvas.width,canvas.height);}
function draw(){if(!ready)return;gl.useProgram(program);gl.bindVertexArray(vao);const a=gl.getAttribLocation(program,'position');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);for(const [key,value]of Object.entries({...uniforms,uResolution:[width,height],uQuality:quality})){const l=loc(key);if(l===null)continue;if(typeof value==='number')gl.uniform1f(l,value);else if(value.length===2)gl.uniform2fv(l,value);else gl.uniform3fv(l,value);}let i=0;for(const [key,t]of Object.entries(bound)){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(loc(key),i++);}if(body==='procedural'){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_3D,noise!);gl.uniform1i(loc('uNoiseTexture'),i);}gl.drawArrays(gl.TRIANGLES,0,6);frames++;}
function loop(now:number){request=0;if(!active||!ready)return;const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;if(!fixed){uniforms.uTime=(uniforms.uTime as number)+dt*.6*(uniforms.uRotationSpeed as number);uniforms.uRotationOffset=(uniforms.uRotationOffset as number)+velocity*dt;velocity*=Math.pow(damping,dt*60);}draw();request=self.requestAnimationFrame(loop);}
function schedule(){if(active&&ready&&!request){last=performance.now();request=self.requestAnimationFrame(loop);}}
async function select(next:Body){const job=++token;ready=false;if(uniforms.uTime!==undefined)saved.set(body,structuredClone(uniforms));body=next;uniforms=structuredClone(saved.get(body)??preset(body));velocity=0;fixed=false;state();const p=getProgram(body);const files=body==='procedural'?{}:body==='earth'?{uEarthColor:'2k_earth_color.jpeg',uEarthClouds:'2k_earth_clouds.jpeg',uEarthSpecular:'2k_earth_specular.jpeg',uEarthBump:'2k_earth_bump.jpg',uEarthNight:'2k_earth_night.jpeg',uStars:'8k_stars.jpg'}:{uPlanetColor:maps[body]!,uStars:'8k_stars.jpg'};const entries=await Promise.all(Object.entries(files).map(async([k,v])=>[k,await texture(v)] as const));if(job!==token)return;bound=Object.fromEntries(entries);program=p;if(body==='procedural'&&!noise)makeNoise();resize();ready=true;draw();state();schedule();}
self.onmessage=async(e:MessageEvent)=>{const m=e.data;try{switch(m.type){
 case'init':canvas=m.canvas;base=m.base;width=m.width;height=m.height;dpr=m.dpr;seed=m.seed;gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:true})!;if(!gl)throw new Error('WebGL2 unavailable');vao=gl.createVertexArray()!;gl.bindVertexArray(vao);buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,1,0,0,0,1,0,0,1,0,1,0,0,1,1,0]),gl.STATIC_DRAW);canvas.addEventListener('webglcontextlost',()=>{active=false;fail('WebGL context lost. Reload to restore Atlas.');});active=true;await select(m.body);break;
 case'body':await select(m.body);break;
 case'active':active=m.value;if(!active&&request){self.cancelAnimationFrame(request);request=0;}state();schedule();break;
 case'resize':width=m.width;height=m.height;dpr=m.dpr;resize();if(active)draw();state();break;
 case'uniforms':Object.assign(uniforms,m.values);if(active)draw();state();break;
 case'drag':uniforms.uRotationOffset=(uniforms.uRotationOffset as number)+m.delta;velocity=m.velocity;break;
 case'damping':damping=m.value;break;
 case'resetView':Object.assign(uniforms,{uPlanetPosition:preset(body).uPlanetPosition,uPlanetRadius:preset(body).uPlanetRadius,uRotationOffset:.6});velocity=0;state();break;
 case'resetLook':{const view={uTime:uniforms.uTime,uRotationOffset:uniforms.uRotationOffset,uPlanetPosition:uniforms.uPlanetPosition,uPlanetRadius:uniforms.uPlanetRadius};uniforms={...preset(body),...view};damping=.94;state();break;}
 case'seed':if(seed!==m.seed){seed=m.seed;if(noise)makeNoise();saved.delete('procedural');}break;
 case'seek':fixed=true;uniforms.uTime=m.time;velocity=0;draw();state();break;
 case'snapshot':state();break;
 case'dispose':active=false;self.cancelAnimationFrame(request);await Promise.all([...textures.values()].map(async t=>gl.deleteTexture(await t)));programs.forEach(p=>gl.deleteProgram(p));if(noise)gl.deleteTexture(noise);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.getExtension('WEBGL_lose_context')?.loseContext();self.close();break;
 }}catch(e){fail(e);}};
