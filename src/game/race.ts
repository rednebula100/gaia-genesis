import {courses,strategies} from './data/races';
import {planet} from './data/planets';
import {skill} from './data/skills';
import {rng,type RaceConfig,type RaceEntry} from './model';

export type EventType='start'|'skill'|'unique'|'pass'|'finish'|'segment'|'collide'|'capture'|'tidal'|'dust'|'exhaust'|'spurt'|'lastspurt';
export type Telemetry={time:number;tick:number;type:EventType;id:string;text:string;others?:string[];label?:string};
type Effect={until:number;mul:number;tag:string};
export type Racer=RaceEntry&{distance:number;velocity:number;hp:number;maxHp:number;lane:number;targetLane:number;finish:number;reaction:number;blocked:number;maxVelocity:number;effects:Effect[];used:string[];spin:number;captureBy:string;captureUntil:number;tidalUntil:number;spurtMul:number;spurtDone:boolean;exhausted:boolean;phase:number;rankAtCheck:number;slingUntil:number;heat:number;form:number};
export const DT=1/60;
export const LANES=8;
const pick=<T,>(r:()=>number,a:T[])=>a[Math.floor(r()*a.length)];

/** Deterministic 60 Hz race. Every visual or comedic event is a rule here first. */
export class Race{
 time=0;tick=0;done=false;events:Telemetry[]=[];racers:Racer[];order:string[]=[];collisions=0;
 private rand:()=>number;private talk:()=>number;private segment=0;private leader='';
 constructor(readonly config:RaceConfig,readonly player=''){this.rand=rng(config.seed);this.talk=rng(config.seed^0x5bd1e995);
  this.racers=config.entries.map((e,i)=>{const maxHp=820+e.stats[1]*2.6;return{...structuredClone(e),distance:0,velocity:0,hp:maxHp,maxHp,lane:i,targetLane:i,finish:0,reaction:.08+this.rand()*.3-Math.min(.06,e.stats[4]*.00012),blocked:0,maxVelocity:0,effects:[],used:[],spin:1,captureBy:'',captureUntil:0,tidalUntil:0,spurtMul:1+.015+e.stats[4]*.00004,spurtDone:false,exhausted:false,phase:this.rand()*6.28,rankAtCheck:i,slingUntil:0,heat:0,form:1+(this.rand()-.5)*.04};});
  for(const r of this.racers)if(r.skills.includes('launch'))r.reaction*=.4;
  this.emit('start','',pick(this.talk,[`${this.course.name}, 8개 천체 정상 출발했습니다.`,`게이트 열렸습니다. ${this.course.name}, 출발.`,`출발했습니다. 오늘 궤도는 안정적입니다.`]));}
 get course(){return courses[this.config.course];}
 get ranking(){return [...this.racers].sort((a,b)=>a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.distance-a.distance);}
 racer(id:string){return this.racers.find(r=>r.id===id)!;}
 emit(type:EventType,id:string,text:string,extra:Partial<Telemetry>={}){this.events.push({time:this.time,tick:this.tick,type,id,text,...extra});}
 inCorner(f:number){return this.course.corners.some(([a,b])=>f>=a&&f<=b);}
 private effect(r:Racer,mul:number,seconds:number,tag:string){r.effects.push({until:this.time+seconds,mul,tag});}
 private skillRoll(r:Racer){return this.rand()<Math.min(.95,.55+r.stats[4]*.0009);}
 private generic(r:Racer,id:string){if(r.used.includes(id))return false;r.used.push(id);if(!this.skillRoll(r))return false;const s=skill(id);this.emit('skill',r.id,`${planet(r.planet).name}, ${s.name}.`,{label:s.name});return true;}
 private unique(r:Racer,text:string,extra:Partial<Telemetry>={}){r.used.push('unique');this.emit('unique',r.id,text,{label:planet(r.planet).skill,...extra});}
 /** Player spurt press. Applied on the next simulated tick so live play and replay match. */
 pressSpurt(){if(this.config.spurt===null&&!this.done)this.config.spurt=this.tick+1;return this.config.spurt;}
 spurtWindow(r:Racer){const w=.012+r.stats[4]*.00003;return{center:.74,half:w,open:.62,close:.84};}
 step(){if(this.done)return;this.tick++;this.time=this.tick*DT;const course=this.course,L=course.length,rank=this.ranking,rankIndex=new Map(rank.map((r,i)=>[r.id,i]));
  for(const r of this.racers){if(r.finish)continue;r.effects=r.effects.filter(e=>e.until>this.time);if(this.time<r.reaction)continue;
   const f=r.distance/L,s=r.stats,strat=strategies[r.strategy],corner=this.inCorner(f),late=f>=.67,p=planet(r.planet),apt=1+((p.aptitude[this.config.course]??1)-1)*.15;
   // Player spurt input (or automatic fallback when the window closes).
   if(r.id===this.player&&!r.spurtDone){const win=this.spurtWindow(r);const pressed=this.config.spurt!==null&&this.tick>=this.config.spurt;if(pressed||f>=win.close){const d=Math.abs(f-win.center);let q='자동',mul=1;if(pressed&&f<win.open){q='조급';mul=.995;}else if(pressed&&d<=win.half){q='PERFECT';mul=1.065;}else if(pressed&&d<=win.half*2.6){q='GOOD';mul=1.035;}else if(pressed){q=f<win.center?'EARLY':'LATE';mul=1.01;}r.spurtMul=mul;r.spurtDone=true;this.emit('spurt',r.id,q==='PERFECT'?'완벽한 타이밍의 스퍼트입니다.':q==='GOOD'?'좋은 타이밍입니다. 스퍼트!':q==='자동'?'스퍼트 지시가 없었습니다. 선수 판단으로 갑니다.':'스퍼트, 타이밍이 조금 어긋났습니다.',{label:q});}}
   const base=(33+s[0]*.01)*apt*r.form;let target=base*(f<.4?strat.early:late?strat.late:1);
   target*=1+.012*Math.sin(this.time*.9+r.phase);
   if(corner)target*=.93+Math.min(.06,s[3]*.00012)+(r.skills.includes('corner')?.05:0);
   if(late)target*=1.05+s[3]*.00005+(r.spurtMul-1);
   if(r.hp<=0){target=Math.min(target,base*(.84+Math.min(.07,s[3]*.00014)));if(!r.exhausted){r.exhausted=true;if(f<.97)this.emit('exhaust',r.id,pick(this.talk,[`${p.name}, 체력이 바닥났습니다. 관성으로 버팁니다.`,`${p.name}, 속도가 떨어집니다. 지구력이 모자랐습니다.`]));}}
   const slip=this.racers.some(o=>o!==r&&!o.finish&&o.distance>r.distance&&o.distance-r.distance<9&&Math.abs(o.lane-r.lane)<1.5);if(slip)target*=1.02;
   for(const e of r.effects)target*=e.mul;
   if(r.skills.includes('finish')&&f>=.85&&!r.used.includes('finish')&&this.generic(r,'finish'))this.effect(r,1.06,99,'finish');
   if(r.skills.includes('guts')&&f>=.75&&!r.used.includes('guts')&&(rankIndex.get(r.id)??0)>=3&&this.generic(r,'guts'))this.effect(r,1.06,99,'guts');
   if(r.skills.includes('cooldown')&&f>=.5&&!r.used.includes('cooldown')&&this.generic(r,'cooldown'))r.hp=Math.min(r.maxHp,r.hp+r.maxHp*.08);
   if(r.skills.includes('perturb')&&f>=.45&&!r.used.includes('perturb')){const victim=this.racers.filter(o=>!o.finish&&o.distance>r.distance&&o.distance-r.distance<25).sort((a,b)=>a.distance-b.distance)[0];if(victim&&this.generic(r,'perturb'))victim.hp=Math.max(0,victim.hp-victim.maxHp*.06);}
   if(r.skills.includes('slingshot')&&f>.3&&!r.used.includes('slingshot')&&(rankIndex.get(r.id)??0)<r.rankAtCheck&&this.generic(r,'slingshot'))this.effect(r,1.06,2,'sling');
   if(this.tick%30===0)r.rankAtCheck=rankIndex.get(r.id)??0;
   if(!r.used.includes("unique"))this.uniqueCheck(r,f,corner,rankIndex.get(r.id)??0);
   // Tidal lock overrides target with Earth's pace.
   if(r.tidalUntil>this.time){const earth=this.racers.find(o=>o.planet==='earth');if(earth){target=Math.max(target,earth.velocity*1.04);r.targetLane=Math.max(0,Math.min(LANES-1,earth.lane+1));}}
   if(r.captureUntil>this.time){const j=this.racers.find(o=>o.id===r.captureBy);if(j)r.targetLane+=(j.lane-r.targetLane)*.02;}
   // Traffic.
   const ahead=this.racers.filter(o=>o!==r&&!o.finish&&o.distance>r.distance&&o.distance-r.distance<3.6&&Math.abs(o.lane-r.lane)<.8).sort((a,b)=>a.distance-b.distance)[0];
   if(ahead&&ahead.velocity<target){r.blocked+=DT;if(this.tick%12===0&&this.rand()<.3+s[4]*.0012){const options=[Math.round(r.targetLane)-1,Math.round(r.targetLane)+1].filter(l=>l>=0&&l<LANES&&!this.racers.some(o=>o!==r&&!o.finish&&Math.abs(o.distance-r.distance)<5&&Math.abs(o.lane-l)<.8));if(options.length)r.targetLane=pick(this.rand,options);}
    if(r.planet==='seed-a'&&!r.used.includes('unique')&&f>.45){this.unique(r,`${p.name}, 주변 물질을 끌어모읍니다. 기원 특성, 응집.`);this.effect(r,1.1,2.5,'unique');ahead.targetLane=Math.min(LANES-1,ahead.targetLane+1);}
    else target=Math.min(target,ahead.velocity+.25+s[2]*.0012);}
   else if(this.tick%90===(r.phase*10|0)%90&&r.targetLane>0&&!this.racers.some(o=>o!==r&&!o.finish&&Math.abs(o.distance-r.distance)<6&&Math.abs(o.lane-(r.targetLane-1))<.9))r.targetLane=Math.round(r.targetLane)-1;
   r.targetLane=Math.max(0,Math.min(LANES-1,r.targetLane));r.lane+=(r.targetLane-r.lane)*Math.min(1,DT*(1.6+s[4]*.004));
   const accel=(2.4+s[2]*.006)*(r.skills.includes('launch')&&this.time<3?1.4:1);r.velocity+=Math.max(-6*DT,Math.min(accel*DT,target-r.velocity));
   const following=this.racers.some(o=>o!==r&&o.distance>r.distance&&o.distance-r.distance<7&&Math.abs(o.lane-r.lane)<1.2);
   const drain=19*(r.velocity/36)**2*strat.cost*(corner?1.04:1)*(late?1.22:1)*(following&&r.skills.includes('draft')?.8:1);r.hp=Math.max(0,r.hp-drain*DT);
   r.maxVelocity=Math.max(r.maxVelocity,r.velocity);r.heat=Math.max(0,r.heat-DT*.4);r.spin+=(1-r.spin)*DT*.6;
   const before=r.distance;r.distance+=r.velocity*DT;
   if(r.distance>=L){r.finish=this.time-DT+(L-before)/(r.distance-before)*DT;r.distance=L;const place=this.racers.filter(o=>o.finish).length;this.emit('finish',r.id,place===1?pick(this.talk,[`${p.name}, 1위로 결승선 통과!`,`${p.name}, 지금 결승선을 넘었습니다! 1위!`]):`${p.name}, ${place}위로 들어옵니다.`);}
  }
  this.collide();
  const lead=this.ranking[0],lf=lead.distance/L;
  const stages:[number,string][]=[[.12,pick(this.talk,['첫 코너로 들어갑니다. 공전 궤도 진입.','선두 그룹, 첫 코너. 원심력은 공평합니다.'])],[.4,pick(this.talk,['중반입니다. 지구력 싸움이 시작됩니다.','레이스 중반. 아직 아무것도 결정되지 않았습니다.'])],[.67,'최종 구간! 각 선수 스퍼트에 들어갑니다!'],[.86,pick(this.talk,['마지막 직선! 남은 것을 전부 씁니다!','결승선이 보입니다!'])]];
  if(this.segment<stages.length&&lf>=stages[this.segment][0]){this.emit(this.segment===2?'lastspurt':'segment',lead.id,stages[this.segment][1]);this.segment++;}
  if(this.tick%30===0&&!lead.finish){if(this.leader&&lead.id!==this.leader&&this.time>3)this.emit('pass',lead.id,pick(this.talk,[`${planet(lead.planet).name}, 선두로 나섭니다!`,`선두 교체! ${planet(lead.planet).name}입니다!`,`${planet(lead.planet).name}가 앞으로 나왔습니다.`]));this.leader=lead.id;}
  if(this.racers.every(r=>r.finish)){this.done=true;this.order=this.ranking.map(r=>r.id);}
 }
 private uniqueCheck(r:Racer,f:number,corner:boolean,rank:number){const p=planet(r.planet),L=this.course.length;
  switch(r.planet){
   case'earth':if(f>=.8&&r.hp>0){this.unique(r,'지구, 제3행성의 품격. 남은 지구력으로 버팁니다. 명칭은 우연입니다.');this.effect(r,1.09,4,'unique');r.hp=Math.min(r.maxHp,r.hp+r.maxHp*.06);}break;
   case'mercury':if(Math.abs(f-this.course.sun)<.03){this.unique(r,'수성, 근일점 통과. 태양에 가장 가까운 지점에서 가장 빠릅니다. 케플러 제2법칙입니다.');this.effect(r,1.13,3,'unique');r.heat=1;}break;
   case'venus':if(f>.5&&corner){this.unique(r,'금성, 역회전 중입니다. 진행 방향은 정상입니다.');this.effect(r,1.1,3.5,'unique');r.spin=-6;}break;
   case'mars':if(f>.45){const victims=this.racers.filter(o=>o!==r&&!o.finish&&o.distance<r.distance&&r.distance-o.distance<28&&Math.abs(o.lane-r.lane)<2.6);for(const v of victims)this.effect(v,.95,3,'dust');this.effect(r,1.05,3,'unique');this.unique(r,victims.length?`화성 뒤로 먼지폭풍. 중계 카메라가 시야를 확보하지 못하고 있습니다.`:'화성, 먼지폭풍을 일으켰습니다. 뒤에 아무도 없습니다.',{others:victims.map(v=>v.id),type:'dust'});}break;
   case'jupiter':if(f>.55){const victims=this.racers.filter(o=>o!==r&&!o.finish&&Math.abs(o.distance-r.distance)<30&&Math.abs(o.lane-r.lane)<3.6);for(const v of victims){this.effect(v,.93,3,'capture');v.captureBy=r.id;v.captureUntil=this.time+3;}this.effect(r,1.04,3,'unique');this.unique(r,victims.length?`목성 주변 선수 ${victims.length}명이 공전 궤도에 진입했습니다. 규정상 공전은 진로 방해가 아닙니다.`:'목성, 중력장을 전개했습니다. 주변에 아무도 없습니다. 조용합니다.',{others:victims.map(v=>v.id),type:'capture'});}break;
   case'moon':if(f>.57){const earth=this.racers.find(o=>o.planet==='earth'&&!o.finish&&Math.abs(o.distance-r.distance)<35);this.effect(r,1.09,3,'unique');if(earth){r.tidalUntil=this.time+4;this.unique(r,'달이 지구에 조석 고정되었습니다. 같은 면만 보여 주며 따라갑니다.',{others:[earth.id],type:'tidal'});}else this.unique(r,'달, 밀물은 기다리지 않는다. 중반 가속입니다.');}break;
   case'seed-b':if(f>.7&&rank>=1&&rank<=3){this.unique(r,'시드 행성 847209, 궤도 공명 2:1. 계산대로 치고 나갑니다.');this.effect(r,1.11,3,'unique');}break;
   default:break;
  }
  void L;void p;}
 private collide(){if(this.collisions>=2||this.time<5)return;for(let i=0;i<this.racers.length;i++)for(let j=i+1;j<this.racers.length;j++){const a=this.racers[i],b=this.racers[j];if(a.finish||b.finish)continue;const dd=Math.abs(a.distance-b.distance),dl=Math.abs(a.lane-b.lane);if(dd<1.6&&dl<.6&&Math.abs(a.velocity-b.velocity)>.35&&this.rand()<.0025){this.collisions++;for(const r of [a,b]){r.velocity*=.9;this.effect(r,.86,1.3,'collide');}a.targetLane=Math.max(0,Math.round(a.lane)-1);b.targetLane=Math.min(LANES-1,Math.round(b.lane)+1);this.emit('collide',a.id,pick(this.talk,[`접촉! ${planet(a.planet).name}와 ${planet(b.planet).name}. 심판단은 운동량 보존을 확인했습니다.`,`${planet(a.planet).name}, ${planet(b.planet).name}와 접촉. 로슈 한계 안쪽입니다. 둘 다 무사합니다.`]),{others:[b.id]});return;}}}
 seek(time:number){while(!this.done&&this.time<time)this.step();}
 finishAll(){while(!this.done&&this.time<300)this.step();}
}

/** Finish margin, measured in planet diameters (sport fiction). */
export function margin(gap:number,velocity:number){const d=gap*velocity/6;return d<.08?'대기권 차':d<.45?'반 지름 차':d<1.2?'1지름 차':d<2.5?'2지름 차':d<8?`${Math.round(d)}지름 차`:'대차';}
