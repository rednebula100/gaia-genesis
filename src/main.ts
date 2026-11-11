import * as THREE from 'three';
import {createCinematic,DURATION,chapters} from './cinematic';
import {prewarmBirth} from './engines/gpu-cache';
import {BirthObjects} from './engines/birth-objects';
import {sphere,cap,bounds,PI,start,end} from './section-geometry';
import {createPipeline} from './render-pipeline';
import {earthReference} from './earth-reference';
import {WorldLab} from './lab/lab';
import type {Mode} from './lab/state';
const referenceEarth=new URLSearchParams(location.search).get('reference')==='earth';
import './style.css';
import { vertex, surface, interior, clouds } from './shaders';

document.querySelector<HTMLDivElement>('#root')!.innerHTML=`<main class="forge">
<canvas aria-label="A real-time three-dimensional planet. Drag to rotate; scroll to zoom after the cinematic." tabindex="0"></canvas>
<div class="hud"><header class="brand"><svg class="sigil" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M27 10A13 13 0 1 0 26 24L18 18H29A13 13 0 0 0 27 10Z" stroke="currentColor" stroke-width="1.6"/><path d="M16 3v9m0 8v9" stroke="currentColor" stroke-width="1.1"/><path d="m19 16 10-5M19 16l9 6" stroke="#bd8651" stroke-width="1.3"/><circle cx="16" cy="16" r="4" fill="#bd8651"/></svg><div class="brand-name">GAIA<span>//</span>GENESIS</div></header>
<div class="edition"><i class="light"></i> THE WORLD FORGE</div>
<div class="chapter"><div class="eyebrow" id="phase">01 / ACCRETION</div><h1 id="title">From the dark</h1></div>
<div class="stage-note" id="note"></div>
<div class="labels" aria-hidden="true"><svg class="leaders">${Array.from({length:4},()=>'<path/><circle r="1.7"/>').join('')}</svg>${['CRUST','MANTLE','OUTER CORE','INNER CORE'].map(s=>`<span class="label">${s}</span>`).join('')}</div>
<div class="bottom"><span class="world-id" id="seed"></span><span id="clock">00.0 / 32.0</span></div>
<nav class="controls" aria-label="World controls"><button id="skip">SKIP <span>↗</span></button><button id="replay" class="hidden">REPLAY <span>↺</span></button><button id="new" class="hidden">NEW WORLD <span>+</span></button></nav>
<div class="progress"><i></i></div><input class="seek" type="range" min="0" max="32" step=".01" value="0" aria-label="Cinematic timeline">
</div><div class="desktop-note">DESKTOP EXPERIENCE RECOMMENDED</div><div class="loading">FORMING THE SEED<small>GEOMETRY / WEATHER / LIGHT</small></div></main>`;
const el=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=el<HTMLCanvasElement>('canvas');
let renderer:THREE.WebGLRenderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}catch(e){el('.loading').textContent='WebGL2 is required. Open in a desktop browser with graphics acceleration.';throw e;}
renderer.setPixelRatio(devicePixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.info.autoReset=false;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.1,100);
const world=new THREE.Group();scene.add(world);
const sun=new THREE.Vector3(-.72,.48,.64).normalize();
const blank=new THREE.DataTexture(new Uint8Array([128,128,128,255]),1,1);blank.needsUpdate=true;
const uniforms={uBirth:{value:0},uTerrain:{value:blank},uCloud:{value:blank},uBiome:{value:blank},uSeed:{value:0},uReference:{value:referenceEarth?1:0},uLocalSun:{value:sun.clone()},uSun:{value:sun},uTime:{value:0},uHeat:{value:1},uWater:{value:0},uAir:{value:0},uSea:{value:.5},uOpen:{value:0}};
const make=(fragmentShader:string,extra:Record<string,THREE.IUniform>={},transparent=false)=>new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader,uniforms:{...uniforms,...extra},transparent,depthWrite:!transparent,side:THREE.FrontSide});
const surfaceMat=make(surface);
const pipeline=createPipeline(renderer,scene,camera,sun);
const birth=new BirthObjects(scene,world,camera,sun);
let physics={mergers:0,maxHeat:0,frames:0,contact:0,particles:0,stateSignature:''};
const still=new THREE.Group(),sector=new THREE.Group();world.add(still,sector);
for(let l=0;l<4;l++){
 const sideMat=l===3?surfaceMat:make(interior,{uLayer:{value:l},uFace:{value:0}});
 const faceMat=make(interior,{uLayer:{value:l},uFace:{value:1}});faceMat.side=THREE.DoubleSide;
 for(const [group,a,len] of [[still,end,PI*2-(end-start)],[sector,start,end-start]] as const){
  const shell=new THREE.Mesh(sphere(bounds[l+1],a,len),sideMat);shell.renderOrder=3-l;group.add(shell);
  for(const angle of [start,end]){const face=new THREE.Mesh(cap(bounds[l],bounds[l+1],angle),faceMat);face.renderOrder=4;face.userData.cutFace=true;group.add(face);}
 }
}
const cloudMat=make(clouds,{},true);
for(const [group,a,len]of [[still,end,PI*2-(end-start)],[sector,start,end-start]]as const){const skin=new THREE.Mesh(sphere(1.006,a,len),cloudMat);skin.renderOrder=5;skin.userData.cloud=true;group.add(skin);}
let randomState=51;function random(){randomState=(Math.imul(randomState,1664525)+1013904223)|0;return(randomState>>>0)/4294967296;}
const starPositions=new Float32Array(450*3),starColors=new Float32Array(450*3);
for(let i=0;i<450;i++){const z=random()*2-1,a=random()*PI*2,r=22+random()*15;starPositions[i*3]=Math.sqrt(1-z*z)*Math.cos(a)*r;starPositions[i*3+1]=Math.sqrt(1-z*z)*Math.sin(a)*r;starPositions[i*3+2]=z*r;const b=.12+random()*.32;starColors.set([b*.87,b,b*.98],i*3);}
const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(starPositions,3));sg.setAttribute('color',new THREE.BufferAttribute(starColors,3));
scene.add(new THREE.Points(sg,new THREE.PointsMaterial({size:.014,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.62})));
const {state,initial,timeline}=createCinematic();
const range=el<HTMLInputElement>('.seek');let lastChapter=-1,seed=0,ready=false,building=false,generation=0,signature='';
let inspection=false;
let userX=0,userY=0,targetX=0,targetY=0,zoom=0,targetZoom=0,drift=0,finishedAt=0;
const loading=el('.loading');
function play(){if(lab.active){lab.leave();const p=new URLSearchParams(location.search);p.delete('lab');p.delete('tour');p.delete('inspect');history.replaceState(null,'',`${location.pathname}?${p}`);}inspection=false;userX=userY=targetX=targetY=zoom=targetZoom=drift=0;finishedAt=0;Object.assign(state,initial);timeline.invalidate().restart();}
function skip(){inspection=false;timeline.seek(DURATION).pause();finishedAt=performance.now();}
const lab=new WorldLab({renderer,scene,world,still,sector,camera,sun,uniforms,pipeline,birth,canvas,replay:play,newWorld:()=>generate(crypto.getRandomValues(new Uint32Array(1))[0]),resetOrbit:()=>{targetX=targetY=userX=userY=zoom=targetZoom=0;}});
const worker=new Worker(new URL('./maps.worker.ts',import.meta.url),{type:'module'});
const texture=(data:Uint8Array,w:number,h:number)=>{const t=new THREE.DataTexture(data,w,h);t.wrapS=THREE.RepeatWrapping;t.wrapT=THREE.ClampToEdgeWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());t.needsUpdate=true;return t;};
function generate(next:number){if(building)return;if(lab.active){lab.leave();const p=new URLSearchParams(location.search);p.delete('lab');p.delete('tour');p.delete('inspect');history.replaceState(null,'',`${location.pathname}?${p}`);}building=true;ready=false;generation++;seed=next>>>0;loading.classList.remove('hidden');loading.style.opacity='1';worker.postMessage({seed,job:generation});
 uniforms.uSeed.value=(seed%10000)/100.;}
worker.onmessage=async(ev)=>{try{
 const d=ev.data;if(d.job!==generation)return;
 const cache=await prewarmBirth(seed,s=>{loading.querySelector('small')!.textContent=s;});if(d.job!==generation)return;
 let hash=2166136261;for(const frame of [cache.disk.at(-1)!,cache.impact.at(-1)!])for(const field of [frame.pos,frame.vel,frame.aux])for(const byte of new Uint8Array(field.buffer))hash=Math.imul(hash^byte,16777619);
 physics={mergers:cache.mergers,maxHeat:cache.maxHeat,frames:cache.impact.length,contact:cache.contact,particles:cache.width*cache.height,stateSignature:(hash>>>0).toString(16)};
 pipeline.collision.setCache(cache);birth.setSeed(cache,seed,d.terrain,d.biome,d.width,d.height,d.sea);
 lab.setSeed(seed,cache);
 await pipeline.ready;if(referenceEarth)Object.assign(d,await earthReference());if(d.job!==generation)return;for(const key of ['uTerrain','uCloud','uBiome'] as const){if(uniforms[key].value!==blank)uniforms[key].value.dispose();}
 uniforms.uTerrain.value=texture(d.terrain,d.width,d.height);uniforms.uBiome.value=texture(d.biome,d.width,d.height);uniforms.uCloud.value=texture(d.cloud,d.width,d.height);uniforms.uSea.value=d.sea;signature=d.signature;
 const volume=new THREE.Data3DTexture(d.volume,d.size,d.size,d.size);volume.format=THREE.RGBAFormat;volume.wrapS=volume.wrapT=volume.wrapR=THREE.RepeatWrapping;volume.minFilter=volume.magFilter=THREE.LinearFilter;volume.needsUpdate=true;
 const oldVolume=pipeline.clouds.volume.uniforms.uNoise.value as THREE.Data3DTexture|null;oldVolume?.dispose();
 pipeline.clouds.volume.uniforms.uNoise.value=volume;pipeline.clouds.volume.uniforms.uWeather.value=uniforms.uCloud.value;
 el('#seed').textContent=`SEED / ${seed.toString(16).toUpperCase().padStart(8,'0')}`;
 if(generation===1){
  // Warm every material and the volumetric/LUT passes under the loading veil.
  // Shader compilation must not consume a scene of the film.
  camera.position.set(0,.18,4.8);camera.lookAt(0,0,0);camera.updateMatrixWorld();world.updateMatrixWorld(true);
  const cu=pipeline.clouds.volume.uniforms;cu.uAir.value=1;cu.uStill.value.copy(still.matrixWorld).invert();cu.uSector.value.copy(sector.matrixWorld).invert();
  await renderer.compileAsync(scene,camera);await lab.prewarm();await pipeline.collision.prewarm(renderer);
  pipeline.collision.seek(7);pipeline.composer.render(0);renderer.getContext().finish();pipeline.collision.seek(0);
 }
 const inspect=new URLSearchParams(location.search).get('inspect');
 building=false;ready=true;prev=performance.now();qualityElapsed=qualityFrames=0;lastChapter=-1;const query=new URLSearchParams(location.search);query.set('seed',String(seed));history.replaceState(null,'',`${location.pathname}?${query}`);play();
 if(inspect!==null||referenceEarth){inspection=true;timeline.seek(inspect!==null?Number(inspect):DURATION).pause();}
 const direct=new URLSearchParams(location.search);if(inspect===null&&(direct.has('lab')||direct.has('tour'))){timeline.seek(DURATION).pause();uniforms.uTime.value=DURATION;world.scale.setScalar(1);world.rotation.set(0,state.rotation,.14);camera.position.set(0,.18,4.8);camera.lookAt(0,0,0);const m=direct.get('lab');lab.enter((['world','anatomy','seismic','origins'].includes(m??'')?m:'world') as Mode,direct.get('tour')==='1');}
 loading.style.opacity='0';window.setTimeout(()=>{if(!building)loading.classList.add('hidden')},650);
}catch(e){console.error(e);building=false;loading.textContent='Physics initialization failed. Reload to retry this seed.';}
};
worker.onerror=()=>{building=false;loading.textContent='World generation failed. Reload to try again.';};
el('#skip').onclick=skip;el('#replay').onclick=play;
el('#new').onclick=()=>generate(crypto.getRandomValues(new Uint32Array(1))[0]);
range.oninput=()=>{inspection=true;timeline.seek(+range.value).pause();finishedAt=0;targetX=targetY=userX=userY=zoom=targetZoom=drift=0;};
let dragging=false,px=0,py=0;
canvas.addEventListener('pointerdown',e=>{if(!ready||timeline.time()<DURATION)return;dragging=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;targetY+=(e.clientX-px)*.005;targetX=THREE.MathUtils.clamp(targetX+(e.clientY-py)*.004,-1.15,1.15);px=e.clientX;py=e.clientY});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();if(timeline.time()>=DURATION)targetZoom=THREE.MathUtils.clamp(targetZoom+e.deltaY*.0017,-1.3,1.8)},{passive:false});
canvas.addEventListener('keydown',e=>{if(timeline.time()<DURATION)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))e.preventDefault();if(e.key==='ArrowLeft')targetY-=.15;if(e.key==='ArrowRight')targetY+=.15;if(e.key==='ArrowUp')targetX-=.12;if(e.key==='ArrowDown')targetX+=.12;if(e.key==='+')targetZoom=Math.max(-1.3,targetZoom-.2);if(e.key==='-')targetZoom=Math.min(1.8,targetZoom+.2)});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();pipeline.composer.setSize(innerWidth,innerHeight);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(timeline.isActive())timeline.pause().data='resume';}else if(timeline.data==='resume'){timeline.data=null;timeline.play();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();timeline.pause();ready=false;loading.classList.remove('hidden');loading.style.opacity='1';loading.textContent='Graphics connection lost. Reload to restore this seed.';});
// Anchors lie on the moving sector's actual phi=PI/2 cap, inside their material boundaries.
const labelPoints=[new THREE.Vector3(0,.9,.4),new THREE.Vector3(0,.44,.5),new THREE.Vector3(0,-.15,.35),new THREE.Vector3(0,-.08,.08)];
const labels=Array.from(document.querySelectorAll<HTMLElement>('.label'));
const leaderPaths=Array.from(document.querySelectorAll<SVGPathElement>('.leaders path')),leaderDots=Array.from(document.querySelectorAll<SVGCircleElement>('.leaders circle'));
const project=new THREE.Vector3();let prev=performance.now();let qualityFrames=0,qualityElapsed=0,renderedTime=-1,renderVersion=0,fps=60;
function frame(now:number){
 requestAnimationFrame(frame);const elapsed=(now-prev)/1000,dt=Math.min(elapsed,.05);prev=now;if(!ready)return;
 const t=timeline.time(),final=t>=DURATION-.001;
 if(final&&!inspection){if(!finishedAt)finishedAt=now;drift+=dt*.011;}
 const k=1-Math.exp(-dt*10);userX+=(targetX-userX)*k;userY+=(targetY-userY)*k;zoom+=(targetZoom-zoom)*k;
 if(final&&!inspection&&!lab.active&&finishedAt&&now-finishedAt>1000){timeline.pause();lab.enter();}
 if(lab.active){lab.update(dt,{x:userX,y:userY,zoom},now);renderer.info.reset();pipeline.composer.render(dt);renderedTime=DURATION;renderVersion++;qualityElapsed+=elapsed;qualityFrames++;if(qualityElapsed>3){fps=qualityFrames/qualityElapsed;qualityElapsed=qualityFrames=0;}return;}
 uniforms.uBirth.value=state.birth;uniforms.uTime.value=t+(final&&!inspection?(now-finishedAt)*.001:0);uniforms.uHeat.value=state.heat;uniforms.uWater.value=state.water;uniforms.uAir.value=state.air;uniforms.uOpen.value=state.open;
 world.scale.setScalar(state.radius);world.rotation.set(userX,.0+state.rotation+userY+drift,.14);
 still.visible=sector.visible=t>=11.9;
 sector.position.set(state.open*.88,state.open*.15,state.open*.36);sector.rotation.y=state.open*.14;
 // Closed caps and buried shells have no visible fragments. Front-to-back shell
 // ordering also lets the depth buffer reject covered interior material work.
 for(const group of [still,sector])for(const mesh of group.children)mesh.visible=mesh.userData.cloud?state.air>.002:mesh.userData.cutFace?state.open>.0001:(mesh.renderOrder===0||state.open>.0001||(t>=11.9&&t<12.5));

 camera.position.set(state.camX,state.camY,state.distance+zoom);camera.lookAt(state.lookX,state.lookY,0);
 let chapter=0;for(let i=0;i<chapters.length;i++)if(t>=chapters[i].t)chapter=i;
 if(chapter!==lastChapter){lastChapter=chapter;el('#phase').textContent=chapters[chapter].id;el('#title').textContent=chapters[chapter].title;}
 el('#skip').classList.toggle('hidden',final);el('#replay').classList.toggle('hidden',!final);el('#new').classList.toggle('hidden',!final);
 el('#note').textContent=referenceEarth?'NASA BLUE MARBLE / REFERENCE':final?'DRAG TO ROTATE  ·  SCROLL TO APPROACH':(t>=22.5&&t<29.3?'MATURE INTERIOR / TIME PROJECTION':'');
 el('#clock').textContent=final?'FORMATION / COMPLETE':`${t.toFixed(1).padStart(4,'0')} / ${DURATION.toFixed(1)}`;
 el<HTMLElement>('.progress i').style.width=`${t/DURATION*100}%`;range.value=String(t);
 const showLabels=t>=22.5?Math.min(1,Math.max(0,(state.open-.5)*2)):0;el('.labels').style.opacity=String(showLabels);
 world.updateMatrixWorld();labelPoints.forEach((p,i)=>{project.copy(p).applyMatrix4(sector.matrixWorld).project(camera);const x=(project.x*.5+.5)*innerWidth,y=(-project.y*.5+.5)*innerHeight,lx=innerWidth*.881,ly=innerHeight*(.29+i*.105);labels[i].style.left=`${lx}px`;labels[i].style.top=`${ly-5}px`;leaderPaths[i].setAttribute('d',`M${x},${y} L${lx-28},${ly} H${lx-10}`);leaderDots[i].setAttribute('cx',String(x));leaderDots[i].setAttribute('cy',String(y));});
 camera.updateMatrixWorld();
 birth.update(t,canvas.width,canvas.height);pipeline.collision.seek(t);

 uniforms.uLocalSun.value.copy(sun).transformDirection(new THREE.Matrix4().copy(world.matrixWorld).invert());
 const cu=pipeline.clouds.volume.uniforms;cu.uStill.value.copy(still.matrixWorld).invert();cu.uSector.value.copy(sector.matrixWorld).invert();cu.uRadius.value=state.radius;cu.uTime.value=uniforms.uTime.value;cu.uAir.value=state.air;cu.uOpen.value=state.open;
 pipeline.clouds.enabled=state.air>.002;
 pipeline.atmosphere.worldToECEFMatrix.makeScale(6360000/state.radius,6360000/state.radius,6360000/state.radius);
 pipeline.atmosphere.blendMode.opacity.value=state.air*.65*(1-THREE.MathUtils.smoothstep(state.open,0,.18));
  // A zero-opacity atmosphere has no contribution. Skip its expensive LUT
  // integration during airless/fully detached shots without lowering fidelity.
  pipeline.atmospherePass.enabled=pipeline.atmosphere.blendMode.opacity.value>0;
 renderer.info.reset();pipeline.composer.render(dt);renderedTime=t;renderVersion++;
 // FPS measurement never changes rendering quality.
 qualityElapsed+=elapsed;qualityFrames++;if(qualityElapsed>3){fps=qualityFrames/qualityElapsed;qualityElapsed=qualityFrames=0;}
}
requestAnimationFrame(frame);
const params=new URLSearchParams(location.search);generate(Number(params.get('seed')??162711)>>>0);
// Small, deterministic inspection surface for seek checks and reproducing shots.
Object.assign(window,{gaia:{seek:(t:number)=>{lab.leave();inspection=true;timeline.seek(THREE.MathUtils.clamp(t,0,DURATION)).pause();targetX=targetY=userX=userY=zoom=targetZoom=drift=0;finishedAt=0;},play,skip,newWorld:generate,openLab:(mode:Mode='world')=>{timeline.seek(DURATION).pause();uniforms.uTime.value=DURATION;lab.enter(mode);},lab:lab.controller,get labSnapshot(){return lab.snapshot;},get snapshot(){return{seed,signature,ready,building,generation,duration:DURATION,physics,time:timeline.time(),renderedTime,renderVersion,fps,cloudScale:pipeline.clouds.scale,...Object.fromEntries(Object.entries(state).filter(([,value])=>typeof value==='number')),userX,userY,zoom,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio()}}}});

if(import.meta.env.DEV)Object.assign(window,{gaiaRender:{renderer,pipeline,world,still,sector,camera,uniforms}});
