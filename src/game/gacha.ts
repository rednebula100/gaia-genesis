/** Scout choreography. Results are fixed before any of this plays; the show only reveals them. */
import gsap from 'gsap';
import {Flip} from 'gsap/Flip';
import {SplitText} from 'gsap/SplitText';
import {MotionPathPlugin} from 'gsap/MotionPathPlugin';
import type {Pull} from './model';
import type {GameScene} from './scene';
import {planet,statColors} from './data/planets';
import {support} from './data/support';
import {icon} from './icons';
import {sfx,chime,arpeggio,fanfare,music} from './audio';
import {flash,shake,stamp,wait,reduced} from './fx';
gsap.registerPlugin(Flip,SplitText,MotionPathPlugin);

type Ctx={scene:GameScene;overlay:HTMLElement;root:HTMLElement;again:()=>void};
const badge=(g:string)=>`<b class="rarity r-${g}">${g}</b>`;
export function cardHTML(p:Pull,scene:GameScene){const art=p.kind==='planet'?`<img src="${scene.thumbs.get(p.id)??''}" alt="">`:`<span class="sup-art" style="--c:${statColors[support(p.id).stat]}">${icon(support(p.id).icon)}</span>`;const name=p.kind==='planet'?planet(p.id).name:support(p.id).name;return`<div class="gcard g-${p.grade} ${p.kind}"><div class="gc-in">${badge(p.grade)}<div class="gc-art">${art}</div><b>${name}</b>${p.fresh?'<em class="new">NEW</em>':`<small>조각 +${p.shards}</small>`}</div></div>`;}
const clickOr=(el:HTMLElement,skip:()=>boolean,ms=0)=>new Promise<void>(res=>{let t=0;const done=()=>{clearInterval(iv);clearTimeout(t);el.removeEventListener('click',on);res();};const on=(e:Event)=>{if((e.target as HTMLElement).closest('[data-skip]'))return;done();};el.addEventListener('click',on);const iv=setInterval(()=>{if(skip())done();},50);if(ms)t=window.setTimeout(done,ms);});

function frame(ctx:Ctx,pulls:Pull[],kind:'planet'|'support'){ctx.root.classList.add('scouting');ctx.overlay.className=`overlay scouting ${kind}`;ctx.overlay.innerHTML=`<button class="skip" data-skip>SKIP ${icon('ff')}</button><div class="sc-top"><span>${kind==='planet'?'별씨 관측':'전파 수신'}</span><b>0 / ${pulls.length}</b></div><div class="sc-stage"></div><div class="tray">${pulls.map(()=>'<i class="slot"></i>').join('')}</div>`;
 let skipped=false;ctx.overlay.querySelector<HTMLElement>('[data-skip]')!.onclick=e=>{e.stopPropagation();skipped=true;sfx('click');};
 return{stage:ctx.overlay.querySelector<HTMLElement>('.sc-stage')!,tray:ctx.overlay.querySelector<HTMLElement>('.tray')!,count:ctx.overlay.querySelector<HTMLElement>('.sc-top b')!,skip:()=>skipped};}

/** Card flies in from the right, swallows the reveal at centre, then drops into its tray slot. */
async function intoTray(ctx:Ctx,p:Pull,i:number,tray:HTMLElement,stage:HTMLElement,fast:boolean){const card=document.createElement('div');card.innerHTML=cardHTML(p,ctx.scene);const el=card.firstElementChild as HTMLElement;el.classList.add('flying');stage.append(el);
 const slot=tray.children[i] as HTMLElement;if(fast||reduced){slot.append(el);el.classList.remove('flying');return;}
 const cx=innerWidth/2,cy=innerHeight*.46;gsap.set(el,{left:cx,top:cy,xPercent:-50,yPercent:-50,x:innerWidth*.6,y:-80,rotate:24,scale:1.25});const art=el.querySelector<HTMLElement>('.gc-art')!;gsap.set(art,{opacity:0,scale:2.2});
 sfx('whoosh',.7);await gsap.to(el,{duration:.42,ease:'power3.out',motionPath:{path:[{x:innerWidth*.3,y:-140},{x:0,y:0}],curviness:1.4},rotate:-4});
 if(p.kind==='planet')ctx.scene.shrinkHero();sfx('stamp',.7);await gsap.to(art,{opacity:1,scale:1,duration:.32,ease:'back.out(2.6)'});gsap.fromTo(el,{scale:1.38},{scale:1.25,duration:.25});await wait(260);
 const r=slot.getBoundingClientRect();await gsap.to(el,{left:r.left+r.width/2,top:r.top+r.height/2,x:0,y:0,rotate:0,scale:r.width/el.offsetWidth,duration:.45,ease:'power3.inOut'});slot.append(el);el.classList.remove('flying');gsap.set(el,{clearProps:'all'});sfx('click',.6,1.2);}

async function finale(ctx:Ctx,pulls:Pull[],stage:HTMLElement,tray:HTMLElement,kind:string){stage.innerHTML='';const grid=document.createElement('div');grid.className=`final-grid n${pulls.length}`;stage.append(grid);
 const cards=[...tray.querySelectorAll<HTMLElement>('.gcard')];const state=Flip.getState(cards);for(const c of cards)grid.append(c);tray.classList.add('gone');sfx('whoosh');
 await Flip.from(state,{duration:reduced?0:.8,ease:'power3.inOut',stagger:.04,absolute:true}).then();cards.forEach((c,i)=>{if(c.classList.contains('g-SSR'))gsap.fromTo(c,{scale:1.18},{scale:1,duration:.5,delay:i*.03,ease:'back.out(3)'});});
 if(pulls.some(p=>p.grade==='SSR'))arpeggio([0,4,7,12,16],.06,.5);
 const done=document.createElement('div');done.className='sc-done';done.innerHTML=`<span>신규 <b>${pulls.filter(p=>p.fresh).length}</b> · 연구 조각 <b>+${pulls.reduce((a,p)=>a+p.shards,0)}</b></span><button class="ghost" data-again>${kind==='planet'?'한 번 더':'한 번 더'} ${pulls.length}회</button><button class="go" data-ok>확인</button>`;ctx.overlay.append(done);gsap.from(done,{y:30,opacity:0,duration:.3});ctx.overlay.querySelector('[data-skip]')?.remove();
 return new Promise<boolean>(res=>{done.querySelector<HTMLElement>('[data-ok]')!.onclick=()=>{sfx('confirm');res(false);};done.querySelector<HTMLElement>('[data-again]')!.onclick=()=>{sfx('confirm');res(true);};});}

function close(ctx:Ctx){ctx.overlay.className='overlay';ctx.overlay.innerHTML='';ctx.root.classList.remove('scouting');ctx.scene.clearStars();ctx.scene.rays(false);}

// ── Planet scout: 별씨 낙하 ──
export async function planetScout(ctx:Ctx,pulls:Pull[]){const {stage,tray,count,skip}=frame(ctx,pulls,'planet');const sc=ctx.scene;music('tension');sc.mode='scout';sc.hero='__none';
 const hint=document.createElement('div');hint.className='sc-hint';hint.textContent='밤하늘에서 별씨가 빛나기 시작합니다';stage.append(hint);gsap.from(hint,{opacity:0,y:10,duration:.6});
 const delays=sc.gachaStars(pulls.map(p=>p.shown));delays.forEach((d,i)=>setTimeout(()=>{if(!skip())sfx('sparkle',.55,.8+i*.05+(pulls[i].shown==='SSR'?.4:0));},d*1000));
 for(let t=0;t<Math.max(...delays)*1000+700&&!skip();t+=50)await wait(50);
 if(!skip()&&pulls.some(p=>p.shown==='SSR')){hint.innerHTML='<span class="rainbow-txt">무지개 별 관측!</span>';sfx('impact',.6);flash('#ffd0f0',.35);}else hint.textContent=pulls.some(p=>p.shown==='SR')?'금빛 별이 섞여 있습니다':'별씨가 내려옵니다';
 await wait(skip()?0:700);hint.remove();
 for(const [i,p] of pulls.entries()){if(skip())break;count.textContent=`${i+1} / ${pulls.length}`;const pl=planet(p.id);const promote=p.shown!==p.grade;
  sfx('charge',.5,p.shown==='SSR'?1.4:1);const fall=sc.fallStar(i,p.grade);
  if(promote)setTimeout(()=>{if(skip())return;sfx('impact',.7);flash(p.grade==='SSR'?'#ffd0f0':'#fff2b0',.55);stamp('RANK UP!',p.grade==='SSR'?'rainbow':'great',.35);shake(ctx.root,10);},850);
  await fall;if(skip())break;
  sc.impact(p.grade);sfx('impact',p.grade==='R'?.6:1);flash('#ffffff',p.grade==='SSR'?1:p.grade==='SR'?.8:.55,.5);shake(ctx.root,p.grade==='SSR'?20:p.grade==='SR'?12:6);
  if(p.grade==='SSR'){const dark=document.createElement('div');dark.className='blackout';stage.append(dark);await wait(550);sc.rays(true);sfx('charge',.8,2);gsap.to(dark,{opacity:0,duration:.6,onComplete:()=>dark.remove()});}
  sc.reveal(p.id);sfx(p.grade==='R'?'confirm':'level',.7);await wait(p.grade==='SSR'?1100:p.grade==='SR'?750:450);
  if(p.grade==='SSR')fanfare();else if(p.grade==='SR')arpeggio([0,4,7,12],.07,.55);else chime(7,.5);
  const cap=document.createElement('div');cap.className=`feature g-${p.grade}`;cap.innerHTML=`<div class="f-top">${badge(p.grade)}${p.fresh?'<em class="new big">NEW</em>':`<em class="dup">중복 · 조각 +${p.shards}</em>`}</div><h1>${pl.name}</h1><p>${pl.title}</p><small>${icon('lightning')}${pl.skill}</small><span class="tap">클릭해서 카드에 담기</span>`;stage.append(cap);
  if(!reduced){const split=new SplitText(cap.querySelector('h1')!,{type:'chars'});gsap.from(split.chars,{yPercent:120,opacity:0,rotate:12,stagger:.05,duration:p.grade==='SSR'?.5:.35,ease:'back.out(2)'});gsap.from(cap.querySelectorAll('.f-top,p,small'),{x:-30,opacity:0,stagger:.08,delay:.25});}
  await clickOr(ctx.overlay,skip,p.grade==='R'&&!p.fresh?1800:0);cap.remove();sc.rays(false);if(skip())break;
  await intoTray(ctx,p,i,tray,stage,false);}
 for(const [i,p] of pulls.entries())if(!tray.children[i].firstElementChild){const d=document.createElement('div');d.innerHTML=cardHTML(p,sc);tray.children[i].append(d.firstElementChild!);}
 sc.clearStars();sc.hero='__none';const again=await finale(ctx,pulls,stage,tray,'planet');close(ctx);return again;}

// ── Support scout: 전파 수신 ──
export async function supportScout(ctx:Ctx,pulls:Pull[]){const {stage,tray,count,skip}=frame(ctx,pulls,'support');music('tension');ctx.scene.hero='__none';
 stage.innerHTML=`<div class="radar"><canvas width="520" height="520"></canvas><div class="osc"><canvas width="640" height="120"></canvas><span>STANDBY</span></div></div>`;
 const rc=stage.querySelector<HTMLCanvasElement>('.radar>canvas')!,g=rc.getContext('2d')!,oc=stage.querySelector<HTMLCanvasElement>('.osc canvas')!,og=oc.getContext('2d')!,label=stage.querySelector<HTMLElement>('.osc span')!;
 const blips=pulls.map((p,i)=>({a:Math.random()*Math.PI*2,r:60+Math.random()*170,tier:p.shown,born:.3+i*.18,lit:0}));let t0=performance.now(),amp=0,ampTarget=0,waveColor='#5fe39a',running=true;
 const draw=()=>{if(!running)return;requestAnimationFrame(draw);const t=(performance.now()-t0)/1000;g.clearRect(0,0,520,520);g.save();g.translate(260,260);g.strokeStyle='#3fd0ff55';g.lineWidth=2;for(const r of [80,160,240]){g.beginPath();g.arc(0,0,r,0,7);g.stroke();}g.beginPath();g.moveTo(-250,0);g.lineTo(250,0);g.moveTo(0,-250);g.lineTo(0,250);g.stroke();
  const sw=t*2.2;const grd=g.createConicGradient(sw,0,0);grd.addColorStop(0,'#5fe39a88');grd.addColorStop(.12,'#5fe39a00');grd.addColorStop(1,'#5fe39a00');g.fillStyle=grd;g.beginPath();g.arc(0,0,250,0,7);g.fill();
  for(const b of blips){if(t<b.born)continue;const col=b.tier==='SSR'?`hsl(${(t*200)%360},100%,65%)`:b.tier==='SR'?'#ffc93c':'#9fd4ff';const x=Math.cos(b.a)*b.r,y=Math.sin(b.a)*b.r;const pulse=1+.3*Math.sin(t*8+b.a*3);g.fillStyle=col;g.shadowColor=col;g.shadowBlur=20;g.beginPath();g.arc(x,y,(b.tier==='SSR'?9:b.tier==='SR'?7:5)*pulse*(b.lit?.4:1),0,7);g.fill();g.shadowBlur=0;}
  g.restore();amp+=(ampTarget-amp)*.12;og.clearRect(0,0,640,120);og.strokeStyle=waveColor;og.lineWidth=3;og.shadowColor=waveColor;og.shadowBlur=12;og.beginPath();for(let x=0;x<640;x++){const y=60+Math.sin(x*.05+t*14)*amp*Math.sin(x*.012+t*3)+(Math.random()-.5)*amp*.25;x?og.lineTo(x,y):og.moveTo(x,y);}og.stroke();og.shadowBlur=0;};draw();
 for(let t=0;t<(.3+pulls.length*.18+.6)*1000&&!skip();t+=50)await wait(50);
 for(const [i,p] of pulls.entries()){if(skip())break;count.textContent=`${i+1} / ${pulls.length}`;blips[i].lit=1;const s=support(p.id);const shownAmp={R:14,SR:30,SSR:52} as Record<string,number>;
  label.textContent='SIGNAL ACQUIRING…';waveColor=p.shown==='SR'?'#ffc93c':p.shown==='SSR'?'#ff5ec8':'#9fd4ff';ampTarget=shownAmp[p.shown];sfx('charge',.5,1.3);await wait(800);
  if(p.shown!==p.grade){label.textContent='신호 증폭!';waveColor=p.grade==='SSR'?'#ff5ec8':'#ffc93c';ampTarget=shownAmp[p.grade]*1.3;sfx('impact',.7);flash('#fff2b0',.45);stamp('RANK UP!',p.grade==='SSR'?'rainbow':'great',.3);await wait(650);}
  label.textContent='SIGNAL LOCKED';label.classList.add('locked');sfx('beep');await wait(250);label.classList.remove('locked');
  if(p.grade==='SSR'){ctx.overlay.classList.add('glitch');sfx('impact');shake(ctx.root,16);await wait(600);ctx.overlay.classList.remove('glitch');}
  const holo=document.createElement('div');holo.className=`holo g-${p.grade}`;holo.innerHTML=`${cardHTML(p,ctx.scene)}<div class="holo-info"><small>${s.team}</small><h2>${s.name}</h2><p>${s.note}</p></div>${p.grade==='SSR'?'<i class="seal">SSR</i>':''}`;stage.append(holo);
  const card=holo.querySelector<HTMLElement>('.gcard')!;if(!reduced){gsap.fromTo(card,{clipPath:'inset(0 0 100% 0)'},{clipPath:'inset(0 0 0% 0)',duration:p.grade==='R'?.5:.9,ease:'steps(18)'});gsap.from(holo.querySelector('.holo-info'),{x:40,opacity:0,delay:.4});if(p.grade==='SSR')gsap.from(holo.querySelector('.seal'),{scale:4,opacity:0,rotate:-30,delay:.9,duration:.3,ease:'power4.in',onComplete:()=>{sfx('stamp');shake(ctx.root,10);}});}
  if(p.grade==='SSR')fanfare();else if(p.grade==='SR')arpeggio([0,4,7,12],.07,.5);else chime(5,.5);ampTarget=4;
  await clickOr(ctx.overlay,skip,p.grade==='R'&&!p.fresh?1600:0);if(skip()){holo.remove();break;}
  holo.querySelector('.holo-info')?.remove();holo.querySelector('.seal')?.remove();const slot=tray.children[i] as HTMLElement;const r=slot.getBoundingClientRect(),cr=card.getBoundingClientRect();sfx('whoosh',.6);
  if(!reduced)await gsap.to(card,{x:r.left+r.width/2-(cr.left+cr.width/2),y:r.top+r.height/2-(cr.top+cr.height/2),scale:r.width/cr.width,duration:.45,ease:'power3.inOut'});slot.append(card);gsap.set(card,{clearProps:'all'});holo.remove();label.textContent='STANDBY';}
 running=false;for(const [i,p] of pulls.entries())if(!tray.children[i].firstElementChild){const d=document.createElement('div');d.innerHTML=cardHTML(p,ctx.scene);tray.children[i].append(d.firstElementChild!);}
 const again=await finale(ctx,pulls,stage,tray,'support');close(ctx);return again;}
