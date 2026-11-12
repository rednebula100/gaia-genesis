import {chromium} from 'playwright';
import fs from 'node:fs';import assert from 'node:assert/strict';
const url=process.env.GAIA_URL||'http://127.0.0.1:5179/gaia-genesis/';
const out='docs/screenshots/planet-musume';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:'artifacts/musume/video',size:{width:1280,height:720}}});
const p=await context.newPage(),errors=[],layouts=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const click=a=>p.locator(`[data-do="${a}"]`).first().click();
const snap=()=>p.evaluate(()=>musume.snapshot);
const shot=async(name)=>{await p.waitForTimeout(850);await p.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88});};
async function layout(screen){const v=await p.evaluate(()=>({screen:document.querySelector('#game-root').dataset.screen,width:innerWidth,height:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,clipped:[...document.querySelectorAll('#game-root button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&!b.closest('.support-roster,.game-dialog')&&(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5)}).map(b=>b.dataset.do)}));assert.equal(v.sw,v.width);assert.equal(v.sh,v.height);assert.deepEqual(v.clipped,[],JSON.stringify(v));layouts.push({...v,checked:screen});}
try{
 await p.goto(url);await p.waitForFunction(()=>window.musume?.snapshot.ready,null,{timeout:120000});
 for(const [width,height]of [[1920,1080],[1600,900],[1280,720]]){await p.setViewportSize({width,height});await layout('home');await shot(`home-${width}`);}
 await click('nav:scout');await click('pull:1');await click('revealAll');await click('revealClose');await click('pull:10');await click('revealAll');await shot('scout');await click('revealClose');
 await click('kind:support');await click('pull:1');await click('revealAll');await click('revealClose');await click('pull:10');await click('revealAll');await shot('support');await click('revealClose');
 assert.equal((await snap()).save.currency,3800);await click('nav:collection');await layout('collection');await shot('collection');
 await click('nav:setup');await layout('setup');await shot('setup');await click('start');await click('special');await click('lab:core');
 await p.waitForFunction(()=>window.gaia?.snapshot.ready&&!gaia.snapshot.building,null,{timeout:240000});await p.waitForTimeout(1500);
 await p.click('[data-layer="0"]');await p.locator('[data-control=cut]').fill('135');await p.locator('[data-control=cut]').dispatchEvent('input');await p.waitForFunction(()=>!document.querySelector('[data-claim]').disabled);await shot('lab');
 await p.click('[data-claim]');assert.equal((await snap()).save.career.turn,1);assert.deepEqual((await snap()).save.career.labUsed,['core']);
 for(const [width,height]of [[1920,1080],[1600,900],[1280,720]]){await p.setViewportSize({width,height});await layout('training');await shot(`training-${width}`);}
 const saved=(await snap()).save.career;await p.reload();await p.waitForFunction(()=>window.musume?.snapshot.ready,null,{timeout:120000});assert.deepEqual((await snap()).save.career,saved);
 for(let i=1;i<10;i++){if(await p.locator('.event-window').count()){await shot('event');await click(`event:${i%2}`);}const s=await snap();await click(s.save.career.energy<35?'rest':`train:${i%5}`);}
 if(await p.locator('.event-window').count())await click('event:0');await click('skills');await click('learn:finish');await click('close');assert((await snap()).save.career.skills.includes('finish'));
 await click('nav:paddock');await layout('paddock');await shot('paddock');await click('race');await p.waitForFunction(()=>musume.race.time>5);await layout('race');await shot('race');
 await click('pause');const frozen=(await snap()).race.time;await p.waitForTimeout(300);assert.equal((await snap()).race.time,frozen);await click('pause');await click('speed');
 await p.waitForFunction(()=>musume.race.events.some(e=>e.type==='skill'),null,{timeout:45000});await shot('skill');
 for(let i=0;i<5;i++){await click('camera');await p.waitForTimeout(150);}
 await p.waitForFunction(()=>musume.screen==='result',null,{timeout:90000});await layout('result');await shot('result');
 const first=await snap();assert.equal(first.race.done,true);assert.equal(first.save.results.length,1);assert(first.race.events.filter(e=>e.type==='skill').length>=6);
 await click('replay');await p.waitForTimeout(1200);await shot('replay');await click('skipRace');const replay=await snap();assert.deepEqual(replay.race.events,first.race.events);assert.equal(replay.save.currency,first.save.currency);
 await p.reload();await p.waitForFunction(()=>window.musume?.snapshot.ready,null,{timeout:120000});assert.equal((await snap()).save.results.length,1);await shot('result-restored');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/verification.json`,JSON.stringify({browser:await browser.version(),gpu:await p.evaluate(()=>{const gl=document.querySelector('canvas.game-canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}),layouts,errors,result:first.save.results[0],raceTime:first.race.time,events:first.race.events,replayExact:true,savedCareerExact:true},null,2));
 console.log('GAME PASS',JSON.stringify({errors,layouts:layouts.length,result:first.save.results[0],raceTime:first.race.time}));
}finally{const video=p.video();await context.close();if(video)fs.copyFileSync(await video.path(),'artifacts/musume/full-playthrough.webm');await browser.close();}
