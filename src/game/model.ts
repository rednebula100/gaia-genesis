import {planet,planets,STAT_CAP,LEGACY_IDS,type Stats} from './data/planets';
import {supports,support} from './data/support';
import {storyEvents,cardEvents,type Choice} from './data/events';
import {skills,skill} from './data/skills';
import {courses,goals,openRaceCourse} from './data/races';
import {tree} from './data/tree';

export const SAVE_KEY='planet-musume-v1';
export const odds={SSR:3,SR:18,R:79};
export const SCOUT_COST=100;
export const TURNS=24;
export const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
export function rng(seed:number){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Facility base gains, indexed like Stats. */
export const facilities=[
 {name:'속도',gains:[38,0,14,0,0],energy:-19},
 {name:'지구력',gains:[0,36,0,14,0],energy:-18},
 {name:'중력',gains:[0,14,36,0,0],energy:-20},
 {name:'자전력',gains:[10,0,10,32,0],energy:-20},
 {name:'궤도감각',gains:[10,0,0,0,34],energy:5},
] as const;
export const moods=['최악','저조','보통','호조','절호조'] as const;
export const FRIEND_BOND=80;
export const seasons=['데뷔기','클래식기','시니어기'] as const;
export const seasonOf=(turn:number)=>turn<=8?0:turn<=16?1:2;
export const isCamp=(turn:number)=>(turn>=13&&turn<=15)||(turn>=21&&turn<=23);
export const missions=[
 {id:'core',name:'코어 드릴',note:'층 경계에서 정확히 멈춰라',stats:[2,3],icon:'core'},
 {id:'seismic',name:'지진파 판독',note:'P파는 치고, S파는 참아라',stats:[4,0],icon:'tide'},
 {id:'swing',name:'스윙바이',note:'중력으로 휘어 게이트를 통과',stats:[0,4],icon:'orbital'},
 {id:'impact',name:'거대 충돌',note:'각도와 속도를 맞춰 달을 만들어라',stats:[1,2],icon:'impact'},
] as const;

export type Factor={stat:number;stars:number;from:string};
export type Pending={kind:'story'|'card'|'legacy';id:string;card?:string}|null;
export type Career={id:number;planet:string;deck:string[];stats:Stats;energy:number;maxEnergy:number;mood:number;turn:number;sp:number;skills:string[];hints:Record<string,number>;seed:number;bonds:Record<string,number>;uses:number[];missionUsed:string[];seen:string[];pending:Pending;cleared:number[];alarms:number;factors:Factor[];races:{turn:number;course:number;rank:number;kind:string}[];log:string;ended?:'failed'|'done'};
export type RaceEntry={id:string;planet:string;stats:Stats;strategy:number;skills:string[]};
export type Inputs={spurt?:{tick:number;mul:number;label:string};mash?:{tick:number;mul:number}};
export type RaceConfig={id:number;seed:number;course:number;kind:'open'|'goal'|'final';need:number;entries:RaceEntry[];inputs:Inputs;turn:number};
export type ResultRecord={id:number;rank:number;time:number;reward:number;planet:string;course:number;kind:string};
export type HallRecord={id:number;planet:string;stats:Stats;skills:string[];rank:number;course:number;score:number;grade:string;result:string};
export type Pull={id:string;grade:string;shown:string;fresh:boolean;shards:number;kind:'planet'|'support'};
export type Save={schemaVersion:3;currency:number;shards:number;planets:Record<string,number>;supports:Record<string,number>;selected:string;deck:string[];parents:number[];firstScout:boolean;career:Career|null;race:RaceConfig|null;results:ResultRecord[];hall:HallRecord[];lastScout:Pull[];intro:boolean;settings:{bgm:boolean;sfx:boolean};tree:Record<string,number>;dev:boolean};
export type TrainResult={ok:boolean;stat:number;delta:number[];friends:string[];levelUp:boolean;energy:number;mood:number;hint?:string;tier:'fail'|'good'|'great'|'friend';cards:number};

export function freshSave():Save{return{schemaVersion:3,currency:6000,shards:0,planets:{earth:1,gaia:1},supports:{tide:1,orbit:1,wind:1},selected:'earth',deck:['tide','orbit','wind'],parents:[],firstScout:false,career:null,race:null,results:[],hall:[],lastScout:[],intro:false,settings:{bgm:true,sfx:true},tree:{},dev:false};}
const knownPlanet=(id:string)=>planets.some(p=>p.id===id);
const knownSupport=(id:string)=>supports.some(p=>p.id===id);
const validStats=(s:unknown):s is Stats=>Array.isArray(s)&&s.length===5&&s.every(v=>Number.isFinite(v)&&v>=0);
export const facilityLevel=(uses:number,turn=0)=>isCamp(turn)?5:Math.min(5,1+Math.floor(uses/3));
export function careerScore(stats:Stats,skillCount:number){return Math.round(stats.reduce((a,b)=>a+b,0)+skillCount*30);}
export const SCORE_GRADES:[string,number][]=[['SS',3400],['S+',3100],['S',2800],['A+',2550],['A',2300],['B+',2100],['B',1900],['C+',1700],['C',1500],['D',1300],['E',1100],['F',900],['G',0]];
export const scoreGrade=(score:number)=>SCORE_GRADES.find(([,t])=>score>=t)![0];
const rename=(o:Record<string,number>)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[LEGACY_IDS[k]??k,v]).filter(([k])=>knownPlanet(k as string)));

export class GameModel{
 state:Save;storageError='';
 constructor(){this.state=this.load();}
 private load():Save{try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return freshSave();const s=JSON.parse(raw);
  if(!Number.isFinite(s.currency)||s.currency<0||!s.planets||!s.supports)throw Error('bad');
  const base=freshSave();
  if(s.schemaVersion===1||s.schemaVersion===2){// Older rules → V9: keep collection, wallet and history; careers restart.
   const pl=rename(s.planets);if(!Object.keys(pl).length)pl.earth=1;const sel=LEGACY_IDS[s.selected]??s.selected;
   this.storageError='새 규칙(V9)으로 저장을 옮겼습니다. 보유 선수·카드·크레딧은 유지되고 진행 중 시즌은 초기화되었습니다.';
   return{...base,currency:s.currency,shards:s.shards|0,planets:pl,supports:Object.fromEntries(Object.entries(s.supports).filter(([k])=>knownSupport(k))) as Record<string,number>,selected:pl[sel]?sel:Object.keys(pl)[0],deck:(s.deck??[]).filter((id:string)=>s.supports[id]&&knownSupport(id)).slice(0,4),firstScout:!!s.firstScout,intro:true,results:(s.results??[]).slice(0,30).map((r:ResultRecord)=>({...r,planet:LEGACY_IDS[r.planet]??r.planet??'earth'})),settings:{...base.settings,...(s.settings??{})}};}
  if(s.schemaVersion!==3)throw Error('bad');
  if(!knownPlanet(s.selected)||!s.planets[s.selected])s.selected=Object.keys(s.planets).find(knownPlanet)??'earth';
  s.deck=(s.deck??[]).filter((id:string)=>s.supports[id]);
  if(s.career&&(!knownPlanet(s.career.planet)||!validStats(s.career.stats)||!Array.isArray(s.career.uses)))s.career=null;
  if(s.race&&(!Array.isArray(s.race.entries)||!courses[s.race.course]))s.race=null;
  return{...base,...s,settings:{...base.settings,...(s.settings??{})},tree:s.tree??{}};
 }catch{this.storageError='저장 데이터를 읽지 못해 새 기록으로 시작했습니다.';return freshSave();}}
 save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));}catch{this.storageError='저장 공간을 사용할 수 없습니다. 이 탭에서는 계속 플레이할 수 있습니다.';}}
 lv=(id:string)=>this.state.tree[id]??0;

 // ── Scout ── results are fixed at the roll; `shown` is only the opening star colour (promotion presentation).
 scout(kind:'planet'|'support',count:number):Pull[]{if(![1,10].includes(count)||this.state.currency<count*SCOUT_COST)return[];this.state.currency-=count*SCOUT_COST;const rand=rng(randomSeed()),pool=kind==='planet'?planets:supports;const found:Pull[]=[];
  for(let i=0;i<count;i++){const roll=rand()*100;let grade=roll<odds.SSR?'SSR':roll<odds.SSR+odds.SR?'SR':'R';if(kind==='planet'&&count===10&&!this.state.firstScout&&i===9&&!found.some(p=>p.fresh||p.grade==='SSR'))grade='SSR';
   const candidates=pool.filter(p=>p.grade===grade),p=candidates[Math.floor(rand()*candidates.length)],owned=kind==='planet'?this.state.planets:this.state.supports,fresh=!owned[p.id],shards=fresh?0:grade==='SSR'?30:grade==='SR'?12:5;owned[p.id]=(owned[p.id]??0)+1;this.state.shards+=shards;
   const x=rand();const shown=grade==='SSR'?(x<.1?'R':x<.45?'SR':'SSR'):grade==='SR'?(x<.2?'R':'SR'):'R';found.push({id:p.id,grade,shown,fresh,shards,kind});}
  if(kind==='planet'&&count===10)this.state.firstScout=true;this.state.lastScout=found;this.save();return found;}
 exchange(){if(this.state.shards<30)return false;this.state.shards-=30;this.state.currency+=300;this.save();return true;}
 select(id:string){if(this.state.planets[id]){this.state.selected=id;this.save();}}
 toggleSupport(id:string){if(!this.state.supports[id])return;const d=this.state.deck;if(d.includes(id))d.splice(d.indexOf(id),1);else if(d.length<4)d.push(id);this.save();}
 toggleParent(id:number){const p=this.state.parents;if(p.includes(id))p.splice(p.indexOf(id),1);else{if(p.length>=2)p.shift();p.push(id);}this.save();}
 cardLevel=(id:string)=>Math.min(4,(this.state.supports[id]??1)-1);
 planetBonus=(id:string)=>Math.min(25,((this.state.planets[id]??1)-1)*5);
 // ── Upgrade tree ──
 treeCost(id:string){const n=tree.find(t=>t.id===id)!;return n.cost(this.lv(id));}
 canBuy(id:string){const n=tree.find(t=>t.id===id)!;if(this.lv(id)>=n.max)return false;if(n.req&&!this.lv(n.req))return false;const [sh,cr]=this.treeCost(id);return this.state.shards>=sh&&this.state.currency>=cr;}
 buy(id:string){if(!this.canBuy(id))return false;const [sh,cr]=this.treeCost(id);this.state.shards-=sh;this.state.currency-=cr;this.state.tree[id]=this.lv(id)+1;this.save();return true;}
 factorsFrom(ids:number[]):Factor[]{const out:Factor[]=[];for(const id of ids){const h=this.state.hall.find(v=>v.id===id);if(!h)continue;const top=[...h.stats.keys()].sort((a,b)=>h.stats[b]-h.stats[a]).slice(0,2);for(const k of top){const v=h.stats[k];out.push({stat:k,stars:v>=600?3:v>=420?2:1,from:h.planet});}}return out;}

 // ── Career ──
 start(){const p=planet(this.state.selected),bonus=this.planetBonus(p.id)+this.lv('start')*10;const bonds:Record<string,number>={};for(const id of this.state.deck)bonds[id]=support(id).bond+this.lv('bond')*10;
  const stats=p.stats.map(v=>v+bonus) as Stats;for(const id of this.state.deck)stats[support(id).stat]+=support(id).start;const factors=this.factorsFrom(this.state.parents);for(const f of factors)stats[f.stat]+=f.stars*8;
  const maxEnergy=100+this.lv('energy')*5;
  this.state.career={id:randomSeed(),planet:p.id,deck:[...this.state.deck],stats,energy:maxEnergy,maxEnergy,mood:3,turn:1,sp:40+this.lv('sp')*30,skills:[],hints:{},seed:randomSeed(),bonds,uses:[0,0,0,0,0],missionUsed:[],seen:[],pending:null,cleared:[],alarms:2+this.lv('alarm'),factors,races:[],log:'데뷔 시즌 시작. 8턴에 데뷔전이 있습니다.'};this.state.race=null;this.checkStory();this.save();}
 get career(){return this.state.career;}
 goal(turn=this.career?.turn??0){return goals.find(g=>g.turn===turn);}
 nextGoal(){const t=this.career?.turn??0;return goals.find(g=>g.turn>=t);}
 isRaceTurn(){const c=this.career;return !!c&&!c.ended&&!!this.goal(c.turn)&&!c.cleared.includes(c.turn);}
 canAct(){const c=this.career;return !!c&&!c.ended&&!c.pending&&!this.isRaceTurn()&&!this.racePending();}
 deal(turn=this.career?.turn??1):string[][]{const c=this.career;const out:string[][]=[[],[],[],[],[]];if(!c)return out;const r=rng(c.seed^Math.imul(turn+11,2654435761));for(const id of c.deck){const s=support(id),x=r();let at=-1;if(x<.5)at=s.stat;else if(x<.9){const others=[0,1,2,3,4].filter(i=>i!==s.stat);at=others[Math.floor((x-.5)/.1)];}if(at>=0)out[at].push(id);}return out;}
 moodMul(){return 1+((this.career?.mood??3)-3)*.1;}
 isFriend(id:string,facility:number){const c=this.career;return !!c&&support(id).stat===facility&&(c.bonds[id]??0)>=FRIEND_BOND;}
 preview(i:number){const c=this.career!;const cards=this.deal()[i];const lv=facilityLevel(c.uses[i],c.turn);let bonus=0,friend=1;for(const id of cards){bonus+=support(id).bonus+this.cardLevel(id)*3;if(this.isFriend(id,i))friend*=1.15+support(id).friend/100;}
  const camp=isCamp(c.turn)?1+this.lv('camp')*.1:1;const mul=(1+.1*(lv-1))*(1+bonus/100)*this.moodMul()*(1+.06*cards.length)*friend*(1+this.lv('gear')*.04)*camp;const gains=facilities[i].gains.map((g,k)=>g?Math.min(Math.round(g*mul),STAT_CAP-c.stats[k]):0);
  const failDown=cards.reduce((n,id)=>n+support(id).fail,0);const fail=c.energy>=50?0:clamp(Math.round((50-c.energy)*1.9)-failDown,0,95);
  return{gains,energy:facilities[i].energy,fail,cards,lv,friends:cards.filter(id=>this.isFriend(id,i)),sp:5+cards.length*3,hintCards:cards.filter(id=>this.hintChance(c,id,i)>.5)};}
 private hintChance(c:Career,id:string,i:number){return rng(c.seed^Math.imul(c.turn+71,97)^id.length*131^i)();}
 train(i:number):TrainResult|null{const c=this.career;if(!c||!this.canAct()||i<0||i>4)return null;const p=this.preview(i);const r=rng(c.seed^Math.imul(c.turn+101,40503)^i*7919);const failed=r()*100<p.fail;const delta=[0,0,0,0,0];let levelUp=false,hint:string|undefined;const before={energy:c.energy,mood:c.mood};
  if(failed){delta[i]=-Math.min(c.stats[i],p.fail>30?15:8);if(p.fail>30)delta[(i+1)%5]=-8;c.energy=clamp(c.energy-5,0,c.maxEnergy);c.mood=Math.max(1,c.mood-1);c.log='훈련 실패. 무리했습니다.';}
  else{for(let k=0;k<5;k++)delta[k]=p.gains[k];c.energy=clamp(c.energy+p.energy,0,c.maxEnergy);const oldLv=facilityLevel(c.uses[i]);c.uses[i]++;levelUp=!isCamp(c.turn)&&facilityLevel(c.uses[i])>oldLv;c.sp+=p.sp;
   for(const id of p.cards)c.bonds[id]=Math.min(100,(c.bonds[id]??0)+(this.isFriend(id,i)?6:12));
   const hc=p.hintCards[0];if(hc&&r()<.6+this.lv('hint')*.08){hint=support(hc).hint;c.hints[hint]=Math.min(3,(c.hints[hint]??0)+1);}
   c.log=p.friends.length?'우정 트레이닝!':p.cards.length>=2?'훈련 대성공':'훈련 완료';
   if(p.cards.length&&r()<.26){const id=p.cards[Math.floor(r()*p.cards.length)];c.pending={kind:'card',id:String(Math.floor(r()*cardEvents.length)),card:id};}}
  for(let k=0;k<5;k++)c.stats[k]=clamp(c.stats[k]+delta[k],0,STAT_CAP);this.advance();this.save();
  return{ok:!failed,stat:i,delta,friends:failed?[]:p.friends,levelUp,energy:c.energy-before.energy,mood:c.mood-before.mood,hint,tier:failed?'fail':p.friends.length?'friend':p.cards.length>=2?'great':'good',cards:p.cards.length};}
 rest(){const c=this.career;if(!c||!this.canAct())return null;const before=c.energy;const r=rng(c.seed+c.turn*7)();const gain=r<.15?30:r<.85?50:70;c.energy=clamp(c.energy+gain,0,c.maxEnergy);if(c.mood<3)c.mood++;c.sp+=5;c.log=gain>=70?'숙면했습니다! 체력 대폭 회복.':gain<=30?'잠을 설쳤습니다.':'충분히 쉬었습니다.';this.advance();this.save();return{energy:c.energy-before,gain};}
 outing(){const c=this.career;if(!c||!this.canAct())return null;const m=c.mood;c.mood=Math.min(5,c.mood+(rng(c.seed+c.turn*13)()<.3?2:1));const before=c.energy;c.energy=clamp(c.energy+15,0,c.maxEnergy);for(const id of c.deck)c.bonds[id]=Math.min(100,(c.bonds[id]??0)+5);c.log='관측회에 다녀왔습니다.';this.advance();this.save();return{mood:c.mood-m,energy:c.energy-before};}
 missionAvailable(id:string){const c=this.career;return !!c&&this.canAct()&&!c.missionUsed.includes(`${seasonOf(c.turn)}:${id}`);}
 /** grade: 3=S 2=A 1=B 0=C */
 missionReward(id:string,grade:number){const c=this.career;if(!c||!this.missionAvailable(id))return null;const m=missions.find(m=>m.id===id)!;c.missionUsed.push(`${seasonOf(c.turn)}:${id}`);const main=[10,22,34,48][grade],sub=[4,10,16,24][grade];const delta=[0,0,0,0,0];delta[m.stats[0]]+=main;delta[m.stats[1]]+=sub;for(let k=0;k<5;k++)c.stats[k]=clamp(c.stats[k]+delta[k],0,STAT_CAP);c.energy=clamp(c.energy-10,0,c.maxEnergy);c.sp+=10+grade*8;if(grade===3)c.mood=Math.min(5,c.mood+1);c.log=`관측소 미션 ${['C','B','A','S'][grade]} 판정`;this.advance();this.save();return{delta,sp:10+grade*8};}
 private advance(){const c=this.career!;if(c.turn<TURNS)c.turn++;this.checkStory();}
 private checkStory(){const c=this.career!;if(c.pending)return;if((c.turn===9||c.turn===17)&&c.factors.length&&!c.seen.includes('legacy'+c.turn)){c.pending={kind:'legacy',id:'legacy'+c.turn};return;}const e=storyEvents.find(e=>e.turn===c.turn&&!c.seen.includes(e.id));if(e)c.pending={kind:'story',id:e.id};}
 pendingEvent(){const c=this.career;if(!c?.pending)return null;if(c.pending.kind==='legacy')return{title:'계승 각성',text:'부모 선수들의 별빛이 깨어납니다.',choices:[{label:'받아들인다',stats:Object.fromEntries(c.factors.map(f=>[f.stat,0])) } as Choice],card:undefined as string|undefined,legacy:true};
  if(c.pending.kind==='story'){const e=storyEvents.find(e=>e.id===c.pending!.id)!;return{title:e.title,text:e.text,choices:e.choices,card:undefined as string|undefined,legacy:false};}const e=cardEvents[+c.pending.id]??cardEvents[0],s=support(c.pending.card!);return{title:e.title,text:e.text.replace('{team}',s.team),choices:e.choices,card:s.id,legacy:false};}
 chooseEvent(i:number){const c=this.career,e=this.pendingEvent();if(!c||!e||!e.choices[i])return null;const delta=[0,0,0,0,0];let hint:string|undefined;
  if(c.pending!.kind==='legacy'){for(const f of c.factors)delta[f.stat]+=f.stars*12;c.seen.push(c.pending!.id);}
  else{const v:Choice=e.choices[i];for(const [k,g] of Object.entries(v.stats??{}))delta[+k]+=g!;if(v.energy)c.energy=clamp(c.energy+v.energy,0,c.maxEnergy);if(v.mood)c.mood=clamp(c.mood+v.mood,1,5);if(v.sp)c.sp+=v.sp;if(e.card){if(v.bond)c.bonds[e.card]=Math.min(100,(c.bonds[e.card]??0)+v.bond);if(v.hint){hint=support(e.card).hint;c.hints[hint]=Math.min(3,(c.hints[hint]??0)+1);}}if(c.pending!.kind==='story')c.seen.push(c.pending!.id);}
  for(let k=0;k<5;k++)c.stats[k]=clamp(c.stats[k]+delta[k],0,STAT_CAP);c.pending=null;this.checkStory();this.save();return{delta,hint};}
 skillCost(id:string){const s=skill(id),h=this.career?.hints[id]??0;return Math.round(s.cost*(1-.15*h));}
 learn(id:string){const c=this.career;if(!c||c.skills.includes(id))return false;const cost=this.skillCost(id);if(c.sp<cost)return false;c.sp-=cost;c.skills.push(id);this.save();return true;}

 // ── Races ──
 /** Opponents grow with the calendar so every race stays contested. */
 makeRace(course:number,strategy:number,open=false){const c=this.career;if(!c||c.ended)return null;const g=this.goal(c.turn);let kind:RaceConfig['kind'];let need=8;
  if(open){if(!this.canAct())return null;kind='open';course=openRaceCourse(c.turn);}else{if(!this.isRaceTurn()||!g)return null;kind=c.turn===TURNS?'final':'goal';need=g.need;course=g.course>=0?g.course:(course===2?2:1);}
  const seed=randomSeed(),rand=rng(seed);const progress=c.turn/TURNS;const diff=kind==='final'?1.06:kind==='goal'?.92:.84;const growth=[300,270,250,240,230];
  const pool=planets.filter(p=>p.id!==c.planet).sort(()=>rand()-.5).slice(0,7);const skillPool=skills.filter(s=>!s.gold).map(s=>s.id);
  const others:RaceEntry[]=pool.map(p=>{const focus=Math.floor(rand()*5);const stats=p.stats.map((v,k)=>Math.round(Math.min(STAT_CAP,v+growth[k]*progress**.95*diff*(.8+rand()*.4)+(k===focus?50*progress:0)))) as Stats;const n=Math.round(1+progress*3+rand());const sk:string[]=[];while(sk.length<n){const s=skillPool[Math.floor(rand()*skillPool.length)];if(!sk.includes(s))sk.push(s);}return{id:p.id,planet:p.id,stats,strategy:Math.floor(rand()*4),skills:sk};});
  const me:RaceEntry={id:c.planet,planet:c.planet,stats:[...c.stats] as Stats,strategy,skills:[...c.skills]};const gate=Math.floor(rand()*8);others.splice(gate,0,me);
  this.state.race={id:randomSeed(),seed,course,kind,need,entries:others,inputs:{},turn:c.turn};this.save();return this.state.race;}
 cancelRace(){const r=this.state.race;if(r&&r.kind==='open'&&!this.state.results.find(v=>v.id===r.id)){this.state.race=null;this.save();}}
 racePending(){const r=this.state.race,c=this.career;return !!r&&!!c&&r.turn===c.turn&&!this.state.results.find(v=>v.id===r.id);}
 setInput(k:'spurt'|'mash',v:{tick:number;mul:number;label?:string}){const r=this.state.race;if(r&&!r.inputs[k]){(r.inputs as Record<string,unknown>)[k]=v;this.save();}}
 /** Idempotent per race id. */
 reward(rank:number,time:number){const r=this.state.race,c=this.career;const empty={reward:0,already:true,delta:[0,0,0,0,0],sp:0,pass:true,shards:0};if(!r)return empty;const done=this.state.results.find(v=>v.id===r.id);if(done)return{...empty,reward:done.reward,pass:rank<=r.need};
  let reward=0,sp=0,shards=0;const delta=[0,0,0,0,0];const pass=rank<=r.need;
  if(c&&!c.ended){c.races.push({turn:c.turn,course:r.course,rank,kind:r.kind});
   if(r.kind==='open'){const g=rank===1?14:rank<=3?8:rank<=5?4:0;for(let k=0;k<5;k++)delta[k]=g;sp=rank===1?45:rank<=3?30:15;reward=rank===1?250:rank<=3?150:60;c.energy=clamp(c.energy-20,0,c.maxEnergy);c.log=`오픈 경기 ${rank}위`;this.advance();}
   else if(r.kind==='goal'){if(pass){const g=c.turn===8?10:18;for(let k=0;k<5;k++)delta[k]=g;sp=c.turn===8?40:60;reward=c.turn===8?300:600;c.cleared.push(c.turn);c.log=`${this.goal(c.turn)!.name} ${rank}위 · 목표 달성!`;this.advance();}else{reward=60;c.log=`${rank}위. 목표(${r.need}위 이내) 미달`;}}
   else{c.cleared.push(c.turn);reward=[1800,1300,1000,800,650,550,450,400][rank-1]??400;const score=careerScore(c.stats,c.skills.length)+(8-rank)*50;const grade=scoreGrade(score);shards=[15,25,35,45,55,70,85,100,120,150,180,220,260][Math.max(0,12-SCORE_GRADES.findIndex(([gg])=>gg===grade))];this.state.shards+=shards;c.ended='done';this.state.hall.unshift({id:r.id,planet:c.planet,stats:[...c.stats] as Stats,skills:[...c.skills],rank,course:r.course,score,grade,result:rank===1?'G1 우승':`G1 ${rank}위`});this.state.hall=this.state.hall.slice(0,20);}
   for(let k=0;k<5;k++)c.stats[k]=clamp(c.stats[k]+delta[k],0,STAT_CAP);c.sp+=sp;if(rank>5&&r.kind!=='final')c.mood=Math.max(1,c.mood-1);if(rank===1)c.mood=Math.min(5,c.mood+1);}
  this.state.currency+=reward;this.state.results.unshift({id:r.id,rank,time,reward,planet:c?.planet??'earth',course:r.course,kind:r.kind});this.state.results=this.state.results.slice(0,30);this.save();return{reward,already:false,delta,sp,pass,shards};}
 /** Goal failed: spend an alarm clock to rerun, or end the season. */
 retry(){const c=this.career;if(!c||c.alarms<=0)return false;c.alarms--;this.state.race=null;this.save();return true;}
 giveUp(){const c=this.career;if(!c)return;const score=careerScore(c.stats,c.skills.length);const grade=scoreGrade(score);c.ended='failed';this.state.hall.unshift({id:randomSeed(),planet:c.planet,stats:[...c.stats] as Stats,skills:[...c.skills],rank:0,course:0,score,grade,result:`${seasons[seasonOf(c.turn)]} 탈락`});this.state.hall=this.state.hall.slice(0,20);this.state.shards+=10;this.save();}
 endCareer(){this.state.career=null;this.state.race=null;this.save();}
 reset(){const settings=this.state.settings;this.state=freshSave();this.state.settings=settings;this.storageError='';this.save();}
}
