import {planet,planets,type Stats} from './data/planets';
import {supports,support} from './data/support';
import {storyEvents,cardEvents,type Choice} from './data/events';
import {skills,skill} from './data/skills';
import {courses} from './data/races';

export const SAVE_KEY='planet-musume-v1';
export const odds={SSR:3,SR:18,R:79};
export const SCOUT_COST=100;
export const TURNS=12,TRIAL_TURN=6;
export const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
export function rng(seed:number){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Facility base gains, indexed like Stats. Energy is the per-session change. */
export const facilities=[
 {name:'속도',gains:[34,0,12,0,0],energy:-18},
 {name:'지구력',gains:[0,32,0,12,0],energy:-17},
 {name:'중력',gains:[0,12,32,0,0],energy:-19},
 {name:'자전력',gains:[10,0,10,28,0],energy:-19},
 {name:'궤도감각',gains:[8,0,0,0,30],energy:5},
] as const;
export const moods=['최악','저조','보통','호조','절호조'] as const;
export const FRIEND_BOND=80;
export let GROWTH_TRIAL=[35,30,28,25,25],GROWTH_FINAL=[100,90,80,75,70];
export function setGrowth(t:number[],f:number[]){GROWTH_TRIAL=t;GROWTH_FINAL=f;}

export type Pending={kind:'story'|'card';id:string;card?:string}|null;
export type Career={id:number;planet:string;deck:string[];stats:Stats;energy:number;mood:number;turn:number;sp:number;skills:string[];hints:Record<string,number>;seed:number;bonds:Record<string,number>;uses:number[];labUsed:string[];seen:string[];pending:Pending;trial:number;log:string};
export type RaceEntry={id:string;planet:string;stats:Stats;strategy:number;skills:string[]};
export type RaceConfig={id:number;seed:number;course:number;kind:'trial'|'final';entries:RaceEntry[];spurt:number|null};
export type ResultRecord={id:number;rank:number;time:number;reward:number;planet:string;course:number;kind:'trial'|'final'};
export type HallRecord={id:number;planet:string;stats:Stats;skills:string[];rank:number;course:number;score:number;grade:string;trial:number};
export type Pull={id:string;grade:string;fresh:boolean;shards:number;kind:'planet'|'support'};
export type Save={schemaVersion:2;currency:number;shards:number;planets:Record<string,number>;supports:Record<string,number>;selected:string;deck:string[];firstScout:boolean;career:Career|null;race:RaceConfig|null;results:ResultRecord[];hall:HallRecord[];lastScout:Pull[];intro:boolean;settings:{bgm:boolean;sfx:boolean}};
export type TrainResult={ok:boolean;stat:number;delta:number[];friends:string[];levelUp:boolean;energy:number;mood:number;hint?:string;great:boolean};

export function freshSave():Save{return{schemaVersion:2,currency:6000,shards:0,planets:{earth:1,'seed-a':1},supports:{tide:1,orbit:1,wind:1},selected:'earth',deck:['tide','orbit','wind'],firstScout:false,career:null,race:null,results:[],hall:[],lastScout:[],intro:false,settings:{bgm:true,sfx:true}};}
const knownPlanet=(id:string)=>planets.some(p=>p.id===id);
const knownSupport=(id:string)=>supports.some(p=>p.id===id);
const validStats=(s:unknown):s is Stats=>Array.isArray(s)&&s.length===5&&s.every(v=>Number.isFinite(v)&&v>=0);
function validCareer(c:Career){return !!c&&knownPlanet(c.planet)&&validStats(c.stats)&&Array.isArray(c.deck)&&c.deck.every(knownSupport)&&Array.isArray(c.skills)&&c.skills.every(id=>skills.some(s=>s.id===id))&&Number.isInteger(c.turn)&&c.turn>=1&&c.turn<=TURNS&&Number.isFinite(c.energy)&&c.mood>=1&&c.mood<=5&&Array.isArray(c.uses)&&c.uses.length===5&&!!c.bonds&&!!c.hints;}
export const facilityLevel=(uses:number)=>Math.min(5,1+Math.floor(uses/4));
export function careerScore(stats:Stats,skillCount:number){return Math.round(stats.reduce((a,b)=>a+b,0)+skillCount*40);}
export function scoreGrade(score:number){return score>=2400?'SS':score>=2050?'S':score>=1800?'A+':score>=1600?'A':score>=1420?'B+':score>=1250?'B':score>=1100?'C':'D';}

export class GameModel{
 state:Save;storageError='';
 constructor(){this.state=this.load();}
 private load():Save{try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return freshSave();const s=JSON.parse(raw);
  if(!Number.isFinite(s.currency)||s.currency<0||!s.planets||!s.supports)throw Error('bad');
  if(!Object.entries(s.planets).every(([id,n])=>knownPlanet(id)&&Number.isInteger(n)&&Number(n)>0)||!Object.entries(s.supports).every(([id,n])=>knownSupport(id)&&Number.isInteger(n)&&Number(n)>0))throw Error('bad');
  const base=freshSave();
  if(s.schemaVersion===1){// V7 → V8: keep collection, wallet and history; careers restart under the new rules.
   const migrated:Save={...base,currency:s.currency,shards:s.shards|0,planets:s.planets,supports:s.supports,selected:s.planets[s.selected]?s.selected:'earth',deck:(s.deck??[]).filter((id:string)=>s.supports[id]).slice(0,4),firstScout:!!s.firstScout,intro:true,results:(s.results??[]).slice(0,30).map((r:any)=>({id:r.id,rank:r.rank,time:r.time,reward:r.reward,planet:'earth',course:1,kind:'final'}))};
   this.storageError='새 규칙(V8)으로 저장을 옮겼습니다. 보유 선수·카드·크레딧은 유지되고 진행 중 육성은 초기화되었습니다.';return migrated;}
  if(s.schemaVersion!==2)throw Error('bad');
  if(!knownPlanet(s.selected)||!s.planets[s.selected]||!Array.isArray(s.deck)||!s.deck.every((id:string)=>s.supports[id]))throw Error('bad');
  if(s.career&&!validCareer(s.career))s.career=null;
  if(s.race&&(!Array.isArray(s.race.entries)||s.race.entries.length!==8||!courses[s.race.course]))s.race=null;
  return {...base,...s,settings:{...base.settings,...(s.settings??{})}};
 }catch{this.storageError='저장 데이터를 읽지 못해 새 기록으로 시작했습니다.';return freshSave();}}
 save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));}catch{this.storageError='저장 공간을 사용할 수 없습니다. 이 탭에서는 계속 플레이할 수 있습니다.';}}

 // ── Scout ──
 scout(kind:'planet'|'support',count:number):Pull[]{if(![1,10].includes(count)||this.state.currency<count*SCOUT_COST)return[];this.state.currency-=count*SCOUT_COST;const rand=rng(randomSeed()),pool=kind==='planet'?planets:supports;const found:Pull[]=[];
  for(let i=0;i<count;i++){const roll=rand()*100;let grade=roll<odds.SSR?'SSR':roll<odds.SSR+odds.SR?'SR':'R';if(kind==='planet'&&count===10&&!this.state.firstScout&&i===9&&!found.some(p=>p.fresh||p.grade==='SSR'))grade='SSR';
   const candidates=pool.filter(p=>p.grade===grade),p=candidates[Math.floor(rand()*candidates.length)],owned=kind==='planet'?this.state.planets:this.state.supports,fresh=!owned[p.id],shards=fresh?0:grade==='SSR'?30:grade==='SR'?12:5;owned[p.id]=(owned[p.id]??0)+1;this.state.shards+=shards;found.push({id:p.id,grade,fresh,shards,kind});}
  if(kind==='planet'&&count===10)this.state.firstScout=true;this.state.lastScout=found;this.save();return found;}
 exchange(){if(this.state.shards<30)return false;this.state.shards-=30;this.state.currency+=300;this.save();return true;}
 select(id:string){if(this.state.planets[id]){this.state.selected=id;this.save();}}
 toggleSupport(id:string){if(!this.state.supports[id])return;const d=this.state.deck;if(d.includes(id))d.splice(d.indexOf(id),1);else if(d.length<4)d.push(id);this.save();}
 cardLevel=(id:string)=>Math.min(4,(this.state.supports[id]??1)-1);
 planetBonus=(id:string)=>Math.min(25,((this.state.planets[id]??1)-1)*5);

 // ── Career ──
 start(){const p=planet(this.state.selected),bonus=this.planetBonus(p.id);const bonds:Record<string,number>={};for(const id of this.state.deck)bonds[id]=support(id).bond;
  this.state.career={id:randomSeed(),planet:p.id,deck:[...this.state.deck],stats:p.stats.map(v=>v+bonus) as Stats,energy:100,mood:3,turn:1,sp:30,skills:[],hints:{},seed:randomSeed(),bonds,uses:[0,0,0,0,0],labUsed:[],seen:[],pending:null,trial:0,log:'데뷔 시즌 시작. 6턴에 예선전이 있습니다.'};this.state.race=null;this.checkStory();this.save();}
 get career(){return this.state.career;}
 isRaceTurn(){const c=this.career;return !!c&&(c.turn===TRIAL_TURN&&!c.trial||c.turn===TURNS);}
 canAct(){const c=this.career;return !!c&&!c.pending&&!this.isRaceTurn();}
 /** Cards dealt to each facility this turn. Deterministic per career seed and turn. */
 deal(turn=this.career?.turn??1):string[][]{const c=this.career;const out:string[][]=[[],[],[],[],[]];if(!c)return out;const r=rng(c.seed^Math.imul(turn+11,2654435761));for(const id of c.deck){const s=support(id),x=r();let at=-1;if(x<.5)at=s.stat;else if(x<.9){const others=[0,1,2,3,4].filter(i=>i!==s.stat);at=others[Math.floor((x-.5)/.1)];}if(at>=0)out[at].push(id);}return out;}
 moodMul(){return 1+((this.career?.mood??3)-3)*.1;}
 isFriend(id:string,facility:number){const c=this.career;return !!c&&support(id).stat===facility&&(c.bonds[id]??0)>=FRIEND_BOND;}
 preview(i:number){const c=this.career!;const cards=this.deal()[i];const lv=facilityLevel(c.uses[i]);let bonus=0,friend=1;for(const id of cards){bonus+=support(id).bonus+this.cardLevel(id)*3;if(this.isFriend(id,i))friend*=1.15+support(id).friend/100;}
  const mul=(1+.08*(lv-1))*(1+bonus/100)*this.moodMul()*(1+.06*cards.length)*friend;const gains=facilities[i].gains.map(g=>g?Math.round(g*mul):0);
  const failDown=cards.reduce((n,id)=>n+support(id).fail,0);const fail=c.energy>=50?0:clamp(Math.round((50-c.energy)*1.9)-failDown,0,95);
  return{gains,energy:facilities[i].energy,fail,cards,lv,friends:cards.filter(id=>this.isFriend(id,i)),sp:4+cards.length*2};}
 train(i:number):TrainResult|null{const c=this.career;if(!c||!this.canAct()||i<0||i>4)return null;const p=this.preview(i);const r=rng(c.seed^Math.imul(c.turn+101,40503)^i*7919);const failed=r()*100<p.fail;const delta=[0,0,0,0,0];let levelUp=false,hint:string|undefined;const before={energy:c.energy,mood:c.mood};
  if(failed){delta[i]=-Math.min(c.stats[i],p.fail>30?10:5);if(p.fail>30)delta[(i+1)%5]=-5;c.energy=clamp(c.energy-5,0,100);c.mood=Math.max(1,c.mood-1);c.log='훈련 실패. 무리했습니다.';}
  else{for(let k=0;k<5;k++)delta[k]=p.gains[k];c.energy=clamp(c.energy+p.energy,0,100);const oldLv=facilityLevel(c.uses[i]);c.uses[i]++;levelUp=facilityLevel(c.uses[i])>oldLv;c.sp+=p.sp;
   for(const id of p.cards)c.bonds[id]=Math.min(100,(c.bonds[id]??0)+10);
   if(p.cards.length&&r()<.2){const id=p.cards[Math.floor(r()*p.cards.length)];hint=support(id).hint;c.hints[hint]=Math.min(3,(c.hints[hint]??0)+1);}
   c.log=p.friends.length?'우정 트레이닝!':p.cards.length>=2?'훈련 대성공':'훈련 완료';
   if(p.cards.length&&r()<.24){const id=p.cards[Math.floor(r()*p.cards.length)];c.pending={kind:'card',id:String(Math.floor(r()*cardEvents.length)),card:id};}}
  for(let k=0;k<5;k++)c.stats[k]=Math.max(0,c.stats[k]+delta[k]);this.advance();this.save();
  return{ok:!failed,stat:i,delta,friends:failed?[]:p.friends,levelUp,energy:c.energy-before.energy,mood:c.mood-before.mood,hint,great:!failed&&(p.friends.length>0||p.cards.length>=3)};}
 rest(){const c=this.career;if(!c||!this.canAct())return null;const before=c.energy;c.energy=clamp(c.energy+50,0,100);if(c.mood<3)c.mood++;c.sp+=5;c.log='충분히 쉬었습니다.';this.advance();this.save();return{energy:c.energy-before};}
 outing(){const c=this.career;if(!c||!this.canAct())return null;const m=c.mood;c.mood=Math.min(5,c.mood+1);const before=c.energy;c.energy=clamp(c.energy+15,0,100);for(const id of c.deck)c.bonds[id]=Math.min(100,(c.bonds[id]??0)+4);c.log='관측회에 다녀왔습니다.';this.advance();this.save();return{mood:c.mood-m,energy:c.energy-before};}
 labReward(type:string){const c=this.career;if(!c||!this.canAct()||c.labUsed.includes(type))return false;c.labUsed.push(type);c.energy=clamp(c.energy-12,0,100);c.sp+=20;const stat=type==='core'?2:type==='seismic'?4:type==='cosmos'?0:2;const high=rng(c.seed+c.turn)()>.25;const gain=type==='impact'?(high?36:6):25;c.stats[stat]+=gain;if(type==='impact'&&!high){c.mood=Math.max(1,c.mood-1);c.energy=Math.max(0,c.energy-15);}c.log=`GAIA 특훈 완료 · ${['속도','지구력','중력','자전력','궤도감각'][stat]} +${gain}`;this.advance();this.save();return true;}
 private advance(){const c=this.career!;if(c.turn<TURNS)c.turn++;this.checkStory();}
 private checkStory(){const c=this.career!;if(c.pending)return;const e=storyEvents.find(e=>e.turn===c.turn&&!c.seen.includes(e.id));if(e)c.pending={kind:'story',id:e.id};}
 pendingEvent(){const c=this.career;if(!c?.pending)return null;if(c.pending.kind==='story'){const e=storyEvents.find(e=>e.id===c.pending!.id)!;return{title:e.title,text:e.text,choices:e.choices,card:undefined as string|undefined};}const e=cardEvents[+c.pending.id]??cardEvents[0],s=support(c.pending.card!);return{title:e.title,text:e.text.replace('{team}',s.team),choices:e.choices,card:s.id};}
 chooseEvent(i:number){const c=this.career,e=this.pendingEvent();if(!c||!e||!e.choices[i])return null;const v:Choice=e.choices[i];const delta=[0,0,0,0,0];for(const [k,g] of Object.entries(v.stats??{})){delta[+k]=g!;c.stats[+k]+=g!;}if(v.energy)c.energy=clamp(c.energy+v.energy,0,100);if(v.mood)c.mood=clamp(c.mood+v.mood,1,5);if(v.sp)c.sp+=v.sp;let hint:string|undefined;if(e.card){if(v.bond)c.bonds[e.card]=Math.min(100,(c.bonds[e.card]??0)+v.bond);if(v.hint){hint=support(e.card).hint;c.hints[hint]=Math.min(3,(c.hints[hint]??0)+1);}}
  if(c.pending!.kind==='story')c.seen.push(c.pending!.id);c.pending=null;this.checkStory();this.save();return{delta,hint};}
 skillCost(id:string){const s=skill(id),h=this.career?.hints[id]??0;return Math.round(s.cost*(1-.15*h));}
 learn(id:string){const c=this.career;if(!c||c.skills.includes(id))return false;const cost=this.skillCost(id);if(c.sp<cost)return false;c.sp-=cost;c.skills.push(id);this.save();return true;}

 // ── Races ──
 makeRace(course:number,strategy:number){const c=this.career;if(!c||!this.isRaceTurn())return null;const kind:RaceConfig['kind']=c.turn===TRIAL_TURN?'trial':'final';if(kind==='trial')course=0;else if(course<1)course=1;
  const seed=randomSeed(),rand=rng(seed);const style:Record<string,number>={mercury:0,mars:0,earth:1,venus:1,'seed-a':1,jupiter:2,moon:2,'seed-b':2};
  const growth=kind==='trial'?GROWTH_TRIAL:GROWTH_FINAL;const pool=['launch','draft','corner','cooldown','slingshot','perturb','guts','finish'];
  const entries=planets.map(p=>{if(p.id===c.planet)return{id:p.id,planet:p.id,stats:[...c.stats] as Stats,strategy,skills:[...c.skills]};const focus=Math.floor(rand()*5);const stats=p.stats.map((v,k)=>Math.round(v+growth[k]*(.78+rand()*.4)+(k===focus?growth[k]*.25:0))) as Stats;const n=kind==='trial'?1:2+Math.floor(rand()*2);const sk:string[]=[];while(sk.length<n){const s=pool[Math.floor(rand()*pool.length)];if(!sk.includes(s))sk.push(s);}return{id:p.id,planet:p.id,stats,strategy:style[p.id]??1,skills:sk};});
  this.state.race={id:randomSeed(),seed,course,kind,entries,spurt:null};this.save();return this.state.race;}
 setSpurt(tick:number){if(this.state.race&&this.state.race.spurt===null){this.state.race.spurt=tick;this.save();}}
 /** Idempotent per race id. */
 reward(rank:number,time:number){const r=this.state.race,c=this.career;if(!r)return{reward:0,already:true,delta:[0,0,0,0,0],sp:0};const done=this.state.results.find(v=>v.id===r.id);if(done)return{reward:done.reward,already:true,delta:[0,0,0,0,0],sp:0};
  let reward=0;const delta=[0,0,0,0,0];let sp=0;
  if(r.kind==='trial'){reward=rank===1?300:rank<=3?150:60;if(c){const g=rank===1?10:rank<=3?5:0;for(let k=0;k<5;k++){c.stats[k]+=g;delta[k]=g;}sp=rank===1?40:rank<=3?25:10;c.sp+=sp;if(rank>3)c.mood=Math.max(1,c.mood-1);c.trial=rank;c.log=rank<=3?`예선 ${rank}위 통과!`:`예선 ${rank}위. 결승은 그대로 진행됩니다.`;c.turn=TRIAL_TURN+1;this.checkStory();}}
  else{reward=[1500,1100,900,700,600,500,450,400][rank-1]??400;if(c){const score=careerScore(c.stats,c.skills.length)+(8-rank)*40;this.state.hall.unshift({id:r.id,planet:c.planet,stats:[...c.stats] as Stats,skills:[...c.skills],rank,course:r.course,score,grade:scoreGrade(score),trial:c.trial});this.state.hall=this.state.hall.slice(0,12);}}
  this.state.currency+=reward;this.state.results.unshift({id:r.id,rank,time,reward,planet:c?.planet??'earth',course:r.course,kind:r.kind});this.state.results=this.state.results.slice(0,30);this.save();return{reward,already:false,delta,sp};}
 endCareer(){this.state.career=null;this.state.race=null;this.save();}
 reset(){const settings=this.state.settings;this.state=freshSave();this.state.settings=settings;this.storageError='';this.save();}
}
