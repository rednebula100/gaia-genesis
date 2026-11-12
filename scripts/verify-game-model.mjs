import {build} from 'esbuild';
import fs from 'node:fs';
import assert from 'node:assert/strict';
fs.mkdirSync('artifacts/musume',{recursive:true});
await build({entryPoints:['src/game/model.ts','src/game/race.ts'],bundle:true,platform:'node',format:'esm',outdir:'artifacts/musume/check',outExtension:{'.js':'.mjs'}});
const {GameModel}=await import('../artifacts/musume/check/model.mjs');
const {Race}=await import('../artifacts/musume/check/race.mjs');
let saved=null;globalThis.localStorage={getItem:()=>saved,setItem:(_,v)=>saved=v};
const model=new GameModel();model.start();
for(let i=0;i<10;i++){if(model.pendingEvent())model.chooseEvent(0);if(i%3===2)model.rest();else model.train(0);}
if(model.pendingEvent())model.chooseEvent(0);
const checks=[];
for(let course=0;course<2;course++){
 const config=model.makeRace(course,1);config.seed=123456;
 const a=new Race(config),b=new Race(config);a.finish();b.finish();
 assert.equal(a.ranking.length,8);assert(a.racers.every(r=>r.finish>0));
 assert.deepEqual(a.racers,b.racers);assert.deepEqual(a.events,b.events);
 const faster=structuredClone(config);faster.entries[0].stats[0]+=100;
 const c=new Race(faster);c.finish();assert(c.racers[0].finish<a.racers[0].finish);
 const different=structuredClone(config);different.entries[0].strategy=2;
 const d=new Race(different);d.finish();assert.notEqual(d.racers[0].finish,a.racers[0].finish);
 const before=model.state.currency;model.reward(3,a.racers[0].finish);const paid=model.state.currency;model.reward(3,a.racers[0].finish);assert(paid>before);assert.equal(model.state.currency,paid);
 checks.push({course,allFinishedAt:a.time,player:a.racers[0].finish,speedPlus100:c.racers[0].finish,lateStrategy:d.racers[0].finish,deterministic:true,rewardOnce:true,skills:a.events.filter(e=>e.type==='skill').length});
}
assert.deepEqual(new GameModel().state,model.state);
saved='{corrupt';const recovered=new GameModel();assert.equal(recovered.state.currency,6000);assert(recovered.storageError);
fs.writeFileSync('artifacts/musume/model-check.json',JSON.stringify(checks,null,2));console.log(JSON.stringify(checks,null,2));
