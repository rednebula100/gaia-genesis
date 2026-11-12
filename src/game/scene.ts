import * as T from 'three';
import {EffectComposer,RenderPass,EffectPass,BloomEffect,VignetteEffect,ChromaticAberrationEffect,ToneMappingEffect,ToneMappingMode} from 'postprocessing';
import {planets,planet,statColors} from './data/planets';
import {courses} from './data/races';
import type {Race} from './race';
import {ScoutParticles} from './scout-particles';
import {proceduralMaterial,ringMaterial,ringGeometry,lightUniforms} from './planet-material';

const base=import.meta.env.BASE_URL+'atlas/';
const files:Record<string,string>={earth:'2k_earth_color.jpeg',moon:'2k_moon.jpeg',mercury:'2k_mercury.jpg',venus:'2k_venus.jpg',mars:'2k_mars.jpg',jupiter:'2k_jupiter.jpg'};
const LANE_W=2.4;
export type Shot='wide'|'tele'|'rail'|'front'|'aerial'|'skill'|'finish'|'chase';
export const cameraNames=['AUTO','내 선수','망원 중계','공중','정면'] as const;
export const UNIQUE=new Set(['unique']);
export const tierColor:Record<string,string>={R:'#9fd4ff',SR:'#ffc93c',SSR:'#ff5ec8'};

function canvasTex(draw:(g:CanvasRenderingContext2D,s:number)=>void,s=256){const c=document.createElement('canvas');c.width=c.height=s;draw(c.getContext('2d')!,s);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
const glowTex=()=>canvasTex((g,s)=>{const r=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.22,'rgba(255,240,220,.4)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,s,s);});
/** Four-point twinkle star. */
const starTex=()=>canvasTex((g,s)=>{const c=s/2;const r=g.createRadialGradient(c,c,0,c,c,c*.35);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,s,s);g.globalCompositeOperation='lighter';for(const [w,h] of [[s*.035,s],[s,s*.035],[s*.02,s*.6],[s*.6,s*.02]]){const gr=g.createRadialGradient(c,c,0,c,c,Math.max(w,h)/2);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.save();g.translate(c,c);if(w<h&&h<s)g.rotate(Math.PI/4);if(h<w&&w<s)g.rotate(Math.PI/4);g.fillRect(-w/2,-h/2,w,h);g.restore();}});
const raysTex=()=>canvasTex((g,s)=>{const c=s/2;g.translate(c,c);for(let i=0;i<24;i++){g.rotate(Math.PI*2/24);const gr=g.createLinearGradient(0,0,0,c);gr.addColorStop(0,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.moveTo(-s*.012,0);g.lineTo(s*.012,0);g.lineTo(s*.05*(i%2?1:.4),c);g.lineTo(-s*.05*(i%2?1:.4),c);g.fill();}},512);
const textTex=(text:string,color='#ffd23f')=>canvasTex((g,s)=>{g.font=`900 ${s*.42}px "Barlow Condensed",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#0b1226';g.fillRect(0,s*.2,s,s*.6);g.fillStyle=color;g.fillText(text,s/2,s/2);});

class Bursts{readonly points:T.Points;private pos:Float32Array;private vel:Float32Array;private life:Float32Array;private col:Float32Array;private n=3000;private head=0;
 constructor(scene:T.Scene,sprite:T.Texture){const g=new T.BufferGeometry();this.pos=new Float32Array(this.n*3).fill(-9999);this.vel=new Float32Array(this.n*3);this.life=new Float32Array(this.n);this.col=new Float32Array(this.n*3);g.setAttribute('position',new T.BufferAttribute(this.pos,3));g.setAttribute('color',new T.BufferAttribute(this.col,3));this.points=new T.Points(g,new T.PointsMaterial({size:.5,map:sprite,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));this.points.frustumCulled=false;scene.add(this.points);}
 emit(at:T.Vector3,count:number,speed:number,colors:string[],spread=1,up=0){const c=new T.Color();for(let i=0;i<count;i++){const k=this.head=(this.head+1)%this.n;const u=Math.random()*2-1,a=Math.random()*Math.PI*2,h=Math.sqrt(1-u*u),s=speed*(.4+Math.random()*.6);this.pos.set([at.x,at.y,at.z],k*3);this.vel.set([h*Math.cos(a)*s*spread,u*s+up,h*Math.sin(a)*s*spread],k*3);this.life[k]=.5+Math.random()*.9;c.set(colors[i%colors.length]).multiplyScalar(2.4);this.col.set([c.r,c.g,c.b],k*3);}}
 update(dt:number){const fade=Math.exp(-dt*2.2);for(let k=0;k<this.n;k++){if(this.life[k]<=0)continue;this.life[k]-=dt;if(this.life[k]<=0){this.pos[k*3+1]=-9999;continue;}for(let j=0;j<3;j++){this.pos[k*3+j]+=this.vel[k*3+j]*dt;this.vel[k*3+j]*=1-dt*1.6;this.col[k*3+j]*=fade;}}this.points.geometry.attributes.position.needsUpdate=true;this.points.geometry.attributes.color.needsUpdate=true;}}
class Trail{readonly mesh:T.Mesh;private pts:T.Vector3[]=[];private geo=new T.BufferGeometry();private positions:Float32Array;private alpha:Float32Array;private n=40;
 constructor(scene:T.Scene,color:string,private width:number){this.positions=new Float32Array(this.n*6);this.alpha=new Float32Array(this.n*2);const idx:number[]=[];for(let i=0;i<this.n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}this.geo.setIndex(idx);this.geo.setAttribute('position',new T.BufferAttribute(this.positions,3));this.geo.setAttribute('alpha',new T.BufferAttribute(this.alpha,1));
  this.mesh=new T.Mesh(this.geo,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,uniforms:{color:{value:new T.Color(color).multiplyScalar(1.6)}},vertexShader:'attribute float alpha;varying float a;void main(){a=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 color;varying float a;void main(){gl_FragColor=vec4(color*a,a);}'}));this.mesh.frustumCulled=false;scene.add(this.mesh);}
 reset(){this.pts=[];this.alpha.fill(0);this.geo.attributes.alpha.needsUpdate=true;}
 push(p:T.Vector3,side:T.Vector3,strength:number){this.pts.unshift(p.clone());if(this.pts.length>this.n)this.pts.pop();for(let i=0;i<this.n;i++){const q=this.pts[Math.min(i,this.pts.length-1)];const w=this.width*(1-i/this.n);this.positions.set([q.x+side.x*w,q.y+side.y*w,q.z+side.z*w],i*6);this.positions.set([q.x-side.x*w,q.y-side.y*w,q.z-side.z*w],i*6+3);const a=i<this.pts.length?(1-i/this.n)**1.6*.45*strength:0;this.alpha[i*2]=a;this.alpha[i*2+1]=a;}this.geo.attributes.position.needsUpdate=true;this.geo.attributes.alpha.needsUpdate=true;}}

type Star={sprite:T.Sprite;rays?:T.Sprite;tier:string;base:T.Vector3;born:number;fall:number;fallDur:number;promoteTo?:string;promoted:boolean;done:boolean;resolve?:()=>void};

export class GameScene{
 readonly renderer:T.WebGLRenderer;readonly scene=new T.Scene();readonly camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,4000);readonly actors=new Map<string,T.Group>();readonly track=new T.Group();
 active=true;ready=false;proceduralDone=false;mode='title';hero='earth';cameraMode=0;shot:Shot='wide';focus='';introIndex=-1;onPoke?:()=>void;thumbs=new Map<string,string>();onThumb?:()=>void;
 private composer:EffectComposer;private chroma:ChromaticAberrationEffect;private sunLight:T.PointLight;private stageLight:T.DirectionalLight;private ambient:T.AmbientLight;private sun=new T.Group();private stars:T.Mesh;private dust:T.Points;
 private trails=new Map<string,Trail>();private bursts:Bursts;private auras=new Map<string,T.Mesh>();private scoutParticles:ScoutParticles;private glow:T.Texture;private starT:T.Texture;private raysT:T.Texture;private gStars:Star[]=[];private godRays:T.Sprite;private shock:T.Mesh;private shockT=-9;private shockColor=new T.Color();
 private time=0;private lastEvent=0;private shake=0;private chromaKick=0;private fov=38;private fovKick=0;private position=new T.Vector3();private target=new T.Vector3();private lookAt=new T.Vector3();private cut=true;private spin=0;private spinVel=0;private bounce=0;private dragging=false;private dragMoved=0;private px=0;private revealT=-10;private shrinkT=-10;private procedural?:Promise<void>;private lastMode='';private courseIndex=-1;private planetPos=new Map<string,T.Vector3>();private lastShotKey='';private ribbon?:T.ShaderMaterial;private shotUntil=0;private shotSeq=0;private packF=0;private stations:number[]=[];private backdrop=new T.Group();private asteroids?:T.InstancedMesh;private sphereGeo=new T.SphereGeometry(1,96,64);private fireworksUntil=0;
 constructor(readonly canvas:HTMLCanvasElement){
  this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',stencil:false});this.renderer.setPixelRatio(Math.min(2,devicePixelRatio));this.renderer.setSize(innerWidth,innerHeight);this.renderer.setClearColor('#03050c');this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.NoToneMapping;
  this.composer=new EffectComposer(this.renderer,{frameBufferType:T.HalfFloatType,multisampling:Math.min(4,this.renderer.capabilities.maxSamples)});this.composer.addPass(new RenderPass(this.scene,this.camera));
  this.chroma=new ChromaticAberrationEffect({offset:new T.Vector2(0,0),radialModulation:true,modulationOffset:.2});
  this.composer.addPass(new EffectPass(this.camera,new BloomEffect({mipmapBlur:true,luminanceThreshold:.8,luminanceSmoothing:.2,intensity:1.2,radius:.72}),this.chroma,new VignetteEffect({darkness:.55,offset:.28}),new ToneMappingEffect({mode:ToneMappingMode.ACES_FILMIC})));
  this.sunLight=new T.PointLight('#fff2dc',3.2,0,0);this.stageLight=new T.DirectionalLight('#fff4e4',3.4);this.stageLight.position.set(-9,4,7);this.ambient=new T.AmbientLight('#7d9cc7',.14);this.scene.add(this.sunLight,this.stageLight,this.ambient);
  this.glow=glowTex();this.starT=starTex();this.raysT=raysTex();
  const core=new T.Mesh(new T.SphereGeometry(7,64,40),new T.ShaderMaterial({uniforms:{t:{value:0}},vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float t;varying vec3 n;varying vec3 p;float h(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}float no(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){float g=no(p*1.3+t*.25)*.5+no(p*3.1-t*.4)*.3+no(p*7.)*.2;float limb=pow(max(0.,n.z),.45);vec3 c=mix(vec3(2.6,.9,.25),vec3(4.2,2.7,1.3),g)*(.55+.6*limb);gl_FragColor=vec4(c,1.);}'}));this.sun.add(core);this.sun.userData.core=core;
  for(const [s,o] of [[40,.9],[80,.22]] as const){const sp=new T.Sprite(new T.SpriteMaterial({map:this.glow,color:new T.Color(4,2.6,1.4),transparent:true,opacity:o,depthWrite:false,blending:T.AdditiveBlending}));sp.scale.setScalar(s);this.sun.add(sp);}
  this.scene.add(this.sun);
  this.stars=new T.Mesh(new T.SphereGeometry(1800,64,32),new T.MeshBasicMaterial({color:new T.Color(.6,.65,.8),side:T.BackSide,depthWrite:false}));this.scene.add(this.stars);
  // Space dust: parallax that sells speed.
  const dg=new T.BufferGeometry(),dp=new Float32Array(3000*3);for(let i=0;i<dp.length;i+=3){dp[i]=(Math.random()-.5)*520;dp[i+1]=(Math.random()-.5)*120;dp[i+2]=(Math.random()-.5)*420;}dg.setAttribute('position',new T.BufferAttribute(dp,3));this.dust=new T.Points(dg,new T.PointsMaterial({size:.14,map:this.glow,color:new T.Color(.6,.75,1),transparent:true,opacity:.7,depthWrite:false,blending:T.AdditiveBlending}));this.scene.add(this.dust);
  this.bursts=new Bursts(this.scene,this.glow);this.scoutParticles=new ScoutParticles(this.scene);
  this.godRays=new T.Sprite(new T.SpriteMaterial({map:this.raysT,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));this.godRays.scale.setScalar(14);this.godRays.position.set(0,0,-3);this.scene.add(this.godRays);
  this.shock=new T.Mesh(new T.TorusGeometry(1,.06,8,120),new T.MeshBasicMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));this.scene.add(this.shock);
  this.scene.add(this.track,this.backdrop);
  canvas.addEventListener('pointerdown',e=>{this.dragging=true;this.px=e.clientX;this.dragMoved=0;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;const d=e.clientX-this.px;this.spinVel=d*.012;this.spin+=d*.008;this.dragMoved+=Math.abs(d);this.px=e.clientX;});
  canvas.addEventListener('pointerup',()=>{this.dragging=false;if(this.dragMoved<6&&['home','setup','collection'].includes(this.mode)){this.poke();this.onPoke?.();}});
  addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);});}

 async prepare(status:(p:number)=>void){const loader=new T.TextureLoader();let done=0;const total=10;const load=async(name:string,color=true)=>{const t=await loader.loadAsync(base+name);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=this.renderer.capabilities.getMaxAnisotropy();status(++done/total);return t;};
  const real=planets.filter(p=>files[p.id]);const [maps,cloud,bump,spec,stars]=await Promise.all([Promise.all(real.map(async p=>[p.id,await load(files[p.id])] as const)),load('2k_earth_clouds.jpeg',false),load('2k_earth_bump.jpg',false),load('2k_earth_specular.jpeg',false),load('8k_stars.jpg')]);
  const sm=this.stars.material as T.MeshBasicMaterial;sm.map=stars;sm.needsUpdate=true;this.scene.userData.moonMap=maps.find(([id])=>id==='moon')?.[1];
  const g=this.sphereGeo;
  for(const p of planets){const body=new T.Group();const map=maps.find(([id])=>id===p.id)?.[1]??null;let sphere:T.Mesh;
   if(p.look){sphere=new T.Mesh(g,proceduralMaterial(p.look));if(p.look.tilt)body.userData.tilt=p.look.tilt;if(p.look.ring){const ring=new T.Mesh(ringGeometry(1.3,2.35),ringMaterial(p.look.c[0]));ring.rotation.x=Math.PI/2;body.add(ring);}
    if(p.look.moons){const moons=new T.Group();for(let i=0;i<p.look.moons;i++){const m=new T.Mesh(g,new T.MeshPhongMaterial({map:this.scene.userData.moonMap,color:['#ffd0e0','#d0f0ff','#fff0c0'][i]}));m.scale.setScalar(.14+i*.03);m.userData.orbit=[1.7+i*.35,1.3-i*.25,i*2.1];moons.add(m);}body.userData.moons=moons;body.add(moons);}}
   else{sphere=new T.Mesh(g,new T.MeshPhongMaterial({map,color:map?'#ffffff':p.color,specular:p.id==='earth'?'#1a2530':'#151a20',shininess:p.id==='earth'?60:8,bumpMap:p.id==='earth'?bump:map,bumpScale:p.id==='earth'?2.2:1.2,specularMap:p.id==='earth'?spec:null,emissive:new T.Color(0,0,0)}));
    if(p.id==='earth'||p.body==='procedural'){const clouds=new T.Mesh(g,new T.MeshPhongMaterial({color:'#ffffff',alphaMap:cloud,transparent:true,opacity:.9,depthWrite:false,shininess:2}));clouds.scale.setScalar(1.012);clouds.userData.cloud=true;body.add(clouds);}
    if(!['moon','mercury'].includes(p.id)){const tint=p.id==='mars'?'#d0805a':p.id==='venus'?'#e8c37e':p.id==='jupiter'?'#d9b48c':'#5aaef0';const rim=new T.Mesh(g,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color(tint)}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float r=pow(1.-abs(dot(normalize(n),normalize(v))),2.4);gl_FragColor=vec4(tint*r*1.4,r);}'}));rim.scale.setScalar(1.045);body.add(rim);}}
   body.add(sphere);body.userData.surface=sphere;
   const aura=new T.Mesh(new T.TorusGeometry(1,.035,8,96),new T.MeshBasicMaterial({color:new T.Color(p.color).multiplyScalar(3),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));aura.rotation.x=Math.PI/2;aura.visible=false;this.scene.add(aura);this.auras.set(p.id,aura);
   body.visible=false;this.actors.set(p.id,body);this.scene.add(body);this.trails.set(p.id,new Trail(this.scene,p.color,p.radius*.4));}
  this.camera.position.set(0,0,9);await this.renderer.compileAsync(this.scene,this.camera);this.makeThumbs(planets.filter(p=>p.body!=='procedural').map(p=>p.id));this.ready=true;
  this.procedural=this.buildProcedural().then(()=>{this.proceduralDone=true;this.makeThumbs(planets.filter(p=>p.body==='procedural').map(p=>p.id));this.onThumb?.();});}
 whenProcedural(){return this.procedural??Promise.resolve();}
 /** Card art: each body rendered once to a small image. */
 private makeThumbs(ids:string[]){const S=256,rt=new T.WebGLRenderTarget(S,S,{samples:4});rt.texture.colorSpace=T.SRGBColorSpace;const sc=new T.Scene();const l=new T.DirectionalLight('#fff4e4',3.6);l.position.set(-6,3,6);sc.add(l,new T.AmbientLight('#8aa8d0',.25));const cam=new T.PerspectiveCamera(30,1,.1,100);cam.position.set(0,0,9.2);cam.lookAt(0,0,0);const buf=new Uint8Array(S*S*4);const c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d')!;
  const keepPoint=lightUniforms.uPoint.value,keepPos=lightUniforms.uLightPos.value.clone();lightUniforms.uPoint.value=0;lightUniforms.uLightPos.value.set(-6,3,6);
  for(const id of ids){const a=this.actors.get(id)!;const parent=a.parent;const vis=a.visible,pos=a.position.clone(),sc0=a.scale.clone(),rot=a.rotation.clone();sc.add(a);a.visible=true;a.position.set(0,0,0);a.scale.setScalar(planet(id).look?.ring?1.15:2);a.rotation.set(.35,.6,a.userData.tilt?.3:.1);
   this.renderer.setRenderTarget(rt);this.renderer.setClearColor('#000000',0);this.renderer.clear();this.renderer.render(sc,cam);this.renderer.readRenderTargetPixels(rt,0,0,S,S,buf);const img=g.createImageData(S,S);for(let y=0;y<S;y++)img.data.set(buf.subarray((S-1-y)*S*4,(S-y)*S*4),y*S*4);g.putImageData(img,0,0);this.thumbs.set(id,c.toDataURL('image/png'));
   parent?.add(a);a.visible=vis;a.position.copy(pos);a.scale.copy(sc0);a.rotation.copy(rot);}
  this.renderer.setRenderTarget(null);this.renderer.setClearColor('#03050c',1);rt.dispose();lightUniforms.uPoint.value=keepPoint;lightUniforms.uLightPos.value.copy(keepPos);}
 private async buildProcedural(){const worker=new Worker(new URL('../maps.worker.ts',import.meta.url),{type:'module'});let job=0;
  for(const p of planets.filter(p=>p.body==='procedural')){const data=await new Promise<any>((resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=reject;worker.postMessage({seed:p.seed,job:++job});});
   const pixels=new Uint8Array(data.width*data.height*4);for(let i=0;i<pixels.length;i+=4){const h=(data.terrain[i]*256+data.terrain[i+1])/65535,land=h>data.sea;const b=data.biome;pixels[i]=land?b[i]:9;pixels[i+1]=land?b[i+1]:43+(h/data.sea)*24;pixels[i+2]=land?b[i+2]:72+(h/data.sea)*30;pixels[i+3]=255;}
   const t=new T.DataTexture(pixels,data.width,data.height);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=this.renderer.capabilities.getMaxAnisotropy();t.needsUpdate=true;
   const surface=this.actors.get(p.id)!.userData.surface as T.Mesh<T.SphereGeometry,T.MeshPhongMaterial>;surface.material.map=t;surface.material.bumpMap=t;surface.material.color.set(p.id==='theia'?'#ffd6c8':'#ffffff');surface.material.needsUpdate=true;
   const density=new Uint8Array(pixels.length);for(let k=0;k<density.length;k+=4){const v=Math.max(0,data.cloud[k]-.18*255)*1.2;density[k]=density[k+1]=density[k+2]=v;density[k+3]=255;}const ct=new T.DataTexture(density,data.width,data.height);ct.wrapS=T.RepeatWrapping;ct.minFilter=T.LinearMipmapLinearFilter;ct.generateMipmaps=true;ct.needsUpdate=true;
   for(const child of this.actors.get(p.id)!.children)if(child.userData.cloud){const m=(child as T.Mesh<T.SphereGeometry,T.MeshPhongMaterial>).material;m.alphaMap=ct;m.needsUpdate=true;}}
  worker.terminate();}

 // ── Track (spline from course data) ──
 get course(){return courses[Math.max(0,this.courseIndex)];}
 trackPoint(f:number,lane:number,out=new T.Vector3()){const s=this.course.track.at(f),off=(lane-3.5)*LANE_W,b=this.course.track.bank(f);return out.set(s.p[0]+s.n[0]*off*Math.cos(b),s.p[1]+off*Math.sin(b),s.p[2]+s.n[2]*off*Math.cos(b));}
 tangent(f:number){const t=this.course.track.at(f).t;return new T.Vector3(t[0],t[1],t[2]).normalize();}
 lateral(f:number){const n=this.course.track.at(f).n;return new T.Vector3(n[0],0,n[2]).normalize();}
 setCourse(i:number){if(i===this.courseIndex)return;this.courseIndex=i;this.buildTrack();}
 private buildTrack(){this.track.clear();this.backdrop.clear();const c=this.course,n=900,pos:number[]=[],uv:number[]=[],idx:number[]=[];const tmp=new T.Vector3();
  for(let i=0;i<=n;i++){const f=i/n;for(const [k,l] of [[0,-.6],[1,7.6]] as const){this.trackPoint(f,l,tmp);pos.push(tmp.x,tmp.y,tmp.z);uv.push(k,f);}if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const cs=c.corners;const cc=(i:number)=>cs[i]??[2,2];
  this.ribbon=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{t:{value:0},len:{value:c.length},c0:{value:new T.Vector4(...cc(0),...cc(1))},c1:{value:new T.Vector4(...cc(2),...cc(3))}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform float t,len;uniform vec4 c0,c1;varying vec2 vUv;void main(){float x=vUv.x*8.;float lane=smoothstep(.035,.0,min(fract(x),1.-fract(x)))*.22;float edge=smoothstep(.03,0.,vUv.x)+smoothstep(.97,1.,vUv.x);float d=vUv.y*len;float tick=smoothstep(.7,0.,25.-abs(mod(d,50.)-25.));float chev=smoothstep(.45,.0,abs(fract(d*.04-t*1.4+abs(vUv.x-.5)*.5)-.5))*.06;float corner=step(c0.x,vUv.y)*step(vUv.y,c0.y)+step(c0.z,vUv.y)*step(vUv.y,c0.w)+step(c1.x,vUv.y)*step(vUv.y,c1.y)+step(c1.z,vUv.y)*step(vUv.y,c1.w);float fin=step(d,1.6)+step(len-1.6,d);float check=fin*step(.5,mod(floor(vUv.x*16.)+floor(d*1.25),2.));float hex=smoothstep(.04,.0,.5-abs(fract(d*.25)-.5))*.06;vec3 col=vec3(.006,.014,.034)+vec3(.08,.3,.62)*(lane+chev+hex)+mix(vec3(1.,.72,.3),vec3(1.,.3,.35),corner)*edge*1.7+vec3(.3)*tick*.5;col=mix(col,vec3(.85),check);gl_FragColor=vec4(col,1.);}'});
  this.track.add(new T.Mesh(g,this.ribbon));
  // Arches every 100 m, struts under the deck, distance boards in the last 400 m.
  const L=c.length,archG=new T.TorusGeometry(12.5,.18,6,48,Math.PI),strutG=new T.CylinderGeometry(.12,.12,1,6);
  for(let d=100;d<L;d+=100){const f=d/L;const a=new T.Mesh(archG,new T.MeshBasicMaterial({color:new T.Color(d%500===0?'#ffd23f':'#3fd0ff').multiplyScalar(d%500===0?2.4:1.6),transparent:true,opacity:.8}));this.trackPoint(f,3.5,a.position);a.position.y-=1;const t=this.tangent(f);a.lookAt(a.position.clone().add(t));this.track.add(a);}
  for(let i=0;i<n;i+=12){const f=i/n;for(const l of [-.6,7.6]){const p=this.trackPoint(f,l);const s=new T.Mesh(strutG,new T.MeshBasicMaterial({color:new T.Color(.25,.5,.9),transparent:true,opacity:.18}));s.scale.y=26;s.position.copy(p);s.position.y-=13.2;this.track.add(s);}}
  for(const d of [400,200,100]){const sp=new T.Sprite(new T.SpriteMaterial({map:textTex(`${d}`),depthWrite:false}));sp.scale.setScalar(6);this.trackPoint(1-d/L,-3.5,sp.position);sp.position.y+=4;this.track.add(sp);}
  const gm=new T.MeshStandardMaterial({color:'#9aa6c0',metalness:.8,roughness:.35});for(const l of [-1.6,8.6]){const p=new T.Mesh(new T.CylinderGeometry(.35,.35,14,16),gm);this.trackPoint(0,l,p.position);p.position.y+=6;this.track.add(p);}
  const a=this.trackPoint(0,-1.6),b=this.trackPoint(0,8.6);const bar=new T.Mesh(new T.BoxGeometry(.4,2,a.distanceTo(b)),new T.MeshBasicMaterial({color:new T.Color(3,1,.6)}));bar.position.copy(a).add(b).multiplyScalar(.5);bar.position.y+=12.4;bar.lookAt(b.x,bar.position.y,b.z);this.track.add(bar);
  // Spectator stations along the outer edge.
  const win=canvasTex((g,s)=>{g.fillStyle='#0b1226';g.fillRect(0,0,s,s);for(let y=8;y<s;y+=18)for(let x=6;x<s;x+=14)if(Math.random()<.7){g.fillStyle=['#ffd23f','#9fd4ff','#ffffff','#ff9ad8'][Math.floor(Math.random()*4)];g.fillRect(x,y,8,9);}});
  for(const f of [.27,.52,.77]){const st=new T.Mesh(new T.BoxGeometry(34,9,7),new T.MeshBasicMaterial({map:win,color:new T.Color(1.4,1.4,1.4)}));this.trackPoint(f,-10,st.position);st.position.y+=3;st.lookAt(st.position.clone().add(this.lateral(f)));this.track.add(st);}
  // Asteroid belt and backdrop.
  const rockG=new T.IcosahedronGeometry(1,2);const rp=rockG.attributes.position;for(let i=0;i<rp.count;i++){const v=new T.Vector3().fromBufferAttribute(rp,i).normalize();const k=1+.22*Math.sin(v.x*4.1+1.3)*Math.sin(v.y*3.7)+.12*Math.sin(v.z*7.3+v.x*2);v.multiplyScalar(k);rp.setXYZ(i,v.x,v.y,v.z);}rockG.computeVertexNormals();
  const count=c.backdrop==='asteroids'?700:300;this.asteroids=new T.InstancedMesh(rockG,new T.MeshStandardMaterial({map:this.scene.userData.moonMap??null,color:'#8a8478',roughness:1}),count);const m=new T.Matrix4(),q=new T.Quaternion();
  for(let i=0;i<count;i++){const f=Math.random(),side=Math.random()<.5?-1:1;const p=this.trackPoint(f,3.5+side*(34+Math.random()*60)/LANE_W);p.y+=(Math.random()-.5)*50-6;const s=.5+Math.random()**3*5;q.setFromEuler(new T.Euler(Math.random()*6,Math.random()*6,Math.random()*6));m.compose(p,q,new T.Vector3(s,s,s));this.asteroids.setMatrixAt(i,m);}this.backdrop.add(this.asteroids);
  if(c.backdrop==='gasgiant'||c.backdrop==='twin'){const gg=new T.Mesh(this.sphereGeo,proceduralMaterial({type:'gas',c:c.backdrop==='twin'?['#c8d8ff','#7f9fe0','#4f6fb8','#ffffff']:['#f1dfb0','#d8b97a','#b89660','#fff2cf'],seed:11.1}));gg.scale.setScalar(c.backdrop==='twin'?160:260);gg.position.set(-200,-140,-620);this.backdrop.add(gg);if(c.backdrop==='gasgiant'){const ring=new T.Mesh(ringGeometry(1.3,2.4),ringMaterial('#f1dfb0'));ring.scale.setScalar(260);ring.position.copy(gg.position);ring.rotation.set(Math.PI/2-.35,0,.2);this.backdrop.add(ring);}}
  this.sun.position.set(...c.sunPos);
  this.stations=Array.from({length:10},(_,i)=>i/10);}

 // ── Reactions ──
 poke(){this.spinVel+=.35;this.bounce=1;}
 pulse(kind:'train'|'friend'|'fail'|'great',stat=0){const a=this.actors.get(this.hero);if(!a)return;const at=a.position.clone();if(kind==='fail'){this.shake=.3;this.bounce=-.6;this.bursts.emit(at,50,3,['#ff4a3a','#ff8a5a']);return;}this.spinVel+=kind==='friend'?1.4:kind==='great'?1:.6;this.bounce=kind==='friend'?1.6:kind==='great'?1.2:.8;const colors=kind==='friend'?['#ff5ec8','#ffc93c','#5fe39a','#3fd0ff','#b07bff']:[statColors[stat],'#ffffff'];this.bursts.emit(at,kind==='friend'?360:kind==='great'?220:110,kind==='friend'?9:6,colors,1.2);if(kind==='friend'){this.shake=.2;this.chromaKick=1;}}
 burst(colors:string[],count=260,speed=10,at?:T.Vector3){const a=this.actors.get(this.hero);this.bursts.emit(at??a?.position??new T.Vector3(),count,speed,colors,1.3);}
 kick(amount=.4){this.shake=Math.max(this.shake,amount);this.chromaKick=1;}
 reveal(id:string){this.hero=id;this.revealT=this.time;this.shrinkT=-10;this.spin=0;}
 shrinkHero(){this.shrinkT=this.time;}
 fireworks(seconds=4){this.fireworksUntil=this.time+seconds;}
 skipEvents(n:number){this.lastEvent=n;}
 resetRaceView(){this.lastEvent=0;this.cut=true;this.lastShotKey='';this.shotUntil=0;for(const t of this.trails.values())t.reset();}

 // ── Scout sky: four-point stars that twinkle in, then fall as meteors ──
 gachaStars(tiers:string[]){this.clearStars();const now=this.time;tiers.forEach((tier,i)=>{const sp=new T.Sprite(new T.SpriteMaterial({map:this.starT,color:new T.Color(tierColor[tier]).multiplyScalar(2.2),transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));const ang=(i/tiers.length)*Math.PI*2+Math.random()*.5;const b=new T.Vector3(Math.cos(ang)*(18+Math.random()*14),Math.sin(ang)*(9+Math.random()*7)+4,-60-Math.random()*30);sp.position.copy(b);sp.scale.setScalar(0);this.scene.add(sp);let rays:T.Sprite|undefined;if(tier==='SSR'){rays=new T.Sprite(new T.SpriteMaterial({map:this.raysT,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:0}));rays.position.copy(b);this.scene.add(rays);}
   this.gStars.push({sprite:sp,rays,tier,base:b,born:now+.25+i*.16+Math.random()*.25,fall:-1,fallDur:1.15,promoted:false,done:false});});return this.gStars.map(s=>s.born-now);}
 /** Drop star i to the centre. Resolves on impact. */
 fallStar(i:number,finalTier:string):Promise<void>{const s=this.gStars[i];if(!s)return Promise.resolve();s.fall=this.time;s.fallDur=finalTier!==s.tier?1.7:finalTier==='SSR'?1.4:1.1;if(finalTier!==s.tier)s.promoteTo=finalTier;return new Promise(r=>s.resolve=r);}
 impact(tier:string){this.shockT=this.time;this.shockColor.set(tierColor[tier]);this.kick(tier==='SSR'?.8:tier==='SR'?.5:.3);this.bursts.emit(new T.Vector3(0,0,0),tier==='SSR'?500:tier==='SR'?260:120,tier==='SSR'?16:10,tier==='SSR'?['#ff5ec8','#ffc93c','#5fe39a','#3fd0ff','#b07bff']:[tierColor[tier],'#ffffff']);}
 rays(on:boolean){(this.godRays.material as T.SpriteMaterial).opacity=on?.85:0;}
 clearStars(){for(const s of this.gStars){this.scene.remove(s.sprite);if(s.rays)this.scene.remove(s.rays);}this.gStars=[];this.rays(false);}
 private updateStars(){for(const [i,s] of this.gStars.entries()){if(s.done)continue;const m=s.sprite.material as T.SpriteMaterial;const age=this.time-s.born;if(age<0){m.opacity=0;continue;}
  const tw=1+.25*Math.sin(this.time*9+i*1.7);let scale=Math.min(1,age/.18)*(age<.3?1+(.3-age)*6:1)*5.5*tw*(s.tier==='SSR'?1.6:s.tier==='SR'?1.25:1);m.opacity=Math.min(1,age*6);
  const tier=s.promoted&&s.promoteTo?s.promoteTo:s.tier;if(tier==='SSR')m.color.setHSL((this.time*.9+i*.1)%1,1,.65).multiplyScalar(2.2);else m.color.set(tierColor[tier]).multiplyScalar(2.2);
  if(s.rays){(s.rays.material as T.SpriteMaterial).opacity=Math.min(.7,age);s.rays.material.rotation=this.time*.8;s.rays.scale.setScalar(scale*3);}
  if(s.fall>=0){const k=Math.min(1,(this.time-s.fall)/s.fallDur);const e=k*k*k;s.sprite.position.lerpVectors(s.base,new T.Vector3(0,0,2),e);scale*=1+k*3;if(s.rays)s.rays.position.copy(s.sprite.position);
   if(k>.15)this.bursts.emit(s.sprite.position,3,1.2,[m.color.getStyle(),'#ffffff'],.4);
   if(s.promoteTo&&!s.promoted&&k>.5){s.promoted=true;this.kick(.5);this.bursts.emit(s.sprite.position,240,8,s.promoteTo==='SSR'?['#ff5ec8','#ffc93c','#5fe39a','#3fd0ff']:['#ffc93c','#ffffff']);if(s.promoteTo==='SSR'&&!s.rays){s.rays=new T.Sprite(new T.SpriteMaterial({map:this.raysT,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.7}));this.scene.add(s.rays);}}
   if(k>=1){s.done=true;this.scene.remove(s.sprite);if(s.rays)this.scene.remove(s.rays);s.resolve?.();}}
  s.sprite.scale.setScalar(scale);}}
 promotedNow(i:number){return !!this.gStars[i]?.promoted;}

 /** Projected head position for DOM labels. */
 screenPos(id:string){const a=this.actors.get(id);if(!a||!a.visible)return null;const v=a.position.clone();v.y+=planet(id).radius*1.6;v.project(this.camera);if(v.z>1)return null;return{x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight};}

 // ── Frame ──
 update(now:number,race?:Race,dt=.016){this.time=now/1000;if(!this.active||!this.ready)return;const racing=['race','paddock','result'].includes(this.mode);this.track.visible=racing;this.backdrop.visible=racing;this.dust.visible=racing;this.sun.visible=racing||this.mode==='title';this.sunLight.intensity=racing?3.4:0;this.stageLight.intensity=racing?0:3.4;this.ambient.intensity=racing?.32:.14;
  lightUniforms.uPoint.value=racing?1:0;if(racing)lightUniforms.uLightPos.value.copy(this.sun.position);else lightUniforms.uLightPos.value.copy(this.stageLight.position);
  (this.sun.userData.core.material as T.ShaderMaterial).uniforms.t.value=this.time;if(this.ribbon)this.ribbon.uniforms.t.value=this.time;
  if(this.lastMode!==this.mode){this.cut=true;this.lastMode=this.mode;this.lastShotKey='';for(const t of this.trails.values())t.reset();}
  this.spin+=this.spinVel*dt*4;this.spinVel*=Math.exp(-dt*2.2);this.bounce*=Math.exp(-dt*5);
  for(const a of this.actors.values())a.visible=false;for(const aura of this.auras.values())aura.visible=false;
  for(const [id,a] of this.actors){const s=a.userData.surface as T.Mesh;const mat=s.material as T.ShaderMaterial;if(mat.uniforms?.uTime)mat.uniforms.uTime.value=this.time;const moons=a.userData.moons as T.Group|undefined;if(moons)for(const m of moons.children){const [r,sp,ph]=m.userData.orbit;m.position.set(Math.cos(this.time*sp+ph)*r,Math.sin(this.time*sp*.7+ph)*.25,Math.sin(this.time*sp+ph)*r);}void id;}
  if(racing)this.updateRace(race,dt);else this.updateStage();
  this.updateStars();this.bursts.update(dt);
  const sk=this.time-this.shockT;const sm=this.shock.material as T.MeshBasicMaterial;if(sk>=0&&sk<1.2){this.shock.visible=true;this.shock.position.set(0,0,0);this.shock.lookAt(this.camera.position);this.shock.scale.setScalar(.5+sk*14);sm.color.copy(this.shockColor).multiplyScalar(3);sm.opacity=(1-sk/1.2)*.9;}else this.shock.visible=false;
  this.godRays.material.rotation=this.time*.25;
  if(this.fireworksUntil>this.time&&Math.random()<dt*4){const c=this.lookAt.clone().add(new T.Vector3((Math.random()-.5)*30,8+Math.random()*12,(Math.random()-.5)*30));this.bursts.emit(c,180,14,[['#ffd23f','#ffffff'],['#ff5ec8','#ffffff'],['#3fd0ff','#ffffff'],['#5fe39a','#ffffff']][Math.floor(Math.random()*4)]);}
  if(this.cut){this.camera.position.copy(this.position);this.lookAt.copy(this.target);this.cut=false;}else{const k=1-Math.exp(-dt*(racing?5:3.5));this.camera.position.lerp(this.position,k);this.lookAt.lerp(this.target,1-Math.exp(-dt*(racing?7:3.5)));}
  this.fovKick*=Math.exp(-dt*2.5);const fov=this.fov+this.fovKick;if(Math.abs(this.camera.fov-fov)>.05){this.camera.fov+=(fov-this.camera.fov)*Math.min(1,dt*6);this.camera.updateProjectionMatrix();}
  this.shake*=Math.exp(-dt*6);const s=this.shake;this.camera.position.x+=(Math.random()-.5)*s;this.camera.position.y+=(Math.random()-.5)*s;this.camera.lookAt(this.lookAt);
  this.chromaKick*=Math.exp(-dt*5);this.chroma.offset.set(.004*this.chromaKick,.0025*this.chromaKick);
  this.stars.position.copy(this.camera.position);
  for(const a of this.actors.values())for(const child of a.children)if(child.userData.cloud)child.rotation.y=this.time*.01;
  this.composer.render(dt);}
 punch(deg=8){this.fovKick=deg;}

 private updateStage(){this.fov=38;const a=this.actors.get(this.hero);const m=this.mode,scout=m==='scout';if(m==='title'){this.sun.position.set(-48,10,-90);this.stageLight.position.set(-9,2,3);}else this.stageLight.position.set(-9,4,7);
  this.position.set(0,.05,9.6);this.target.set(m==='home'?.5:m==='collection'?.6:0,m==='training'?.25:0,0);if(!a)return;a.visible=true;
  const x=m==='home'?.3:m==='training'?.15:m==='setup'?.35:m==='collection'?1.6:m==='tree'?1.8:0;const y=m==='training'?.75:m==='setup'?.1:m==='title'?-.15:0;let scale=m==='training'?1.05:m==='setup'?1.35:m==='title'?1.7:scout?1.7:m==='home'?1.75:1.6;scale*=planet(this.hero).radius/.74*.2+.8;if(planet(this.hero).look?.ring)scale*=.72;
  const r=this.time-this.revealT;if(r>=0&&r<1.6)scale*=T.MathUtils.smootherstep(r,0,1.4)*.92+.08;const sh=this.time-this.shrinkT;if(this.shrinkT>0&&sh>=0)scale*=Math.max(0,1-sh/.35);scale*=1+this.bounce*.06;
  a.position.set(x,y+Math.sin(this.time*.8)*.04,0);a.scale.setScalar(scale);a.rotation.set(.18+(a.userData.tilt??0),this.spin+this.time*.06*(this.hero==='venus'?-1:1),.1+(a.userData.tilt??0)*.3);
  this.godRays.position.set(x,y,-2);this.godRays.scale.setScalar(scale*7);
  this.scoutParticles.update(scout&&r>=0?r:-1,a);}

 private updateRace(race:Race|undefined,dt:number){const course=race?.config.course??Math.max(0,this.courseIndex);this.setCourse(course);const L=this.course.length;const order=race?.ranking??[];
  for(const [i,p] of planets.entries()){const r=race?.racers.find(r=>r.id===p.id);if(!r){if(!race&&p.id===this.focus)this.planetPos.set(p.id,this.trackPoint(-.006,3.5));else this.planetPos.delete(p.id);continue;}const f=this.mode==='paddock'?-.004*(1+i%3):r.distance/L;this.planetPos.set(p.id,this.trackPoint(f,r.lane));}void order;
  const time=race?.time??0;
  if(race)for(const r of race.racers){const pos=this.planetPos.get(r.id)!;
   if(r.fx.capture>time){const j=race.racers.find(o=>o.planet==='jupiter');const jp=j&&this.planetPos.get(j.id);if(jp){const left=r.fx.capture-time,s=Math.min(1,left*1.5,(3-left)*1.5)*.85,a=time*3.2+r.phase;pos.lerp(jp.clone().add(new T.Vector3(Math.cos(a)*2.8,Math.sin(a*1.3)*.9,Math.sin(a)*2.8)),Math.max(0,s));}}
   if(r.fx.tidal>time){const e=race.racers.find(o=>o.planet==='earth');const ep=e&&this.planetPos.get(e.id);if(ep){const left=r.fx.tidal-time,s=Math.min(1,left*1.5,(4-left)*1.5)*.9,a=time*2.4;pos.lerp(ep.clone().add(new T.Vector3(Math.cos(a)*2.3,.7,Math.sin(a)*2.3)),Math.max(0,s));}}
   if(r.fx.hop>time)pos.y+=Math.sin((1-(r.fx.hop-time)/1.6)*Math.PI)*3;}
  for(const p of planets){const a=this.actors.get(p.id)!;const r=race?.racers.find(r=>r.id===p.id);const pos=this.planetPos.get(p.id);if(!pos)continue;a.visible=this.mode!=='result'||p.id===race?.ranking[0].id||p.id===this.focus;a.position.copy(pos);a.position.y+=p.radius;a.scale.setScalar(p.radius*(p.look?.ring?.62:1));
   if(!r){a.visible=true;a.position.copy(pos);a.position.y+=p.radius;a.scale.setScalar(p.radius*(p.look?.ring?.62:1));a.rotation.y=this.time*.3;continue;}const roll=r.fx.roll>time?1:0;a.rotation.set(.2+(a.userData.tilt??0)+roll*time*6,(this.time*.5+r.distance*.06)*(p.id==='venus'?-1:1)*r.spin,.1);
   const mat=(a.userData.surface as T.Mesh).material as T.MeshPhongMaterial;if(mat.emissive){const heat=r.fx.heat>time?1:0;mat.emissive.setRGB(heat*.9,heat*.25,0);}
   const trail=this.trails.get(p.id)!;if(this.mode==='race'&&!r.finish&&r.velocity>1){const side=this.lateral(r.distance/L);trail.push(a.position.clone().setY(a.position.y-p.radius*.3),side,r.effects.some(e=>e.mul>1)?2.6:1);}else if(this.mode!=='race')trail.reset();
   const ev=race?.events.filter(e=>e.id===p.id&&e.type==='unique').at(-1);const age=ev?race!.time-ev.time:-1;if(age>=0&&age<2.5){const aura=this.auras.get(p.id)!;aura.visible=true;aura.position.copy(a.position);const k=age/2.5;aura.scale.setScalar(p.radius*(1.3+k*(['jupiter','gangmam','saturn'].includes(p.id)?6:2.5)));(aura.material as T.MeshBasicMaterial).opacity=(1-k)*.9;}
   if(r.fx.dust>time&&Math.random()<.5)this.bursts.emit(a.position,6,3,['#c9673a','#e09062'],1.4,.2);if(r.fx.glass>time&&Math.random()<.6)this.bursts.emit(a.position,5,6,['#9fd4ff','#ffffff'],1.6);if(r.fx.rain>time&&Math.random()<.5)this.bursts.emit(a.position.clone().add(new T.Vector3(0,3,0)),5,2,['#ffb84a'],1,-4);if(r.fx.geyser>time)this.bursts.emit(a.position,4,8,['#ffffff','#bfe6ff'],.5,5);if(r.fx.storm>time)this.bursts.emit(a.position,5,7,['#7fa8ff','#ffffff'],1.4);if(r.fx.diamond>time&&Math.random()<.4)this.bursts.emit(a.position,3,3,['#ffffff','#bfe6ff']);if(r.fx.mom>time&&Math.random()<.4)this.bursts.emit(a.position,4,4,['#7fe0b8','#ffd0e0']);}
  if(race)this.raceEvents(race);this.director(race,dt);}
 private raceEvents(race:Race){for(;this.lastEvent<race.events.length;this.lastEvent++){const e=race.events[this.lastEvent];const at=this.actors.get(e.id)?.position;if(!at)continue;
  if(e.type==='collide'){this.bursts.emit(at,200,9,['#ffd27a','#ffffff','#ff7a4a'],1.2);this.kick(.4);}
  else if(e.type==='unique'){this.bursts.emit(at,170,7,[planet(e.id).color,'#ffffff'],1.2);this.chromaKick=1;}
  else if(e.type==='finish'&&race.racers.filter(r=>r.finish).length===1)this.bursts.emit(at,300,10,['#ffc93c','#ffffff','#3fd0ff']);}}

 /** Broadcast director: telephoto stand cameras and a rail dolly, head-on compression, medium-distance skill shots at varied angles. */
 private director(race:Race|undefined,dt:number){const setKey=(k:string)=>{if(k!==this.lastShotKey){this.cut=true;this.lastShotKey=k;}};const up=new T.Vector3(0,1,0);
  if(this.mode==='paddock'||!race){this.fov=34;if(this.introIndex>=0&&race){const id=race.config.entries[this.introIndex]?.planet;const pos=id&&this.planetPos.get(id)?.clone();if(pos){pos.y+=planet(id!).radius;const a=this.time*.3+this.introIndex;const R=4+planet(id!).radius*3.2;this.position.set(pos.x+Math.cos(a)*R,pos.y+1.2,pos.z+Math.sin(a)*R);this.target.copy(pos);setKey('intro'+this.introIndex);return;}}
   const g=this.trackPoint(-.006,3.5);const t=this.tangent(0);this.position.copy(g).addScaledVector(t,26).add(new T.Vector3(0,9,0)).addScaledVector(this.lateral(0),-18);this.target.copy(g);setKey('grid');return;}
  if(this.mode==='result'){this.fov=30;const w=this.actors.get(race.ranking[0].id)!;const a=this.time*.25,R=3+planet(race.ranking[0].id).radius*4;this.position.copy(w.position).add(new T.Vector3(Math.cos(a)*R,1.2,Math.sin(a)*R));this.target.copy(w.position);setKey('result');return;}
  const L=race.course.length,live=race.racers.filter(r=>!r.finish);const lead=race.ranking[0];const pack=live.length?live:race.racers;const cf=pack.reduce((a,r)=>a+r.distance,0)/pack.length/L;const spread=Math.max(8,(Math.max(...pack.map(r=>r.distance))-Math.min(...pack.map(r=>r.distance)))*(this.course.track.length/L));
  this.packF+=(cf-this.packF)*Math.min(1,dt*3);const center=this.trackPoint(this.packF,3.5);const me=race.racers.find(r=>r.id===this.focus);
  // Event overrides: player's skills and uniques get a medium shot from a varied angle.
  if(this.time>this.shotUntil){const ev=race.events.filter(e=>race.time-e.time<.2&&(e.type==='unique'||(e.type==='skill'&&e.id===this.focus)||e.type==='collide'||e.type==='duel')).at(-1);if(ev&&this.cameraMode===0){this.shot='skill';this.shotUntil=this.time+(ev.type==='duel'?2.4:1.9);this.focus2=ev.id;this.shotSeq++;}}
  let shot:Shot;let subject=lead;const lf=lead.distance/L;
  if(this.time<this.shotUntil&&this.cameraMode===0)shot='skill';
  else if(this.cameraMode===1){shot='chase';subject=me??lead;}else if(this.cameraMode===2)shot='tele';else if(this.cameraMode===3)shot='aerial';else if(this.cameraMode===4)shot='front';
  else if(race.time<3)shot='wide';else if(lf>.93)shot=lf>.975||lead.finish?'finish':'front';else{const seg=Math.floor((race.time-3)/5)%5;shot=(['tele','rail','front','tele','aerial'] as Shot[])[seg];if(shot==='front'&&race.inCorner(Math.min(.999,lf+.04)))shot='rail';}
  if(shot==='skill')subject=race.racers.find(r=>r.id===this.focus2)??lead;
  const pos=this.actors.get(subject.id)!.position.clone();const sf=subject.distance/L;const tan=this.tangent(sf),lat=this.lateral(sf);
  switch(shot){
   case'wide':{this.fov=40;setKey('wide');const g=this.trackPoint(.02,3.5);this.position.copy(g).addScaledVector(lat,-60).add(new T.Vector3(0,45,0)).addScaledVector(this.tangent(.02),-40);this.target.copy(g).addScaledVector(this.tangent(.02),20);break;}
   case'tele':{// Fixed stand camera nearest ahead of the pack; only the gaze follows.
    const st=this.stations.find(s=>((s-this.packF+1)%1)>.02&&((s-this.packF+1)%1)<.12)??this.stations.reduce((a,s)=>((s-this.packF+1)%1)<((a-this.packF+1)%1)?s:a);setKey('tele'+st);const sp=this.trackPoint(st,-9);sp.y+=10;this.position.copy(sp);this.target.copy(center);const d=sp.distanceTo(center);this.fov=T.MathUtils.clamp(T.MathUtils.radToDeg(2*Math.atan(spread*.7/d)),9,34);break;}
   case'rail':{setKey('rail');const rp=this.trackPoint(this.packF+.01,-11);rp.y+=5;this.position.copy(rp);this.target.copy(center);this.fov=34;break;}
   case'front':{setKey('front'+Math.floor(this.packF*6));const fp=this.trackPoint(Math.min(this.packF+.07,.999),3.5);fp.y+=4.5;this.position.copy(fp);this.target.copy(center);this.fov=T.MathUtils.clamp(T.MathUtils.radToDeg(2*Math.atan(16/fp.distanceTo(center))),8,28);break;}
   case'aerial':{setKey('aerial');this.position.copy(center).add(new T.Vector3(0,55,0)).addScaledVector(this.lateral(this.packF),-30);this.target.copy(center);this.fov=38;break;}
   case'chase':{setKey('chase'+subject.id);this.position.copy(pos).addScaledVector(tan,-15).addScaledVector(up,5).addScaledVector(lat,-2);this.target.copy(pos).addScaledVector(tan,10);this.fov=40;break;}
   case'skill':{setKey('skill'+this.shotSeq);const ang=[0,1.1,2.3,-1.1,-2.3,.55,-.55][this.shotSeq%7];const dist=9+(this.shotSeq%3)*2.5,el=1.5+(this.shotSeq%4)*1.4;const dir=tan.clone().multiplyScalar(Math.cos(ang)).addScaledVector(lat,Math.sin(ang));this.position.copy(pos).addScaledVector(dir,dist).addScaledVector(up,el);this.target.copy(pos);this.fov=30;break;}
   case'finish':{setKey('finish');const g=this.trackPoint(.006,11);g.y+=4;this.position.copy(g);this.target.copy(center);this.fov=T.MathUtils.clamp(T.MathUtils.radToDeg(2*Math.atan(spread*.6/g.distanceTo(center))),10,30);break;}}
  this.shot=shot;this.dust.position.set(0,0,0);}
 private focus2='';
}
