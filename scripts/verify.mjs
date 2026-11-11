import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.GAIA_URL||'http://127.0.0.1:5178/gaia-genesis/';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const results=[];
try{
 await page.goto(base+'?seed=162711');await page.waitForFunction(()=>window.gaia?.snapshot.ready,null,{timeout:120000});
 // Observe actual uninterrupted playback, not a seek pretending to be completion.
 const phases=[];
 for(let i=0;i<12;i++){phases.push(await page.locator('#phase').textContent());await page.waitForTimeout(2000)}
 assert.equal(await page.locator('#phase').textContent(),'06 / GENESIS');assert(await page.locator('#replay').isVisible());
 results.push({continuousPlayback:true,phases:[...new Set(phases)],performance:await page.evaluate(()=>({fps:gaia.snapshot.fps,cloudScale:gaia.snapshot.cloudScale}))});
 for(const [width,height] of [[1920,1080],[1280,720]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(180);
  const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,canvas:[document.querySelector('canvas').width,document.querySelector('canvas').height],buttons:[...document.querySelectorAll('button')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}})}));
  assert.equal(layout.width,layout.scrollWidth);assert.equal(layout.height,layout.scrollHeight);for(const b of layout.buttons){assert(b.x>=0&&b.y>=0&&b.right<=width&&b.bottom<=height)}results.push({layout});
 }
 await page.setViewportSize({width:1920,height:1080});
 const seek=async t=>{const version=await page.evaluate(t=>{const v=gaia.snapshot.renderVersion;gaia.seek(t);return v},t);await page.waitForFunction(({t,version})=>gaia.snapshot.renderedTime===t&&gaia.snapshot.renderVersion>version,{t,version},{timeout:30000});await page.waitForFunction(()=>document.querySelector('.loading').classList.contains('hidden'));};
 await mkdir('artifacts/remaster/after',{recursive:true});
 for(const t of [1.8,5.1,9,12.5,16.9,22]){await seek(t);await page.screenshot({path:`artifacts/remaster/after/${t.toFixed(1)}.png`});}
 await page.screenshot({path:'artifacts/genesis-1920.png'});
 const renderedCanvas=()=>page.locator('canvas').screenshot({style:'.hud{visibility:hidden!important}'});
 const first=await renderedCanvas();const firstSnapshot=await page.evaluate(()=>gaia.snapshot);const firstSignature=firstSnapshot.signature;
 await page.mouse.move(950,470);await page.mouse.down();await page.mouse.move(1110,550,{steps:12});await page.mouse.up();await page.mouse.wheel(0,-350);await page.waitForTimeout(500);
 const rotated=await page.evaluate(()=>window.gaia.snapshot);assert(rotated.userY>.4);assert(rotated.zoom<-.3);assert.equal(await page.evaluate(()=>scrollY),0);results.push({rotationAndZoom:true});
 await page.click('#replay');await page.waitForTimeout(100);assert((await page.evaluate(()=>window.gaia.snapshot.time))<1);await page.click('#skip');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.gaia.snapshot.time),22);
 for(const t of [16,4.8,8.7,12,0,22,16]){await page.evaluate(t=>window.gaia.seek(t),t);await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.gaia.snapshot.time),t)}
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/anatomy-1280.png'});
 await page.setViewportSize({width:1920,height:1080});await seek(22);await page.click('#new');await page.waitForFunction(()=>window.gaia.snapshot.ready&&window.gaia.snapshot.seed!==162711,null,{timeout:120000});
 const newSeed=await page.evaluate(()=>window.gaia.snapshot.seed);assert.notEqual(await page.evaluate(()=>window.gaia.snapshot.signature),firstSignature);await seek(22);const second=await renderedCanvas();assert(!first.equals(second));
 // Same seed regenerates exactly the same GPU-facing maps; use fixed time/size for image comparison.
 await page.setViewportSize({width:1920,height:1080});await page.evaluate(()=>window.gaia.newWorld(162711));await page.waitForFunction(()=>window.gaia.snapshot.ready&&window.gaia.snapshot.seed===162711,null,{timeout:120000});await seek(22);const repeat=await renderedCanvas();
 assert.equal(await page.evaluate(()=>window.gaia.snapshot.signature),firstSignature);
 if(!first.equals(repeat)){await writeFile('artifacts/seed-first.png',first);await writeFile('artifacts/seed-repeat.png',repeat);console.log({firstSnapshot,repeatSnapshot:await page.evaluate(()=>gaia.snapshot)});}
 assert(first.equals(repeat),'Same seed and film time must reproduce the exact rendered canvas');
 await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('+');await page.waitForTimeout(200);assert((await page.evaluate(()=>gaia.snapshot)).userY>.05);
 await page.locator('.seek').focus();await page.keyboard.press('Home');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>gaia.snapshot.time),0);
 results.push({replay:true,skip:true,seek:true,keyboard:true,newWorld:true,newSeed,sameSeedMapsExact:true,sameSeedImageExact:true,snapshot:await page.evaluate(()=>window.gaia.snapshot)});
 assert.equal(errors.length,0,errors.join('\n'));
 await writeFile('artifacts/verification.json',JSON.stringify({base,errors,results},null,2));console.log(JSON.stringify({errors,results},null,2));
}finally{await browser.close()}
