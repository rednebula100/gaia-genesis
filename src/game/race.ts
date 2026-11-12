import {courses,strategies} from './data/races';
import {planet} from './data/planets';
import {skill} from './data/skills';
import {rng,type RaceConfig,type RaceEntry} from './model';

export type EventType='start'|'skill'|'unique'|'pass'|'finish'|'segment'|'collide'|'exhaust'|'spurt'|'lastspurt'|'duel'|'mash';
export type Telemetry={time:number;tick:number;type:EventType;id:string;text:string;others?:string[];label?:string;big?:boolean};
type Effect={until:number;mul:number;tag:string};
export type Racer=RaceEntry&{distance:number;velocity:number;hp:number;maxHp:number;lane:number;targetLane:number;finish:number;reaction:number;blocked:number;maxVelocity:number;effects:Effect[];used:string[];spin:number;spurtMul:number;mashMul:number;exhausted:boolean;phase:number;rankAtCheck:number;form:number;fx:Record<string,number>;lastLaneTry:number};
export const DT=1/60,LANES=8,BODY=4;
export const FINAL_LEG=.62;
const pick=<T,>(r:()=>number,a:T[])=>a[Math.floor(r()*a.length)];

/** Deterministic 60 Hz race modelled on position keeping → final-leg spurt. Every comedic event is a rule here first. */
export class Race{
 time=0;tick=0;done=false;events:Telemetry[]=[];racers:Racer[];order:string[]=[];collisions=0;
 private rand:()=>number;private talk:()=>number;private segment=0;private leader='';private duels=new Set<string>();
 constructor(readonly config:RaceConfig,readonly player=''){this.rand=rng(config.seed);this.talk=rng(config.seed^0x5bd1e995);
  this.racers=config.entries.map((e,i)=>{const maxHp=800+e.stats[1]*2.2;return{...structuredClone(e),distance:-i*.01,velocity:0,hp:maxHp,maxHp,lane:i,targetLane:i,finish:0,reaction:.08+this.rand()*.3-Math.min(.06,e.stats[4]*.0001),blocked:0,maxVelocity:0,effects:[],used:[],spin:1,spurtMul:1+.012+e.stats[4]*.00003,mashMul:1,exhausted:false,phase:this.rand()*6.28,rankAtCheck:i,form:1+(this.rand()-.5)*.035,fx:{},lastLaneTry:0};});
  for(const r of this.racers)if(r.skills.includes('launch'))r.reaction*=.4;
  this.emit('start','',pick(this.talk,[`${this.course.name}, 8개 천체 정상 출발했습니다.`,`게이트 열렸습니다. ${this.course.name}, 출발.`,`출발했습니다. 오늘 궤도는 안정적입니다.`]));}
 get course(){return courses[this.config.course];}
 get ranking(){return [...this.racers].sort((a,b)=>a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.distance-a.distance);}
 racer(id:string){return this.racers.find(r=>r.id===id)!;}
 emit(type:EventType,id:string,text:string,extra:Partial<Telemetry>={}){this.events.push({time:this.time,tick:this.tick,type,id,text,...extra});}
 inCorner(f:number){return this.course.corners.some(([a,b])=>f>=a&&f<=b);}
 private effect(r:Racer,mul:number,seconds:number,tag:string){if(mul<1&&r.planet==='cancri'&&r.used.includes('unique'))return;r.effects.push({until:this.time+seconds,mul,tag});}
 private skillRoll(r:Racer){return this.rand()<Math.min(.95,.55+r.stats[4]*.0006);}
 private generic(r:Racer,id:string){if(r.used.includes(id))return false;r.used.push(id);if(!this.skillRoll(r))return false;const s=skill(id);this.emit('skill',r.id,`${planet(r.planet).name}, ${s.name}.`,{label:s.name,big:!!s.gold});return true;}
 private unique(r:Racer,text:string,extra:Partial<Telemetry>={}){r.used.push('unique');this.emit('unique',r.id,text,{label:planet(r.planet).skill,big:true,...extra});}
 /** Player inputs are written into the config so live play and replays match tick for tick. */
 applyInput(k:'spurt'|'mash',mul:number,label=''){const inp=this.config.inputs;if(inp[k]||this.done)return null;const v={tick:this.tick+1,mul,label};(inp as Record<string,unknown>)[k]=v;return v;}
 rankOf(id:string){return this.ranking.findIndex(r=>r.id===id)+1;}
 step(){if(this.done)return;this.tick++;this.time=this.tick*DT;const L=this.course.length,rank=this.ranking,rankIndex=new Map(rank.map((r,i)=>[r.id,i]));const live=this.racers.filter(r=>!r.finish);const lead=rank.find(r=>!r.finish)??rank[0];
  for(const r of this.racers){if(r.finish)continue;r.effects=r.effects.filter(e=>e.until>this.time);if(this.time<r.reaction)continue;
   const f=Math.max(0,r.distance/L),s=r.stats,strat=strategies[r.strategy],corner=this.inCorner(f),final=f>=FINAL_LEG,p=planet(r.planet),apt=1+((p.aptitude[this.config.course]??1)-1)*.15;
   const inp=this.config.inputs;if(r.id===this.player){if(inp.spurt&&this.tick>=inp.spurt.tick)r.spurtMul=inp.spurt.mul;if(inp.mash&&this.tick>=inp.mash.tick)r.mashMul=inp.mash.mul;}
   const base=(30+s[0]*.009)*apt*r.form;let target=base;
   if(!final){// Position keeping: hold the style's distance behind the pacemaker. The pack stays together until the final leg.
    target*=f<.06?1.02:strat.early;const behind=lead.distance-r.distance;if(r!==lead){if(behind<strat.gap-3)target*=.965;else if(behind>strat.gap+9)target*=1.035+Math.min(.03,(behind-strat.gap-9)*.002);}
    target*=1+.01*Math.sin(this.time*.8+r.phase);}
   else{// Final leg: spurt speed from speed/guts, trimmed when HP cannot carry it to the line (Uma-style).
    let spurt=base*(1.06+s[3]*.00005)*strat.late*r.spurtMul*r.mashMul;const left=L-r.distance;const need=left/Math.max(1,spurt)*19*(spurt/36)**2*1.25*strat.cost;if(r.hp<need)spurt=Math.max(base*1.0,spurt-(1-r.hp/need)*base*.12);target=spurt;}
   if(corner)target*=.94+Math.min(.05,s[3]*.00008)+(r.skills.includes('corner')?.05:0);
   if(r.hp<=0&&!(r.fx.veteran>this.time)){target=Math.min(target,base*(.83+Math.min(.07,s[3]*.0001)));if(!r.exhausted){r.exhausted=true;if(f<.97)this.emit('exhaust',r.id,pick(this.talk,[`${p.name}, 체력이 바닥났습니다. 관성으로 버팁니다.`,`${p.name}, 속도가 떨어집니다. 지구력이 모자랐습니다.`]));}}
   for(const e of r.effects)target*=e.mul;
   // Learned skills.
   if(r.skills.includes('finish')&&f>=.85&&!r.used.includes('finish')&&this.generic(r,'finish'))this.effect(r,1.06,99,'finish');
   if(r.skills.includes('supernova')&&f>=.8&&!r.used.includes('supernova')&&this.generic(r,'supernova'))this.effect(r,1.12,4,'supernova');
   if(r.skills.includes('guts')&&f>=.75&&!r.used.includes('guts')&&(rankIndex.get(r.id)??0)>=3&&this.generic(r,'guts'))this.effect(r,1.06,99,'guts');
   if(r.skills.includes('cooldown')&&f>=.5&&!r.used.includes('cooldown')&&this.generic(r,'cooldown'))r.hp=Math.min(r.maxHp,r.hp+r.maxHp*.08);
   if(r.skills.includes('perturb')&&f>=.45&&!r.used.includes('perturb')){const v=this.aheadOf(r,25);if(v&&this.generic(r,'perturb'))v.hp=Math.max(0,v.hp-v.maxHp*.06);}
   if(r.skills.includes('slingshot')&&f>.3&&!r.used.includes('slingshot')&&(rankIndex.get(r.id)??0)<r.rankAtCheck&&this.generic(r,'slingshot'))this.effect(r,1.06,2,'sling');
   if(this.tick%30===0)r.rankAtCheck=rankIndex.get(r.id)??0;
   if(!r.used.includes('unique'))this.uniqueCheck(r,f,corner,rankIndex.get(r.id)??0);
   if(r.fx.tidal>this.time){const earth=this.racers.find(o=>o.planet==='earth'&&!o.finish);if(earth){target=Math.max(target,earth.velocity*1.04);r.targetLane=Math.max(0,Math.min(LANES-1,Math.round(earth.lane)+1));}}
   if(r.fx.capture>this.time){const j=this.racers.find(o=>o.planet==='jupiter');if(j)r.targetLane+=(j.lane-r.targetLane)*.02;}
   // Traffic: blocked runners are capped to the blocker; they look for a free lane.
   const ahead=this.aheadOf(r,BODY+2.2,.95);
   if(ahead&&ahead.velocity<target&&!(r.fx.hop>this.time)){r.blocked+=DT;if(this.tick-r.lastLaneTry>10){r.lastLaneTry=this.tick;if(this.rand()<.35+s[4]*.0008+(r.skills.includes('position')?.25:0)){const cur=Math.round(r.targetLane);const opts=[cur+1,cur-1].filter(l=>l>=0&&l<LANES&&this.laneFree(r,l));if(opts.length)r.targetLane=final?Math.max(...opts):pick(this.rand,opts);}}
    if(r.planet==='gaia'&&!r.used.includes('unique')&&f>.45){this.unique(r,`${p.name}, 주변 물질을 끌어모읍니다. 기원 특성, 응집.`);this.effect(r,1.1,2.5,'unique');ahead.targetLane=Math.min(LANES-1,Math.round(ahead.targetLane)+1);}
    else target=Math.min(target,ahead.velocity+.1);}
   else if(!final&&this.tick%45===(r.phase*7|0)%45&&r.targetLane>0&&this.laneFree(r,Math.round(r.targetLane)-1))r.targetLane=Math.round(r.targetLane)-1;// drift to the rail
   // Final-stretch duel.
   if(f>.8)for(const o of live){if(o===r||o.finish)continue;if(Math.abs(o.distance-r.distance)<2.2&&Math.abs(o.lane-r.lane)<1.6){const key=[r.id,o.id].sort().join();const k=r.skills.includes('duel')?2:1;target*=1+.022*k+s[3]*.00002;if(!this.duels.has(key)){this.duels.add(key);this.emit('duel',r.id,pick(this.talk,[`${p.name}와 ${planet(o.planet).name}, 나란히! 치열한 경합입니다!`,`경합! ${p.name}, ${planet(o.planet).name}, 한 치도 물러서지 않습니다!`]),{others:[o.id]});}}}
   r.targetLane=Math.max(0,Math.min(LANES-1,r.targetLane));r.lane+=Math.sign(r.targetLane-r.lane)*Math.min(Math.abs(r.targetLane-r.lane),DT*(1.1+s[4]*.0012));
   const accel=(2.2+s[2]*.005)*(r.skills.includes('launch')&&this.time<3?1.4:1);r.velocity+=Math.max(-5*DT,Math.min(accel*DT,target-r.velocity));
   const following=this.aheadOf(r,8,1.2);const drain=19*(r.velocity/36)**2*strat.cost*(corner?1.04:1)*(final?1.25:1)*(following&&r.skills.includes('draft')?.8:1)*(r.skills.includes('stamina')?.92:1);r.hp=Math.max(0,r.hp-drain*DT);
   r.maxVelocity=Math.max(r.maxVelocity,r.velocity);r.spin+=(1-r.spin)*DT*.6;
   const before=r.distance;r.distance+=r.velocity*DT;
   if(r.distance>=L){r.finish=this.time-DT+(L-before)/(r.distance-before)*DT;r.distance=L;const place=this.racers.filter(o=>o.finish).length;this.emit('finish',r.id,place===1?pick(this.talk,[`${p.name}, 1위로 결승선 통과!`,`${p.name}, 지금 결승선을 넘었습니다! 1위!`]):`${p.name}, ${place}위로 들어옵니다.`);}
  }
  this.resolveOverlaps();this.collide();
  const L2=this.course.length,lr=this.ranking[0],lf=lr.distance/L2;
  const stages:[number,string][]=[[.15,pick(this.talk,['첫 코너로 들어갑니다. 대열이 정리됩니다.','선두 그룹, 자리 잡았습니다. 원심력은 공평합니다.'])],[.4,pick(this.talk,['중반입니다. 집단이 뭉쳐 있습니다. 아직 아무것도 결정되지 않았습니다.','레이스 중반. 각 선수 체력을 아끼고 있습니다.'])],[FINAL_LEG,'최종 구간! 각 선수 스퍼트에 들어갑니다!'],[.86,pick(this.talk,['마지막 직선! 남은 것을 전부 씁니다!','결승선이 보입니다! 누가 먼저입니까!'])]];
  if(this.segment<stages.length&&lf>=stages[this.segment][0]){this.emit(this.segment===2?'lastspurt':'segment',lr.id,stages[this.segment][1]);this.segment++;}
  if(this.tick%30===0&&!lr.finish){if(this.leader&&lr.id!==this.leader&&this.time>3)this.emit('pass',lr.id,pick(this.talk,lf>.8?[`역전! ${planet(lr.planet).name}가 앞으로!`,`선두가 바뀝니다! ${planet(lr.planet).name}!`]:[`${planet(lr.planet).name}, 선두로 나섭니다.`,`선두 교체. ${planet(lr.planet).name}입니다.`]));this.leader=lr.id;}
  if(this.racers.every(r=>r.finish)){this.done=true;this.order=this.ranking.map(r=>r.id);}
 }
 private aheadOf(r:Racer,range:number,laneGap=.95){let best:Racer|undefined,d=1e9;for(const o of this.racers){if(o===r||o.finish)continue;const dd=o.distance-r.distance;if(dd>0&&dd<range&&Math.abs(o.lane-r.lane)<laneGap&&dd<d){d=dd;best=o;}}return best;}
 private laneFree(r:Racer,l:number){return !this.racers.some(o=>o!==r&&!o.finish&&Math.abs(o.distance-r.distance)<BODY+1.6&&Math.abs(o.lane-l)<.95);}
 /** No two bodies share space: the trailing one is held back. */
 private resolveOverlaps(){for(let it=0;it<2;it++)for(const a of this.racers)for(const b of this.racers){if(a===b||a.finish||b.finish)continue;if(Math.abs(a.lane-b.lane)<.9){const dd=a.distance-b.distance;if(dd>=0&&dd<BODY){b.distance=a.distance-BODY;b.velocity=Math.min(b.velocity,a.velocity);}}}}
 private uniqueCheck(r:Racer,f:number,corner:boolean,rank:number){const p=planet(r.planet),near=(range:number,lane=3)=>this.racers.filter(o=>o!==r&&!o.finish&&Math.abs(o.distance-r.distance)<range&&Math.abs(o.lane-r.lane)<lane);
  switch(r.planet){
   case'earth':if(f>=.8&&r.hp>0){this.unique(r,'지구, 제3행성의 품격. 남은 지구력으로 버팁니다. 명칭은 우연입니다.');this.effect(r,1.09,4,'unique');r.hp=Math.min(r.maxHp,r.hp+r.maxHp*.06);}break;
   case'mercury':if(Math.abs(f-this.course.sun)<.03||f>.9){this.unique(r,'수성, 근일점 통과. 태양에 가장 가까운 지점에서 가장 빠릅니다. 케플러 제2법칙입니다.');this.effect(r,1.13,3,'unique');r.fx.heat=this.time+3;}break;
   case'venus':if(f>.5&&(corner||f>.85)){this.unique(r,'금성, 역회전 중입니다. 진행 방향은 정상입니다.');this.effect(r,1.1,3.5,'unique');r.spin=-6;}break;
   case'mars':if(f>.45){const v=this.racers.filter(o=>o!==r&&!o.finish&&o.distance<r.distance&&r.distance-o.distance<28&&Math.abs(o.lane-r.lane)<2.6);for(const o of v)this.effect(o,.95,3,'dust');this.effect(r,1.05,3,'unique');r.fx.dust=this.time+3;this.unique(r,v.length?'화성 뒤로 먼지폭풍. 중계 카메라가 시야를 확보하지 못하고 있습니다.':'화성, 먼지폭풍을 일으켰습니다. 뒤에 아무도 없습니다.',{others:v.map(o=>o.id)});}break;
   case'jupiter':if(f>.55){const v=near(30,3.6);for(const o of v){this.effect(o,.93,3,'capture');o.fx.capture=this.time+3;}this.effect(r,1.04,3,'unique');this.unique(r,v.length?`목성 주변 선수 ${v.length}명이 공전 궤도에 진입했습니다. 규정상 공전은 진로 방해가 아닙니다.`:'목성, 중력장을 전개했습니다. 주변에 아무도 없습니다. 조용합니다.',{others:v.map(o=>o.id)});}break;
   case'moon':if(f>.57){const e=this.racers.find(o=>o.planet==='earth'&&!o.finish&&Math.abs(o.distance-r.distance)<35);this.effect(r,1.09,3,'unique');if(e){r.fx.tidal=this.time+4;this.unique(r,'달이 지구에 조석 고정되었습니다. 같은 면만 보여 주며 따라갑니다.',{others:[e.id]});}else this.unique(r,'달, 밀물은 기다리지 않는다. 중반 가속입니다.');}break;
   case'saturn':if(f>.6){const v=this.racers.filter(o=>o!==r&&!o.finish&&r.distance-o.distance>0&&r.distance-o.distance<14&&Math.abs(o.lane-r.lane)<2.2);for(const o of v)this.effect(o,.92,2.5,'ring');this.effect(r,1.08,3,'unique');r.fx.ring=this.time+3;this.unique(r,'토성이 고리를 전개했습니다. 규정집에는 관련 조항이 없습니다.',{others:v.map(o=>o.id)});}break;
   case'gangmam':if(f>.66){const v=this.racers.filter(o=>!o.finish&&o.distance>r.distance&&o.distance-r.distance<50);for(const o of v)this.effect(o,.94,2.8,'nag');this.effect(r,1.08,3.5,'unique');r.fx.mom=this.time+3.5;this.unique(r,v.length?`강맘: "귀가 시간이다." 앞선 ${v.length}명이 동시에 뒤를 돌아봤습니다.`:'강맘: "다들 어디 갔니." 앞에 아무도 없습니다.',{others:v.map(o=>o.id)});}break;
   case'cancri':if(f>.55){r.effects=r.effects.filter(e=>e.mul>=1);this.effect(r,1.07,4,'unique');r.fx.diamond=this.time+6;this.unique(r,'칸크리 e, 다이아몬드는 영원히. 모든 감속을 튕겨 냅니다. 흠집은 상대가 납니다.');}break;
   case'hd189':if(f>.5){const v=this.racers.filter(o=>o!==r&&!o.finish&&o.distance<r.distance&&r.distance-o.distance<22&&Math.abs(o.lane-r.lane)<3);for(const o of v)this.effect(o,.95,3,'glass');this.effect(r,1.06,3,'unique');r.fx.glass=this.time+3;this.unique(r,v.length?'시속 8,700km 유리비가 옆으로 내립니다. 뒤따르는 선수들은 우산을 준비하지 않았습니다.':'유리비 주의보 발령. 뒤에 아무도 없어 피해는 없습니다.',{others:v.map(o=>o.id)});}break;
   case'uranus':if(f>.6&&r.blocked>.6){r.fx.roll=this.time+3;r.fx.hop=this.time+3;this.effect(r,1.09,3,'unique');r.targetLane=Math.min(LANES-1,Math.round(r.lane)+1);this.unique(r,'천왕성, 옆으로 누워서 굴러갑니다. 막힌 길이 없어졌습니다.');}else if(f>.82){r.fx.roll=this.time+3;this.effect(r,1.07,3,'unique');this.unique(r,'천왕성, 옆으로 누운 채 가속합니다. 자세 교정은 없습니다.');}break;
   case'neptune':if(f>.84){this.effect(r,1.12,2.6,'unique');r.fx.storm=this.time+2.6;this.unique(r,'해왕성, 초음속 폭풍! 태양계에서 가장 빠른 바람입니다!');}break;
   case'titan':if(f>.4&&corner){for(const o of near(40,8))this.effect(o,.96,3,'methane');this.effect(r,1.06,3,'unique');r.fx.rain=this.time+3;this.unique(r,'타이탄 상공에 메탄 비. 코너가 미끄럽습니다. 타이탄만 익숙합니다.');}break;
   case'pluto':if(f>.5&&!r.fx.review){r.fx.review=this.time+1.5;this.effect(r,.7,1.5,'review');this.emit('unique',r.id,'잠시만요. 심판단이 명왕성의 행성 자격을 재심사합니다…',{label:'자격 재심사',big:true});}else if(r.fx.review&&this.time>r.fx.review){this.unique(r,'결론: 경기 속행. 명왕성, 분노의 가속입니다!',{label:'분노의 가속'});this.effect(r,1.16,3,'unique');}break;
   case'theia':if(f>.5){const v=this.aheadOf(r,10,1.6);if(v){this.effect(v,.88,1.5,'impact');this.effect(r,1.12,2.5,'unique');r.fx.impact=this.time+1;this.collisions++;this.unique(r,`테이아, ${planet(v.planet).name}에게 충돌! 45억 년 전 습관이 나왔습니다.`,{others:[v.id]});}}break;
   case'ceres':if(f>.72&&rank>=4){this.effect(r,1.09,3,'unique');this.unique(r,'세레스, 왜행성 연합의 결속. 하위권에서 치고 올라옵니다.');}break;
   case'io':if(f>.55&&r.blocked>.4){r.fx.hop=this.time+1.6;this.effect(r,1.08,2.5,'unique');r.targetLane=Math.max(0,Math.round(r.lane)-1);this.unique(r,'이오, 화산 분출! 반동으로 앞 선수를 뛰어넘습니다.');}break;
   case'europa':if(f>.55&&r.hp<r.maxHp*.5){r.hp=Math.min(r.maxHp,r.hp+r.maxHp*.12);this.effect(r,1.04,3,'unique');this.unique(r,'유로파, 얼음 아래 바다에서 체력을 길어 올립니다.');}break;
   case'callisto':if(r.hp<=0&&f>.6){r.fx.veteran=this.time+4;this.effect(r,1.03,4,'unique');this.unique(r,'칼리스토, 40억 년 된 표면입니다. 체력이 없어도 속도가 그대로입니다.');}break;
   case'enceladus':if(f>.7){r.fx.geyser=this.time+2;this.effect(r,1.11,2,'unique');this.unique(r,'엔셀라두스, 남극 간헐천 분사! 순간 가속입니다.');}break;
   case'theia2':break;
   default:break;}}
 private collide(){if(this.collisions>=2||this.time<5)return;for(const a of this.racers)for(const b of this.racers){if(a===b||a.finish||b.finish)continue;const dd=Math.abs(a.distance-b.distance),dl=Math.abs(a.lane-b.lane);if(dd<BODY+.4&&dl>.9&&dl<1.1&&Math.abs(a.targetLane-a.lane)>.2&&this.rand()<.01){this.collisions++;for(const r of [a,b]){r.velocity*=.93;this.effect(r,.9,1.2,'collide');}a.targetLane=Math.max(0,Math.round(a.lane)-1);b.targetLane=Math.min(LANES-1,Math.round(b.lane)+1);this.emit('collide',a.id,pick(this.talk,[`접촉! ${planet(a.planet).name}와 ${planet(b.planet).name}. 심판단은 운동량 보존을 확인했습니다.`,`${planet(a.planet).name}, ${planet(b.planet).name}와 접촉. 로슈 한계 안쪽입니다. 둘 다 무사합니다.`]),{others:[b.id]});return;}}}
 seek(time:number){while(!this.done&&this.time<time)this.step();}
 finishAll(){while(!this.done&&this.time<300)this.step();}
}
/** Finish margin, measured in planet diameters (sport fiction). */
export function margin(gap:number,velocity:number){const d=gap*velocity/BODY;return d<.08?'대기권 차':d<.45?'반 지름 차':d<1.2?'1지름 차':d<2.5?'2지름 차':d<8?`${Math.round(d)}지름 차`:'대차';}
