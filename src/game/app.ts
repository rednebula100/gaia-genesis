import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/black-han-sans/korean-400.css';
import '@fontsource/black-han-sans/latin-400.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-800-italic.css';
import './game.css';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import {GameModel,facilities,moods,TURNS,FRIEND_BOND,careerScore,scoreGrade,SCOUT_COST,odds,seasons,seasonOf,isCamp,missions,type TrainResult} from './model';
import {planets,planet,statNames,statColors,gradeOf,gradeColor} from './data/planets';
import {supports,support} from './data/support';
import {skills,skill} from './data/skills';
import {courses,strategies} from './data/races';
import {tree} from './data/tree';
import {Race,margin,FINAL_LEG} from './race';
import {GameScene,cameraNames} from './scene';
import {icon} from './icons';
import {sfx,chime,arpeggio,fanfare,unlockAudio,setAudio,music} from './audio';
import {fxLayer,floatText,flash,shake,stamp,countUp,wipe,hitstop,wait,reduced} from './fx';
import {planetScout,supportScout} from './gacha';
import {runMission,missionIcon} from './missions';
import {installDev} from './dev';

type Screen='title'|'home'|'scout'|'setup'|'training'|'paddock'|'race'|'result'|'collection'|'tree';
const model=new GameModel();
const base=import.meta.env.BASE_URL;
const root=document.createElement('main');root.id='game-root';root.className='musume';
root.innerHTML='<canvas class="game-canvas" tabindex="-1" aria-label="행성 선수. 드래그로 회전"></canvas><div class="vignette"></div><div class="speedlines"></div><div class="labels"></div><div class="game-ui"></div><div class="overlay"></div>';
document.body.append(root);
const ui=root.querySelector<HTMLElement>('.game-ui')!,overlay=root.querySelector<HTMLElement>('.overlay')!,speedlines=root.querySelector<HTMLElement>('.speedlines')!,labels=root.querySelector<HTMLElement>('.labels')!;
fxLayer(root);gsap.ticker.lagSmoothing(0);
const scene=new GameScene(root.querySelector('canvas')!);
let screen:Screen='title',busy=false,kind:'planet'|'support'='planet',strategy=1,race:Race|undefined,paused=false,speed=1,acc=0,prev=performance.now(),dialog='',inLegacy=false,launching=false,legacyLoaded=false,loadPct=0,ready=false,setupTab:'deck'|'legacy'='deck';
let racePhase:'intro'|'count'|'run'|'done'='intro',lastComment=-1,slowmo=1,hudClock=0,lastHover:Element|null=null,spurtUI:{t0:number;done:boolean}|null=null,mashUI:{t0:number;n:number;done:boolean}|null=null;
setAudio({sfx:model.state.settings.sfx,bgm:model.state.settings.bgm});
const T={home:'클럽하우스',scout:'스카우트',setup:'선수 편성',training:'시즌',paddock:'출전 준비',race:'LIVE',result:'공식 결과',collection:'기록실',tree:'관측소 업그레이드',title:''} as Record<Screen,string>;
const statIcon=(i:number)=>['spd','sta','grv','rot','orb'][i];
const thumb=(id:string,cls='')=>`<img class="thumb ${cls}" src="${scene.thumbs.get(id)??''}" alt="">`;

// ── Builders ──
const btn=(html:string,action:string,cls='',disabled=false,extra='')=>`<button class="${cls}" data-do="${action}" ${disabled?'disabled':''} ${extra}>${html}</button>`;
const gradeBadge=(g:string)=>`<b class="rarity r-${g}">${g}</b>`;
const statGrade=(v:number)=>{const g=gradeOf(v);return`<b class="sg" style="--g:${gradeColor(g)}">${g}</b>`;};
const statRow=(i:number,v:number)=>`<div class="stat" data-stat="${i}" style="--c:${statColors[i]}">${icon(statIcon(i))}<span class="sn">${statNames[i]}</span>${statGrade(v)}<strong class="sv">${v}</strong><i class="sbar"><em style="width:${Math.min(100,v/12)}%"></em></i><span class="sgh"></span></div>`;
const cardFace=(id:string,opt:{selected?:boolean;action?:string;small?:boolean}={})=>{const s=support(id);const lv=model.cardLevel(id);return`<button class="scard g-${s.grade} ${opt.selected?'on':''} ${opt.small?'small':''}" data-do="${opt.action??'inspect:'+id}" style="--c:${statColors[s.stat]}"><span class="scard-art">${icon(s.icon)}</span><span class="scard-top">${gradeBadge(s.grade)}<em>${icon(statIcon(s.stat))}</em></span><strong>${s.name}</strong><small>${statNames[s.stat]} +${s.bonus+lv*3}%${lv?` · 돌파 ${lv}`:''}</small></button>`;};
const wallet=()=>`<div class="wallet"><span class="pill coin">${icon('coins')}<b id="wallet-credits">${model.state.currency.toLocaleString()}</b></span><button class="pill shard" data-do="nav:tree" title="연구 조각 · 관측소 업그레이드">${icon('crystal')}<b>${model.state.shards}</b></button><button class="icon-btn" data-do="sound" aria-label="소리">${icon(model.state.settings.bgm||model.state.settings.sfx?'sound':'mute')}</button><button class="icon-btn" data-do="settings" aria-label="설정">${icon('cog')}</button></div>`;
const topbar=()=>`<header class="topbar">${screen!=='home'?btn(icon('back'),'back','icon-btn back',false,'aria-label="뒤로"'):''}<div class="crumb"><span>${T[screen]}</span></div>${model.state.dev?'<span class="devtag">DEV</span>':''}${wallet()}</header>`;
const headlines=['[속보] 목성 측, 결승선의 중력적 구속 여부 재차 문의','[규정] 공전은 진로 방해에 해당하지 않음을 재확인','[인터뷰] 금성 "회전 방향은 개인의 자유"','[관측] 화성 먼지폭풍, 고의성 없음으로 결론','[해명] 강맘 "위성은 선수가 아니라 자녀"','[심판] 명왕성 자격 재심사, 이번 시즌도 결론 보류','[기상] HD 189733 b 지역 유리비, 옆에서 내림','[스카우트] 별씨 낙하 관측, 무지개 별 목격담 증가'];
const fmt=(t:number)=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;

function render(){root.dataset.screen=screen;if(!busy||screen!=='scout')scene.mode=screen;const s=model.state,c=s.career;
 if(['training','paddock','race','result'].includes(screen)&&c)scene.hero=c.planet;else if(!busy)scene.hero=s.selected;scene.focus=c?.planet??'';
 const body=({title:titleScreen,home:homeScreen,scout:scoutScreen,setup:setupScreen,training:trainingScreen,paddock:paddockScreen,race:raceScreen,result:resultScreen,collection:collectionScreen,tree:treeScreen} as Record<Screen,()=>string>)[screen]();
 ui.innerHTML=(['title','race'].includes(screen)?'':topbar())+body+(dialog?`<div class="shade" data-do="close"></div><section class="dialog" role="dialog" aria-modal="true">${btn(icon('close'),'close','icon-btn dialog-x',false,'aria-label="닫기"')}<div class="dialog-body">${dialog}</div></section>`:'');
 if(screen==='race')updateRaceHUD(true);if(screen!=='race')labels.innerHTML='';
 ui.querySelector<HTMLElement>('.dialog button:not(.dialog-x):not(:disabled)')?.focus({preventScroll:true});}
function enter(){if(reduced)return;gsap.from(ui.querySelectorAll('.enter'),{y:26,opacity:0,duration:.42,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});gsap.from(ui.querySelectorAll('.enter-x'),{x:70,opacity:0,duration:.45,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});}

function titleScreen(){return`<section class="title-screen"><div class="logo enter"><small>ORBITAL RACING LEAGUE</small><h1>행성<span>무스메</span></h1><em>WAKUSEI MUSUME</em></div><p class="lore enter">별씨를 품고 별만큼 빛나게 태어난 행성들.<br>그래서 그들은 공전하지 않는다. <b>달린다.</b></p><div class="press enter">${ready?btn('<span>클릭해서 시작</span>','start','press-btn'):`<div class="loadbar"><i style="width:${Math.round(loadPct*100)}%"></i></div><span class="loadtxt">천체 선수 입장 중</span>`}</div><p class="title-foot enter">실제 천체 · 허구의 스포츠 · 무료 재화만 사용</p></section>`;}

function homeScreen(){const s=model.state,c=s.career,p=planet(s.selected);const live=c&&!c.ended;
 return`<section class="home"><div class="nameplate enter"><div class="np-top">${gradeBadge(p.grade)}<span>${p.en}</span></div><h1>${p.name}</h1><p>${p.title}</p><div class="quip" id="quip">${p.quips[0]}</div><small class="hint-poke">행성을 클릭해 보세요</small></div>
 <nav class="home-menu">${btn(`${icon('flag')}<span><b>${live?'시즌 계속':'시즌 시작'}</b><small>${live?`${seasons[seasonOf(c!.turn)]} · TURN ${c!.turn}/${TURNS} · ${planet(c!.planet).name}`:'3시즌 24턴 → 오비탈 그랑프리'}</small></span>`,live?'nav:training':'nav:setup','menu-main enter-x')}
 ${btn(`${icon('comet')}<span><b>스카우트</b><small>${s.currency>=1000?'10회 가능!':'1회 100'}</small></span>${s.currency>=1000?'<i class="ping"></i>':''}`,'nav:scout','menu-card enter-x')}
 ${btn(`${icon('cards')}<span><b>선수 편성</b><small>선수 ${Object.keys(s.planets).length}/${planets.length} · 카드 ${Object.keys(s.supports).length}/${supports.length}</small></span>`,'nav:setup','menu-card enter-x')}
 ${btn(`${icon('crystal')}<span><b>관측소 업그레이드</b><small>연구 조각 ${s.shards}</small></span>`,'nav:tree','menu-card enter-x')}
 ${btn(`${icon('trophy')}<span><b>기록실</b><small>${s.hall.length?`최고 평가 ${s.hall.reduce((a,b)=>a.score>b.score?a:b).grade}`:'아직 기록 없음'}</small></span>`,'nav:collection','menu-card enter-x')}
 ${btn(`${icon('atom')}<span><b>GAIA 연구소</b><small>원래의 행성 실험실</small></span>`,'lab:free','menu-card lab enter-x')}</nav>
 <div class="ticker"><span>ORL NEWS</span><div><p>${[...headlines,...headlines].map(h=>`<i>${h}</i>`).join('')}</p></div></div>
 ${model.storageError?`<div class="notice enter">${model.storageError}</div>`:''}</section>`;}

function scoutScreen(){const s=model.state;const pool=kind==='planet'?planets:supports;const owned=kind==='planet'?s.planets:s.supports;
 return`<section class="scout"><div class="banner enter ${kind}"><div class="tabs">${btn(`${icon('ringed')}별씨 (천체)`,'kind:planet',kind==='planet'?'on':'')}${btn(`${icon('cards')}전파 (서포트)`,'kind:support',kind==='support'?'on':'')}</div>
 <small class="banner-k">${kind==='planet'?'STARSEED SCOUT':'SIGNAL SCOUT'}</small><h1>${kind==='planet'?'떨어지는 별씨를<br>받아 내라':'우주 저편의<br>연구진에게서 온 신호'}</h1>
 <div class="pickup">${pool.filter(p=>p.grade==='SSR').map(p=>`<span>${kind==='planet'?thumb(p.id,'tm'):icon((p as {icon:string}).icon)}${p.name}</span>`).join('')}</div><em class="rates-line">SSR ${odds.SSR}% · SR ${odds.SR}% · R ${odds.R}% · 승급 연출 있음</em>
 <div class="owned">${pool.map(p=>`<i class="${owned[p.id]?'own':''}" title="${owned[p.id]?p.name:'???'}" style="--c:${'color' in p?p.color:statColors[(p as {stat:number}).stat]}"></i>`).join('')}<span>보유 ${Object.keys(owned).length}/${pool.length}</span></div>
 ${btn('확률 · 규칙 보기','rates','link')}</div>
 <div class="pull-actions enter-x">${btn(`<small>1회</small><b>${icon('coins')}${SCOUT_COST}</b>`,'pull:1','pull one',s.currency<SCOUT_COST)}${btn(`<small>10회</small><b>${icon('coins')}${(SCOUT_COST*10).toLocaleString()}</b>${!s.firstScout&&kind==='planet'?'<em>첫 10회 보호</em>':''}`,'pull:10','pull ten',s.currency<SCOUT_COST*10)}</div></section>`;}

function setupScreen(){const s=model.state,p=planet(s.selected),bonus=model.planetBonus(p.id)+model.lv('start')*10;const factors=model.factorsFrom(s.parents);
 return`<section class="setup"><div class="panel roster enter"><div class="roster-grid scroll">${planets.map(v=>btn(`${s.planets[v.id]?thumb(v.id):'<i class="unknown">?</i>'}${gradeBadge(v.grade)}<span>${s.planets[v.id]?v.name:'???'}</span>${s.planets[v.id]>1?`<em>+${s.planets[v.id]-1}</em>`:''}`,`select:${v.id}`,`rost ${s.selected===v.id?'on':''}`,!s.planets[v.id])).join('')}</div></div>
 <div class="nameplate compact enter"><div class="np-top">${gradeBadge(p.grade)}<span>${p.en}</span></div><h1>${p.name}</h1><p class="uniq">${icon('lightning')}<b>${p.skill}</b></p><p>${p.skillNote}</p></div>
 <div class="panel stats-mini enter">${p.stats.map((v,i)=>statRow(i,v+bonus)).join('')}${bonus?`<small class="bonus">중복·업그레이드 보너스 전 능력 +${bonus}</small>`:''}</div>
 <div class="panel deck enter-x"><div class="tabs dark">${btn(`${icon('cards')}서포트 ${s.deck.length}/4`,'tab:deck',setupTab==='deck'?'on':'')}${btn(`${icon('laurels')}계승 ${s.parents.length}/2`,'tab:legacy',setupTab==='legacy'?'on':'')}</div>
 ${setupTab==='deck'?`<div class="deck-slots">${[0,1,2,3].map(i=>s.deck[i]?cardFace(s.deck[i],{selected:true,action:'support:'+s.deck[i]}):'<div class="slot-empty">+</div>').join('')}</div><h3>보유 카드 <small>클릭해서 편성</small></h3><div class="owned-cards scroll">${supports.filter(v=>s.supports[v.id]&&!s.deck.includes(v.id)).map(v=>cardFace(v.id,{action:'support:'+v.id,small:true})).join('')||'<p class="muted">모든 카드를 편성했습니다.</p>'}</div>`
 :`<p class="muted">명예의 전당 선수 최대 2명을 부모로 고르면, 그들의 높은 능력이 <b>파란 인자</b>가 되어 시작·9턴·17턴에 능력치를 줍니다.</p><div class="parents scroll">${s.hall.length?s.hall.map(h=>btn(`${thumb(h.planet)}<span><b>${planet(h.planet).name}</b><small>${h.result} · 평가 ${h.grade}</small></span><em>${model.factorsFrom([h.id]).map(f=>`<i style="--c:${statColors[f.stat]}">${statNames[f.stat]} ${'★'.repeat(f.stars)}</i>`).join('')}</em>`,`parent:${h.id}`,`parent ${s.parents.includes(h.id)?'on':''}`)).join(''):'<p class="muted">아직 기록이 없습니다. 시즌을 끝까지 마치면 부모로 고를 수 있습니다.</p>'}</div>${factors.length?`<small class="bonus">계승 인자 ${factors.length}개 · 시작 보너스 ${factors.map(f=>`${statNames[f.stat]} +${f.stars*8}`).join(', ')}</small>`:''}`}</div>
 <div class="setup-go enter-x">${s.career&&!s.career.ended?btn('진행 중 시즌으로','nav:training','ghost'):''}${btn(`${icon('flag')}<span>시즌 시작</span>`,'start','go')}</div></section>`;}

function trainingScreen(){const c=model.career!;const p=planet(c.planet);const ev=model.pendingEvent();const raceTurn=model.isRaceTurn()||model.racePending();const g=model.nextGoal();const season=seasonOf(c.turn);const camp=isCamp(c.turn);const openPending=model.racePending()&&model.state.race!.kind==='open';
 const goalTxt=g?(g.turn===c.turn?`<b>${g.name}</b> 출전! 목표 ${g.need===1?'우승':g.need+'위 이내'}`:`${g.name}까지 <b>${g.turn-c.turn}</b>턴 · 목표 ${g.need===1?'우승':g.need+'위 이내'}`):'';
 return`<section class="training ${camp?'camp':''}"><div class="turnbox enter"><small>${seasons[season]}${camp?' · 합숙':''}</small><b>${String(c.turn).padStart(2,'0')}</b><span>/ ${TURNS}</span><p>${goalTxt}</p><div class="alarms" title="목표 실패 재도전">${icon('time')}× ${c.alarms}</div></div>
 <div class="vitals enter"><div class="energy"><span>${icon('sta')}체력</span><div class="ebar"><i style="width:${c.energy/c.maxEnergy*100}%;--e:${c.energy<30?'#ff4a3a':c.energy<50?'#ffb13c':'#5fe39a'}"></i></div><b id="energy-v">${c.energy}</b></div><div class="mood m${c.mood}"><span>컨디션</span><b>${moods[c.mood-1]}</b></div></div>
 <div class="panel info-panel enter"><div class="who">${thumb(p.id,'tm')}${gradeBadge(p.grade)}<b>${p.name}</b></div><div class="sp-row"><span>스킬 포인트</span><b id="sp-v">${c.sp}</b>${btn(`${icon('skill')}스킬`,'skills','mini')}</div><div class="owned-skills">${c.skills.map(id=>`<span class="${skill(id).gold?'gold':''}">${skill(id).name}</span>`).join('')||'<em>습득한 스킬 없음</em>'}</div><div class="deck-row">${c.deck.map(id=>`<i class="chip ${(c.bonds[id]??0)>=FRIEND_BOND?'max':''}" style="--c:${statColors[support(id).stat]};--b:${c.bonds[id]??0}%" title="${support(id).name} 유대 ${c.bonds[id]}">${icon(support(id).icon)}</i>`).join('')}<small>유대 ${FRIEND_BOND}↑ + 전문 훈련 = 우정</small></div>${c.factors.length?`<div class="factors">${c.factors.map(f=>`<i style="--c:${statColors[f.stat]}">${statNames[f.stat]}${'★'.repeat(f.stars)}</i>`).join('')}</div>`:''}</div>
 <div class="stats-panel stat-strip enter">${c.stats.map((v,i)=>statRow(i,v)).join('')}</div>
 ${raceTurn?`<div class="race-call enter">${btn(`${icon('flag')}<span><small>${openPending?'오픈 경기':g?.grade}</small><b>${openPending?'출전 준비':g?.name+' 출전'}</b></span>`,'nav:paddock','go big')}</div>`:
 `<div class="facilities">${facilities.map((f,i)=>{const pv=model.preview(i);const tot=pv.gains.reduce((a,b)=>a+b,0);return btn(`<span class="fac-top">${icon(statIcon(i))}<b>${f.name}</b><em>Lv${pv.lv}</em></span><span class="chips">${pv.cards.map(id=>`<i class="chip ${model.isFriend(id,i)?'friend':''}" style="--c:${statColors[support(id).stat]};--b:${c.bonds[id]??0}%" title="${support(id).name} · 유대 ${c.bonds[id]}">${icon(support(id).icon)}${pv.hintCards.includes(id)?'<u>!</u>':''}</i>`).join('')}</span><span class="gain">+${tot}</span><span class="tier">${pv.friends.length?'우정':pv.cards.length>=2?'대성공':pv.cards.length?'':'혼자'}</span>${pv.fail?`<span class="fail">실패 ${pv.fail}%</span>`:`<span class="cost">체력 ${f.energy>0?'+':''}${f.energy}</span>`}`,`train:${i}`,`fac enter ${pv.friends.length?'rainbow':''} ${pv.cards.length>=2?'hot':''}`,!!ev,`style="--c:${statColors[i]}" data-fac="${i}"`);}).join('')}</div>
 <div class="side-actions">${btn(`${icon('rest')}<span><b>휴식</b><small>체력 회복 · 숙면 운</small></span>`,'rest','side enter-x',!!ev)}${btn(`${icon('outing')}<span><b>관측회</b><small>컨디션 ▲ · 유대 +5</small></span>`,'outing','side enter-x',!!ev)}${btn(`${icon('flag')}<span><b>오픈 경기</b><small>체력 −20 · 능력·SP 보상</small></span>`,'openRace','side race enter-x',!!ev)}${btn(`${icon('lab')}<span><b>관측소 미션</b><small>피지컬 미니게임</small></span>`,'missions','side lab enter-x',!!ev)}</div>`}
 <p class="log enter">${camp?'<b>근일점 합숙</b> · 모든 훈련 Lv5 · ':''}${c.log}</p>
 ${ev?`<div class="event enter-x ${ev.legacy?'legacy':''}"><div class="ev-ribbon">${ev.legacy?`${icon('laurels')}계승 이벤트`:ev.card?`${icon(support(ev.card).icon)}${support(ev.card).team}`:'STORY EVENT'}</div><h2>${ev.title}</h2><p>${ev.text}</p>${ev.legacy?`<div class="factors big">${c.factors.map(f=>`<i style="--c:${statColors[f.stat]}">${planet(f.from).name}의 ${statNames[f.stat]} ${'★'.repeat(f.stars)} → +${f.stars*12}</i>`).join('')}</div>${btn('<b>별빛을 받아들인다</b>','event:0','choice')}`:ev.choices.map((v,i)=>btn(`<b>${v.label}</b><small>${choiceText(v)}</small>`,`event:${i}`,'choice')).join('')}</div>`:''}</section>`;}
function choiceText(v:{stats?:Partial<Record<number,number>>;energy?:number;mood?:number;sp?:number;bond?:number;hint?:string}){const parts:string[]=[];for(const [k,g] of Object.entries(v.stats??{}))parts.push(`${statNames[+k]} +${g}`);if(v.energy)parts.push(`체력 ${v.energy>0?'+':''}${v.energy}`);if(v.mood)parts.push('컨디션 ▲');if(v.sp)parts.push(`SP +${v.sp}`);if(v.bond)parts.push(`유대 +${v.bond}`);if(v.hint)parts.push('스킬 힌트');return parts.join(' · ');}

function strengthOf(e:{stats:number[];planet:string},ci:number){const apt=1+((planet(e.planet).aptitude[ci]??1)-1)*.15;const s=e.stats;return(s[0]*1.4+s[1]*(ci===2?1.1:.8)+s[2]*.8+s[3]*.8+s[4]*.7)*apt;}
function paddockScreen(){const c=model.career!,r=model.state.race!;const k=courses[r.course];const final=r.kind==='final';const me=c.planet;
 const str=r.entries.map(e=>strengthOf(e,r.course));const total=str.reduce((a,b)=>a+b**4,0);const order=[...str.keys()].sort((a,b)=>str[b]-str[a]);
 return`<section class="paddock"><div class="panel course-card enter"><small>${k.grade} · ${k.en}${r.kind==='goal'?` · 목표 ${r.need}위 이내`:final?' · 시즌 최종전':' · 오픈 경기'}</small><h1>${r.kind==='open'?'오픈 · ':''}${k.name}</h1><div class="course-meta"><span>${icon('flag')}${k.length.toLocaleString()} m</span><span>${icon('spiral')}코너 ${k.corners.length}</span><span>${icon('sun')}근일점 ${Math.round(k.sun*100)}%</span></div><p>${k.note}</p>
 ${final?`<div class="course-pick">${[1,2].map(i=>btn(`<b>${courses[i].name}</b><small>${courses[i].length.toLocaleString()} m · ${courses[i].note}</small>`,`course:${i}`,r.course===i?'on':'')).join('')}</div>`:''}
 <h3>작전</h3><div class="strats">${strategies.map((v,i)=>btn(`<b>${v.name}</b><small>${v.note}</small>`,`strategy:${i}`,strategy===i?'on':'')).join('')}</div></div>
 <div class="panel racecard enter-x"><h2>${icon('podium')}출주표</h2><div class="rc-head"><span>게이트</span><span>선수</span><span>인기</span><span>배당</span></div>${r.entries.map((e,i)=>{const p=planet(e.planet);const pop=order.indexOf(i)+1;const o=Math.max(1.1,(total/(str[i]**4))*.8);return`<div class="rc-row ${e.planet===me?'me':''}" style="--c:${p.color}"><b class="gate g${i+1}">${i+1}</b><span>${thumb(p.id,'tm')}${p.name}${e.planet===me?'<em>내 선수</em>':''}</span><span class="pop">${pop}번 인기</span><strong>${o.toFixed(1)}</strong></div>`;}).join('')}<small class="muted">배당은 중계 연출용 표기입니다. 실제 내기는 없습니다.</small></div>
 <div class="setup-go enter-x">${r.kind==='open'?btn('출전 취소','cancelRace','ghost'):''}${btn(`${icon('flag')}<span>출전</span>`,'race','go')}</div></section>`;}

function raceScreen(){const r=race!;return`<section class="race-hud"><div class="bc-top"><span class="live">${icon('camera')}LIVE</span><div class="bc-title"><b>${r.course.name}</b><small>${r.course.grade} · ${r.course.length.toLocaleString()} m</small></div><b id="rc-clock" class="clock">0:00.0</b><span id="rc-left" class="left"></span></div>
 <ol class="ranks" id="rc-ranks"></ol><svg class="minimap" id="rc-map" viewBox="-220 -150 440 300"><path class="mm-track" d="${miniPath()}"/>${r.config.entries.map(e=>`<circle r="${e.planet===model.career?.planet?9:6}" data-id="${e.planet}" fill="${planet(e.planet).color}" class="${e.planet===model.career?.planet?'me':''}"/>`).join('')}</svg>
 <div class="commentary" id="rc-comment"><span>실황</span><p></p></div><div class="cutin" id="rc-cutin"></div><div class="skillchips" id="rc-chips"></div>
 <div class="spurt" id="rc-spurt"><div class="ring"><i class="target"></i><i class="approach"></i><b>SPACE</b></div><small>라스트 스퍼트 — 링이 겹치는 순간!</small></div>
 <div class="mash" id="rc-mash"><b>연타!</b><div class="mbar"><i></i></div><small>SPACE / 클릭 연타로 근성 폭발</small></div>
 <div class="intro" id="rc-intro"></div><div class="countdown" id="rc-count"></div>
 <div class="rc-ctrl">${btn(icon('pause'),'pause','icon-btn',false,'aria-label="일시정지"')}${btn(`${speed}×`,'speed','icon-btn txt')}${btn(`${icon('camera')}<span id="cam-name">${cameraNames[scene.cameraMode]}</span>`,'camera','cam')}${btn('결과로','skipRace','ghost small')}</div></section>`;}
let mm={sc:1,cx:0,cz:0};
function miniPath(){const k=race!.course;const pts=k.track.samples.filter((_,i)=>i%10===0);const xs=pts.map(s=>s.p[0]),zs=pts.map(s=>s.p[2]);const sc=Math.min(400/(Math.max(...xs)-Math.min(...xs)),260/(Math.max(...zs)-Math.min(...zs)));const cx=(Math.max(...xs)+Math.min(...xs))/2,cz=(Math.max(...zs)+Math.min(...zs))/2;mm={sc,cx,cz};return pts.map((s,i)=>`${i?'L':'M'}${((s.p[0]-cx)*sc).toFixed(1)} ${((s.p[2]-cz)*sc).toFixed(1)}`).join(' ')+'Z';}

function resultScreen(){const c=model.career,r=race!;const me=r.racer(c?.planet??r.config.entries[0].planet);const ranking=r.ranking;const rank=ranking.indexOf(me)+1;const res=model.reward(rank,me.finish);const winner=ranking[0];const cfg=r.config;
 const final=cfg.kind==='final',goal=cfg.kind==='goal';const score=c?careerScore(c.stats,c.skills.length)+(8-rank)*50:0;const tone=rank===1?'win':rank<=3?'podium':'lose';const fail=goal&&!res.pass;
 return`<section class="result ${tone}"><div class="rank-block enter"><small>${r.course.name} · 공식 결과</small><div class="rank-big ${rank<=3?'top':''} ${rank===1?'win':''}"><b>${rank}</b><span>위</span></div><h1>${planet(me.planet).name}</h1><p>${fmt(me.finish)} · ${rank===1?`2위와 ${margin(ranking[1].finish-me.finish,me.velocity)}`:`1위 ${planet(winner.planet).name}와 ${margin(me.finish-winner.finish,winner.velocity)}`}</p><div class="verdict">${rank===1?'완벽한 승리. 관중석의 위성들이 일어섰습니다.':rank<=3?'시상대에 올랐습니다. 다음은 맨 위입니다.':fail?'목표 미달. 심판단도 아쉬워합니다.':'완주했습니다. 별빛은 아직 남아 있습니다.'}</div></div>
 <div class="panel reward enter"><div class="rw-row">${icon('coins')}<span>획득 크레딧</span><b id="rw-credits" data-v="${res.reward}">${res.already?res.reward:0}</b></div>
 ${cfg.kind==='open'?`<div class="rw-row">${icon('up')}<span>경기 보너스</span><b>${res.delta[0]?`전 능력 +${res.delta[0]}`:'없음'} · SP +${res.sp}</b></div>`:''}
 ${goal?`<div class="rw-row goal ${res.pass?'ok':'ng'}">${icon(res.pass?'trophy':'close')}<span>목표 ${cfg.need}위 이내</span><b>${res.pass?'달성':'미달'}</b></div>${res.pass&&!res.already?`<div class="rw-row">${icon('up')}<span>달성 보너스</span><b>전 능력 +${res.delta[0]} · SP +${res.sp}</b></div>`:''}`:''}
 ${final&&c?`<div class="career-grade"><span>시즌 평가</span><b class="cg">${scoreGrade(score)}</b><small>점수 ${score.toLocaleString()}${res.shards?` · 조각 +${res.shards}`:''}</small></div>`:''}
 ${res.already?'<small class="muted">이미 지급된 경기입니다.</small>':''}</div>
 <div class="panel order enter-x"><h2>${icon('podium')}착순</h2>${ranking.map((v,i)=>`<div class="or-row ${v.id===me.id?'me':''}" style="--c:${planet(v.planet).color}"><b>${i+1}</b><span>${thumb(v.planet,'tm')}${planet(v.planet).name}</span><small>${i?margin(v.finish-ranking[i-1].finish,v.velocity):fmt(v.finish)}</small></div>`).join('')}</div>
 <div class="setup-go enter-x">${btn(`${icon('cycle')}리플레이`,'replay','ghost')}${fail?(c&&c.alarms>0?btn(`${icon('time')}<span>알람시계로 재도전 (${c.alarms})</span>`,'retry','go'):'')+btn('시즌 종료','giveUp',c&&c.alarms>0?'ghost':'go'):final||c?.ended?btn(`${icon('home')}<span>시즌 종료</span>`,'endCareer','go'):btn(`${icon('flag')}<span>시즌 계속</span>`,'afterRace','go')}</div></section>`;}

function collectionScreen(){const s=model.state;return`<section class="collection"><div class="panel col-planets enter"><h2>${icon('ringed')}천체 선수 <em>${Object.keys(s.planets).length}/${planets.length}</em></h2><div class="col-grid scroll">${planets.map(p=>btn(`${s.planets[p.id]?thumb(p.id):'<i class="unknown">?</i>'}<b>${s.planets[p.id]?p.name:'미발견'}</b>${gradeBadge(p.grade)}<small>${s.planets[p.id]?p.skill:'별씨 스카우트에서 획득'}</small>`,`collect:${p.id}`,'col-item',!s.planets[p.id])).join('')}</div><h2>${icon('cards')}서포트 카드 <em>${Object.keys(s.supports).length}/${supports.length}</em></h2><div class="col-cards">${supports.map(v=>s.supports[v.id]?cardFace(v.id,{small:true}):`<div class="scard locked small"><span>?</span></div>`).join('')}</div></div>
 <div class="panel hall enter-x"><h2>${icon('laurels')}명예의 전당</h2><div class="scroll">${s.hall.length?s.hall.map(h=>`<div class="hall-row">${thumb(h.planet,'tm')}<b class="cg small">${h.grade}</b><span>${planet(h.planet).name}<small>${h.result}</small></span><strong>${h.score.toLocaleString()}</strong></div>`).join(''):'<p class="muted">시즌을 끝까지 마치면 기록이 남고, 다음 시즌의 부모(계승)로 고를 수 있습니다.</p>'}</div><div class="hall-sum">출전 ${s.results.length}회 · 1위 ${s.results.filter(r=>r.rank===1).length}회</div></div></section>`;}

function treeScreen(){const s=model.state;return`<section class="tree"><div class="panel tree-panel enter"><h2>${icon('crystal')}관측소 업그레이드 <em>${icon('crystal')}${s.shards} · ${icon('coins')}${s.currency.toLocaleString()}</em></h2><p class="muted">연구 조각은 스카우트 중복과 시즌 평가로 모입니다. 업그레이드는 모든 시즌에 영구 적용됩니다.</p>
 <div class="tree-grid">${tree.map(n=>{const lv=model.lv(n.id),max=lv>=n.max,[sh,cr]=n.cost(lv),locked=!!n.req&&!model.lv(n.req);return btn(`<span class="tn-ic">${icon(n.icon)}</span><b>${n.name}</b><small>${n.note}</small><span class="pips">${Array.from({length:n.max},(_,i)=>`<i class="${i<lv?'on':''}"></i>`).join('')}</span><em>${max?'MAX':locked?`${tree.find(t=>t.id===n.req)!.name} 필요`:`${icon('crystal')}${sh} · ${icon('coins')}${cr}`}</em>`,`buy:${n.id}`,`tnode ${max?'max':''} ${locked?'locked':''}`,max||locked||!model.canBuy(n.id));}).join('')}</div>
 ${btn(`${icon('coins')}조각 30 → 300 크레딧`,'exchange','ghost small')}</div></section>`;}

// ── Navigation ──
async function navigate(next:Screen,push=true,transition=true){if(launching||busy)return;dialog='';const c=model.career;
 if(next==='training'&&(!c||c.ended))next=c?.ended?'home':'setup';
 if(next==='paddock'&&!model.racePending()){if(model.isRaceTurn())model.makeRace(1,strategy);else next=c?'training':'setup';}
 if((next==='race'||next==='result')&&!model.state.race)next=c?'training':'home';
 if(transition&&screen!=='title'&&next!==screen){busy=true;sfx('whoosh',.6);await wipe(next==='race'?'#ff4a5e':'#ffd23f');busy=false;}
 if(next==='race'){race=new Race(model.state.race!,model.career?.planet??'');scene.resetRaceView();scene.setCourse(race.config.course);racePhase='intro';lastComment=-1;slowmo=1;paused=false;acc=0;spurtUI=null;mashUI=null;speedlines.classList.remove('on');}
 if(next==='result'&&model.state.race&&(!race||!race.done||race.config.id!==model.state.race.id)){race=new Race(model.state.race,model.career?.planet??'');race.finishAll();scene.skipEvents(race.events.length);}
 if(next==='paddock'&&model.state.race)scene.setCourse(model.state.race.course);
 screen=next;if(push)history.pushState(null,'',`${base}?game=${next}`);
 music(next==='race'||next==='paddock'?'tension':next==='title'?'none':'home');
 render();enter();afterEnter();}
function afterEnter(){if(screen==='result')resultFx();if(screen==='race')startIntro();}
function openDialog(html:string){const first=!dialog;dialog=html;render();if(first&&!reduced)gsap.from('.dialog',{y:30,scale:.94,opacity:0,duration:.28,ease:'back.out(1.8)'});}

// ── Training feel ──
async function doTrain(i:number){if(busy||!model.canAct())return;const c=model.career!;const btnEl=ui.querySelector<HTMLElement>(`[data-fac="${i}"]`);const from=btnEl?.getBoundingClientRect();const before=[...c.stats];busy=true;sfx('confirm');if(btnEl)gsap.to(btnEl,{scale:.93,duration:.07,yoyo:true,repeat:1});
 const r=model.train(i) as TrainResult;await hitstop(r.tier==='friend'?140:r.tier==='great'?90:50);
 if(r.tier==='fail'){scene.pulse('fail');sfx('fail');flash('#ff2a2a',.45);shake(ui,14);stamp('실패…','bad');}
 else if(r.tier==='friend'){scene.pulse('friend',i);flash('#ffffff',.7);arpeggio([0,4,7,12,16,19],.06,.65);stamp('우정 트레이닝!','rainbow');}
 else if(r.tier==='great'){scene.pulse('great',i);flash('#fff4c0',.35);arpeggio([0,7,12],.07,.55);stamp(`대성공! ×${r.cards}`,'great');}
 else{scene.pulse('train',i);sfx('level',.5);stamp(r.cards?'GOOD':'혼자 훈련','good',.3);}
 busy=false;render();
 const ox=(from?.left??innerWidth/2)+(from?.width??0)/2,oy=from?.top??innerHeight*.7;let n=0;
 r.delta.forEach((d,k)=>{if(!d)return;const row=ui.querySelector<HTMLElement>(`.stats-panel [data-stat="${k}"]`);const val=row?.querySelector<HTMLElement>('.sv');const m=n;if(val){val.textContent=String(before[k]);setTimeout(()=>{countUp(val,before[k],before[k]+d,.5);row!.classList.add(d>0?'up':'down');if(d>0)chime(Math.round(d/6)+m,.5);},560+m*90);}floatText(ox+(m-.5)*48,oy,(d>0?'+':'')+d,d>0?statColors[k]:'#ff5a4a',row,d>=60?50:d>=35?40:32);n++;});
 if(r.energy){const box=ui.querySelector<HTMLElement>('.energy');if(box){const bb=box.getBoundingClientRect();floatText(bb.left+bb.width*.6,bb.bottom,`${r.energy>0?'+':''}${r.energy}`,r.energy>0?'#5fe39a':'#ff8a5a',null,24);}}
 if(r.levelUp)setTimeout(()=>{floatText(ox,oy-70,'Lv UP!','#ffd23f',null,30);sfx('level');},750);
 if(r.hint)setTimeout(()=>toast(`${icon('hint')}스킬 힌트: <b>${skill(r.hint!).name}</b> 15% 할인`),950);
 announceTurn();}
function announceTurn(){const c=model.career;if(!c||c.pending)return;if(model.isRaceTurn())setTimeout(()=>{stamp(model.goal()!.name+'!','rainbow');sfx('gate');},1100);else if(c.turn===13||c.turn===21)setTimeout(()=>{stamp('근일점 합숙!','great');sfx('gate');},1100);else if(c.turn===9||c.turn===17)setTimeout(()=>{stamp(seasons[seasonOf(c.turn)]+' 개막','great');},1100);}
function toast(html:string){const t=document.createElement('div');t.className='toast';t.innerHTML=html;ui.append(t);sfx('sparkle',.6);gsap.timeline({onComplete:()=>t.remove()}).from(t,{y:-30,opacity:0,duration:.3,ease:'back.out(2)'}).to(t,{opacity:0,y:-10,duration:.3,delay:2.2});}
function vitalsFx(energy:number,mood=0){const box=ui.querySelector<HTMLElement>('.energy');if(box&&energy){const bb=box.getBoundingClientRect();floatText(bb.left+bb.width*.6,bb.bottom,`+${energy}`,'#5fe39a',null,30);}const e=ui.querySelector<HTMLElement>('#energy-v');if(e&&energy)countUp(e,+e.textContent!-energy,+e.textContent!,.5);arpeggio(mood>0?[0,4,7,12]:[0,4,7],.06,.5);if(mood>0){const m=ui.querySelector('.mood');if(m)gsap.fromTo(m,{scale:1.35},{scale:1,duration:.45,ease:'back.out(3)'});}scene.pulse('train',1);announceTurn();}
function skillDialog(){const c=model.career!;openDialog(`<div class="dlg-head"><h2>${icon('skill')}스킬 습득</h2><em class="sp-left">${c.sp} SP</em></div><div class="skill-list scroll">${skills.map(v=>{const cost=model.skillCost(v.id),own=c.skills.includes(v.id),hint=c.hints[v.id]??0;return btn(`${icon(v.icon)}<span><b>${v.name}${hint?`<i class="hint">힌트 Lv${hint}</i>`:''}</b><small>${v.note}</small></span><em>${own?'습득':cost+' SP'}</em>`,`learn:${v.id}`,`skill ${own?'own':''} ${v.gold?'gold':''}`,own||c.sp<cost);}).join('')}</div>`);}
function missionDialog(){openDialog(`<div class="dlg-head"><h2>${icon('lab')}관측소 미션</h2></div><p class="muted">GAIA 연구소의 실험을 피지컬 게임으로. 1턴 · 체력 −10 · 시즌마다 종류별 1회. 판정 S/A/B/C에 따라 능력치.</p><div class="skill-list">${missions.map(m=>btn(`${missionIcon(m.id)}<span><b>${m.name}</b><small>${m.note} · ${statNames[m.stats[0]]}·${statNames[m.stats[1]]}</small></span><em>${model.missionAvailable(m.id)?'S: +48':'이번 시즌 완료'}</em>`,`mission:${m.id}`,'skill',!model.missionAvailable(m.id))).join('')}</div>`);}
async function doMission(id:string){dialog='';render();busy=true;music('tension');const host=document.createElement('div');host.className='mission-host';root.append(host);const g=await runMission(id,host);host.remove();busy=false;const before=[...model.career!.stats];const r=model.missionReward(id,g);music('home');render();if(r)r.delta.forEach((d,k)=>{if(!d)return;const row=ui.querySelector<HTMLElement>(`.stats-panel [data-stat="${k}"]`);const val=row?.querySelector<HTMLElement>('.sv');if(val){countUp(val,before[k],before[k]+d,.6);row!.classList.add('up');}if(row){const rr=row.getBoundingClientRect();floatText(rr.left+rr.width/2,rr.top,`+${d}`,statColors[k],null,36);}});announceTurn();}

// ── Race presentation ──
async function startIntro(){const r=race!;const intro=ui.querySelector<HTMLElement>('#rc-intro')!;racePhase='intro';scene.mode='paddock';
 const str=r.config.entries.map(e=>strengthOf(e,r.config.course));const order=[...str.keys()].sort((a,b)=>str[b]-str[a]);const me=model.career?.planet;
 intro.innerHTML=`${btn('소개 건너뛰기 '+icon('ff'),'skipIntro','ghost small skip-intro')}<div class="lower3"></div>`;const l3=intro.querySelector<HTMLElement>('.lower3')!;
 for(const [i,e] of r.config.entries.entries()){if(racePhase!=='intro')return;const p=planet(e.planet);scene.introIndex=i;l3.innerHTML=`<b class="gate g${i+1}">${i+1}</b>${thumb(p.id,'l3')}<div><small>${p.en} · ${order.indexOf(i)+1}번 인기 · ${strategies[e.strategy].name}</small><h2>${p.name}${p.id===me?'<em>내 선수</em>':''}</h2><p>${p.title}</p></div>`;if(!reduced)gsap.fromTo(l3,{x:-60,opacity:0},{x:0,opacity:1,duration:.3,ease:'power3.out'});sfx('whoosh',.3);await wait(p.id===me?1500:800);}
 if(racePhase==='intro')countdown();}
async function countdown(){racePhase='count';scene.introIndex=-1;scene.mode='race';const intro=ui.querySelector<HTMLElement>('#rc-intro');if(intro)intro.innerHTML='';const box=ui.querySelector<HTMLElement>('#rc-count');if(!box)return;
 for(const n of ['3','2','1']){box.innerHTML=`<b>${n}</b>`;sfx('beep');gsap.fromTo(box.firstElementChild,{scale:2,opacity:0},{scale:1,opacity:1,duration:.25,ease:'power3.out'});await wait(600);if(screen!=='race')return;}
 box.innerHTML='<b class="go">GO!</b>';sfx('gate');sfx('go');sfx('crowd',.8);music('race');gsap.fromTo(box.firstElementChild,{scale:.6,opacity:1},{scale:1.4,opacity:0,duration:.8,ease:'power2.out'});racePhase='run';}
function updateRaceHUD(full=false){if(!race)return;const r=race,me=model.career?.planet??'';const q=(s:string)=>ui.querySelector<HTMLElement>(s);
 const clock=q('#rc-clock');if(clock)clock.textContent=`${Math.floor(r.time/60)}:${(r.time%60).toFixed(1).padStart(4,'0')}`;const lead=r.ranking[0];const left=q('#rc-left');if(left)left.textContent=lead.finish?'FINISH':`${Math.ceil(r.course.length-lead.distance)} m`;
 const map=q('#rc-map');if(map)for(const el of map.querySelectorAll<SVGCircleElement>('circle[data-id]')){const rc=r.racer(el.dataset.id!);const s=r.course.track.at(rc.distance/r.course.length);el.setAttribute('cx',((s.p[0]-mm.cx)*mm.sc).toFixed(1));el.setAttribute('cy',((s.p[2]-mm.cz)*mm.sc).toFixed(1));}
 if(screen==='race'&&racePhase!=='intro'){const lf=lead.distance/r.course.length;const showRank=lf>.55||(r.time%12)<3;let html='';r.ranking.forEach((v,i)=>{const isMe=v.id===me;if(!isMe&&!(showRank&&i<3))return;const sp=scene.screenPos(v.id);if(!sp)return;html+=`<div class="tag ${isMe?'me':''} p${i+1}" style="transform:translate(${sp.x.toFixed(0)}px,${sp.y.toFixed(0)}px)">${isMe?`<b>${i+1}위</b><span>${planet(v.planet).name}</span>`:`<b>${i+1}</b>`}</div>`;});labels.innerHTML=html;}
 if(!full&&performance.now()-hudClock<120)return;hudClock=performance.now();
 const ranks=q('#rc-ranks');if(ranks)ranks.innerHTML=r.ranking.map((v,i)=>`<li class="${v.id===me?'me':''} ${v.exhausted?'tired':''}" style="--c:${planet(v.planet).color}"><b>${i+1}</b><span>${planet(v.planet).name}</span>${v.effects.some(e=>e.mul>1)?icon('lightning'):''}</li>`).join('');}
function raceEvents(){if(!race)return;const r=race,me=model.career?.planet;for(let i=lastComment+1;i<r.events.length;i++){const e=r.events[i];lastComment=i;const box=ui.querySelector<HTMLElement>('#rc-comment p');
  if(box&&(e.type!=='skill'||e.id===me)){const text=e.text;box.textContent='';let k=0;box.dataset.t=String(i);const timer=setInterval(()=>{if(!box.isConnected||box.dataset.t!==String(i)){clearInterval(timer);return;}box.textContent=text.slice(0,++k);if(k>=text.length)clearInterval(timer);},16);if(!reduced)gsap.fromTo(box.parentElement,{x:-14},{x:0,duration:.25});}
  if(e.type==='unique')cutIn(e.id,e.label??'');else if(e.type==='skill')chip(e.id,e.label??'',!!e.big);else if(e.type==='collide'){sfx('impact',.8);flash('#fff',.35);shake(ui,8);}else if(e.type==='pass'){sfx('whoosh',.4);if(e.id===me){sfx('crowd',.7);toastRace('선두!');}}else if(e.type==='duel'){sfx('crowd',.6);if(e.id===me||e.others?.includes(me!))toastRace('경합!');}else if(e.type==='lastspurt'){sfx('crowd',.9);speedlines.classList.add('on');scene.punch(6);}else if(e.type==='exhaust'&&e.id===me)sfx('fail',.5);
  else if(e.type==='finish'){const n=r.racers.filter(x=>x.finish).length;if(n===1){sfx('bell');flash('#fff',.8);stamp(e.id===me?'1착!!':'FINISH',e.id===me?'rainbow':'great',.6);if(e.id===me){scene.fireworks(5);fanfare();}}else if(e.id===me){const rk=r.rankOf(me!);stamp(`${rk}위 골인`,rk<=3?'great':'good',.5);}}}}
function toastRace(t:string){const el=document.createElement('div');el.className='race-toast';el.textContent=t;ui.append(el);gsap.timeline({onComplete:()=>el.remove()}).from(el,{scale:2,opacity:0,duration:.25,ease:'power3.in'}).to(el,{opacity:0,y:-20,duration:.3,delay:.8});}
function cutIn(id:string,label:string){const el=ui.querySelector<HTMLElement>('#rc-cutin');if(!el)return;const p=planet(id);const mine=id===model.career?.planet;sfx('skill');el.innerHTML=`<div class="band ${mine?'mine':''}" style="--c:${p.color}">${thumb(p.id,'cut')}<div><small>${p.name}${mine?' · 내 선수':''}</small><b>${label}</b></div></div>`;el.classList.add('on');if(!reduced){gsap.fromTo(el.querySelector('.band'),{xPercent:110},{xPercent:0,duration:.28,ease:'power4.out'});gsap.fromTo(el.querySelector('b'),{scale:1.8,opacity:0},{scale:1,opacity:1,duration:.3,delay:.1,ease:'power3.out'});}
 setTimeout(()=>{const b=el.querySelector('.band');if(b)gsap.to(b,{xPercent:-120,duration:.3,ease:'power3.in',onComplete:()=>el.classList.remove('on')});},1500);}
function chip(id:string,label:string,gold=false){const box=ui.querySelector<HTMLElement>('#rc-chips');if(!box)return;const c=document.createElement('div');c.className='chip-skill'+(id===model.career?.planet?' me':'')+(gold?' gold':'');c.style.setProperty('--c',planet(id).color);c.innerHTML=`${icon('lightning')}<span>${planet(id).name}</span><b>${label}</b>`;box.prepend(c);if(id===model.career?.planet)sfx('sparkle',.6);while(box.children.length>4)box.lastElementChild?.remove();gsap.timeline({onComplete:()=>c.remove()}).from(c,{x:-40,opacity:0,duration:.25}).to(c,{opacity:0,duration:.3,delay:2});}
/** Player inputs V2: shrinking ring timing at the final leg, then a short mash in the last stretch. */
function inputs(){if(!race||racePhase!=='run')return;const me=model.career?.planet;const mr=me?race.racer(me):undefined;if(!mr||mr.finish)return;const f=mr.distance/race.course.length;const inp=race.config.inputs;const sp=ui.querySelector<HTMLElement>('#rc-spurt'),ma=ui.querySelector<HTMLElement>('#rc-mash');
 if(!inp.spurt&&!spurtUI&&f>=FINAL_LEG-.015){spurtUI={t0:performance.now(),done:false};sp?.classList.add('on');sfx('charge',.6,1.5);}
 if(spurtUI&&!spurtUI.done){const k=(performance.now()-spurtUI.t0)/1000/.85;const ap=sp?.querySelector<HTMLElement>('.approach');if(ap)ap.style.transform=`scale(${Math.max(.3,3-2*k)})`;if(k>1.35)judgeSpurt(true);}
 if(inp.spurt&&!inp.mash&&!mashUI&&f>=.88){mashUI={t0:performance.now(),n:0,done:false};ma?.classList.add('on');}
 if(mashUI&&!mashUI.done){const t=(performance.now()-mashUI.t0)/1000;const bar=ma?.querySelector<HTMLElement>('.mbar i');if(bar)bar.style.width=`${Math.min(100,mashUI.n/16*100)}%`;if(t>2.2){mashUI.done=true;ma?.classList.remove('on');const mul=1+Math.min(.035,mashUI.n*.0022);const v=race.applyInput('mash',mul);if(v)model.setInput('mash',v);stamp(mashUI.n>=14?'근성 폭발!':mashUI.n>=8?'근성!':'…',mashUI.n>=14?'rainbow':'great',.3);if(mashUI.n>=14){flash('#fff',.4);scene.punch(8);}}}}
function judgeSpurt(timeout=false){if(!race||!spurtUI||spurtUI.done)return;const k=(performance.now()-spurtUI.t0)/1000/.85;spurtUI.done=true;ui.querySelector('#rc-spurt')?.classList.remove('on');const me=race.racer(model.career!.planet);const tol=.06+me.stats[4]*.00006;const err=Math.abs(k-1);
 const [label,mul]=(timeout?['MISS',.98]:err<tol?['PERFECT',1.065]:err<tol*2.2?['GREAT',1.04]:err<tol*4?['GOOD',1.02]:['MISS',.98]) as [string,number];const v=race.applyInput('spurt',mul,label);if(v)model.setInput('spurt',v);
 stamp(label,label==='PERFECT'?'rainbow':label==='MISS'?'bad':'great',.35);if(label==='PERFECT'){flash('#fff',.6);arpeggio([0,7,12,19],.05,.6);scene.punch(10);scene.kick(.3);}else if(label==='MISS')sfx('back');else{sfx('confirm');scene.punch(5);}}
async function finishRace(){racePhase='done';speedlines.classList.remove('on');await wait(1900);if(screen==='race'&&racePhase==='done')navigate('result');}
async function resultFx(){const r=race!;const me=r.racer(model.career?.planet??r.config.entries[0].planet);const rank=r.ranking.indexOf(me)+1;const el=ui.querySelector<HTMLElement>('.rank-big');if(el&&!reduced)gsap.from(el,{scale:3,opacity:0,rotate:-10,duration:.4,ease:'power4.in',delay:.25});await wait(650);sfx('stamp');shake(ui,8);
 if(rank===1){fanfare();scene.fireworks(8);const burst=(o:confetti.Options)=>confetti({disableForReducedMotion:true,colors:['#ffd23f','#ff5e8a','#3fd0ff','#5fe39a','#ffffff'],...o});burst({particleCount:200,spread:100,origin:{y:.6}});setTimeout(()=>burst({particleCount:140,angle:60,spread:70,origin:{x:0,y:.7}}),300);setTimeout(()=>burst({particleCount:140,angle:120,spread:70,origin:{x:1,y:.7}}),500);setTimeout(()=>burst({particleCount:120,spread:160,origin:{y:.3},scalar:1.4}),1200);}
 else if(rank<=3){arpeggio([0,4,7,12],.08,.6);confetti({particleCount:80,spread:60,origin:{y:.6},disableForReducedMotion:true});}else sfx('back');
 const cr=ui.querySelector<HTMLElement>('#rw-credits');if(cr&&cr.textContent==='0'){countUp(cr,0,+cr.dataset.v!,1);sfx('coin');}
 const cg=ui.querySelector<HTMLElement>('.cg');if(cg)setTimeout(()=>{if(!reduced)gsap.from(cg,{scale:3,opacity:0,duration:.35,ease:'power4.in'});sfx('stamp');},900);}

// ── Input ──
ui.addEventListener('pointerover',e=>{const b=(e.target as HTMLElement).closest('button');if(b&&!b.disabled&&b!==lastHover){lastHover=b;sfx('hover',.6);}const fac=(e.target as HTMLElement).closest<HTMLElement>('[data-fac]');if(fac&&screen==='training')ghost(+fac.dataset.fac!);});
ui.addEventListener('pointerout',e=>{if((e.target as HTMLElement).closest('[data-fac]'))ghost(-1);});
function ghost(i:number){if(!model.career||!model.canAct())return;const pv=i>=0?model.preview(i):null;ui.querySelectorAll<HTMLElement>('.stats-panel .stat').forEach((row,k)=>{const g=row.querySelector<HTMLElement>('.sgh')!;const v=pv?.gains[k]??0;g.textContent=v?`+${v}`:'';row.classList.toggle('preview',!!v);});}
root.addEventListener('pointerdown',e=>{if(screen!=='race'||(e.target as HTMLElement).closest('.rc-ctrl,button'))return;if(mashUI&&!mashUI.done){mashUI.n++;sfx('click',.3,1+mashUI.n*.03);}else if(spurtUI&&!spurtUI.done)judgeSpurt();});
ui.addEventListener('click',async e=>{const t=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-do]');if(!t||t.disabled)return;unlockAudio();const [a,arg]=t.dataset.do!.split(':');
 if(!['train','pull','start','race','buy'].includes(a))sfx(a==='back'||a==='close'?'back':'click');
 switch(a){case'start':if(screen==='title'){sfx('impact');flash('#fff',.6);music('home');screen='home';render();enter();break;}if(model.career&&!model.career.ended){openDialog(`<h2>진행 중인 시즌을 버릴까요?</h2><p class="muted">보유 선수와 카드는 유지됩니다.</p><div class="row">${btn('새 시즌 시작','confirmStart','go')}${btn('취소','close','ghost')}</div>`);}else{model.start();sfx('gate');navigate('training');}break;
  case'confirmStart':dialog='';model.start();navigate('training');break;
  case'nav':navigate(arg as Screen);break;case'back':navigate(screen==='paddock'?'training':'home');break;
  case'kind':kind=arg as typeof kind;render();break;case'select':model.select(arg);scene.reveal(arg);sfx('whoosh',.5);render();break;case'support':model.toggleSupport(arg);render();break;case'tab':setupTab=arg as typeof setupTab;render();break;case'parent':model.toggleParent(+arg);render();break;
  case'collect':model.select(arg);navigate('home');break;
  case'train':doTrain(+arg);break;
  case'rest':{const r=model.rest();render();if(r){vitalsFx(r.energy);if(r.gain>=70)stamp('숙면!','great',.3);else if(r.gain<=30)stamp('잠을 설침','bad',.3);}break;}
  case'outing':{const r=model.outing();render();if(r){vitalsFx(r.energy,r.mood);if(r.mood>=2)stamp('최고의 관측회!','great',.3);}break;}
  case'openRace':if(model.makeRace(0,strategy,true))navigate('paddock');break;case'cancelRace':model.cancelRace();navigate('training');break;
  case'missions':missionDialog();break;case'mission':doMission(arg);break;
  case'event':{const ev=model.pendingEvent();const r=model.chooseEvent(+arg);sfx('confirm');if(ev?.legacy){flash('#9fd4ff',.6);arpeggio([0,4,7,11,14],.08,.6);stamp('계승 각성!','rainbow');}render();if(r){r.delta.forEach((d,k)=>{if(!d)return;const row=ui.querySelector<HTMLElement>(`.stats-panel [data-stat="${k}"]`);if(row){const rr=row.getBoundingClientRect();floatText(rr.left+rr.width/2,rr.top,`+${d}`,statColors[k],null,30);row.classList.add('up');chime(5);}});if(r.hint)toast(`${icon('hint')}스킬 힌트 획득`);}announceTurn();break;}
  case'skills':skillDialog();break;case'learn':if(model.learn(arg)){sfx('level');arpeggio(skill(arg).gold?[0,4,7,12,16,19,24]:[0,4,7,12],.05,.5);}skillDialog();break;
  case'pull':{if(busy)break;const pulls=model.scout(kind,+arg);if(!pulls.length){sfx('back');break;}busy=true;unlockAudio();const ctx={scene,overlay,root,again:()=>{}};let again=await(kind==='planet'?planetScout(ctx,pulls):supportScout(ctx,pulls));while(again&&model.state.currency>=SCOUT_COST*pulls.length){const more=model.scout(kind,pulls.length);again=await(kind==='planet'?planetScout(ctx,more):supportScout(ctx,more));}busy=false;const first=model.state.lastScout.find(p=>p.kind==='planet'&&p.fresh);if(first)model.select(first.id);music('home');render();break;}
  case'rates':openDialog(`<h2>스카우트 확률</h2><p>매회 SSR ${odds.SSR}% · SR ${odds.SR}% · R ${odds.R}%. 등급 안에서는 균등 선택.</p><div class="rate-table scroll">${(kind==='planet'?planets:supports).map(v=>`<div>${gradeBadge(v.grade)}<span>${v.name}</span><b>${(odds[v.grade]/(kind==='planet'?planets:supports).filter(x=>x.grade===v.grade).length).toFixed(2)}%</b></div>`).join('')}</div><p class="muted">결과는 버튼을 누르는 순간 정해집니다. '승급'은 결과를 숨겨 보여 주는 연출로, 처음 빛나는 별 색이 실제보다 낮을 수 있습니다(SR의 20%, SSR의 45%). 첫 천체 10회에서 앞 9회에 신규·SSR이 없으면 10번째는 SSR로 확정됩니다. 중복은 연구 조각(R 5 · SR 12 · SSR 30)으로 바뀝니다. 결제 없음, 무료 재화 전용.</p>`);break;
  case'exchange':if(model.exchange()){sfx('coin');render();toast(`${icon('coins')}연구 조각 30 → 300 크레딧`);}else toast('연구 조각 30개부터 교환할 수 있습니다.');break;
  case'buy':if(model.buy(arg)){sfx('level');arpeggio([0,4,7,12,16],.06,.6);flash('#9fd4ff',.4);render();const n=ui.querySelector(`[data-do="buy:${arg}"]`);if(n)gsap.fromTo(n,{scale:1.15},{scale:1,duration:.4,ease:'back.out(3)'});}else sfx('back');break;
  case'course':{const r=model.state.race;if(r&&r.kind==='final'){r.course=+arg;model.save();scene.setCourse(r.course);}render();break;}case'strategy':strategy=+arg;render();break;
  case'race':{const r=model.state.race;if(busy||!r)break;const me=r.entries.find(e=>e.planet===model.career?.planet);if(me)me.strategy=strategy;model.save();sfx('gate');if(!scene.proceduralDone){t.innerHTML='<span>시드 행성 지형 생성 중…</span>';t.disabled=true;}busy=true;await scene.whenProcedural();busy=false;navigate('race');break;}
  case'skipIntro':if(racePhase==='intro')countdown();break;
  case'pause':paused=!paused;t.innerHTML=icon(paused?'play':'pause');break;case'speed':speed=speed===1?2:1;t.textContent=speed+'×';break;
  case'camera':scene.cameraMode=(scene.cameraMode+1)%cameraNames.length;ui.querySelector('#cam-name')!.textContent=cameraNames[scene.cameraMode];break;
  case'skipRace':if(race){racePhase='done';race.finishAll();scene.skipEvents(race.events.length);lastComment=race.events.length;navigate('result');}break;
  case'replay':if(model.state.race)navigate('race');break;
  case'afterRace':navigate('training');break;case'retry':if(model.retry())navigate('training');break;case'giveUp':model.giveUp();model.endCareer();navigate('home');break;
  case'endCareer':model.endCareer();navigate('home');break;
  case'lab':await launchLab();break;case'close':dialog='';render();break;
  case'sound':{const on=!(model.state.settings.bgm||model.state.settings.sfx);model.state.settings.bgm=on;model.state.settings.sfx=on;model.save();setAudio({...model.state.settings});render();break;}
  case'settings':settingsDialog();break;
  case'toggle':{const k=arg as 'bgm'|'sfx';model.state.settings[k]=!model.state.settings[k];model.save();setAudio({...model.state.settings});settingsDialog();break;}
  case'export':{const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([JSON.stringify(model.state,null,2)],{type:'application/json'}));l.download='planet-musume-save.json';l.click();setTimeout(()=>URL.revokeObjectURL(l.href),500);break;}
  case'resetPrompt':openDialog(`<h2>모든 기록을 지울까요?</h2><p class="muted">보유 선수·카드·시즌·경기 기록·업그레이드가 삭제됩니다.</p><div class="row">${btn('초기화','reset','danger')}${btn('취소','close','ghost')}</div>`);break;
  case'reset':dialog='';model.reset();navigate('home');break;
  case'inspect':{const v=support(arg);openDialog(`<div class="inspect">${cardFace(arg)}<div><h2>${v.name}</h2><p class="muted">${v.team} · ${statNames[v.stat]} 전문 · ${v.note}</p><ul><li>함께 훈련하면 상승량 +${v.bonus+model.cardLevel(arg)*3}%</li><li>유대 ${FRIEND_BOND} 이상 + 전문 훈련 = 우정 트레이닝 (+${v.friend}%)</li><li>초기 유대 ${v.bond} · 실패율 −${v.fail}%p · 시작 ${statNames[v.stat]} +${v.start}</li><li>스킬 힌트: ${skill(v.hint).name}</li></ul></div></div>`);break;}
 }});
function settingsDialog(){const st=model.state.settings;openDialog(`<h2>${icon('cog')}설정</h2><div class="toggles">${btn(`${icon('music')}배경음 ${st.bgm?'ON':'OFF'}`,'toggle:bgm',st.bgm?'on':'')}${btn(`${icon('sound')}효과음 ${st.sfx?'ON':'OFF'}`,'toggle:sfx',st.sfx?'on':'')}</div><p class="muted">기록은 이 브라우저에만 저장됩니다. ${model.storageError||'자동 저장 정상.'}</p><div class="row">${btn('저장 내보내기','export','ghost')}${btn('전체 초기화','resetPrompt','danger')}</div>`);}
scene.onPoke=()=>{if(screen!=='home')return;const p=planet(model.state.selected);const q=ui.querySelector<HTMLElement>('#quip');sfx('sparkle',.5);if(q){q.textContent=p.quips[(p.quips.indexOf(q.textContent??'')+1)%p.quips.length];if(!reduced)gsap.fromTo(q,{scale:.7,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(2.4)'});}};
scene.onThumb=()=>{if(!busy&&['setup','collection','scout','paddock'].includes(screen))render();};
window.addEventListener('keydown',e=>{if(inLegacy||root.querySelector('.mission'))return;unlockAudio();if(e.key==='Escape'&&dialog){dialog='';render();return;}
 if(screen==='race'&&e.code==='Space'){e.preventDefault();if(e.repeat)return;if(mashUI&&!mashUI.done){mashUI.n++;sfx('click',.3,1+mashUI.n*.03);}else if(spurtUI&&!spurtUI.done)judgeSpurt();else paused=!paused;return;}
 if(screen==='training'&&/^[1-5]$/.test(e.key)&&!dialog)doTrain(+e.key-1);if(screen==='title'&&ready&&(e.key==='Enter'||e.code==='Space'))ui.querySelector<HTMLButtonElement>('.press-btn')?.click();});

// ── Loop ──
function loop(now:number){requestAnimationFrame(loop);const dt=Math.min(.1,(now-prev)/1000);prev=now;if(inLegacy)return;
 if(screen==='race'&&race){if(racePhase==='run'&&!paused&&!document.hidden){const [lead,second]=race.ranking;const lf=lead.distance/race.course.length;const ringOn=spurtUI&&!spurtUI.done;slowmo=ringOn?.45:(!lead.finish&&lf>.975&&Math.abs(lead.distance-second.distance)<4)||(lead.finish>0&&!second.finish&&race.time-lead.finish<.5)?.3:1;acc+=dt*speed*slowmo;while(acc>=1/60&&!race.done){race.step();acc-=1/60;}inputs();raceEvents();if(race.done)finishRace();}else slowmo=1;updateRaceHUD();}
 scene.update(now,screen==='race'||screen==='result'?race:undefined,dt*(screen==='race'?Math.max(.4,slowmo):1));}
requestAnimationFrame(loop);

// ── Legacy GAIA lab (free exploration; training uses the observatory missions) ──
async function launchLab(){if(launching)return;launching=true;dialog='';const seed=planet(model.state.selected).seed;history.pushState(null,'',`${base}?lab=world&seed=${seed}`);scene.active=false;inLegacy=true;root.hidden=true;music('none');document.querySelector<HTMLElement>('#root')!.style.display='block';
 const bridge=document.createElement('aside');bridge.id='game-lab-bridge';bridge.innerHTML='<div><b>GAIA//GENESIS</b><span>기존 연구실과 32초 영화 · 모든 기능 유지</span></div><button data-return>← 게임으로</button>';document.body.append(bridge);bridge.querySelector<HTMLButtonElement>('[data-return]')!.onclick=()=>returnGame();
 try{if(!legacyLoaded){await import('../main');legacyLoaded=true;}const g=(window as any).gaia;g.suspend(false);if(g.snapshot.seed!==seed)g.newWorld(seed);launching=false;}catch(e){launching=false;bridge.querySelector('span')!.textContent='연구실 준비 실패. 게임으로 돌아가 다시 시도하세요.';console.error(e);}}
function returnGame(push=true){const g=(window as any).gaia;g?.suspend(true);document.querySelector<HTMLElement>('#root')!.style.display='none';document.querySelector('#game-lab-bridge')?.remove();inLegacy=false;launching=false;root.hidden=false;scene.active=true;if(push)history.pushState(null,'',`${base}?game=home`);navigate('home',false,false);}
window.addEventListener('popstate',()=>{if(inLegacy){if(new URLSearchParams(location.search).has('game'))returnGame(false);return;}const p=new URLSearchParams(location.search);if(p.has('game'))navigate((p.get('game')||'home') as Screen,false);else location.reload();});

// ── Dev mode ──
installDev(model,()=>render(),{finishRace:win=>{if(screen!=='race'||!race)return;if(win){const me=race.racer(model.career!.planet);me.stats=me.stats.map(()=>1200) as typeof me.stats;}race.finishAll();racePhase='done';scene.skipEvents(race.events.length);lastComment=race.events.length;navigate('result');}});

// ── Boot ──
const requested=(new URLSearchParams(location.search).get('game')??'') as Screen;
render();
scene.prepare(p=>{loadPct=p;const bar=ui.querySelector<HTMLElement>('.loadbar i');if(bar)bar.style.width=`${Math.round(p*100)}%`;}).then(()=>{ready=true;model.state.intro=true;model.save();
 if(requested&&requested!=='title'&&Object.hasOwn(T,requested)){screen='home';navigate(requested,false,false);}else{render();if(!reduced)gsap.from('.press-btn',{scale:.6,opacity:0,duration:.5,ease:'back.out(2)'});}
}).catch(e=>{ui.innerHTML='<section class="title-screen"><div class="logo"><h1>행성<span>무스메</span></h1></div><p class="title-foot">WebGL2 가속이 필요합니다. 브라우저 하드웨어 가속을 켠 뒤 다시 시도하세요.</p><button class="go" onclick="location.reload()">다시 연결</button></section>';console.error(e);});
Object.assign(window,{musume:{model,scene,get race(){return race},get screen(){return screen},get snapshot(){return{screen,save:structuredClone(model.state),ready:scene.ready,race:race?{time:race.time,done:race.done,order:race.ranking.map(r=>r.id),events:race.events}:null}},navigate}});
