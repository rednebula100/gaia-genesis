import * as THREE from 'three';
import { gsap } from 'gsap';
import './style.css';
import { vertex, surface, clouds, atmosphere, interior } from './shaders';

document.querySelector<HTMLDivElement>('#root')!.innerHTML=`<main class="forge">
<canvas aria-label="A real-time three-dimensional planet. Drag to rotate; scroll to zoom after the cinematic." tabindex="0"></canvas>
<div class="hud"><header class="brand"><svg class="sigil" viewBox="0 0 28 34" fill="none" aria-hidden="true"><path d="M14 1 27 25H1L14 1Z" stroke="currentColor"/><path d="M14 10v23M5 18h18M8 25l6-10 6 10" stroke="currentColor" stroke-width=".7"/></svg><div class="brand-name">GAIA<span>//</span>GENESIS</div></header>
<div class="edition"><i class="light"></i> THE WORLD FORGE</div>
<div class="chapter"><div class="eyebrow" id="phase">01 / ACCRETION</div><h1 id="title">From the dark</h1></div>
<div class="stage-note" id="note"></div>
<div class="labels" aria-hidden="true"><svg class="leaders">${Array.from({length:4},()=>'<path/><circle r="1.7"/>').join('')}</svg>${['CRUST','MANTLE','OUTER CORE','INNER CORE'].map(s=>`<span class="label">${s}</span>`).join('')}</div>
<div class="bottom"><span class="world-id" id="seed"></span><span id="clock">00.0 / 22.0</span></div>
<nav class="controls" aria-label="World controls"><button id="skip">SKIP <span>↗</span></button><button id="replay" class="hidden">REPLAY <span>↺</span></button><button id="new" class="hidden">NEW WORLD <span>+</span></button></nav>
<div class="progress"><i></i></div><input class="seek" type="range" min="0" max="22" step=".01" value="0" aria-label="Cinematic timeline">
</div><div class="desktop-note">DESKTOP EXPERIENCE RECOMMENDED</div><div class="loading">FORMING THE SEED<small>Preparing a world, not a photograph.</small></div></main>`;
const el=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>('canvas');
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){el('.loading').textContent='WebGL2 is required. Open in a desktop browser with graphics acceleration.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x050809);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);
const world=new THREE.Group();scene.add(world);
const sun=new THREE.Vector3(-.72,.48,.64).normalize();
const blank=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1);blank.needsUpdate=true;
const uniforms={uTerrain:{value:blank},uCloud:{value:blank},uSun:{value:sun},uTime:{value:0},uHeat:{value:1},uWater:{value:0},uAir:{value:0},uSea:{value:.5},uOpen:{value:0}};
const make=(fragmentShader:string,extra:Record<string,THREE.IUniform>={},transparent=false)=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader,uniforms:{...uniforms,...extra},transparent,depthWrite:!transparent,side:THREE.FrontSide});
const surfaceMat=make(surface),cloudMat=make(clouds,{},true),airMat=make(atmosphere,{},true);
airMat.blending=THREE.AdditiveBlending;
const still=new THREE.Group(),sector=new THREE.Group();world.add(still,sector);
const PI=Math.PI,start=PI*.5,end=PI;
function sphere(radius:number,phi:number,length:number){
 const g=new THREE.SphereGeometry(radius,144,96,phi,length);const uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setX(i,(phi+uv.getX(i)*length)/(PI*2));
 return g;
}
// A meridional half-annulus connects the inner/outer spherical boundaries.
// It is mesh geometry, not a decal or a screen-facing disc.
function cap(inner:number,outer:number,phi:number){
 const p:number[]=[],idx:number[]=[];
 for(let j=0;j<=128;j++){const t=j/128*PI;for(const r of [inner,outer])p.push(-r*Math.cos(phi)*Math.sin(t),r*Math.cos(t),r*Math.sin(phi)*Math.sin(t));
  if(j<128){const n=j*2;idx.push(n,n+1,n+2,n+1,n+3,n+2)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.length/3*2),2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const bounds=[0,.19,.55,.975,1]; // Crust exaggerated to 2.5% of R for visual legibility.
for(let l=0;l<4;l++){
 const sideMat=l===3?surfaceMat:make(interior,{uLayer:{value:l},uFace:{value:0}});
 const faceMat=make(interior,{uLayer:{value:l},uFace:{value:1}});faceMat.side=THREE.DoubleSide;
 for(const [group,a,len] of [[still,end,PI*2-(end-start)],[sector,start,end-start]] as const){
  group.add(new THREE.Mesh(sphere(bounds[l+1],a,len),sideMat));
  for(const angle of [start,end])group.add(new THREE.Mesh(cap(bounds[l],bounds[l+1],angle),faceMat));
 }
}
for(const [group,a,len] of [[still,end,PI*2-(end-start)],[sector,start,end-start]] as const){
 const mesh=new THREE.Mesh(sphere(1.008,a,len),cloudMat);mesh.renderOrder=3;group.add(mesh);
}
const air=new THREE.Mesh(new THREE.SphereGeometry(1.026,128,80),airMat);air.renderOrder=4;world.add(air);

let randomState=51;function random(){randomState=(Math.imul(randomState,1664525)+1013904223)|0;return(randomState>>>0)/4294967296;}
const starPositions=new Float32Array(450*3),starColors=new Float32Array(450*3);
for(let i=0;i<450;i++){const z=random()*2-1,a=random()*PI*2,r=22+random()*15;starPositions[i*3]=Math.sqrt(1-z*z)*Math.cos(a)*r;starPositions[i*3+1]=Math.sqrt(1-z*z)*Math.sin(a)*r;starPositions[i*3+2]=z*r;const b=.12+random()*.32;starColors.set([b*.87,b,b*.98],i*3);}
const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(starPositions,3));sg.setAttribute('color',new THREE.BufferAttribute(starColors,3));
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:.014,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.62})));
const rockMat=new THREE.MeshStandardMaterial({color:0x342d25,roughness:1,metalness:.3,emissive:0x361307,emissiveIntensity:.35});
const debris=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),rockMat,150);scene.add(debris);
const key=new THREE.DirectionalLight(0xffddbb,2.6);key.position.copy(sun).multiplyScalar(8);scene.add(key,new THREE.AmbientLight(0x698a9b,.2));
const dummy=new THREE.Object3D();const fragments=Array.from({length:150},()=>({angle:random()*PI*2,lat:(random()-.5)*2.5,start:random()*2.8,duration:.7+random()*.5,scale:.012+random()*.033,distance:2.5+random()*3}));
// Small, local collision glows. They never flash the frame.
const impacts=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({color:0xffad54,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}),150);scene.add(impacts);
const droplets=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:0xb68a40,metalness:.8,roughness:.31,emissive:0x5e2405,emissiveIntensity:.65}),36);world.add(droplets);
const metals=Array.from({length:36},()=>({a:PI*(.53+random()*.42),lat:(random()-.5)*1.7,start:3.55+random()*1.3,duration:.9+random()*.8,size:.012+random()*.015}));

const state={heat:1,water:0,air:0,open:0,radius:.1,distance:5.6,lookX:0,lookY:0,camX:-.2,rotation:-.25};
const initial={...state};
const timeline=gsap.timeline({paused:true,defaults:{ease:'sine.inOut'}});
timeline.to(state,{radius:.91,distance:4.8,duration:3.5,ease:'power2.out'},0)
 .to(state,{radius:1,open:.95,distance:5.1,rotation:-.1,duration:1.5},3.5)
 .to(state,{open:0,duration:1.4},5.5)
 .to(state,{heat:.27,distance:3.15,lookX:.36,lookY:.18,camX:.38,rotation:.05,duration:2.2},7)
 .to(state,{heat:0,duration:2.8},9)
 .to(state,{water:1,air:1,distance:4.7,lookX:0,lookY:0,camX:.3,rotation:.22,duration:3.6},10)
 .to(state,{open:1,distance:5.15,camX:.38,rotation:.12,duration:1.55,ease:'power2.inOut'},14)
 .to(state,{open:0,duration:1.65,ease:'power2.inOut'},17.8)
 .to(state,{distance:4.85,camX:0,rotation:.36,duration:2.5},19.5);
const chapters=[{t:0,id:'01 / ACCRETION',title:'From the dark'},{t:3.5,id:'02 / DIFFERENTIATION',title:'A heart of iron'},{t:7,id:'03 / CRUST',title:'Fire becomes stone'},{t:10,id:'04 / OCEAN & ATMOSPHERE',title:'The first blue'},{t:14,id:'05 / ANATOMY',title:'A world within'},{t:19.5,id:'06 / GENESIS',title:'A world, alive'}];
const range=el<HTMLInputElement>('.seek');let lastChapter=-1,seed=0,ready=false,building=false,generation=0,signature='';
let userX=0,userY=0,targetX=0,targetY=0,zoom=0,targetZoom=0,drift=0,finishedAt=0;
const loading=el('.loading');
function play(){userX=userY=targetX=targetY=zoom=targetZoom=drift=0;finishedAt=0;Object.assign(state,initial);timeline.invalidate().restart();}
function skip(){timeline.seek(22).pause();finishedAt=performance.now();}
const worker=new Worker(new URL('./maps.worker.ts',import.meta.url),{type:'module'});
const texture=(data:Uint8Array,w:number,h:number)=>{const t=new THREE.DataTexture(data,w,h);t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t;};
function generate(next:number){if(building)return;building=true;ready=false;generation++;seed=next>>>0;loading.classList.remove('hidden');loading.style.opacity='1';worker.postMessage(seed);}
worker.onmessage=(ev)=>{
 const d=ev.data;for(const key of ['uTerrain','uCloud'] as const){if(uniforms[key].value!==blank)uniforms[key].value.dispose();}
 uniforms.uTerrain.value=texture(d.terrain,d.width,d.height);uniforms.uCloud.value=texture(d.cloud,d.width,d.height);uniforms.uSea.value=d.sea;signature=d.signature;
 el('#seed').textContent=`SEED / ${seed.toString(16).toUpperCase().padStart(8,'0')}`;
 const inspect=new URLSearchParams(location.search).get('inspect');
 building=false;ready=true;lastChapter=-1;history.replaceState(null,'',`${location.pathname}?seed=${seed}`);play();
 if(inspect!==null)timeline.seek(Number(inspect)).pause();
 loading.style.opacity='0';window.setTimeout(()=>{if(!building)loading.classList.add('hidden')},650);
};
worker.onerror=()=>{building=false;loading.textContent='World generation failed. Reload to try again.';};
el('#skip').onclick=skip;el('#replay').onclick=play;
el('#new').onclick=()=>generate(crypto.getRandomValues(new Uint32Array(1))[0]);
range.oninput=()=>{timeline.seek(+range.value).pause();finishedAt=0;targetX=targetY=userX=userY=drift=0;};
let dragging=false,px=0,py=0;
canvas.addEventListener('pointerdown',e=>{if(!ready||timeline.time()<22)return;dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;targetY+=(e.clientX-px)*.005;targetX=THREE.MathUtils.clamp(targetX+(e.clientY-py)*.004,-1.15,1.15);px=e.clientX;py=e.clientY});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(timeline.time()>=22)targetZoom=THREE.MathUtils.clamp(targetZoom+e.deltaY*.0017,-1.3,1.8)},{passive:false});
canvas.addEventListener('keydown',e=>{if(timeline.time()<22)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')targetY-=.15;if(e.key==='ArrowRight')targetY+=.15;if(e.key==='ArrowUp')targetX-=.12;if(e.key==='ArrowDown')targetX+=.12;if(e.key==='+')targetZoom=Math.max(-1.3,targetZoom-.2);if(e.key==='-')targetZoom=Math.min(1.8,targetZoom+.2)});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(timeline.isActive())timeline.pause().data='resume';}else if(timeline.data==='resume'){timeline.data=null;timeline.play();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();timeline.pause();ready=false;loading.classList.remove('hidden');loading.style.opacity='1';loading.textContent='Graphics connection lost. Reload to restore this seed.';});
// Anchors lie on the moving sector's actual phi=PI/2 cap, inside their material boundaries.
const labelPoints=[new THREE.Vector3(0,.9,.4),new THREE.Vector3(0,.44,.5),new THREE.Vector3(0,-.15,.35),new THREE.Vector3(0,-.08,.08)];
const labels=Array.from(document.querySelectorAll<HTMLElement>('.label'));
const leaderPaths=Array.from(document.querySelectorAll<SVGPathElement>('.leaders path')),leaderDots=Array.from(document.querySelectorAll<SVGCircleElement>('.leaders circle'));
const project=new THREE.Vector3();let prev=performance.now();let qualityFrames=0,qualityElapsed=0;
function frame(now:number){
 requestAnimationFrame(frame);const dt=Math.min((now-prev)/1000,.05);prev=now;if(!ready)return;
 const t=timeline.time(),final=t>=21.999;
 if(final){if(!finishedAt)finishedAt=now;drift+=dt*.011;}
 const k=1-Math.exp(-dt*10);userX+=(targetX-userX)*k;userY+=(targetY-userY)*k;zoom+=(targetZoom-zoom)*k;
 uniforms.uTime.value=t+(final?(now-finishedAt)*.001:0);uniforms.uHeat.value=state.heat;uniforms.uWater.value=state.water;uniforms.uAir.value=state.air;uniforms.uOpen.value=state.open;
 world.scale.setScalar(state.radius);world.rotation.set(userX,.0+state.rotation+userY+drift,.14);
 sector.position.set(state.open*.88,state.open*.15,state.open*.36);sector.rotation.y=state.open*.14;
 air.visible=state.air>.001&&state.open<.02;
 camera.position.set(state.camX,.18,state.distance+zoom);camera.lookAt(state.lookX,state.lookY,0);
 let chapter=0;for(let i=0;i<chapters.length;i++)if(t>=chapters[i].t)chapter=i;
 if(chapter!==lastChapter){lastChapter=chapter;el('#phase').textContent=chapters[chapter].id;el('#title').textContent=chapters[chapter].title;}
 el('#skip').classList.toggle('hidden',final);el('#replay').classList.toggle('hidden',!final);el('#new').classList.toggle('hidden',!final);
 el('#note').textContent=final?'DRAG TO ROTATE  ·  SCROLL TO APPROACH':(t>=14&&t<18.8?'MATURE INTERIOR / TIME PROJECTION':'');
 el('#clock').textContent=final?'FORMATION / COMPLETE':`${t.toFixed(1).padStart(4,'0')} / 22.0`;
 el<HTMLElement>('.progress i').style.width=`${t/22*100}%`;range.value=String(t);
 const showLabels=t>=14?Math.min(1,Math.max(0,(state.open-.5)*2)):0;el('.labels').style.opacity=String(showLabels);
 world.updateMatrixWorld();labelPoints.forEach((p,i)=>{project.copy(p).applyMatrix4(sector.matrixWorld).project(camera);const x=(project.x*.5+.5)*innerWidth,y=(-project.y*.5+.5)*innerHeight,lx=innerWidth*.881,ly=innerHeight*(.29+i*.105);labels[i].style.left=`${lx}px`;labels[i].style.top=`${ly-5}px`;leaderPaths[i].setAttribute('d',`M${x},${y} L${lx-28},${ly} H${lx-10}`);leaderDots[i].setAttribute('cx',String(x));leaderDots[i].setAttribute('cy',String(y));});
 debris.visible=impacts.visible=t<4.2;
 droplets.visible=t>=3.5&&t<6.9;
 if(droplets.visible){metals.forEach((f,i)=>{const p=THREE.MathUtils.clamp((t-f.start)/f.duration,0,1),r=.94-.48*p*p;dummy.position.set(-Math.cos(f.a)*Math.cos(f.lat)*r,Math.sin(f.lat)*r,Math.sin(f.a)*Math.cos(f.lat)*r);dummy.scale.setScalar(p>=1?0:f.size);dummy.updateMatrix();droplets.setMatrixAt(i,dummy.matrix)});droplets.instanceMatrix.needsUpdate=true;}
 if(t<4.2){fragments.forEach((f,i)=>{
  const p=THREE.MathUtils.clamp((t-f.start)/f.duration,0,1),a=f.angle+(1-p)*1.6,dist=state.radius+(1-p)*(1-p)*f.distance;
  dummy.position.set(Math.cos(a)*dist,Math.sin(f.lat)*dist*.65,Math.sin(a)*dist);dummy.rotation.set(a*2,f.lat+a,a);dummy.scale.setScalar(p>=1?0:f.scale*(.5+p));dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix);
  const glow=Math.max(0,1-Math.abs(t-f.start-f.duration)/.11);dummy.position.normalize().multiplyScalar(state.radius);dummy.scale.setScalar(glow*.035);dummy.updateMatrix();impacts.setMatrixAt(i,dummy.matrix);
 });debris.instanceMatrix.needsUpdate=true;impacts.instanceMatrix.needsUpdate=true;}
 renderer.render(scene,camera);
 // Only reduce resolution after a sustained slow interval; never swap materials or worlds.
 qualityElapsed+=dt;qualityFrames++;if(qualityElapsed>3){if(qualityFrames/qualityElapsed<29&&renderer.getPixelRatio()>1)renderer.setPixelRatio(Math.max(1,renderer.getPixelRatio()-.2));qualityElapsed=qualityFrames=0;}
}
requestAnimationFrame(frame);
const params=new URLSearchParams(location.search);generate(Number(params.get('seed')??162711)>>>0);
// Small, deterministic inspection surface for seek checks and reproducing shots.
Object.assign(window,{gaia:{seek:(t:number)=>{timeline.seek(THREE.MathUtils.clamp(t,0,22)).pause();targetX=targetY=userX=userY=drift=0;finishedAt=0;},play,skip,newWorld:generate,get snapshot(){return{seed,signature,ready,building,generation,time:timeline.time(),...Object.fromEntries(Object.entries(state).filter(([,value])=>typeof value==='number')),userX,userY,zoom,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio()}}}});
