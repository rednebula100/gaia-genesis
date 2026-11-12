// V8 model checks: deterministic races, training matters, idempotent rewards, save migration.
import {build} from 'esbuild';
import assert from 'node:assert/strict';
await build({entryPoints:['src/game/model.ts','src/game/race.ts'],bundle:true,platform:'node',format:'esm',outdir:'artifacts/musume/check',outExtension:{'.js':'.mjs'},logLevel:'error'});
const {GameModel,TRIAL_TURN,TURNS}=await import('../artifacts/musume/check/model.mjs');
const {Race}=await import('../artifacts/musume/check/race.mjs');
let saved=null;globalThis.localStorage={getItem:()=>saved,setItem:(_,v)=>saved=v};
const m=new GameModel();m.start();
while(m.career&&!m.isRaceTurn()){if(m.career.pending){m.chooseEvent(0);continue;}if(m.career.energy<45)m.rest();else m.train(m.career.turn%5);}
assert.equal(m.career.turn,TRIAL_TURN);
const trial=m.makeRace(0,1);assert.equal(trial.kind,'trial');
const a=new Race(structuredClone(trial),m.career.planet),b=new Race(structuredClone(trial),m.career.planet);a.finishAll();b.finishAll();
assert(a.racers.every(r=>r.finish>0));assert.deepEqual(a.events,b.events);assert.deepEqual(a.ranking.map(r=>r.id),b.ranking.map(r=>r.id));
// Spurt input is part of the config, so a replay with the same tick matches.
const s1=structuredClone(trial);s1.spurt=1500;const c1=new Race(structuredClone(s1),m.career.planet),c2=new Race(structuredClone(s1),m.career.planet);c1.finishAll();c2.finishAll();assert.deepEqual(c1.racers.map(r=>r.finish),c2.racers.map(r=>r.finish));
// Training matters: more speed finishes sooner.
const fast=structuredClone(trial);const me=fast.entries.find(e=>e.planet===m.career.planet);me.stats[0]+=150;const f=new Race(fast,m.career.planet);f.finishAll();assert(f.racer(m.career.planet).finish<a.racer(m.career.planet).finish);
const rank=a.ranking.findIndex(r=>r.id===m.career.planet)+1;const before=m.state.currency;const r1=m.reward(rank,1);const r2=m.reward(rank,1);assert.equal(m.state.currency,before+r1.reward);assert(r2.already);
assert.equal(m.career.turn,TRIAL_TURN+1);
while(m.career&&!m.isRaceTurn()){if(m.career.pending){m.chooseEvent(0);continue;}if(m.career.energy<45)m.rest();else m.train(1);}
assert.equal(m.career.turn,TURNS);const fin=m.makeRace(2,2);assert.equal(fin.kind,'final');const fr=new Race(fin,m.career.planet);fr.finishAll();m.reward(fr.ranking.findIndex(r=>r.id===m.career.planet)+1,1);assert.equal(m.state.hall.length,1);m.endCareer();
// V1 save migrates collection and wallet.
saved=JSON.stringify({schemaVersion:1,currency:1234,shards:7,planets:{earth:1,jupiter:2},supports:{tide:1,roche:1},selected:'jupiter',deck:['roche'],results:[],firstScout:true});const mig=new GameModel();assert.equal(mig.state.schemaVersion,2);assert.equal(mig.state.currency,1234);assert.equal(mig.state.planets.jupiter,2);assert.equal(mig.state.career,null);
console.log('game model ok');
