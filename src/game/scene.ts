import * as T from 'three';
import {EffectComposer,RenderPass,EffectPass,BloomEffect,VignetteEffect,ChromaticAberrationEffect,ToneMappingEffect,ToneMappingMode} from 'postprocessing';
import {planets,planet,statColors} from './data/planets';
import {courses} from './data/races';
import type {Race} from './race';
import {ScoutParticles} from './scout-particles';

const base=import.meta.env.BASE_URL+'atlas/';
const files:Record<string,string>={earth:'2k_earth_color.jpeg',moon:'2k_moon.jpeg',mercury:'2k_mercury.jpg',venus:'2k_venus.jpg',mars:'2k_mars.jpg',jupiter:'2k_jupiter.jpg'};
// Orbital track: an ellipse with the sun at one focus. Perihelion is the closest pass.
const A=78,B=56,C=Math.sqrt(A*A-B*B),LANE_W=2.3;
export type Shot='wide'|'chase'|'side'|'front'|'aerial'|'closeup'|'finish';
export const cameraNames=['AUTO','내 선수','선두','공중','전경'] as const;
export const UNIQUE=new Set(['unique','dust','capture','tidal']);

function glowTexture(inner='rgba(255,255,255,1)',mid='rgba(255,220,160,.35)'){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d')!;const r=g.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,inner);r.addColorStop(.25,mid);r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,256,256);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}

/** Short-lived additive particle bursts (sparks, dust, rainbow). */
class Bursts{readonly points:T.Points;private pos:Float32Array;private vel:Float32Array;private life:Float32Array;private col:Float32Array;private n=2400;private head=0;
 constructor(scene:T.Scene,sprite:T.Texture){const g=new T.BufferGeometry();this.pos=new Float32Array(this.n*3).fill(-9999);this.vel=new Float32Array(this.n*3);this.life=new Float32Array(this.n);this.col=new Float32Array(this.n*3);g.setAttribute('position',new T.BufferAttribute(this.pos,3));g.setAttribute('color',new T.BufferAttribute(this.col,3));this.points=new T.Points(g,new T.PointsMaterial({size:.5,map:sprite,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,sizeAttenuation:true}));this.points.frustumCulled=false;scene.add(this.points);}
 emit(at:T.Vector3,count:number,speed:number,colors:string[],spread=1,up=0){const c=new T.Color();for(let i=0;i<count;i++){const k=this.head=(this.head+1)%this.n;const u=Math.random()*2-1,a=Math.random()*Math.PI*2,h=Math.sqrt(1-u*u),s=speed*(.4+Math.random()*.6);this.pos.set([at.x,at.y,at.z],k*3);this.vel.set([h*Math.cos(a)*s*spread,u*s+up,h*Math.sin(a)*s*spread],k*3);this.life[k]=.5+Math.random()*.9;c.set(colors[i%colors.length]).multiplyScalar(2.4);this.col.set([c.r,c.g,c.b],k*3);}}
 update(dt:number){const fade=Math.exp(-dt*2.2);for(let k=0;k<this.n;k++){if(this.life[k]<=0)continue;this.life[k]-=dt;if(this.life[k]<=0){this.pos[k*3+1]=-9999;continue;}for(let j=0;j<3;j++){this.pos[k*3+j]+=this.vel[k*3+j]*dt;this.vel[k*3+j]*=1-dt*1.6;this.col[k*3+j]*=fade;}}this.points.geometry.attributes.position.needsUpdate=true;this.points.geometry.attributes.color.needsUpdate=true;}}

/** Flat additive ribbon behind each racer. */
class Trail{readonly mesh:T.Mesh;private pts:T.Vector3[]=[];private geo=new T.BufferGeometry();private positions:Float32Array;private alpha:Float32Array;private n=48;
 constructor(scene:T.Scene,color:string,private width:number){this.positions=new Float32Array(this.n*6);this.alpha=new Float32Array(this.n*2);const idx:number[]=[];for(let i=0;i<this.n-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}this.geo.setIndex(idx);this.geo.setAttribute('position',new T.BufferAttribute(this.positions,3));this.geo.setAttribute('alpha',new T.BufferAttribute(this.alpha,1));
  this.mesh=new T.Mesh(this.geo,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,uniforms:{color:{value:new T.Color(color).multiplyScalar(1.7)}},vertexShader:'attribute float alpha;varying float a;void main(){a=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 color;varying float a;void main(){gl_FragColor=vec4(color*a,a);}'}));this.mesh.frustumCulled=false;scene.add(this.mesh);}
 reset(){this.pts=[];this.alpha.fill(0);this.geo.attributes.alpha.needsUpdate=true;}
 push(p:T.Vector3,side:T.Vector3,strength:number){this.pts.unshift(p.clone());if(this.pts.length>this.n)this.pts.pop();for(let i=0;i<this.n;i++){const q=this.pts[Math.min(i,this.pts.length-1)];const w=this.width*(1-i/this.n);this.positions.set([q.x+side.x*w,q.y+side.y*w,q.z+side.z*w],i*6);this.positions.set([q.x-side.x*w,q.y-side.y*w,q.z-side.z*w],i*6+3);const a=i<this.pts.length?(1-i/this.n)**1.6*.5*strength:0;this.alpha[i*2]=a;this.alpha[i*2+1]=a;}this.geo.attributes.position.needsUpdate=true;this.geo.attributes.alpha.needsUpdate=true;}}

export class GameScene{
 readonly renderer:T.WebGLRenderer;readonly scene=new T.Scene();readonly camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,2000);readonly actors=new Map<string,T.Group>();readonly track=new T.Group();
 active=true;ready=false;proceduralDone=false;mode='title';hero='earth';cameraMode=0;shot:Shot='wide';focus='';introIndex=-1;onPoke?:()=>void;
 private composer:EffectComposer;private chroma:ChromaticAberrationEffect;private sunLight:T.PointLight;private stageLight:T.DirectionalLight;private ambient:T.AmbientLight;private sun=new T.Group();private stars:T.Mesh;
 private trails=new Map<string,Trail>();private bursts:Bursts;private auras=new Map<string,T.Mesh>();private scoutParticles:ScoutParticles;private cometMesh=new T.Group();private cometState={t:-1,color:new T.Color(),promote:false,dur:1.6};
 private time=0;private lastEvent=0;private shake=0;private chromaKick=0;private position=new T.Vector3();private target=new T.Vector3();private lookAt=new T.Vector3();private cut=true;private spin=0;private spinVel=0;private bounce=0;private dragging=false;private dragMoved=0;private px=0;private revealT=-10;private procedural?:Promise<void>;private lastMode='';private courseIndex=1;private planetPos=new Map<string,T.Vector3>();private lastShotKey='';private ribbon?:T.ShaderMaterial;
 constructor(readonly canvas:HTMLCanvasElement){
  this.renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',stencil:false});this.renderer.setPixelRatio(Math.min(2,devicePixelRatio));this.renderer.setSize(innerWidth,innerHeight);this.renderer.setClearColor('#03050c');this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.NoToneMapping;
  this.composer=new EffectComposer(this.renderer,{frameBufferType:T.HalfFloatType,multisampling:Math.min(4,this.renderer.capabilities.maxSamples)});this.composer.addPass(new RenderPass(this.scene,this.camera));
  const bloom=new BloomEffect({mipmapBlur:true,luminanceThreshold:.8,luminanceSmoothing:.2,intensity:1.2,radius:.72});this.chroma=new ChromaticAberrationEffect({offset:new T.Vector2(0,0),radialModulation:true,modulationOffset:.2});
  this.composer.addPass(new EffectPass(this.camera,bloom,this.chroma,new VignetteEffect({darkness:.55,offset:.28}),new ToneMappingEffect({mode:ToneMappingMode.ACES_FILMIC})));
  this.sunLight=new T.PointLight('#fff2dc',3.4,0,0);this.stageLight=new T.DirectionalLight('#fff4e4',3.4);this.stageLight.position.set(-9,4,7);this.ambient=new T.AmbientLight('#7d9cc7',.14);this.scene.add(this.sunLight,this.stageLight,this.ambient);
  const glow=glowTexture();
  const core=new T.Mesh(new T.SphereGeometry(7,64,40),new T.ShaderMaterial({uniforms:{t:{value:0}},vertexShader:'varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform float t;varying vec3 n;varying vec3 p;float h(vec3 q){return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453);}float no(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}void main(){float g=no(p*1.3+t*.25)*.5+no(p*3.1-t*.4)*.3+no(p*7.)*.2;float limb=pow(max(0.,n.z),.45);vec3 c=mix(vec3(2.6,.9,.25),vec3(4.2,2.7,1.3),g)*(.55+.6*limb);gl_FragColor=vec4(c,1.);}'}));this.sun.add(core);this.sun.userData.core=core;
  for(const [s,o] of [[40,.9],[80,.22]] as const){const sp=new T.Sprite(new T.SpriteMaterial({map:glow,color:new T.Color(4,2.6,1.4),transparent:true,opacity:o,depthWrite:false,blending:T.AdditiveBlending}));sp.scale.setScalar(s);this.sun.add(sp);}
  this.scene.add(this.sun);
  this.stars=new T.Mesh(new T.SphereGeometry(900,64,32),new T.MeshBasicMaterial({color:new T.Color(.6,.65,.8),side:T.BackSide,depthWrite:false}));this.scene.add(this.stars);
  this.bursts=new Bursts(this.scene,glowTexture('rgba(255,255,255,1)','rgba(255,255,255,.4)'));this.scoutParticles=new ScoutParticles(this.scene);
  const head=new T.Sprite(new T.SpriteMaterial({map:glow,color:new T.Color(4,4,4),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));head.scale.setScalar(3.2);this.cometMesh.add(head);const tail=new T.Mesh(new T.ConeGeometry(1.5,30,24,1,true),new T.MeshBasicMaterial({color:new T.Color(3,3,3),transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide}));tail.rotation.x=-Math.PI/2;tail.position.z=-15;this.cometMesh.add(tail);this.cometMesh.visible=false;this.scene.add(this.cometMesh);
  this.scene.add(this.track);this.buildTrack();
  canvas.addEventListener('pointerdown',e=>{this.dragging=true;this.px=e.clientX;this.dragMoved=0;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;const d=e.clientX-this.px;this.spinVel=d*.012;this.spin+=d*.008;this.dragMoved+=Math.abs(d);this.px=e.clientX;});
  canvas.addEventListener('pointerup',()=>{this.dragging=false;if(this.dragMoved<6&&['home','setup','collection'].includes(this.mode)){this.poke();this.onPoke?.();}});
  addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);});}

 async prepare(status:(p:number)=>void){const loader=new T.TextureLoader();let done=0;const total=10;const load=async(name:string,color=true)=>{const t=await loader.loadAsync(base+name);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=this.renderer.capabilities.getMaxAnisotropy();status(++done/total);return t;};
  const [maps,cloud,bump,spec,stars]=await Promise.all([Promise.all(planets.slice(0,6).map(async p=>[p.id,await load(files[p.id])] as const)),load('2k_earth_clouds.jpeg',false),load('2k_earth_bump.jpg',false),load('2k_earth_specular.jpeg',false),load('8k_stars.jpg')]);
  const sm=this.stars.material as T.MeshBasicMaterial;sm.map=stars;sm.needsUpdate=true;
  const g=new T.SphereGeometry(1,128,80);
  for(const p of planets){const map=maps.find(([id])=>id===p.id)?.[1]??null;const mat=new T.MeshPhongMaterial({map,color:map?'#ffffff':p.color,specular:p.id==='earth'?'#1a2530':'#151a20',shininess:p.id==='earth'?60:8,bumpMap:p.id==='earth'?bump:map,bumpScale:p.id==='earth'?2.2:1.2,specularMap:p.id==='earth'?spec:null,emissive:new T.Color(0,0,0)});
   const body=new T.Group();const sphere=new T.Mesh(g,mat);body.add(sphere);body.userData.surface=sphere;
   if(p.id==='earth'||p.body==='procedural'){const clouds=new T.Mesh(g,new T.MeshPhongMaterial({color:'#ffffff',alphaMap:cloud,transparent:true,opacity:.9,depthWrite:false,shininess:2}));clouds.scale.setScalar(1.012);clouds.userData.cloud=true;body.add(clouds);}
   if(!['moon','mercury'].includes(p.id)){const tint=p.id==='mars'?'#d0805a':p.id==='venus'?'#e8c37e':p.id==='jupiter'?'#d9b48c':'#5aaef0';const rim=new T.Mesh(g,new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color(tint)}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float r=pow(1.-abs(dot(normalize(n),normalize(v))),2.4);gl_FragColor=vec4(tint*r*1.4,r);}'}));rim.scale.setScalar(1.045);body.add(rim);}
   const aura=new T.Mesh(new T.TorusGeometry(1,.035,8,96),new T.MeshBasicMaterial({color:new T.Color(p.color).multiplyScalar(3),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));aura.rotation.x=Math.PI/2;aura.visible=false;this.scene.add(aura);this.auras.set(p.id,aura);
   body.visible=false;this.actors.set(p.id,body);this.scene.add(body);this.trails.set(p.id,new Trail(this.scene,p.color,p.radius*.42));}
  this.procedural=this.buildProcedural().then(()=>{this.proceduralDone=true;});this.camera.position.set(0,0,9);await this.renderer.compileAsync(this.scene,this.camera);this.ready=true;}
 /** Seeded GAIA planets are baked in a worker after first paint. Races wait for them. */
 whenProcedural(){return this.procedural??Promise.resolve();}
 private async buildProcedural(){const worker=new Worker(new URL('../maps.worker.ts',import.meta.url),{type:'module'});let job=0;
  for(const p of planets.filter(p=>p.body==='procedural')){const data=await new Promise<any>((resolve,reject)=>{worker.onmessage=e=>resolve(e.data);worker.onerror=reject;worker.postMessage({seed:p.seed,job:++job});});
   const pixels=new Uint8Array(data.width*data.height*4);for(let i=0;i<pixels.length;i+=4){const h=(data.terrain[i]*256+data.terrain[i+1])/65535,land=h>data.sea;const b=data.biome;pixels[i]=land?b[i]:9;pixels[i+1]=land?b[i+1]:43+(h/data.sea)*24;pixels[i+2]=land?b[i+2]:72+(h/data.sea)*30;pixels[i+3]=255;}
   const t=new T.DataTexture(pixels,data.width,data.height);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=this.renderer.capabilities.getMaxAnisotropy();t.needsUpdate=true;
   const surface=this.actors.get(p.id)!.userData.surface as T.Mesh<T.SphereGeometry,T.MeshPhongMaterial>;surface.material.map=t;surface.material.bumpMap=t;surface.material.color.set('#ffffff');surface.material.needsUpdate=true;
   const density=new Uint8Array(pixels.length);for(let k=0;k<density.length;k+=4){const v=Math.max(0,data.cloud[k]-.18*255)*1.2;density[k]=density[k+1]=density[k+2]=v;density[k+3]=255;}const ct=new T.DataTexture(density,data.width,data.height);ct.wrapS=T.RepeatWrapping;ct.minFilter=T.LinearMipmapLinearFilter;ct.generateMipmaps=true;ct.needsUpdate=true;
   for(const child of this.actors.get(p.id)!.children)if(child.userData.cloud){const m=(child as T.Mesh<T.SphereGeometry,T.MeshPhongMaterial>).material;m.alphaMap=ct;m.needsUpdate=true;}}
  worker.terminate();}

 // ── Track ──
 trackPoint(f:number,lane:number,course=this.courseIndex,out=new T.Vector3()){const th=(f-courses[course].sun)*Math.PI*2,off=(lane-3.5)*LANE_W;return out.set(Math.cos(th)*(A+off)-C,Math.sin(th*2)*2.2,-Math.sin(th)*(B+off));}
 tangent(f:number,course=this.courseIndex){const a=this.trackPoint(f-.002,3.5,course),b=this.trackPoint(f+.002,3.5,course);return b.sub(a).normalize();}
 private buildTrack(){this.track.clear();const course=this.courseIndex,n=720,pos:number[]=[],uv:number[]=[],idx:number[]=[];const tmp=new T.Vector3();
  for(let i=0;i<=n;i++){const f=i/n;for(const [k,l] of [[0,-.5],[1,7.5]] as const){this.trackPoint(f,l,course,tmp);pos.push(tmp.x,tmp.y,tmp.z);uv.push(k,f);}if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);
  const cs=courses[course].corners;const c=(i:number)=>cs[i]??[2,2];
  this.ribbon=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{t:{value:0},len:{value:courses[course].length},c0:{value:new T.Vector4(...c(0),...c(1))},c1:{value:new T.Vector2(...c(2))}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform float t;uniform float len;uniform vec4 c0;uniform vec2 c1;varying vec2 vUv;void main(){float x=vUv.x*8.;float laneLine=smoothstep(.04,.0,min(fract(x),1.-fract(x)))*.22;float edge=smoothstep(.035,0.,vUv.x)+smoothstep(.965,1.,vUv.x);float d=vUv.y*len;float tick=smoothstep(1.2,0.,abs(mod(d,100.)-50.)-48.8);float chev=smoothstep(.5,.0,abs(fract(d*.02-t*.6+abs(vUv.x-.5)*.6)-.5))*.05;float corner=step(c0.x,vUv.y)*step(vUv.y,c0.y)+step(c0.z,vUv.y)*step(vUv.y,c0.w)+step(c1.x,vUv.y)*step(vUv.y,c1.y);float fin=step(d,1.6)+step(len-1.6,d);float check=fin*step(.5,mod(floor(vUv.x*16.)+floor(d*1.25),2.));vec3 c=vec3(.004,.012,.03)+vec3(.08,.3,.6)*(laneLine+chev)+vec3(1.,.7,.3)*edge*1.6+vec3(.5,.12,.06)*corner*.08+vec3(.25)*tick*.4;c=mix(c,vec3(.8),check);float a=.82+edge*.18;gl_FragColor=vec4(c,a);}'});
  this.track.add(new T.Mesh(g,this.ribbon));
  const L=courses[course].length,pyl=new T.MeshBasicMaterial({color:new T.Color(1.8,1.5,.9)}),pg=new T.CylinderGeometry(.12,.12,3.2,8);for(let d=200;d<L;d+=200)for(const l of [-1,8]){const p=new T.Mesh(pg,pyl);this.trackPoint(d/L,l,course,p.position);p.position.y+=1.2;this.track.add(p);}
  const gm=new T.MeshStandardMaterial({color:'#9aa6c0',metalness:.8,roughness:.35});for(const l of [-1.4,8.4]){const p=new T.Mesh(new T.CylinderGeometry(.28,.28,9,16),gm);this.trackPoint(0,l,course,p.position);p.position.y+=3.5;this.track.add(p);}
  const a=this.trackPoint(0,-1.4,course),b=this.trackPoint(0,8.4,course);const bar=new T.Mesh(new T.BoxGeometry(.3,1.4,a.distanceTo(b)),new T.MeshBasicMaterial({color:new T.Color(3,.9,.6)}));bar.position.copy(a).add(b).multiplyScalar(.5);bar.position.y+=7.6;bar.lookAt(b.x,bar.position.y,b.z);this.track.add(bar);}
 setCourse(i:number){if(i!==this.courseIndex){this.courseIndex=i;this.buildTrack();}}

 // ── Reactions ──
 poke(){this.spinVel+=.35;this.bounce=1;}
 pulse(kind:'train'|'friend'|'fail',stat=0){const a=this.actors.get(this.hero);if(!a)return;const at=a.position.clone();if(kind==='fail'){this.shake=.3;this.bounce=-.6;this.bursts.emit(at,50,3,['#ff4a3a','#ff8a5a']);return;}this.spinVel+=kind==='friend'?1.4:.7;this.bounce=kind==='friend'?1.6:1;const colors=kind==='friend'?['#ff5e8a','#ffc93c','#5fe39a','#3fd0ff','#b07bff']:[statColors[stat],'#ffffff'];this.bursts.emit(at,kind==='friend'?340:150,kind==='friend'?9:6,colors,1.2);if(kind==='friend'){this.shake=.2;this.chromaKick=1;}}
 burst(colors:string[],count=260,speed=10){const a=this.actors.get(this.hero);this.bursts.emit(a?.position??new T.Vector3(),count,speed,colors,1.3);}
 kick(amount=.4){this.shake=Math.max(this.shake,amount);this.chromaKick=1;}
 reveal(id:string){this.hero=id;this.revealT=this.time;this.spin=0;}
 comet(color:string,promote:boolean){this.cometState={t:this.time,color:new T.Color(color),promote,dur:promote?2.3:1.5};this.cometMesh.visible=true;}

 // ── Frame ──
 update(now:number,race?:Race,dt=.016){this.time=now/1000;if(!this.active||!this.ready)return;const racing=['race','paddock','result'].includes(this.mode);this.track.visible=racing;this.sun.visible=racing||this.mode==='title';this.sunLight.intensity=racing?3.4:0;this.stageLight.intensity=racing?0:3.4;this.ambient.intensity=racing?.32:.14;
  (this.sun.userData.core.material as T.ShaderMaterial).uniforms.t.value=this.time;if(this.ribbon)this.ribbon.uniforms.t.value=this.time;
  if(this.lastMode!==this.mode){this.cut=true;this.lastMode=this.mode;this.lastShotKey='';for(const t of this.trails.values())t.reset();}
  this.spin+=this.spinVel*dt*4;this.spinVel*=Math.exp(-dt*2.2);this.bounce*=Math.exp(-dt*5);
  for(const a of this.actors.values())a.visible=false;for(const aura of this.auras.values())aura.visible=false;
  if(racing)this.updateRace(race);else this.updateStage();
  this.bursts.update(dt);
  if(this.cut){this.camera.position.copy(this.position);this.lookAt.copy(this.target);this.cut=false;}else{const k=1-Math.exp(-dt*(racing?7:3.5));this.camera.position.lerp(this.position,k);this.lookAt.lerp(this.target,k);}
  this.shake*=Math.exp(-dt*6);const s=this.shake;this.camera.position.x+=(Math.random()-.5)*s;this.camera.position.y+=(Math.random()-.5)*s;this.camera.lookAt(this.lookAt);
  this.chromaKick*=Math.exp(-dt*5);this.chroma.offset.set(.004*this.chromaKick,.0025*this.chromaKick);
  this.stars.position.copy(this.camera.position);
  for(const a of this.actors.values())for(const child of a.children)if(child.userData.cloud)child.rotation.y=this.time*.01;
  this.composer.render(dt);}

 private updateStage(){const a=this.actors.get(this.hero);if(!a)return;a.visible=true;const m=this.mode,scout=m==='scout';const x=m==='home'?.3:m==='training'?.15:m==='setup'?.35:m==='collection'?1.6:0;const y=m==='training'?.75:m==='setup'?.1:m==='title'?-.15:0;let scale=m==='training'?1.05:m==='setup'?1.35:m==='title'?1.7:scout?1.9:m==='home'?1.75:2;scale*=planet(this.hero).radius/.74*.2+.8;
  const r=this.time-this.revealT;if(r>=0&&r<1.6)scale*=T.MathUtils.smootherstep(r,0,1.4)*.92+.08;scale*=1+this.bounce*.06;a.position.set(x,y+Math.sin(this.time*.8)*.04,0);a.scale.setScalar(scale);a.rotation.set(.18,this.spin+this.time*.06*(this.hero==='venus'?-1:1),.1);
  this.scoutParticles.update(scout&&r>=0?r:-1,a);
  const c=this.cometState;if(c.t>=0){const k=(this.time-c.t)/c.dur;if(k>1){this.cometMesh.visible=false;c.t=-1;}else{const e=k*k*(3-2*k);this.cometMesh.position.set(-30+30*e,18-18*e,-160+150*e);this.cometMesh.lookAt(0,0,10);const col=c.promote&&k>.55?new T.Color().setHSL((this.time*1.8)%1,1,.6):c.color.clone();for(const ch of this.cometMesh.children){const mm=(ch as T.Mesh).material as T.MeshBasicMaterial;mm.color.copy(col).multiplyScalar(4);}}}
  if(m==='title'){this.sun.position.set(-48,10,-90);this.stageLight.position.set(-9,2,3);}else this.stageLight.position.set(-9,4,7);
  this.position.set(0,.05,9.6);this.target.set(m==='home'?.5:m==='collection'?.6:0,m==='training'?.25:0,0);}

 private updateRace(race:Race|undefined){const course=race?.config.course??this.courseIndex;this.setCourse(course);this.sun.position.set(0,0,0);const L=courses[course].length;const order=race?.ranking??[];
  for(const [i,p] of planets.entries()){const r=race?.racers.find(r=>r.id===p.id);const f=this.mode==='paddock'||!r?-.006:r.distance/L;this.planetPos.set(p.id,this.trackPoint(f,r?.lane??i,course));}
  // Comedic overlays drawn from sim state: captured racers orbit Jupiter; the Moon circles a tidally locked Earth.
  if(race)for(const r of race.racers){if(r.captureUntil>race.time&&r.captureBy){const j=this.planetPos.get(r.captureBy)!,left=r.captureUntil-race.time,s=Math.min(1,left*1.5,(3-left)*1.5)*.85,a=race.time*3.2+r.phase;this.planetPos.get(r.id)!.lerp(j.clone().add(new T.Vector3(Math.cos(a)*2.8,Math.sin(a*1.3)*.9,Math.sin(a)*2.8)),Math.max(0,s));}
   if(r.tidalUntil>race.time){const e=race.racers.find(o=>o.planet==='earth');if(e){const ep=this.planetPos.get(e.id)!,left=r.tidalUntil-race.time,s=Math.min(1,left*1.5,(4-left)*1.5)*.9,a=race.time*2.4;this.planetPos.get(r.id)!.lerp(ep.clone().add(new T.Vector3(Math.cos(a)*2.3,.7,Math.sin(a)*2.3)),Math.max(0,s));}}}
  const winner=order[0]?.id;for(const p of planets){const a=this.actors.get(p.id)!;const r=race?.racers.find(r=>r.id===p.id);a.visible=this.mode!=='result'||p.id===winner;a.position.copy(this.planetPos.get(p.id)!);a.position.y+=p.radius;a.scale.setScalar(p.radius);a.rotation.set(.2,(this.time*.5+(r?.distance??0)*.06)*(p.id==='venus'?-1:1)*(r?.spin??1),.1);
   const mat=(a.userData.surface as T.Mesh<T.SphereGeometry,T.MeshPhongMaterial>).material;const heat=r?.heat??0;mat.emissive.setRGB(heat*.9,heat*.25,0);
   const trail=this.trails.get(p.id)!;if(this.mode==='race'&&r&&!r.finish&&r.velocity>1){const tan=this.tangent(r.distance/L,course);const side=new T.Vector3(0,1,0).cross(tan).normalize();trail.push(a.position.clone().setY(a.position.y-p.radius*.25),side,r.effects.some(e=>e.mul>1)?2.4:1);}else if(this.mode!=='race')trail.reset();
   const ev=race?.events.filter(e=>e.id===p.id&&UNIQUE.has(e.type)).at(-1);const age=ev?race!.time-ev.time:-1;if(age>=0&&age<2.5){const aura=this.auras.get(p.id)!;aura.visible=true;aura.position.copy(a.position);const k=age/2.5;aura.scale.setScalar(p.radius*(1.3+k*(p.id==='jupiter'?6:2.5)));(aura.material as T.MeshBasicMaterial).opacity=(1-k)*.9;}}
  void order;if(race)this.raceEvents(race);this.director(race,course);}
 private raceEvents(race:Race){for(;this.lastEvent<race.events.length;this.lastEvent++){const e=race.events[this.lastEvent];const at=this.actors.get(e.id)?.position;if(!at)continue;
  if(e.type==='collide'){this.bursts.emit(at,200,9,['#ffd27a','#ffffff','#ff7a4a'],1.2);this.kick(.55);}
  else if(e.type==='dust'){for(let i=0;i<4;i++)this.bursts.emit(at,100,5,['#c9673a','#e09062','#8a4a2a'],1.6,.4);}
  else if(UNIQUE.has(e.type)){this.bursts.emit(at,170,7,[planet(e.id).color,'#ffffff'],1.2);this.chromaKick=1;}
  else if(e.type==='finish'&&race.racers.filter(r=>r.finish).length===1)this.bursts.emit(at,300,10,['#ffc93c','#ffffff','#3fd0ff']);}}
 skipEvents(n:number){this.lastEvent=n;}
 resetRaceView(){this.lastEvent=0;this.cut=true;this.lastShotKey='';for(const t of this.trails.values())t.reset();}

 /** TV-style director: hard cuts between broadcast shots with event-driven overrides. */
 private autoShot(race:Race):[Shot,string]{const t=race.time,lead=race.ranking[0],lf=lead.distance/race.course.length;const recent=race.events.filter(e=>t-e.time<2.6&&(UNIQUE.has(e.type)||e.type==='collide')).at(-1);
  if(t<2.6)return['wide',lead.id];if(recent)return[recent.type==='collide'?'aerial':'closeup',recent.id];if(lf>.9)return lf>.965?['finish',lead.id]:['front',lead.id];
  const seg=Math.floor((t-2.6)/4.2)%6;const me=this.focus||lead.id;return([['front',lead.id],['chase',me],['side',lead.id],['aerial',lead.id],['chase',lead.id],['side',me]] as [Shot,string][])[seg];}
 private director(race:Race|undefined,course:number){const setKey=(k:string)=>{if(k!==this.lastShotKey){this.cut=true;this.lastShotKey=k;}};
  if(this.mode==='paddock'||!race){if(this.introIndex>=0){const p=planets[this.introIndex];const pos=this.planetPos.get(p.id)!.clone();pos.y+=p.radius;const a=this.time*.35+this.introIndex;const R=3.6+p.radius*3;this.position.set(pos.x+Math.cos(a)*R,pos.y+.9,pos.z+Math.sin(a)*R);this.target.copy(pos);setKey('intro'+this.introIndex);return;}
   const g=this.trackPoint(-.006,3.5,course);const tan=this.tangent(0,course);this.position.copy(g).addScaledVector(tan,22).add(new T.Vector3(0,7,0)).add(new T.Vector3(0,1,0).cross(tan).multiplyScalar(-14));this.target.copy(g);setKey('grid');return;}
  if(this.mode==='result'){const w=this.actors.get(race.ranking[0].id)!;const a=this.time*.25,R=2.2+planet(race.ranking[0].id).radius*3.2;this.position.copy(w.position).add(new T.Vector3(Math.cos(a)*R,.8,Math.sin(a)*R));this.target.copy(w.position);setKey('result');return;}
  let [shot,id]=this.autoShot(race);const lead=race.ranking[0];
  if(this.cameraMode===1){shot=race.time<2.6?'wide':'chase';id=this.focus||lead.id;}else if(this.cameraMode===2){shot='chase';id=lead.id;}else if(this.cameraMode===3){shot='aerial';id=lead.id;}else if(this.cameraMode===4){shot='wide';id=lead.id;}
  setKey(shot+id);this.shot=shot;
  const r=race.racers.find(r=>r.id===id)??lead;const pos=this.actors.get(r.id)!.position.clone();const tan=this.tangent(r.distance/race.course.length,course);const out=new T.Vector3(0,1,0).cross(tan).normalize().negate();const up=new T.Vector3(0,1,0);
  switch(shot){case'wide':this.position.set(-C*.5+40,95,150);this.target.set(-C*.5,0,0);break;
   case'chase':this.position.copy(pos).addScaledVector(tan,-8).addScaledVector(up,2.2).addScaledVector(out,1.2);this.target.copy(pos).addScaledVector(tan,7);break;
   case'side':this.position.copy(pos).addScaledVector(out,10).addScaledVector(up,1.6).addScaledVector(tan,2);this.target.copy(pos).addScaledVector(tan,1.5);break;
   case'front':this.position.copy(pos).addScaledVector(tan,12).addScaledVector(up,1.5).addScaledVector(out,-1);this.target.copy(pos).addScaledVector(tan,-4);break;
   case'aerial':this.position.copy(pos).addScaledVector(up,26).addScaledVector(out,16).addScaledVector(tan,-8);this.target.copy(pos).addScaledVector(tan,4);break;
   case'closeup':this.position.copy(pos).addScaledVector(tan,4.2).addScaledVector(out,2.4).addScaledVector(up,.9);this.target.copy(pos);break;
   case'finish':{const g=this.trackPoint(0,-6,course);g.y+=2.2;this.position.copy(g).addScaledVector(this.tangent(0,course),6);this.target.copy(pos);break;}}}
}
