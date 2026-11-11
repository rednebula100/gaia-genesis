// Independently authored GAIA host; communicates with the standalone GPL worker via messages.
import {bodies,type Body,type Uniforms,type AtlasSnapshot} from './protocol';
import './atlas.css';
export class Atlas{
 readonly canvas=document.createElement('canvas');readonly panel=document.createElement('aside');
 active=false;body:Body='earth';snapshot:AtlasSnapshot|null=null;
 private worker?:Worker;private seed=162711;private status:HTMLElement;private controls:HTMLElement;private open=false;private dragging=false;private x=0;private then=0;private radius=2;
 constructor(parent:HTMLElement,ui:HTMLElement){
  this.canvas.className='atlas-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Atlas 행성. 드래그로 회전, 휠로 확대, 화살표 키로 회전');parent.insertBefore(this.canvas,ui);
  this.panel.className='atlas-optics';this.panel.innerHTML='<button class="atlas-optics-toggle" aria-expanded="false">OPTICS / 광학 조절 +</button><div class="atlas-optics-body"></div><p class="atlas-status" role="status"></p>';ui.append(this.panel);this.status=this.panel.querySelector('.atlas-status')!;this.controls=this.panel.querySelector('.atlas-optics-body')!;
  this.panel.querySelector<HTMLButtonElement>('button')!.onclick=()=>{this.open=!this.open;this.panel.classList.toggle('is-open',this.open);this.panel.querySelector('button')!.setAttribute('aria-expanded',String(this.open));};
  this.canvas.onpointerdown=e=>{if(!this.active)return;this.canvas.focus();this.canvas.setPointerCapture(e.pointerId);this.dragging=true;this.x=e.clientX;this.then=e.timeStamp;this.send({type:'drag',delta:0,velocity:0});};
  this.canvas.onpointermove=e=>{if(!this.dragging)return;const dx=e.clientX-this.x,dt=Math.max(8,e.timeStamp-this.then);this.send({type:'drag',delta:dx*.005,velocity:dx*.005/dt*1000});this.x=e.clientX;this.then=e.timeStamp;};
  this.canvas.onpointerup=this.canvas.onpointercancel=()=>{this.dragging=false;};
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.radius=Math.max(.5,Math.min(5,this.radius*Math.exp(-e.deltaY*.00065)));this.uniform({uPlanetRadius:this.radius});},{passive:false});
  this.canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')this.resetView();else if(e.key.startsWith('Arrow'))this.send({type:'drag',delta:e.key==='ArrowLeft'?-.1:.1,velocity:0});else{this.radius=Math.max(.5,Math.min(5,this.radius*(e.key==='+'?1.1:.9)));this.uniform({uPlanetRadius:this.radius});}}};
  window.addEventListener('resize',()=>this.send({type:'resize',width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));
  document.addEventListener('visibilitychange',()=>this.send({type:'active',value:this.active&&!document.hidden}));
  window.addEventListener('pagehide',e=>{if(e.persisted)this.send({type:'active',value:false});else this.dispose();});
  window.addEventListener('pageshow',()=>{if(this.active)this.send({type:'active',value:true});});
 }
 private send(m:object){this.worker?.postMessage(m);}
 private uniform(values:Uniforms){this.send({type:'uniforms',values});}
 setSeed(seed:number){this.seed=seed;this.send({type:'seed',seed});}
 show(body:Body){const changed=this.body!==body;this.body=body;this.active=true;this.canvas.classList.add('is-active');this.panel.classList.add('is-active');this.status.textContent='원본 셰이더 · 지도 준비 중…';if(!this.worker){this.worker=new Worker(new URL('./renderer.worker.ts',import.meta.url),{type:'module',name:'jsulpis-gpl-atlas'});this.worker.onmessage=e=>{const d=e.data;if(d.type==='error'){this.status.textContent=d.error;this.canvas.classList.remove('is-ready');console.error('Atlas:',d.error);return;}this.snapshot=d;this.radius=d.uniforms.uPlanetRadius;this.canvas.classList.toggle('is-ready',d.ready);this.status.textContent=d.ready?'Julien Sulpis · GPL-3.0 / 원본 GLSL':'셰이더 · 지도 준비 중…';if(d.ready)this.renderControls(d.uniforms);};const off=this.canvas.transferControlToOffscreen();this.worker.postMessage({type:'init',canvas:off,base:new URL(`${import.meta.env.BASE_URL}atlas/`,location.origin).href,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,seed:this.seed,body},[off]);}
  else{this.send({type:'active',value:true});if(changed){this.canvas.classList.remove('is-ready');this.send({type:'body',body});}}
 }
 hide(){if(!this.active)return;this.active=false;this.dragging=false;this.canvas.classList.remove('is-active');this.panel.classList.remove('is-active');this.send({type:'active',value:false});}
 resetView(){this.send({type:'resetView'});}
 resetLook(){this.send({type:'resetLook'});}
 seek(time=0){this.send({type:'seek',time});}
 refreshSnapshot(){this.send({type:'snapshot'});}
 dispose(){const worker=this.worker;this.send({type:'dispose'});this.worker=undefined;if(worker)setTimeout(()=>worker.terminate(),1000);}
 private renderControls(u:Uniforms){
  // Do not rebuild a control under the pointer while a range input is being dragged.
  if(this.controls.contains(document.activeElement)&&document.activeElement?.tagName==='INPUT')return;
  const slider=(key:string,label:string,min:number,max:number,step:number,index?:number)=>{const value=index===undefined?u[key]:(u[key] as number[])[index];return `<label><span>${label}<output>${Number(value).toFixed(step<.01?3:2)}</output></span><input aria-label="${label}" data-uniform="${key}" ${index!==undefined?`data-index="${index}"`:''} type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;};
  this.controls.innerHTML=`<div class="atlas-control-actions"><button data-reset="view">시점 초기화 ↺</button><button data-reset="look">광학 초기화 ↺</button></div><h3>LIGHT / 태양</h3>${slider('sunDirectionXY','태양 X',-1,1,.01,0)}${slider('sunDirectionXY','태양 Y',-1,1,.01,1)}${slider('uSunIntensity','태양 강도',0,5,.01)}${slider('uAmbientLight','주변광',0,1,.001)}<h3>ATMOSPHERE / 대기</h3>${slider('uAtmosphereDensity','밀도',0,1,.01)}<label><span>산란 색</span><input type="color" aria-label="대기 색" value="#${(u.uAtmosphereColor as number[]).map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}"></label><h3>MOTION / 운동</h3>${slider('uRotationSpeed','자전 속도',0,5,.01)}<label><span>드래그 감쇠<output>0.94</output></span><input type="range" aria-label="드래그 감쇠" data-damping min=".8" max="1" step=".001" value=".94"></label>${this.body==='earth'||this.body==='procedural'?`<h3>CLOUDS / 구름</h3>${slider('uCloudsDensity','구름 밀도',0,1,.01)}`:''}${this.body==='procedural'?`${slider('uCloudsScale','구름 규모',.3,1.5,.01)}${slider('uCloudsSpeed','구름 속도',0,5,.01)}<h3>TERRAIN / 지형</h3>${slider('uNoiseStrength','지형 높이',0,.4,.001)}${slider('uTerrainScale','지형 규모',.2,1.5,.01)}`:this.body==='earth'?'':`<h3>SURFACE / 표면</h3>${slider('uBumpStrength','범프 강도',0,.04,.001)}`}<h3>FRAMING / 구도</h3>${slider('uPlanetRadius','반지름 / 확대',.5,5,.01)}${slider('uPlanetPosition','위치 X',-2,2,.01,0)}${slider('uPlanetPosition','위치 Y',-2,2,.01,1)}<p>독립 관측 화면입니다.<br>내부·지진파·기원은 GENESIS WORLD로 돌아갑니다.</p><a href="https://github.com/rednebula100/gaia-genesis/blob/main/docs/ATLAS_SOURCE.md" target="_blank" rel="noreferrer">원본 소스 · 자산 · GPL 고지 ↗</a>`;
  this.controls.querySelectorAll<HTMLInputElement>('[data-uniform]').forEach(i=>i.oninput=()=>{const key=i.dataset.uniform!,index=i.dataset.index;let value:number|number[]=+i.value;if(index!==undefined){value=[...u[key] as number[]];value[+index]=+i.value;if(key==='sunDirectionXY'&&Math.hypot(...value as [number,number])<.001)value[0]=.001;}u[key]=value;this.uniform({[key]:value});i.previousElementSibling!.querySelector('output')!.textContent=(+i.value).toFixed(+i.step<.01?3:2);});
  this.controls.querySelector<HTMLInputElement>('[type=color]')!.oninput=e=>{const h=(e.target as HTMLInputElement).value;const value=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);u.uAtmosphereColor=value;this.uniform({uAtmosphereColor:value});};
  this.controls.querySelector<HTMLInputElement>('[data-damping]')!.oninput=e=>{const i=e.target as HTMLInputElement;this.send({type:'damping',value:+i.value});i.previousElementSibling!.querySelector('output')!.textContent=(+i.value).toFixed(3);};
  this.controls.querySelectorAll<HTMLButtonElement>('[data-reset]').forEach(b=>b.onclick=()=>b.dataset.reset==='view'?this.resetView():this.resetLook());
 }
 static list(selected:Body){return `<div class="atlas-body-list" aria-label="천체 선택">${bodies.map((b,i)=>`<button data-body="${b}" class="${selected===b?'active':''}" aria-pressed="${selected===b}"><small>0${i+1}</small>${b.toUpperCase()}</button>`).join('')}</div><p class="atlas-index-note">드래그 · 회전<br>휠 · 확대 / 축소<br>0 · 시점 초기화</p><a class="atlas-source" href="https://github.com/jsulpis/realtime-planet-shader/tree/cfa2776033d31250bb826b677e4539c4cecbd4be" target="_blank" rel="noreferrer">ORIGINAL / JSULPIS ↗</a>`;}
}
