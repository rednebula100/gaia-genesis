import {planet,planets,type Stats} from './data/planets';
import {supports,support} from './data/support';
import {events} from './data/events';
import {skills} from './data/skills';
export const SAVE_KEY='planet-musume-v1';
export const odds={SSR:3,SR:18,R:79};
export const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
export function rng(seed:number){let s=seed>>>0;return()=>{s+=0x6d2b79f5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export type Career={id:number;planet:string;deck:string[];stats:Stats;energy:number;mood:number;turn:number;sp:number;skills:string[];seed:number;events:number[];log:string;labUsed:string[]};
export type RaceEntry={id:string;planet:string;stats:Stats;strategy:number;skills:string[]};
export type RaceConfig={id:number;seed:number;course:number;entries:RaceEntry[]};
export type Save={schemaVersion:1;currency:number;shards:number;planets:Record<string,number>;supports:Record<string,number>;selected:string;deck:string[];firstScout:boolean;career:Career|null;race:RaceConfig|null;results:{id:number;rank:number;time:number;reward:number}[];veterans:Career[];lastScout:Pull[];intro:boolean};
export type Pull={id:string;grade:string;fresh:boolean;shards:number;kind:'planet'|'support'};
export function freshSave():Save{return{schemaVersion:1,currency:6000,shards:0,planets:{earth:1,'seed-a':1},supports:{tide:1,orbit:1,wind:1},selected:'earth',deck:['tide','orbit','wind'],firstScout:false,career:null,race:null,results:[],veterans:[],lastScout:[],intro:false};}
const validStats=(s:unknown):s is Stats=>Array.isArray(s)&&s.length===5&&s.every(v=>Number.isFinite(v)&&v>=0);
const knownPlanet=(id:string)=>planets.some(p=>p.id===id);
const knownSupport=(id:string)=>supports.some(p=>p.id===id);
const validCareer=(c:Career)=>c&&knownPlanet(c.planet)&&validStats(c.stats)&&Array.isArray(c.deck)&&c.deck.every(knownSupport)&&Array.isArray(c.skills)&&c.skills.every(id=>skills.some(s=>s.id===id))&&Array.isArray(c.events)&&Array.isArray(c.labUsed)&&Number.isInteger(c.turn)&&c.turn>=0&&c.turn<=10&&Number.isFinite(c.energy)&&Number.isFinite(c.seed)&&c.mood>=1&&c.mood<=5&&Number.isFinite(c.sp);
export class GameModel{
 state:Save;storageError='';
 constructor(){this.state=this.load();}
 private load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return freshSave();const s=JSON.parse(raw);if(s.schemaVersion!==1||!Number.isFinite(s.currency)||s.currency<0||!s.planets||!s.supports||!Array.isArray(s.deck)||!Array.isArray(s.results))throw Error('지원되지 않거나 손상된 저장');if(!knownPlanet(s.selected)||!s.planets[s.selected]||!s.deck.every(knownSupport)||!Object.entries(s.planets).every(([id,n])=>knownPlanet(id)&&Number.isInteger(n)&&Number(n)>0)||!Object.entries(s.supports).every(([id,n])=>knownSupport(id)&&Number.isInteger(n)&&Number(n)>0)||s.career&&!validCareer(s.career)||s.race&&(!Array.isArray(s.race.entries)||s.race.entries.length!==8||!s.race.entries.every((r:RaceEntry)=>knownPlanet(r.id)&&knownPlanet(r.planet)&&validStats(r.stats)&&Array.isArray(r.skills)&&r.strategy>=0&&r.strategy<=2)||![0,1].includes(s.race.course)))throw Error('손상된 육성 또는 경기');return {...freshSave(),...s} as Save;}catch{this.storageError='저장 데이터를 읽지 못해 새 기록으로 시작했습니다.';return freshSave();}}
 save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));}catch{this.storageError='저장 공간을 사용할 수 없습니다. 현재 탭에서는 계속 플레이할 수 있습니다.';}}
 scout(kind:'planet'|'support',count:number){if(![1,10].includes(count)||this.state.currency<count*100)return[];this.state.currency-=count*100;const rand=rng(randomSeed()),pool=kind==='planet'?planets:supports;const found:Pull[]=[];
 for(let i=0;i<count;i++){let roll=rand()*100;let grade=roll<3?'SSR':roll<21?'SR':'R';if(kind==='planet'&&count===10&&!this.state.firstScout&&i===9&&!found.some(p=>p.fresh||p.grade==='SSR'))grade='SSR';const candidates=pool.filter(p=>p.grade===grade),p=candidates[Math.floor(rand()*candidates.length)],owned=kind==='planet'?this.state.planets:this.state.supports,fresh=!owned[p.id],shards=fresh?0:grade==='SSR'?30:grade==='SR'?12:5;owned[p.id]=(owned[p.id]??0)+1;this.state.shards+=shards;found.push({id:p.id,grade,fresh,shards,kind});}
 if(kind==='planet'&&count===10)this.state.firstScout=true;this.state.lastScout=found;this.save();return found;}
 select(id:string){if(this.state.planets[id]){this.state.selected=id;this.save();}}
 toggleSupport(id:string){if(!this.state.supports[id])return;const d=this.state.deck;if(d.includes(id))d.splice(d.indexOf(id),1);else if(d.length<4)d.push(id);this.save();}
 start(){const p=planet(this.state.selected),bonus=Math.min(12,((this.state.planets[p.id]??1)-1)*2);this.state.career={id:randomSeed(),planet:p.id,deck:[...this.state.deck],stats:p.stats.map(v=>v+bonus) as Stats,energy:100,mood:3,turn:0,sp:20,skills:[],seed:randomSeed(),events:[],log:'10턴 뒤, 첫 출전입니다.',labUsed:[]};this.state.race=null;this.save();}
 preview(stat:number){const c=this.state.career!;const cards=c.deck.map(support).filter(s=>s.stat===stat);const bonus=cards.reduce((n,s)=>n+s.bonus+Math.min(8,(this.state.supports[s.id]-1)*2),0);return{gain:Math.round(27*(1+bonus/100)*(1+(c.mood-3)*.08)),bonus,energy:18,fail:Math.max(0,Math.round((35-c.energy)*1.45)-c.deck.map(support).reduce((n,s)=>n+s.fail,0))};}
 pendingEvent(){const c=this.state.career;return c?events.find(e=>e.turn===c.turn&&!c.events.includes(e.turn)):undefined;}
 train(stat:number){const c=this.state.career;if(!c||c.turn>=10||this.pendingEvent())return;const p=this.preview(stat),fail=rng(c.seed+c.turn*997)()*100<p.fail;c.turn++;c.energy=Math.max(0,c.energy-p.energy);c.sp+=fail?3:12;if(fail){c.mood=Math.max(1,c.mood-1);c.log='훈련 실패. 체력과 컨디션을 관리하세요.';}else{c.stats[stat]+=p.gain;c.stats[(stat+1)%5]+=5;c.log=`훈련 성공 · +${p.gain} / 서포트 +${p.bonus}%`;}this.save();}
 rest(){const c=this.state.career;if(!c||c.turn>=10||this.pendingEvent())return;c.turn++;c.energy=Math.min(100,c.energy+43);c.mood=Math.min(5,c.mood+1);c.sp+=5;c.log='안정 궤도에서 휴식 · 체력 +43';this.save();}
 chooseEvent(i:number){const c=this.state.career!,e=this.pendingEvent();if(!e||!e.choices[i])return;const v=e.choices[i];c.stats[v.stat]+=v.gain;c.energy=Math.max(0,Math.min(100,c.energy+v.energy));c.mood=Math.min(5,c.mood+v.mood);c.events.push(e.turn);c.log=`${v.label} · 능력 +${v.gain}`;this.save();}
 learn(id:string){const c=this.state.career,s=skills.find(s=>s.id===id);if(!c||!s||c.sp<s.cost||c.skills.includes(id))return;c.sp-=s.cost;c.skills.push(id);this.save();}
 labReward(type:string){const c=this.state.career;if(!c||c.turn>=10||c.labUsed.includes(type)||this.pendingEvent())return false;c.labUsed.push(type);c.turn++;c.energy=Math.max(0,c.energy-12);c.sp+=18;const stat=type==='core'?2:type==='seismic'?4:type==='cosmos'?0:2;const high=rng(c.seed+c.turn)()>.25;const gain=type==='impact'?(high?50:8):35;c.stats[stat]+=gain;if(type==='impact'&&!high){c.mood=Math.max(1,c.mood-1);c.energy=Math.max(0,c.energy-15);}c.log=`특훈 완료 · 능력 +${gain} / 스킬 포인트 +18${type==='impact'&&!high?' · 충돌 회복 필요':''}`;this.save();return true;}
 makeRace(course:number,strategy:number){const c=this.state.career;if(!c||c.turn<10)return null;const seed=randomSeed(),rand=rng(seed);const entries=planets.map((p,i)=>({id:p.id,planet:p.id,stats:p.id===c.planet?[...c.stats] as Stats:p.stats.map(v=>Math.round(v+45+rand()*85)) as Stats,strategy:p.id===c.planet?strategy:i%3,skills:p.id===c.planet?[...c.skills]:['corner']}));this.state.race={id:randomSeed(),seed,course,entries};this.save();return this.state.race;}
 reward(rank:number,time:number){const r=this.state.race,c=this.state.career;if(!r||!c)return 0;const existing=this.state.results.find(v=>v.id===r.id);if(existing)return existing.reward;const reward=350+(8-rank)*70;this.state.currency+=reward;this.state.results.unshift({id:r.id,rank,time,reward});this.state.results=this.state.results.slice(0,30);this.state.veterans.unshift(structuredClone(c));this.state.veterans=this.state.veterans.slice(0,12);this.save();return reward;}
 exchange(){if(this.state.shards<30)return false;this.state.shards-=30;this.state.currency+=300;this.save();return true;}
 reset(){this.state=freshSave();this.storageError='';this.save();}
}
