// V9 model checks: 24-turn career with goals, deterministic races and inputs, training matters, idempotent rewards, save migration.
import {build} from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['src/game/model.ts','src/game/race.ts'],bundle:true,platform:'node',format:'esm',outdir:'artifacts/musume/check',outExtension:{'.js':'.mjs'},logLevel:'error'});
const {GameModel,TURNS}=await import('../artifacts/musume/check/model.mjs');
const {Race}=await import('../artifacts/musume/check/race.mjs');
let saved=null;globalThis.localStorage={getItem:()=>saved,setItem:(_,v)=>saved=v};
const m=new GameModel();m.start();let guard=0;const ranks=[];
while(m.career&&!m.career.ended&&guard++<120){const c=m.career;if(c.pending){m.chooseEvent(0);continue;}
 if(m.isRaceTurn()){const cfg=m.makeRace(1,1);const a=new Race(structuredClone(cfg),c.planet),b=new Race(structuredClone(cfg),c.planet);a.finishAll();b.finishAll();
  assert(a.racers.every(r=>r.finish>0));assert.deepEqual(a.events,b.events);
  const s=structuredClone(cfg);s.inputs={spurt:{tick:900,mul:1.065,label:'PERFECT'}};const x=new Race(structuredClone(s),c.planet),y=new Race(structuredClone(s),c.planet);x.finishAll();y.finishAll();assert.deepEqual(x.racers.map(r=>r.finish),y.racers.map(r=>r.finish));
  const fast=structuredClone(cfg);fast.entries.find(e=>e.planet===c.planet).stats[0]+=300;const f=new Race(fast,c.planet);f.finishAll();assert(f.racer(c.planet).finish<a.racer(c.planet).finish);
  const rank=a.rankOf(c.planet);ranks.push(rank);const before=m.state.currency;const r1=m.reward(rank,1);assert.equal(m.state.currency,before+r1.reward);assert(m.reward(rank,1).already);
  if(!r1.pass&&cfg.kind==='goal'){if(!m.retry()){m.giveUp();break;}}continue;}
 if(c.energy<45)m.rest();else m.train(c.turn%5);}
assert(m.state.hall.length===1,'career archived');m.endCareer();
saved=JSON.stringify({schemaVersion:2,currency:1234,shards:7,planets:{earth:1,'seed-b':2},supports:{tide:1,roche:1},selected:'seed-b',deck:['roche'],results:[],firstScout:true});const mig=new GameModel();assert.equal(mig.state.schemaVersion,3);assert.equal(mig.state.planets.theia,2);assert.equal(mig.state.selected,'theia');
console.log('game model ok · race ranks',ranks.join(','),'· final',m.state.hall[0]?.grade,'turns',TURNS);
