import {courses,strategies} from './data/races';
import {planet} from './data/planets';
import {rng,type RaceConfig,type RaceEntry} from './model';
export type Telemetry={time:number;type:'start'|'skill'|'pass'|'finish'|'segment';id:string;text:string};
export type Racer=RaceEntry&{distance:number;velocity:number;stamina:number;lane:number;targetLane:number;finish:number;boost:number;skillUsed:boolean;reaction:number;blocked:number;maxVelocity:number};
export class Race{
 time=0;tick=0;done=false;events:Telemetry[]=[];racers:Racer[];order:string[]=[];private rand:()=>number;private previous:string[]=[];private segment=0;
 constructor(readonly config:RaceConfig){this.rand=rng(config.seed);this.racers=config.entries.map((e,i)=>({...structuredClone(e),distance:0,velocity:0,stamina:70+e.stats[1]*.45,lane:i,targetLane:i,finish:0,boost:0,skillUsed:false,reaction:.2+this.rand()*.65,blocked:0,maxVelocity:0}));this.emit('start','',`${courses[config.course].name}. 8개 천체, 정상적으로 출발합니다.`);}
 get course(){return courses[this.config.course];}
 get ranking(){return [...this.racers].sort((a,b)=>a.finish&&b.finish?a.finish-b.finish:a.finish?-1:b.finish?1:b.distance-a.distance);}
 emit(type:Telemetry['type'],id:string,text:string){this.events.push({time:this.time,type,id,text});}
 step(){if(this.done)return;const dt=1/60;this.tick++;this.time=this.tick/60;const course=this.course;
 for(const r of this.racers){if(r.finish||this.time<r.reaction)continue;const f=r.distance/course.length,corner=(f>.12&&f<.32)||(f>.52&&f<.76),strat=strategies[r.strategy],s=r.stats,p=planet(r.planet);let target=(21.5+s[0]*.026)*p.aptitude[this.config.course]*(f<.55?strat.early:strat.late);if(corner)target*=.88-course.corner*.07+Math.min(.17,s[3]*.00035);if(corner&&r.skills.includes('corner'))target*=1.06;if(f>.8&&r.skills.includes('finish'))target*=1.07;if(r.stamina<22)target*=.72+r.stamina*.012;
 if(!r.skillUsed&&this.skillCondition(r,f,corner)){r.skillUsed=true;r.boost=4.5+s[4]*.008;this.emit('skill',r.id,`${p.name} — ${p.skill}. ${r.planet==='venus'?'역회전 중입니다. 진행 방향은 정상입니다.':r.planet==='jupiter'?'주위 선수들의 경로가 바뀌고 있습니다.':r.planet==='earth'?'지구가 지구력으로 버팁니다. 명칭은 우연입니다.':'공식 기록에 반영되는 가속입니다.'}`);if(r.planet==='jupiter')for(const other of this.racers){if(other!==r&&Math.abs(other.distance-r.distance)<28){other.velocity*=.94;other.targetLane=(other.targetLane+1)%8;}}}
 if(r.boost>0){target*=1.12+s[4]*.00006;r.boost-=dt;}
 const ahead=this.racers.find(o=>o!==r&&!o.finish&&o.distance>r.distance&&o.distance-r.distance<6&&Math.abs(o.lane-r.lane)<.7);if(ahead){r.blocked+=dt;const options=[r.targetLane-1,r.targetLane+1].filter(l=>l>=0&&l<8&&!this.racers.some(o=>o!==r&&Math.abs(o.distance-r.distance)<8&&Math.abs(o.lane-l)<.7));if(options.length&&this.tick%20===0)r.targetLane=options[Math.floor(this.rand()*options.length)];else target=Math.min(target,ahead.velocity*.99+s[2]*.001);}
 r.lane+=(r.targetLane-r.lane)*dt*(1+s[4]*.003);r.velocity+=Math.max(-4,Math.min(1.7+s[2]*.004,target-r.velocity))*dt;const consume=(1.7+r.velocity*.022)*strat.cost*(corner?1.08:1)*(ahead&&r.skills.includes('draft')?.85:1);r.stamina=Math.max(0,r.stamina-consume*dt);r.maxVelocity=Math.max(r.maxVelocity,r.velocity);const before=r.distance;r.distance+=r.velocity*dt;
 if(r.distance>=course.length){r.finish=this.time-dt+(course.length-before)/(r.distance-before)*dt;r.distance=course.length;this.emit('finish',r.id,`${p.name}, 결승선 통과. 중력에 의한 항의는 접수되지 않습니다.`);}
 }
 const stages=[.12,.32,.52,.76,.86],lead=this.ranking[0];if(this.segment<stages.length&&lead.distance/course.length>=stages[this.segment]){this.emit('segment',lead.id,['첫 코너 진입. 궤도 변경에 유의하십시오.','중반 진입. 각 선수의 지구력이 관건입니다.','마지막 코너. 자전력 차이가 드러납니다.','최종 직선. 남은 가속을 모두 사용합니다.','결승 판독 장치를 가동합니다.'][this.segment]);this.segment++;}
 const rank=this.ranking.map(r=>r.id);if(this.tick%60===0&&this.previous.length&&rank[0]!==this.previous[0])this.emit('pass',rank[0],`${planet(rank[0]).name}, 선두로 나섭니다.`);if(this.tick%60===0)this.previous=rank;
 if(this.racers.every(r=>r.finish)){this.done=true;this.order=this.ranking.map(r=>r.id);}
 }
 private skillCondition(r:Racer,f:number,corner:boolean){switch(r.planet){case'earth':return f>.78&&r.stamina>20;case'mercury':return f>.28;case'venus':return f>.5&&corner;case'mars':return f>.43;case'jupiter':return f>.36;case'moon':return f>.57;default:return f>.32+(planet(r.planet).seed%20)/100;}}
 seek(time:number){while(!this.done&&this.time<time)this.step();}
 finish(){while(!this.done&&this.time<200)this.step();}
}
