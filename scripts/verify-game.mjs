// Browser smoke: title → home → setup → training → scout → trial race → result, no page scroll, no console errors.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const url=process.env.GAIA_URL||'http://127.0.0.1:5179/gaia-genesis/';
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
for(const [w,h] of [[1280,720],[1920,1080]]){
 const p=await browser.newPage({viewport:{width:w,height:h}});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 const noScroll=async()=>{const v=await p.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight,innerWidth,innerHeight]);assert.equal(v[0],v[2]);assert.equal(v[1],v[3]);};
 await p.goto(url);await p.waitForFunction(()=>window.musume?.scene.ready,null,{timeout:180000});await p.click('.press-btn');await p.waitForTimeout(800);await noScroll();
 await p.evaluate(()=>musume.navigate('setup'));await p.waitForTimeout(1500);await p.click('[data-do="start"]');await p.waitForTimeout(1500);await noScroll();
 await p.click('[data-fac="0"]');await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>musume.model.career.turn),2);
 await p.evaluate(()=>{const m=musume.model;m.state.career.turn=6;m.state.career.pending=null;musume.navigate('paddock');});await p.waitForTimeout(1500);await p.click('[data-do="race"]');
 await p.waitForFunction(()=>musume.race,null,{timeout:180000});await p.waitForTimeout(800);await p.click('[data-do="skipRace"]');await p.waitForTimeout(1500);await noScroll();
 assert.equal(await p.evaluate(()=>musume.screen),'result');assert.deepEqual(errors,[]);await p.close();console.log('browser ok',w,h);}
await browser.close();
