/** Hidden developer panel (Ctrl+Shift+D, or type "starborn" anywhere). Uses lil-gui (MIT). */
import GUI from 'lil-gui';
import type {GameModel} from './model';
import {planets} from './data/planets';
import {supports} from './data/support';
let gui:GUI|null=null;
export function installDev(model:GameModel,refresh:()=>void,api:{finishRace:(win:boolean)=>void}){let typed='';
 const open=()=>{if(gui){gui.destroy();gui=null;return;}model.state.dev=true;model.save();gui=new GUI({title:'DEV · 행성무스메'});gui.domElement.style.zIndex='90';
  const o={credits:10000,shards:500,turn:1,stat:200,sp:500,
   addCredits:()=>{model.state.currency+=o.credits;done();},addShards:()=>{model.state.shards+=o.shards;done();},
   allPlanets:()=>{for(const p of planets)model.state.planets[p.id]=Math.max(1,model.state.planets[p.id]??0);done();},allCards:()=>{for(const s of supports)model.state.supports[s.id]=Math.max(1,model.state.supports[s.id]??0);done();},
   maxTree:()=>{for(const k of ['energy','start','gear','bond','sp','alarm','hint','camp'])model.state.tree[k]=3;done();},
   stats:()=>{const c=model.career;if(c){c.stats=c.stats.map(v=>Math.min(1200,v+o.stat)) as typeof c.stats;done();}},energy:()=>{const c=model.career;if(c){c.energy=c.maxEnergy;c.mood=5;done();}},
   addSp:()=>{const c=model.career;if(c){c.sp+=o.sp;done();}},jump:()=>{const c=model.career;if(c){c.turn=Math.max(1,Math.min(24,o.turn));c.pending=null;done();}},
   bonds:()=>{const c=model.career;if(c){for(const k in c.bonds)c.bonds[k]=100;done();}},
   winRace:()=>api.finishRace(true),endRace:()=>api.finishRace(false),reset:()=>{if(confirm('전체 초기화?')){model.reset();done();}}};
  const done=()=>{model.save();refresh();};
  const w=gui.addFolder('재화');w.add(o,'credits',0,100000,1000).name('크레딧 양');w.add(o,'addCredits').name('크레딧 지급');w.add(o,'shards',0,5000,10).name('조각 양');w.add(o,'addShards').name('조각 지급');w.add(o,'allPlanets').name('전 행성 획득');w.add(o,'allCards').name('전 서포트 획득');w.add(o,'maxTree').name('업그레이드 최대');
  const c=gui.addFolder('육성');c.add(o,'stat',10,1200,10).name('능력 +');c.add(o,'stats').name('능력치 올리기');c.add(o,'energy').name('체력·컨디션 최대');c.add(o,'sp',0,2000,10).name('SP 양');c.add(o,'addSp').name('SP 지급');c.add(o,'bonds').name('유대 100');c.add(o,'turn',1,24,1).name('턴');c.add(o,'jump').name('턴 이동');
  const r=gui.addFolder('경주');r.add(o,'winRace').name('즉시 결과(내 우승)');r.add(o,'endRace').name('즉시 결과(시뮬)');gui.add(o,'reset').name('전체 초기화');};
 addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.code==='KeyD'){e.preventDefault();open();return;}if(e.key.length===1){typed=(typed+e.key.toLowerCase()).slice(-8);if(typed==='starborn'){typed='';open();}}});}
