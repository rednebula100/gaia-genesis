/** Observatory missions built on GAIA's own science core: the PREM-style layer model, the
 * meridional cutaway geometry (section-geometry) and the conserved-ray-parameter seismic tracer.
 * Everything renders in the game's 3D scene with the trainee planet; each mission resolves to a grade 0..3 (C..S). */
import * as T from 'three';
import gsap from 'gsap';
import {layers,drawnRadius,R} from '../lab/model';
import {trace,type Ray} from '../lab/seismic';
import {sphere,cap} from '../section-geometry';
import type {GameScene} from './scene';
import {icon} from './icons';
import {sfx,chime,arpeggio} from './audio';
import {flash,stamp,shake,wait} from './fx';

const label=['MISS','GOOD','GREAT','PERFECT'];
const W=Math.PI/2;// opened wedge, as in GAIA ANATOMY
type Hud={msg:(t:string)=>void;sub:(t:string)=>void;score:(t:string)=>void;el:HTMLElement};

/** GAIA cutaway: real layer order and colours, schematic radii so thin shells stay readable. */
function cutaway(scene:GameScene,planetId:string){const g=new T.Group();const caps:T.Mesh[]=[];
 layers.forEach((l,i)=>{const r0=drawnRadius(l.a,1),r1=drawnRadius(l.b,1);const col=new T.Color(l.color);
  const shell=new T.Mesh(sphere(r1,W,Math.PI*2-W),new T.MeshStandardMaterial({color:col,roughness:.8,side:T.BackSide}));g.add(shell);
  for(const phi of [W,Math.PI*2]){const c=new T.Mesh(cap(r0,r1,phi),new T.MeshStandardMaterial({color:col.clone().multiplyScalar(1.1),roughness:.65,side:T.DoubleSide,emissive:new T.Color(0,0,0)}));c.userData.layer=i;caps.push(c);g.add(c);}});
 const surf=(scene.actors.get(planetId)?.userData.surface as T.Mesh|undefined)?.material as T.Material|undefined;const crust=new T.Mesh(sphere(1.004,W,Math.PI*2-W),surf??new T.MeshStandardMaterial({color:'#5a8fb8'}));g.add(crust);
 g.rotation.y=-Math.PI*.25;return{g,caps,crust};}
function hudBox(host:HTMLElement,title:string,how:string):Hud{const el=document.createElement('div');el.className='mission3d';el.innerHTML=`<div class="m-head"><small>관측소 미션 · GAIA</small><h2>${title}</h2><p>${how}</p></div><div class="m-center"><b class="m-msg"></b><span class="m-sub"></span></div><div class="m-foot"><span class="m-score"></span></div>`;host.append(el);gsap.from(el.querySelector('.m-head'),{x:-40,opacity:0,duration:.35});
 const q=(s:string)=>el.querySelector<HTMLElement>(s)!;return{el,msg:t=>{q('.m-msg').textContent=t;gsap.fromTo(q('.m-msg'),{scale:1.35},{scale:1,duration:.25});},sub:t=>{q('.m-sub').textContent=t;},score:t=>{q('.m-score').textContent=t;}};}
async function countdown(h:Hud){for(const n of ['3','2','1']){h.msg(n);sfx('beep');await wait(450);}h.msg('시작!');sfx('go');}
function finish(scene:GameScene,g:number){stamp(`${['C','B','A','S'][g]} 판정`,g===3?'rainbow':g===2?'great':g===1?'good':'bad',.6);if(g===3){flash('#fff',.6);arpeggio([0,4,7,12,16,19],.06,.6);scene.kick(.3);}else if(g>=1)arpeggio([0,4,7],.07,.5);else sfx('fail');}
const ray=new T.Raycaster(),ndc=new T.Vector2();
function pick(scene:GameScene,e:PointerEvent,objs:T.Object3D[]){ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,scene.camera);return ray.intersectObjects(objs,false)[0];}

export async function runMission(id:string,host:HTMLElement,scene:GameScene,planetId:string):Promise<number>{
 const prevMode=scene.mode;scene.mode='mission';const root=scene.root3;root.clear();const light=new T.DirectionalLight('#fff4e4',3);light.position.set(-6,4,8);const amb=new T.AmbientLight('#8aa8d0',.5);root.add(light,amb);
 let grade=0;try{grade=await ({core,seismic,swing,impact} as Record<string,(s:GameScene,h:HTMLElement,p:string)=>Promise<number>>)[id](scene,host,planetId);}finally{scene.custom=undefined;root.clear();scene.mode=prevMode;}
 finish(scene,grade);await wait(1300);return grade;}

// 1. ANATOMY: the planet opens like GAIA's cutaway; find the named layer on the section.
async function core(scene:GameScene,host:HTMLElement,pid:string){const h=hudBox(host,'내부 절개 관측','행성이 절개됩니다. 표시된 층을 단면에서 빠르게 클릭하세요. 6라운드.');const {g,caps}=cutaway(scene,pid);g.scale.setScalar(.01);scene.root3.add(g);let t=0;
 scene.custom=(dt,pos,target)=>{t+=dt;pos.set(-4.6+Math.sin(t*.15)*.4,1.8,4.6);target.set(0,0,0);g.rotation.y=-Math.PI*.25+Math.sin(t*.2)*.15;};
 await gsap.to(g.scale,{x:1.6,y:1.6,z:1.6,duration:1.2,ease:'back.out(1.4)'});sfx('whoosh');await countdown(h);let total=0;const order=[...layers.keys()].sort(()=>Math.random()-.5).slice(0,6);
 for(const [k,li] of order.entries()){const L=layers[li];h.msg(`${L.name} 을(를) 찾으세요`);h.sub(`${L.phase} · ${L.composition}`);h.score(`${k+1} / 6`);const t0=performance.now();
  const hit=await new Promise<number>(res=>{const tm=setTimeout(()=>{removeEventListener('pointerdown',on);res(-1);},4000);const on=(e:PointerEvent)=>{const x=pick(scene,e,caps);if(!x)return;clearTimeout(tm);removeEventListener('pointerdown',on);res(x.object.userData.layer);};addEventListener('pointerdown',on);});
  const dt=(performance.now()-t0)/1000;const ok=hit===li;const j=ok?(dt<1.3?3:dt<2.3?2:1):0;total+=j;
  for(const c of caps)if(c.userData.layer===li){const m=c.material as T.MeshStandardMaterial;m.emissive.set(ok?'#ffd23f':'#ff3a3a');gsap.to(m.emissive,{r:0,g:0,b:0,duration:.9});}
  h.msg(ok?label[j]:hit<0?'시간 초과':'다른 층입니다');h.sub(L.note);ok?chime(3+j*3,.6):(sfx('fail',.5),shake(host,8));await wait(1100);}
 h.score(`정확도 ${total}/18`);await gsap.to(g.scale,{x:.01,y:.01,z:.01,duration:.5,ease:'power3.in'});h.el.remove();return total>=16?3:total>=11?2:total>=6?1:0;}

// 2. SEISMIC: real P/S rays (GAIA tracer) run through the section. Catch arrivals; S waves die in the liquid outer core.
async function seismic(scene:GameScene,host:HTMLElement,pid:string){const h=hudBox(host,'지진파 판독','진원(위)에서 파동이 출발합니다. 관측소(노란 표식)에 파면이 닿는 순간 클릭. S파가 외핵에서 사라지면 누르지 마세요.');const {g}=cutaway(scene,pid);g.scale.setScalar(1.6);g.rotation.y=-Math.PI*.25;scene.root3.add(g);
 scene.custom=(_dt,pos,target)=>{pos.set(-3.2,.6,3.4).normalize().multiplyScalar(6.4);target.set(0,0,0);};
 const toXYZ=(rKm:number,a:number)=>{const rho=drawnRadius(rKm,1);return new T.Vector3(-rho*Math.cos(W)*Math.sin(a),rho*Math.cos(a),rho*Math.sin(W)*Math.sin(a)).multiplyScalar(1.004);};
 const epic=new T.Mesh(new T.SphereGeometry(.05,12,8),new T.MeshBasicMaterial({color:new T.Color(3,1.5,.5)}));epic.position.copy(toXYZ(R,0));g.add(epic);
 await countdown(h);let total=0,max=0;
 for(let k=0;k<7;k++){const kind:'P'|'S'=Math.random()<.45?'S':'P';const launch=(18+Math.random()*62)*Math.PI/180;const r:Ray=trace(kind,launch);const pts=r.points.map(p=>toXYZ(p.r,p.angle));
  const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:kind==='P'?'#3fd0ff':'#ff5a6a',transparent:true,opacity:.25}));g.add(line);
  const head=new T.Mesh(new T.SphereGeometry(.045,12,8),new T.MeshBasicMaterial({color:new T.Color(kind==='P'?'#3fd0ff':'#ff5a6a').multiplyScalar(3)}));g.add(head);
  let station:T.Mesh|undefined;if(r.arrival!==null){station=new T.Mesh(new T.ConeGeometry(.06,.16,10),new T.MeshBasicMaterial({color:new T.Color(3,2.4,.4)}));station.position.copy(pts.at(-1)!.clone().multiplyScalar(1.04));station.lookAt(0,0,0);station.rotateX(-Math.PI/2);g.add(station);}
  h.msg(`${kind}파 발생`);h.sub(r.stopped?'':'');h.score(`${k+1} / 7`);sfx('impact',.4);const dur=2.4,t0=performance.now();let pressed=-1;const on=()=>{if(pressed<0)pressed=(performance.now()-t0)/1000;};addEventListener('pointerdown',on);
  while((performance.now()-t0)/1000<dur+.5){const u=Math.min(1,(performance.now()-t0)/1000/dur);const idx=Math.min(pts.length-1,Math.floor(u*(pts.length-1)));head.position.copy(pts[idx]);if(pressed>=0)break;await wait(16);}
  removeEventListener('pointerdown',on);
  if(r.arrival!==null){max+=3;const err=pressed<0?9:Math.abs(pressed-dur);const j=err<.12?3:err<.25?2:err<.45?1:0;total+=j;h.msg(label[j]);j?chime(3+j*3,.6):sfx('back',.5);}
  else{max+=2;if(pressed<0){total+=2;h.msg('정확히 참았습니다');h.sub('S파는 액체 외핵을 통과하지 못합니다.');chime(9,.5);}else{h.msg('S파는 외핵에서 사라집니다');sfx('fail',.5);shake(host,6);}}
  await wait(800);g.remove(line,head);if(station)g.remove(station);}
 h.score(`점수 ${total}/${max}`);h.el.remove();const q=total/max;return q>.85?3:q>.65?2:q>.4?1:0;}

// 3. ORIGINS gravity: aim, charge, release. The trainee planet bends the probe through rings.
async function swing(scene:GameScene,host:HTMLElement,pid:string){const h=hudBox(host,'중력 스윙바이','마우스로 조준, 누르고 있다 놓아 발사. 행성 중력으로 휘어 금색 링을 통과. 3회.');const a=scene.actors.get(pid)!;let t=0;
 scene.custom=(dt,pos,target)=>{t+=dt;a.visible=true;a.position.set(0,0,0);a.scale.setScalar(1.4);a.rotation.y=t*.2;pos.set(0,11,8.5);target.set(0,0,.5);};
 const probe=new T.Mesh(new T.SphereGeometry(.12,12,8),new T.MeshBasicMaterial({color:new T.Color(3,3,3)}));scene.root3.add(probe);const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#3fd0ff'}));scene.root3.add(trail);
 const aim=new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#ffffff',dashSize:.2,gapSize:.15}));scene.root3.add(aim);const plane=new T.Plane(new T.Vector3(0,1,0),0);const mouse=new T.Vector3(5,0,-3);
 const mv=(e:PointerEvent)=>{ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(ndc,scene.camera);ray.ray.intersectPlane(plane,mouse);};addEventListener('pointermove',mv);
 let down=false;const pd=()=>down=true,pu=()=>down=false;addEventListener('pointerdown',pd);addEventListener('pointerup',pu);await countdown(h);let best=0;
 for(let k=0;k<3&&best<3;k++){const gate=new T.Mesh(new T.TorusGeometry(.6,.05,8,48),new T.MeshBasicMaterial({color:new T.Color(3,2.3,.5)}));gate.position.set(4.5+Math.random(),0,-2.5-Math.random()*1.5);gate.rotation.x=Math.PI/2;scene.root3.add(gate);
  const start=new T.Vector3(-6,0,3.4);probe.position.copy(start);let power=0;h.msg(`발사 ${k+1}/3`);
  while(!(power>0&&!down)){if(down)power=Math.min(1,power+.018);const dir=mouse.clone().sub(start).setY(0).normalize();aim.geometry.setFromPoints([start,start.clone().addScaledVector(dir,1.5+power*3)]);aim.computeLineDistances();h.sub(`세기 ${Math.round(power*100)}%`);await wait(16);}
  const v=mouse.clone().sub(start).setY(0).normalize().multiplyScalar(2.2+power*4.2);const p=start.clone();const path:T.Vector3[]=[];let passed=0;sfx('whoosh');
  for(let s=0;s<900;s++){for(let sub=0;sub<3;sub++){const d=p.clone().negate();const r2=d.lengthSq();v.addScaledVector(d.normalize(),18/r2*(1/180));p.addScaledVector(v,1/180);}path.push(p.clone());probe.position.copy(p);trail.geometry.setFromPoints(path);const gd=p.distanceTo(gate.position);if(gd<.6)passed=Math.max(passed,gd<.2?3:gd<.4?2:1);if(p.length()<1.1||p.length()>14)break;if(s%2===0)await wait(16);}
  best=Math.max(best,passed);h.msg(passed?label[passed]:'링 실패');passed?chime(3+passed*3,.6):sfx('fail',.5);if(p.length()<1.1){scene.burst(['#ffd27a','#ffffff'],80,5,new T.Vector3());}await wait(700);scene.root3.remove(gate);}
 removeEventListener('pointermove',mv);removeEventListener('pointerdown',pd);removeEventListener('pointerup',pu);h.score(`최고 ${label[best]}`);h.el.remove();return best;}

// 4. Giant impact (Cosmic Collisions): stop the angle, then the speed; Theia strikes and the debris makes a moon.
async function impact(scene:GameScene,host:HTMLElement,pid:string){const h=hudBox(host,'거대 충돌','각도 → 속도 게이지를 차례로 멈추세요. 45° · 4 km/s 근처면 달이 생깁니다.');const a=scene.actors.get(pid)!,th=scene.actors.get('theia')??scene.actors.get('mars')!;const moonA=scene.actors.get('moon')!;
 let t=0,ang=45,spd=4,phase=0,hitT=-1,ok=0;const thPos=new T.Vector3();
 scene.custom=(dt,pos,target)=>{t+=dt;a.visible=true;a.position.set(.6,0,0);a.scale.setScalar(1.3);a.rotation.y=t*.2;th.visible=hitT<0||t-hitT<.15;th.scale.setScalar(.7);if(phase===0)ang=45+Math.sin(t*2.4)*44;if(phase===1)spd=4+Math.sin(t*3.1)*3.6;
  const rad=ang*Math.PI/180;if(hitT<0){const base=new T.Vector3(.6-Math.cos(rad)*5,Math.sin(rad)*2.5,1);thPos.copy(phase>=2?thPos.lerp(new T.Vector3(.6-Math.cos(rad)*1.6,Math.sin(rad)*.9,.3),Math.min(1,dt*4)):base);}th.position.copy(thPos);
  if(hitT>=0&&ok){const k=Math.min(1,(t-hitT)/1.6);moonA.visible=k>.5;moonA.scale.setScalar(.3*k);const o=t*1.2;moonA.position.set(.6+Math.cos(o)*2.6,Math.sin(o)*.4,Math.sin(o)*2.6);}
  pos.set(0,1.5,8.5);target.set(0,0,0);};
 const gauge=document.createElement('div');gauge.className='m-gauge';gauge.innerHTML='<i class="zone"></i><i class="needle"></i>';h.el.append(gauge);const nd=gauge.querySelector<HTMLElement>('.needle')!,zone=gauge.querySelector<HTMLElement>('.zone')!;
 await countdown(h);const press=()=>new Promise<void>(r=>{const on=()=>{removeEventListener('pointerdown',on);r();};addEventListener('pointerdown',on);});
 zone.style.cssText='left:43.3%;width:13.3%';let live=true;(async()=>{while(live){nd.style.left=`${phase===0?ang/90*100:spd/8*100}%`;h.sub(phase===0?`각도 ${ang.toFixed(0)}°`:`속도 ${spd.toFixed(1)} km/s`);await wait(16);}})();
 h.msg('각도를 멈추세요');await press();phase=1;const ja=Math.abs(ang-45)<3?3:Math.abs(ang-45)<7?2:Math.abs(ang-45)<13?1:0;chime(4+ja*2,.5);zone.style.cssText='left:46.25%;width:7.5%';
 h.msg('속도를 멈추세요');await press();phase=2;live=false;const jv=Math.abs(spd-4)<.3?3:Math.abs(spd-4)<.7?2:Math.abs(spd-4)<1.2?1:0;chime(6+jv*2,.5);gauge.remove();
 h.msg('충돌!');await wait(600);ok=ja+jv>=3?1:0;hitT=t;sfx('impact');flash('#fff',.8);scene.kick(.6);scene.burst(['#ffb03a','#ffffff','#c85a2a'],500,9,new T.Vector3(.6,0,0));await wait(1800);
 const s=ja+jv;h.msg(s>=5?'달이 생겼습니다!':s>=3?'작은 달이 생겼습니다':'파편만 흩어졌습니다');await wait(900);moonA.visible=false;h.el.remove();return s>=6?3:s>=4?2:s>=2?1:0;}
export const missionIcon=(id:string)=>icon(id==='core'?'core':id==='seismic'?'tide':id==='swing'?'orbital':'impact');
