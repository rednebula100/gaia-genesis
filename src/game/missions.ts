/** Observatory missions: GAIA lab ideas rebuilt as quick skill games inside the game UI. Each resolves to a grade 0..3 (C..S). */
import gsap from 'gsap';
import {icon} from './icons';
import {sfx,chime,arpeggio} from './audio';
import {flash,stamp,wait} from './fx';

type Run=(c:HTMLCanvasElement,ui:{msg:(t:string)=>void;score:(t:string)=>void},press:()=>Promise<void>,hold:{down:boolean})=>Promise<number>;
const W=720,H=440;
const judge=(err:number,tight:number)=>err<tight?3:err<tight*2.2?2:err<tight*4?1:0;
const label=['MISS','GOOD','GREAT','PERFECT'];

export async function runMission(id:string,host:HTMLElement):Promise<number>{const titles:Record<string,[string,string]>={core:['코어 드릴','드릴이 층 경계에 닿는 순간 SPACE / 클릭. 4번.'],seismic:['지진파 판독','P파(원)는 판정선에서 치고, S파(삼각형)는 액체 외핵을 못 지나니 참으세요.'],swing:['스윙바이','마우스로 조준, 누르고 있다 놓아 발사. 행성 중력으로 휘어 금색 게이트를 통과. 3번 기회.'],impact:['거대 충돌','각도 게이지 → 속도 게이지 순서로 멈추세요. 45° · 시속 4km/s가 정답.']};
 const box=document.createElement('div');box.className='mission';box.innerHTML=`<div class="m-head"><small>관측소 미션</small><h2>${titles[id][0]}</h2><p>${titles[id][1]}</p></div><canvas width="${W}" height="${H}"></canvas><div class="m-foot"><b class="m-msg">준비</b><span class="m-score"></span></div>`;host.append(box);gsap.from(box,{scale:.9,opacity:0,duration:.3,ease:'back.out(2)'});
 const c=box.querySelector('canvas')!;const msg=(t:string)=>{const m=box.querySelector<HTMLElement>('.m-msg')!;m.textContent=t;gsap.fromTo(m,{scale:1.3},{scale:1,duration:.25});};const score=(t:string)=>{box.querySelector<HTMLElement>('.m-score')!.textContent=t;};
 const hold={down:false};let waiter:(()=>void)|null=null;const press=()=>new Promise<void>(r=>waiter=r);
 const kd=(e:KeyboardEvent)=>{if(e.code==='Space'){e.preventDefault();if(!hold.down){hold.down=true;waiter?.();waiter=null;}}};const ku=(e:KeyboardEvent)=>{if(e.code==='Space')hold.down=false;};const pd=()=>{hold.down=true;waiter?.();waiter=null;};const pu=()=>hold.down=false;
 addEventListener('keydown',kd,true);addEventListener('keyup',ku);c.addEventListener('pointerdown',pd);addEventListener('pointerup',pu);
 msg('3');sfx('beep');await wait(500);msg('2');sfx('beep');await wait(500);msg('1');sfx('beep');await wait(500);msg('시작!');sfx('go');
 const g=await ({core,seismic,swing,impact} as Record<string,Run>)[id](c,{msg,score},press,hold);
 removeEventListener('keydown',kd,true);removeEventListener('keyup',ku);removeEventListener('pointerup',pu);
 const grade=['C','B','A','S'][g];stamp(`${grade} 판정`,g===3?'rainbow':g===2?'great':g===1?'good':'bad',.6);if(g===3){flash('#fff',.6);arpeggio([0,4,7,12,16,19],.06,.6);}else if(g>=1)arpeggio([0,4,7],.07,.5);else sfx('fail');
 await wait(1300);box.remove();return g;}

// 1. Core drill: stop the drill on each layer boundary. Speed rises each layer.
const core:Run=async(c,ui,press)=>{const g=c.getContext('2d')!;const R=200,cx=W/2,cy=H/2+10;const layers=[[1,'#7a5a3a','지각'],[.86,'#c8643a','맨틀'],[.55,'#ffb03a','외핵 (액체)'],[.32,'#ffe9a0','내핵 (고체)']] as const;const bounds=[.86,.55,.32,.08];
 let depth=0,speed=.16,running=true,idx=0;const marks:number[]=[];let total=0;const t0=performance.now();let last=t0;
 const draw=()=>{if(!running)return;requestAnimationFrame(draw);const now=performance.now(),dt=(now-last)/1000;last=now;depth=Math.min(1,depth+speed*dt);g.clearRect(0,0,W,H);
  for(const [r,col] of layers){g.fillStyle=col;g.beginPath();g.arc(cx,cy,R*r,Math.PI,0);g.fill();}g.fillStyle='#0b1226';g.fillRect(0,cy,W,H-cy);
  g.strokeStyle='#ffffff40';g.setLineDash([6,6]);for(const b of bounds.slice(idx,idx+1)){g.beginPath();g.arc(cx,cy,R*b,Math.PI,0);g.stroke();}g.setLineDash([]);
  const y=cy-R*(1-depth)-0;const tip=cy-R+R*depth;g.strokeStyle='#e8f4ff';g.lineWidth=8;g.beginPath();g.moveTo(cx,cy-R-40);g.lineTo(cx,tip);g.stroke();g.fillStyle='#3fd0ff';g.beginPath();g.moveTo(cx-12,tip-6);g.lineTo(cx+12,tip-6);g.lineTo(cx,tip+14);g.fill();void y;
  for(const m of marks){g.fillStyle='#ffd23f';g.fillRect(cx+18,cy-R+R*m-2,40,4);}
  g.font='700 16px Pretendard Variable, sans-serif';g.fillStyle='#fff';for(const [r,,n] of layers)g.fillText(n,cx+R*r*.72,cy-R*r*.4);};draw();
 for(let k=0;k<4;k++){const target=1-bounds[k];await Promise.race([press(),new Promise<void>(r=>{const iv=setInterval(()=>{if(depth>=Math.min(1,target+.12)){clearInterval(iv);r();}},16);})]);const err=Math.abs(depth-target)*R;const j=judge(err,5);total+=j;marks.push(depth);ui.msg(label[j]);j?chime(4+j*3,.6):sfx('fail',.5);idx++;speed*=1.35;}
 running=false;ui.score(`정확도 ${total}/12`);return total>=11?3:total>=8?2:total>=5?1:0;};

// 2. Seismic rhythm: hit P waves, let S waves pass (they cannot cross the liquid outer core).
const seismic:Run=async(c,ui,press)=>{const g=c.getContext('2d')!;const hitX=140;const notes=Array.from({length:14},(_,i)=>({t:1.2+i*.62+(i%3===2?.18:0),s:i%4===3||i===9,hit:false,judged:false}));const speed=320;let score=0,max=0,running=true;const t0=performance.now();
 const draw=()=>{if(!running)return;requestAnimationFrame(draw);const t=(performance.now()-t0)/1000;g.clearRect(0,0,W,H);g.fillStyle='#0b1226';g.fillRect(0,H/2-50,W,100);g.fillStyle='#ffb03a22';g.fillRect(W*.55,H/2-50,90,100);g.fillStyle='#ffb03a';g.font='700 14px Pretendard Variable, sans-serif';g.fillText('액체 외핵',W*.55+8,H/2-60);
  g.strokeStyle='#ffd23f';g.lineWidth=4;g.beginPath();g.moveTo(hitX,H/2-60);g.lineTo(hitX,H/2+60);g.stroke();
  for(const n of notes){if(n.judged&&!n.s)continue;const x=hitX+(n.t-t)*speed;if(x<-30||x>W+30)continue;g.fillStyle=n.s?'#ff5a6a':'#3fd0ff';g.beginPath();if(n.s){g.moveTo(x,H/2-22);g.lineTo(x+22,H/2+18);g.lineTo(x-22,H/2+18);}else g.arc(x,H/2,20,0,7);g.fill();if(n.s&&x>W*.55&&x<W*.55+90){g.fillStyle='#ffffff';g.fillText('×',x-5,H/2-30);}}};draw();
 let done=false;(async()=>{while(!done){await press();if(done)break;const t=(performance.now()-t0)/1000;const n=notes.filter(n=>!n.judged).sort((a,b)=>Math.abs(a.t-t)-Math.abs(b.t-t))[0];if(!n||Math.abs(n.t-t)>.25){ui.msg('헛스윙');continue;}n.judged=true;if(n.s){score-=2;ui.msg('S파는 참아야 합니다!');sfx('fail',.5);}else{const j=judge(Math.abs(n.t-t)*1000,45);score+=j;ui.msg(label[j]);j?chime(3+j*3,.5):sfx('back',.5);}}})();
 const end=notes.at(-1)!.t+1;while((performance.now()-t0)/1000<end){const t=(performance.now()-t0)/1000;for(const n of notes)if(!n.judged&&t-n.t>.25){n.judged=true;if(n.s){score+=2;}else ui.msg('MISS');}await wait(30);}
 done=true;running=false;max=notes.filter(n=>!n.s).length*3+notes.filter(n=>n.s).length*2;ui.score(`점수 ${Math.max(0,score)}/${max}`);const r=score/max;return r>.85?3:r>.65?2:r>.4?1:0;};

// 3. Swing-by: aim, charge, release. Gravity bends the probe through a gate.
const swing:Run=async(c,ui,_press,hold)=>{const g=c.getContext('2d')!;const P={x:W*.5,y:H*.55,m:9000,r:42};let best=0;let aim=-.4,mouse={x:W*.7,y:H*.2};c.onpointermove=e=>{const b=c.getBoundingClientRect();mouse={x:(e.clientX-b.left)*W/b.width,y:(e.clientY-b.top)*H/b.height};};
 for(let tries=0;tries<3;tries++){ui.msg(`발사 ${tries+1}/3`);const gate={x:W*.82,y:H*(.18+Math.random()*.2),r:28};let power=0,state:'aim'|'fly'|'end'='aim';const pr={x:70,y:H*.82,vx:0,vy:0};const path:{x:number,y:number}[]=[];let passed=0;
  await new Promise<void>(resolve=>{const loop=()=>{aim=Math.atan2(mouse.y-pr.y,mouse.x-pr.x);if(state==='aim'){if(hold.down)power=Math.min(1,power+.012);else if(power>0){state='fly';const v=180+power*260;pr.vx=Math.cos(aim)*v;pr.vy=Math.sin(aim)*v;sfx('whoosh');}}
    else if(state==='fly'){for(let s=0;s<4;s++){const dx=P.x-pr.x,dy=P.y-pr.y,d2=dx*dx+dy*dy,d=Math.sqrt(d2);const a=P.m*60/d2;pr.vx+=dx/d*a/240;pr.vy+=dy/d*a/240;pr.x+=pr.vx/240;pr.y+=pr.vy/240;path.push({x:pr.x,y:pr.y});const gd=Math.hypot(pr.x-gate.x,pr.y-gate.y);if(gd<gate.r)passed=Math.max(passed,gd<9?3:gd<18?2:1);if(d<P.r||pr.x<-50||pr.x>W+50||pr.y<-50||pr.y>H+50||path.length>2400){state='end';}}}
    g.clearRect(0,0,W,H);const grd=g.createRadialGradient(P.x,P.y,0,P.x,P.y,P.r*3);grd.addColorStop(0,'#58c4ff55');grd.addColorStop(1,'#58c4ff00');g.fillStyle=grd;g.fillRect(0,0,W,H);g.fillStyle='#2a6fb0';g.beginPath();g.arc(P.x,P.y,P.r,0,7);g.fill();
    g.strokeStyle='#ffd23f';g.lineWidth=5;g.beginPath();g.arc(gate.x,gate.y,gate.r,0,7);g.stroke();g.fillStyle='#ffd23f55';g.beginPath();g.arc(gate.x,gate.y,9,0,7);g.fill();
    g.strokeStyle='#3fd0ff';g.lineWidth=2;g.beginPath();path.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(pr.x,pr.y,6,0,7);g.fill();
    if(state==='aim'){g.strokeStyle='#ffffff88';g.setLineDash([5,7]);g.beginPath();g.moveTo(pr.x,pr.y);g.lineTo(pr.x+Math.cos(aim)*90,pr.y+Math.sin(aim)*90);g.stroke();g.setLineDash([]);g.fillStyle='#ff5a6a';g.fillRect(20,H-30,200*power,12);g.strokeStyle='#fff';g.strokeRect(20,H-30,200,12);}
    if(state==='end'){resolve();return;}requestAnimationFrame(loop);};loop();});
  best=Math.max(best,passed);ui.msg(passed?label[passed]:'게이트 실패');passed?chime(3+passed*3,.6):sfx('fail',.5);await wait(700);if(best===3)break;}
 c.onpointermove=null;ui.score(`최고 ${label[best]}`);return best;};

// 4. Giant impact: stop the angle needle, then the speed needle.
const impact:Run=async(c,ui,press)=>{const g=c.getContext('2d')!;let a=0,v=0,phase=0,running=true;const t0=performance.now();let lockA=-1,lockV=-1;
 const draw=()=>{if(!running)return;requestAnimationFrame(draw);const t=(performance.now()-t0)/1000;if(phase===0)a=45+Math.sin(t*2.6)*44;if(phase===1)v=4+Math.sin(t*3.4)*3.6;g.clearRect(0,0,W,H);
  g.fillStyle='#3a6ea8';g.beginPath();g.arc(W*.62,H*.55,90,0,7);g.fill();const ang=(phase>0?lockA:a)*Math.PI/180;const ix=W*.62-Math.cos(ang)*230,iy=H*.55-Math.sin(ang)*230;g.fillStyle='#c88a6a';g.beginPath();g.arc(ix,iy,40,0,7);g.fill();g.strokeStyle='#ffffff66';g.setLineDash([6,6]);g.beginPath();g.moveTo(ix,iy);g.lineTo(W*.62,H*.55);g.stroke();g.setLineDash([]);
  g.fillStyle='#fff';g.font='800 22px Barlow Condensed, sans-serif';g.fillText(`각도 ${(phase>0?lockA:a).toFixed(0)}°`,30,40);g.fillText(`속도 ${(phase>1?lockV:v).toFixed(1)} km/s`,30,72);
  g.fillStyle='#0b1226';g.fillRect(30,H-60,300,18);g.fillStyle='#5fe39a';g.fillRect(30+300*(phase===0?(45-6)/90:(4-.6)/8),H-60,300*(phase===0?12/90:1.2/8),18);g.fillStyle='#ffd23f';g.fillRect(30+300*(phase===0?a/90:v/8)-2,H-66,4,30);};draw();
 await press();lockA=a;phase=1;const ja=judge(Math.abs(a-45),3);ui.msg(`각도 ${label[ja]}`);ja?chime(4+ja*2,.5):sfx('back',.5);await wait(200);
 await press();lockV=v;phase=2;const jv=judge(Math.abs(v-4),.3);ui.msg(`속도 ${label[jv]}`);jv?chime(6+jv*2,.5):sfx('back',.5);sfx('impact');await wait(900);running=false;
 const s=ja+jv;ui.score(s>=5?'달이 생겼습니다':s>=3?'작은 달이 생겼습니다':'파편만 남았습니다');return s>=6?3:s>=4?2:s>=2?1:0;};
export const missionIcon=(id:string)=>icon(id==='core'?'core':id==='seismic'?'tide':id==='swing'?'orbital':'impact');
