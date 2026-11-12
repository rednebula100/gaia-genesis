import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/black-han-sans/korean-400.css';
import '@fontsource/black-han-sans/latin-400.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-800-italic.css';
import './game.css';
import gsap from 'gsap';
import confetti from 'canvas-confetti';
import {GameModel,facilities,facilityLevel,moods,TURNS,TRIAL_TURN,FRIEND_BOND,careerScore,scoreGrade,SCOUT_COST,odds,type TrainResult} from './model';
import {planets,planet,statNames,statColors,gradeOf,gradeColor} from './data/planets';
import {supports,support} from './data/support';
import {skills,skill} from './data/skills';
import {courses,strategies} from './data/races';
import {Race,margin} from './race';
import {GameScene,cameraNames,UNIQUE} from './scene';
import {icon} from './icons';
import {sfx,chime,arpeggio,fanfare,unlockAudio,setAudio,music} from './audio';
import {fxLayer,floatText,flash,shake,stamp,countUp,wipe,hitstop,wait,reduced} from './fx';

type Screen='title'|'home'|'scout'|'setup'|'training'|'paddock'|'race'|'result'|'collection';
const model=new GameModel();
const base=import.meta.env.BASE_URL;
const root=document.createElement('main');root.id='game-root';root.className='musume';
root.innerHTML='<canvas class="game-canvas" tabindex="-1" aria-label="행성 선수. 드래그로 회전"></canvas><div class="vignette"></div><div class="speedlines"></div><div class="game-ui"></div><div class="overlay"></div>';
document.body.append(root);
const ui=root.querySelector<HTMLElement>('.game-ui')!,overlay=root.querySelector<HTMLElement>('.overlay')!,speedlines=root.querySelector<HTMLElement>('.speedlines')!;
fxLayer(root);gsap.ticker.lagSmoothing(0);
const scene=new GameScene(root.querySelector('canvas')!);
let screen:Screen='title',busy=false,kind:'planet'|'support'='planet',course=1,strategy=1,race:Race|undefined,paused=false,speed=1,acc=0,prev=performance.now(),dialog='',inLegacy=false,launching=false,legacyLoaded=false,labType='',labProgress=false,labTouched=false,loadPct=0,ready=false;
let racePhase:'intro'|'count'|'run'|'done'='intro',lastComment=-1,slowmo=1,hudClock=0,lastHover:Element|null=null;
setAudio({sfx:model.state.settings.sfx,bgm:model.state.settings.bgm});
const T={home:'클럽하우스',scout:'스카우트',setup:'선수 편성',training:'데뷔 시즌',paddock:'출전 준비',race:'LIVE',result:'공식 결과',collection:'기록실',title:''} as Record<Screen,string>;
const statIcon=(i:number)=>['spd','sta','grv','rot','orb'][i];

// ── Small builders ──
const btn=(html:string,action:string,cls='',disabled=false,extra='')=>`<button class="${cls}" data-do="${action}" ${disabled?'disabled':''} ${extra}>${html}</button>`;
const gradeBadge=(g:string)=>`<b class="rarity r-${g}">${g}</b>`;
const statGrade=(v:number)=>{const g=gradeOf(v);return`<b class="sg" style="--g:${gradeColor(g)}">${g}</b>`;};
const statRow=(i:number,v:number)=>`<div class="stat" data-stat="${i}" style="--c:${statColors[i]}">${icon(statIcon(i))}<span class="sn">${statNames[i]}</span>${statGrade(v)}<strong class="sv">${v}</strong><i class="sbar"><em style="width:${Math.min(100,v/6)}%"></em></i><span class="sgh"></span></div>`;
const cardFace=(id:string,opt:{selected?:boolean;action?:string;small?:boolean}={})=>{const s=support(id);const lv=model.cardLevel(id);return`<button class="scard g-${s.grade} ${opt.selected?'on':''} ${opt.small?'small':''}" data-do="${opt.action??'inspect:'+id}" style="--c:${statColors[s.stat]}"><span class="scard-art">${icon(s.icon)}</span><span class="scard-top">${gradeBadge(s.grade)}<em>${icon(statIcon(s.stat))}</em></span><strong>${s.name}</strong><small>${statNames[s.stat]} +${s.bonus+lv*3}%${lv?` · 돌파 ${lv}`:''}</small></button>`;};
const wallet=()=>`<div class="wallet"><span class="pill coin">${icon('coins')}<b id="wallet-credits">${model.state.currency.toLocaleString()}</b></span><button class="pill shard" data-do="exchange" title="연구 조각 30개 → 300 크레딧">${icon('crystal')}<b>${model.state.shards}</b></button><button class="icon-btn" data-do="sound" aria-label="소리">${icon(model.state.settings.bgm||model.state.settings.sfx?'sound':'mute')}</button><button class="icon-btn" data-do="settings" aria-label="설정">${icon('cog')}</button></div>`;
const topbar=()=>`<header class="topbar">${screen!=='home'?btn(icon('back'),'back','icon-btn back',false,'aria-label="뒤로"'):''}<div class="crumb"><span>${T[screen]}</span></div>${wallet()}</header>`;
const headlines=['[속보] 목성 측, 결승선의 중력적 구속 여부 재차 문의','[규정] 공전은 진로 방해에 해당하지 않음을 재확인','[인터뷰] 금성 "회전 방향은 개인의 자유"','[관측] 화성 먼지폭풍, 고의성 없음으로 결론','[기록] 달, 이번 시즌도 같은 면만 공개','[해명] 수성 "근일점은 전략이 아니라 궤도"','[공지] 위성 동반 출전 금지 규정 유지','[심판] 로슈 한계 안쪽 접촉, 양측 과실 없음'];
const fmt=(t:number)=>`${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;

// ── Render ──
function render(){root.dataset.screen=screen;if(!busy||screen!=='scout')scene.mode=screen;const s=model.state,c=s.career;
 if(['training','paddock','race','result'].includes(screen)&&c)scene.hero=c.planet;else if(screen!=='scout'||!busy)scene.hero=s.selected;
 const body=({title:titleScreen,home:homeScreen,scout:scoutScreen,setup:setupScreen,training:trainingScreen,paddock:paddockScreen,race:raceScreen,result:resultScreen,collection:collectionScreen} as Record<Screen,()=>string>)[screen]();
 ui.innerHTML=(['title','race'].includes(screen)?'':topbar())+body+(dialog?`<div class="shade" data-do="close"></div><section class="dialog" role="dialog" aria-modal="true">${btn(icon('close'),'close','icon-btn dialog-x',false,'aria-label="닫기"')}${dialog}</section>`:'');
 if(screen==='race')updateRaceHUD(true);
 ui.querySelector<HTMLElement>('.dialog button:not(.dialog-x):not(:disabled)')?.focus();}
function enter(){if(reduced)return;gsap.from(ui.querySelectorAll('.enter'),{y:26,opacity:0,duration:.42,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});gsap.from(ui.querySelectorAll('.enter-x'),{x:70,opacity:0,duration:.45,stagger:.05,ease:'power3.out',clearProps:'transform,opacity'});}

function titleScreen(){return`<section class="title-screen"><div class="logo enter"><small>ORBITAL RACING LEAGUE</small><h1>행성<span>무스메</span></h1><em>WAKUSEI MUSUME</em></div><div class="press enter">${ready?btn('<span>클릭해서 시작</span>','start','press-btn'):`<div class="loadbar"><i style="width:${Math.round(loadPct*100)}%"></i></div><span class="loadtxt">천체 선수 입장 중</span>`}</div><p class="title-foot enter">실제 천체 · 허구의 스포츠 · 무료 재화만 사용</p></section>`;}

function homeScreen(){const s=model.state,c=s.career,p=planet(s.selected);
 return`<section class="home"><div class="nameplate enter"><div class="np-top">${gradeBadge(p.grade)}<span>${p.en}</span></div><h1>${p.name}</h1><p>${p.title}</p><div class="quip" id="quip">${p.quips[0]}</div><small class="hint-poke">행성을 클릭해 보세요</small></div>
 <nav class="home-menu">${btn(`${icon('flag')}<span><b>${c?'시즌 계속':'데뷔 시즌'}</b><small>${c?`TURN ${c.turn} / ${TURNS} · ${planet(c.planet).name}`:'12턴 육성 → G1 결승'}</small></span>`,c?'nav:training':'nav:setup','menu-main enter-x')}
 ${btn(`${icon('comet')}<span><b>스카우트</b><small>${s.currency>=1000?'10회 가능!':'1회 100'}</small></span>${s.currency>=1000?'<i class="ping"></i>':''}`,'nav:scout','menu-card enter-x')}
 ${btn(`${icon('cards')}<span><b>선수 편성</b><small>선수 ${Object.keys(s.planets).length}/8 · 카드 ${Object.keys(s.supports).length}/8</small></span>`,'nav:setup','menu-card enter-x')}
 ${btn(`${icon('trophy')}<span><b>기록실</b><small>${s.hall.length?`최고 평가 ${s.hall.reduce((a,b)=>a.score>b.score?a:b).grade}`:'아직 기록 없음'}</small></span>`,'nav:collection','menu-card enter-x')}
 ${btn(`${icon('atom')}<span><b>GAIA 연구소</b><small>원래의 행성 실험실</small></span>`,'lab:free','menu-card lab enter-x')}</nav>
 <div class="ticker"><span>ORL NEWS</span><div><p>${[...headlines,...headlines].map(h=>`<i>${h}</i>`).join('')}</p></div></div>
 ${model.storageError?`<div class="notice enter">${model.storageError}</div>`:''}</section>`;}

function scoutScreen(){const s=model.state;const pool=kind==='planet'?planets:supports;const owned=kind==='planet'?s.planets:s.supports;
 return`<section class="scout"><div class="banner enter ${kind}"><div class="tabs">${btn(`${icon('ringed')}천체`,'kind:planet',kind==='planet'?'on':'')}${btn(`${icon('cards')}서포트`,'kind:support',kind==='support'?'on':'')}</div>
 <small class="banner-k">${kind==='planet'?'CELESTIAL SCOUT':'RESEARCH TEAM SCOUT'}</small><h1>${kind==='planet'?'다음 궤도의<br>주인공':'한 세계를 위한<br>연구진'}</h1>
 <div class="pickup">${pool.filter(p=>p.grade==='SSR').map(p=>`<span>${gradeBadge('SSR')}${p.name}</span>`).join('')}</div><em class="rates-line">SSR ${odds.SSR}% · SR ${odds.SR}% · R ${odds.R}%</em>
 <div class="owned">${pool.map(p=>`<i class="${owned[p.id]?'own':''}" title="${owned[p.id]?p.name:'???'}" style="--c:${'color' in p?p.color:statColors[(p as {stat:number}).stat]}"></i>`).join('')}<span>보유 ${Object.keys(owned).length}/${pool.length}</span></div>
 ${btn('확률 · 규칙 보기','rates','link')}</div>
 <div class="pull-actions enter-x">${btn(`<small>1회</small><b>${icon('coins')}${SCOUT_COST}</b>`,'pull:1','pull one',s.currency<SCOUT_COST)}${btn(`<small>10회</small><b>${icon('coins')}${(SCOUT_COST*10).toLocaleString()}</b>${!s.firstScout&&kind==='planet'?'<em>첫 10회 보호</em>':''}`,'pull:10','pull ten',s.currency<SCOUT_COST*10)}</div></section>`;}

function setupScreen(){const s=model.state,p=planet(s.selected),bonus=model.planetBonus(p.id);
 return`<section class="setup"><div class="panel roster enter"><h2>${icon('ringed')}선수</h2><div class="roster-grid">${planets.map(v=>btn(`<i class="dot" style="--c:${v.color}"></i><span>${s.planets[v.id]?v.name:'???'}</span>${gradeBadge(v.grade)}${s.planets[v.id]>1?`<em>+${s.planets[v.id]-1}</em>`:''}`,`select:${v.id}`,`rost ${s.selected===v.id?'on':''}`,!s.planets[v.id])).join('')}</div></div>
 <div class="nameplate compact enter"><div class="np-top">${gradeBadge(p.grade)}<span>${p.en}</span></div><h1>${p.name}</h1><p class="uniq">${icon('lightning')}<b>${p.skill}</b></p><p>${p.skillNote}</p></div>
 <div class="panel stats-mini enter">${p.stats.map((v,i)=>statRow(i,v+bonus)).join('')}${bonus?`<small class="bonus">중복 보너스 전 능력 +${bonus}</small>`:''}</div>
 <div class="panel deck enter-x"><h2>${icon('cards')}서포트 <em>${s.deck.length}/4</em></h2><div class="deck-slots">${[0,1,2,3].map(i=>s.deck[i]?cardFace(s.deck[i],{selected:true,action:'support:'+s.deck[i]}):'<div class="slot-empty">+</div>').join('')}</div><h3>보유 카드 <small>클릭해서 편성</small></h3><div class="owned-cards">${supports.filter(v=>s.supports[v.id]&&!s.deck.includes(v.id)).map(v=>cardFace(v.id,{action:'support:'+v.id,small:true})).join('')||'<p class="muted">모든 카드를 편성했습니다.</p>'}</div></div>
 <div class="setup-go enter-x">${s.career?btn('진행 중 시즌으로','nav:training','ghost'):''}${btn(`${icon('flag')}<span>데뷔 시즌 시작</span>`,'start','go')}</div></section>`;}

function trainingScreen(){const c=model.career!;const p=planet(c.planet);const ev=model.pendingEvent();const raceTurn=model.isRaceTurn();const toTrial=TRIAL_TURN-c.turn,toFinal=TURNS-c.turn;
 const goal=!c.trial&&c.turn<=TRIAL_TURN?(toTrial>0?`예선전까지 <b>${toTrial}</b>턴 · 목표 3위 이내`:'예선전 출전!'):toFinal>0?`G1 결승까지 <b>${toFinal}</b>턴`:'G1 결승 출전!';
 return`<section class="training"><div class="turnbox enter"><small>TURN</small><b>${String(c.turn).padStart(2,'0')}</b><span>/ ${TURNS}</span><p>${goal}</p></div>
 <div class="vitals enter"><div class="energy"><span>${icon('sta')}체력</span><div class="ebar"><i style="width:${c.energy}%;--e:${c.energy<30?'#ff4a3a':c.energy<50?'#ffb13c':'#5fe39a'}"></i></div><b id="energy-v">${c.energy}</b></div><div class="mood m${c.mood}"><span>컨디션</span><b>${moods[c.mood-1]}</b></div></div>
 <div class="panel info-panel enter"><div class="who">${gradeBadge(p.grade)}<b>${p.name}</b></div><div class="sp-row"><span>스킬 포인트</span><b id="sp-v">${c.sp}</b>${btn(`${icon('skill')}스킬`,'skills','mini')}</div><div class="owned-skills">${c.skills.map(id=>`<span>${skill(id).name}</span>`).join('')||'<em>습득한 스킬 없음</em>'}</div><div class="deck-row">${c.deck.map(id=>`<i class="chip" style="--c:${statColors[support(id).stat]};--b:${c.bonds[id]??0}%" title="${support(id).name} 유대 ${c.bonds[id]}">${icon(support(id).icon)}</i>`).join('')}<small>유대 ${FRIEND_BOND}↑ = 우정</small></div></div>
 <div class="stats-panel stat-strip enter">${c.stats.map((v,i)=>statRow(i,v)).join('')}</div>
 ${raceTurn?`<div class="race-call enter">${btn(`${icon('flag')}<span><small>${c.turn===TRIAL_TURN?'데뷔 예선':'G1'}</small><b>${c.turn===TRIAL_TURN?'메인벨트 신인전 출전':'결승 출전 준비'}</b></span>`,'nav:paddock','go big')}</div>`:
 `<div class="facilities">${facilities.map((f,i)=>{const pv=model.preview(i);return btn(`<span class="fac-top">${icon(statIcon(i))}<b>${f.name}</b><em>Lv${facilityLevel(c.uses[i])}</em></span><span class="chips">${pv.cards.map(id=>`<i class="chip ${model.isFriend(id,i)?'friend':''}" style="--c:${statColors[support(id).stat]};--b:${c.bonds[id]??0}%" title="${support(id).name} · 유대 ${c.bonds[id]}">${icon(support(id).icon)}</i>`).join('')}</span><span class="gain">+${pv.gains.reduce((a,b)=>a+b,0)}</span>${pv.fail?`<span class="fail">실패 ${pv.fail}%</span>`:`<span class="cost">${f.energy>0?'체력 +':'체력 '}${f.energy}</span>`}`,`train:${i}`,`fac enter ${pv.friends.length?'rainbow':''} ${pv.cards.length>=2?'hot':''}`,!!ev,`style="--c:${statColors[i]}" data-fac="${i}"`);}).join('')}</div>
 <div class="side-actions">${btn(`${icon('rest')}<span><b>휴식</b><small>체력 +50</small></span>`,'rest','side enter-x',!!ev)}${btn(`${icon('outing')}<span><b>관측회</b><small>컨디션 ▲ · 유대 +4</small></span>`,'outing','side enter-x',!!ev)}${btn(`${icon('lab')}<span><b>GAIA 특훈</b><small>실제 연구실 조작</small></span>`,'special','side lab enter-x',!!ev)}</div>`}
 <p class="log enter">${c.log}</p>
 ${ev?`<div class="event enter-x"><div class="ev-ribbon">${ev.card?`${icon(support(ev.card).icon)}${support(ev.card).team}`:'STORY EVENT'}</div><h2>${ev.title}</h2><p>${ev.text}</p>${ev.choices.map((v,i)=>btn(`<b>${v.label}</b><small>${choiceText(v)}</small>`,`event:${i}`,'choice')).join('')}</div>`:''}</section>`;}
function choiceText(v:{stats?:Partial<Record<number,number>>;energy?:number;mood?:number;sp?:number;bond?:number;hint?:string}){const parts:string[]=[];for(const [k,g] of Object.entries(v.stats??{}))parts.push(`${statNames[+k]} +${g}`);if(v.energy)parts.push(`체력 ${v.energy>0?'+':''}${v.energy}`);if(v.mood)parts.push('컨디션 ▲');if(v.sp)parts.push(`SP +${v.sp}`);if(v.bond)parts.push(`유대 +${v.bond}`);if(v.hint)parts.push('스킬 힌트');return parts.join(' · ');}

function strengthOf(e:{stats:number[];planet:string},ci:number){const apt=1+((planet(e.planet).aptitude[ci]??1)-1)*.15;const s=e.stats;return(s[0]*1.4+s[1]*(ci===2?1.1:.8)+s[2]*.8+s[3]*.8+s[4]*.7)*apt;}
function paddockScreen(){const c=model.career!;const trial=c.turn===TRIAL_TURN&&!c.trial;const ci=trial?0:Math.max(1,course);const k=courses[ci];
 const str=planets.map(p=>strengthOf({planet:p.id,stats:p.id===c.planet?c.stats:p.stats.map(v=>v+(trial?30:95))},ci));const total=str.reduce((a,b)=>a+b**4,0);const order=[...str.keys()].sort((a,b)=>str[b]-str[a]);
 return`<section class="paddock"><div class="panel course-card enter"><small>${k.grade} · ${k.en}</small><h1>${k.name}</h1><div class="course-meta"><span>${icon('flag')}${k.length.toLocaleString()} m</span><span>${icon('spiral')}코너 ${k.corners.length}</span><span>${icon('sun')}근일점 직선</span></div><p>${k.note}</p>
 ${trial?'':`<div class="course-pick">${[1,2].map(i=>btn(`<b>${courses[i].name}</b><small>${courses[i].length.toLocaleString()} m · ${courses[i].note}</small>`,`course:${i}`,ci===i?'on':'')).join('')}</div>`}
 <h3>작전</h3><div class="strats">${strategies.map((v,i)=>btn(`<b>${v.name}</b><small>${v.note}</small>`,`strategy:${i}`,strategy===i?'on':'')).join('')}</div></div>
 <div class="panel racecard enter-x"><h2>${icon('podium')}출주표</h2><div class="rc-head"><span>게이트</span><span>선수</span><span>인기</span><span>배당</span></div>${planets.map((p,i)=>{const pop=order.indexOf(i)+1;const o=Math.max(1.1,(total/(str[i]**4))*.8);return`<div class="rc-row ${p.id===c.planet?'me':''}" style="--c:${p.color}"><b class="gate g${i+1}">${i+1}</b><span><i class="dot"></i>${p.name}${p.id===c.planet?'<em>내 선수</em>':''}</span><span class="pop">${pop}번 인기</span><strong>${o.toFixed(1)}</strong></div>`;}).join('')}<small class="muted">배당은 중계 연출용 표기입니다. 실제 내기는 없습니다.</small></div>
 <div class="setup-go enter-x">${btn(`${icon('flag')}<span>출전</span>`,'race','go')}</div></section>`;}

function raceScreen(){const r=race!;const me=model.career?.planet;return`<section class="race-hud"><div class="bc-top"><span class="live">${icon('camera')}LIVE</span><div class="bc-title"><b>${r.course.name}</b><small>${r.course.grade} · ${r.course.length.toLocaleString()} m</small></div><b id="rc-clock" class="clock">0:00.0</b><span id="rc-left" class="left"></span></div>
 <ol class="ranks" id="rc-ranks"></ol><svg class="minimap" id="rc-map" viewBox="-140 -66 200 132"><ellipse cx="-53" cy="0" rx="78" ry="56" class="mm-track"/><circle cx="0" cy="0" r="6" class="mm-sun"/>${planets.map(p=>`<circle r="${p.id===me?6:4}" data-id="${p.id}" fill="${p.color}" class="${p.id===me?'me':''}"/>`).join('')}</svg>
 <div class="commentary" id="rc-comment"><span>실황</span><p></p></div><div class="cutin" id="rc-cutin"></div><div class="skillchips" id="rc-chips"></div>
 <div class="spurt" id="rc-spurt"><div class="sp-gauge"><i class="zone"></i><i class="zone good"></i><i class="needle"></i></div>${btn('<b>스퍼트!</b><small>SPACE</small>','spurt','spurt-btn')}</div>
 <div class="intro" id="rc-intro"></div><div class="countdown" id="rc-count"></div>
 <div class="rc-ctrl">${btn(icon('pause'),'pause','icon-btn',false,'aria-label="일시정지"')}${btn(`${speed}×`,'speed','icon-btn txt')}${btn(`${icon('camera')}<span id="cam-name">${cameraNames[scene.cameraMode]}</span>`,'camera','cam')}${btn('결과로','skipRace','ghost small')}</div></section>`;}

function resultScreen(){const c=model.career,r=race!;const me=r.racer(c?.planet??r.config.entries[0].planet);const ranking=r.ranking;const rank=ranking.indexOf(me)+1;const res=model.reward(rank,me.finish);const winner=ranking[0];const trial=r.config.kind==='trial';
 const score=c?careerScore(c.stats,c.skills.length)+(8-rank)*40:0;
 return`<section class="result"><div class="rank-block enter"><small>${r.course.name} · 공식 결과</small><div class="rank-big ${rank<=3?'top':''} ${rank===1?'win':''}"><b>${rank}</b><span>위</span></div><h1>${planet(me.planet).name}</h1><p>${fmt(me.finish)} · ${rank===1?`2위와 ${margin(ranking[1].finish-me.finish,me.velocity)}`:`1위와 ${margin(me.finish-winner.finish,winner.velocity)}`}</p></div>
 <div class="panel reward enter"><div class="rw-row">${icon('coins')}<span>획득 크레딧</span><b id="rw-credits" data-v="${res.reward}">${res.already?res.reward:0}</b></div>${trial?`<div class="rw-row">${icon('up')}<span>예선 보너스</span><b>${res.delta[0]?`전 능력 +${res.delta[0]}`:'없음'} · SP +${res.sp}</b></div>`:`<div class="career-grade"><span>시즌 평가</span><b class="cg">${scoreGrade(score)}</b><small>점수 ${score.toLocaleString()}</small></div>`}
 ${res.already?'<small class="muted">이미 지급된 경기입니다.</small>':''}</div>
 <div class="panel order enter-x"><h2>${icon('podium')}착순</h2>${ranking.map((v,i)=>`<div class="or-row ${v.id===me.id?'me':''}" style="--c:${planet(v.planet).color}"><b>${i+1}</b><span><i class="dot"></i>${planet(v.planet).name}</span><small>${i?margin(v.finish-ranking[i-1].finish,v.velocity):fmt(v.finish)}</small></div>`).join('')}</div>
 <div class="setup-go enter-x">${btn(`${icon('cycle')}리플레이`,'replay','ghost')}${c?(trial?btn(`${icon('flag')}<span>시즌 계속</span>`,'afterTrial','go'):btn(`${icon('home')}<span>시즌 종료</span>`,'endCareer','go')):btn('홈으로','nav:home','go')}</div></section>`;}

function collectionScreen(){const s=model.state;return`<section class="collection"><div class="panel col-planets enter"><h2>${icon('ringed')}천체 선수</h2><div class="col-grid">${planets.map(p=>btn(`<i class="dot" style="--c:${p.color}"></i><b>${s.planets[p.id]?p.name:'미발견'}</b>${gradeBadge(p.grade)}<small>${s.planets[p.id]?p.skill:'스카우트에서 획득'}</small>`,`collect:${p.id}`,'col-item',!s.planets[p.id])).join('')}</div><h2>${icon('cards')}서포트 카드</h2><div class="col-cards">${supports.map(v=>s.supports[v.id]?cardFace(v.id,{small:true}):`<div class="scard locked small"><span>?</span></div>`).join('')}</div></div>
 <div class="panel hall enter-x"><h2>${icon('laurels')}명예의 전당</h2>${s.hall.length?s.hall.map(h=>`<div class="hall-row"><b class="cg small">${h.grade}</b><span>${planet(h.planet).name}<small>${courses[h.course].name} ${h.rank}위 · 예선 ${h.trial||'-'}위</small></span><strong>${h.score.toLocaleString()}</strong></div>`).join(''):'<p class="muted">시즌을 끝까지 마치면 기록이 남습니다.</p>'}<div class="hall-sum">출전 ${s.results.length}회 · 1위 ${s.results.filter(r=>r.rank===1).length}회</div></div></section>`;}

// ── Navigation ──
async function navigate(next:Screen,push=true,transition=true){if(launching||busy)return;dialog='';const c=model.career;
 if(next==='training'&&!c)next='setup';if(next==='paddock'&&!model.isRaceTurn())next=c?'training':'setup';if((next==='race'||next==='result')&&!model.state.race)next=c?'training':'home';
 if(transition&&screen!=='title'&&next!==screen){busy=true;sfx('whoosh',.6);await wipe(next==='race'?'#ff4a5e':'#ffd23f');busy=false;}
 if(next==='race'){race=new Race(model.state.race!,model.career?.planet??'');scene.resetRaceView();scene.focus=model.career?.planet??'';scene.setCourse(race.config.course);racePhase='intro';lastComment=-1;slowmo=1;paused=false;acc=0;speedlines.classList.remove('on');}
 if(next==='result'&&model.state.race&&(!race||!race.done)){race=new Race(model.state.race,model.career?.planet??'');race.finishAll();}
 screen=next;if(push)history.pushState(null,'',`${base}?game=${next}`);
 music(next==='race'||next==='paddock'?'tension':next==='title'?'none':'home');
 render();enter();afterEnter();}
function afterEnter(){if(screen==='result')resultFx();if(screen==='race')startIntro();}
function openDialog(html:string){const first=!dialog;dialog=html;render();if(first&&!reduced)gsap.from('.dialog',{y:30,scale:.94,opacity:0,duration:.28,ease:'back.out(1.8)'});}

// ── Training feel ──
async function doTrain(i:number){if(busy||!model.canAct())return;const c=model.career!;const btnEl=ui.querySelector<HTMLElement>(`[data-fac="${i}"]`);const from=btnEl?.getBoundingClientRect();const before=[...c.stats];busy=true;sfx('confirm');if(btnEl)gsap.to(btnEl,{scale:.93,duration:.07,yoyo:true,repeat:1});
 const r=model.train(i) as TrainResult;await hitstop(r.great?120:60);
 if(!r.ok){scene.pulse('fail');sfx('fail');flash('#ff2a2a',.45);shake(ui,14);stamp('실패…','bad');}
 else{scene.pulse(r.friends.length?'friend':'train',i);if(r.friends.length){flash('#ffffff',.7);arpeggio([0,4,7,12,16,19],.06,.65);stamp('우정 트레이닝!','rainbow');}else if(r.great){flash('#fff4c0',.35);arpeggio([0,7,12],.07,.55);stamp('대성공!','great');}else{sfx('level',.5);stamp('GOOD','good',.3);}}
 busy=false;render();
 const ox=(from?.left??innerWidth/2)+(from?.width??0)/2,oy=from?.top??innerHeight*.7;let n=0;
 r.delta.forEach((d,k)=>{if(!d)return;const row=ui.querySelector<HTMLElement>(`.stats-panel [data-stat="${k}"]`);const val=row?.querySelector<HTMLElement>('.sv');const m=n;if(val){val.textContent=String(before[k]);setTimeout(()=>{countUp(val,before[k],before[k]+d,.5);row!.classList.add(d>0?'up':'down');if(d>0)chime(Math.round(d/5)+m,.5);},560+m*90);}floatText(ox+(m-.5)*44,oy,(d>0?'+':'')+d,d>0?statColors[k]:'#ff5a4a',row,d>=40?46:34);n++;});
 if(r.energy){const box=ui.querySelector<HTMLElement>('.energy');if(box){const bb=box.getBoundingClientRect();floatText(bb.left+bb.width*.6,bb.bottom,`${r.energy>0?'+':''}${r.energy}`,r.energy>0?'#5fe39a':'#ff8a5a',null,24);}}
 if(r.levelUp)setTimeout(()=>{floatText(ox,oy-70,'Lv UP!','#ffd23f',null,30);sfx('level');},750);
 if(r.hint)setTimeout(()=>toast(`${icon('hint')}스킬 힌트: <b>${skill(r.hint!).name}</b> 15% 할인`),950);
 const cc=model.career;if(cc&&model.isRaceTurn()&&!cc.pending)setTimeout(()=>{stamp(cc.turn===TRIAL_TURN?'예선전!':'G1 결승!','rainbow');sfx('gate');},1150);}
function toast(html:string){const t=document.createElement('div');t.className='toast';t.innerHTML=html;ui.append(t);sfx('sparkle',.6);gsap.timeline({onComplete:()=>t.remove()}).from(t,{y:-30,opacity:0,duration:.3,ease:'back.out(2)'}).to(t,{opacity:0,y:-10,duration:.3,delay:2.2});}
function vitalsFx(energy:number,mood=0){const box=ui.querySelector<HTMLElement>('.energy');if(box&&energy){const bb=box.getBoundingClientRect();floatText(bb.left+bb.width*.6,bb.bottom,`+${energy}`,'#5fe39a',null,30);}const e=ui.querySelector<HTMLElement>('#energy-v');if(e&&energy)countUp(e,+e.textContent!-energy,+e.textContent!,.5);arpeggio(mood>0?[0,4,7,12]:[0,4,7],.06,.5);if(mood>0){const m=ui.querySelector('.mood');if(m)gsap.fromTo(m,{scale:1.35},{scale:1,duration:.45,ease:'back.out(3)'});}scene.pulse('train',1);}

function skillDialog(){const c=model.career!;openDialog(`<h2>${icon('skill')}스킬 습득 <em class="sp-left">${c.sp} SP</em></h2><div class="skill-list">${skills.map(v=>{const cost=model.skillCost(v.id),own=c.skills.includes(v.id),hint=c.hints[v.id]??0;return btn(`${icon(v.icon)}<span><b>${v.name}${hint?`<i class="hint">힌트 Lv${hint}</i>`:''}</b><small>${v.note}</small></span><em>${own?'습득':cost+' SP'}</em>`,`learn:${v.id}`,`skill ${own?'own':''}`,own||c.sp<cost);}).join('')}</div>`);}
function specialDialog(){const c=model.career!;openDialog(`<h2>${icon('lab')}GAIA 특훈</h2><p class="muted">GAIA 연구실의 실제 3D 장치를 직접 조작합니다. 지구과학 모델과 능력치 보상은 별개의 게임 규칙입니다.</p><div class="skill-list">${[['core','내핵 관측','내핵 선택 + 절개각 120° 이상','중력 +25','core'],['seismic','지진파 계측','지진파 300초 이후 S파 선택','궤도감각 +25','tide'],['cosmos','중력 실험','중력값 직접 변경','속도 +25','orbital'],['impact','충돌 역학','충돌 시간 직접 탐색','중력 +36 / +6','impact']].map(([id,t,n,g,ic])=>btn(`${icon(ic)}<span><b>${t}</b><small>${n} · 1턴 · 체력 −12 · SP +20</small></span><em>${c.labUsed.includes(id)?'완료':g}</em>`,`lab:${id}`,'skill',c.labUsed.includes(id))).join('')}</div>`);}

// ── Scout choreography: charge → comet (colour = best rarity, may promote) → flash → card wall → featured reveals ──
const gradeCol:Record<string,string>={R:'#6fa8d8',SR:'#ffc93c',SSR:'#ff5ec8'};
async function runScout(count:number){if(busy)return;const pulls=model.scout(kind,count);if(!pulls.length){sfx('back');return;}busy=true;unlockAudio();let skip=false;
 const best=pulls.some(p=>p.grade==='SSR')?'SSR':pulls.some(p=>p.grade==='SR')?'SR':'R';const promote=best==='SSR'&&Math.random()<.55;
 ui.querySelector<HTMLElement>('#wallet-credits')!.textContent=model.state.currency.toLocaleString();
 overlay.className='overlay scouting';root.classList.add('scouting');overlay.innerHTML=`<button class="skip" data-skip>SKIP ${icon('ff')}</button><div class="sc-stage"></div>`;const stage=overlay.querySelector<HTMLElement>('.sc-stage')!;overlay.querySelector<HTMLElement>('[data-skip]')!.onclick=e=>{e.stopPropagation();skip=true;sfx('click');};
 music('tension');sfx('charge');scene.mode='scout';scene.hero='__none';scene.comet(promote?gradeCol.SR:gradeCol[best],promote);
 for(let t=0;t<(promote?2300:1500)&&!skip;t+=50){await wait(50);if(promote&&t===1250){sfx('sparkle',.9);flash('#ffe08a',.35);}}
 sfx('impact');flash('#ffffff',.95,.6);shake(root,16);
 stage.innerHTML=`<div class="pull-wall n${pulls.length}">${pulls.map((p,i)=>`<div class="pcard g-${p.grade}" data-i="${i}"><div class="pc-back">${icon('comet')}</div><div class="pc-front" style="--c:${p.kind==='planet'?planet(p.id).color:statColors[support(p.id).stat]}">${gradeBadge(p.grade)}<span class="pc-art">${p.kind==='planet'?'<i class="orb"></i>':icon(support(p.id).icon)}</span><b>${p.kind==='planet'?planet(p.id).name:support(p.id).name}</b>${p.fresh?'<em class="new">NEW</em>':`<small>조각 +${p.shards}</small>`}</div></div>`).join('')}</div>`;
 const cards=[...stage.querySelectorAll<HTMLElement>('.pcard')];if(!reduced)gsap.from(cards,{y:80,opacity:0,duration:.4,stagger:.04,ease:'back.out(1.6)',clearProps:'transform,opacity'});await wait(skip?0:500);
 for(const [i,p] of pulls.entries()){if(skip)break;const el=cards[i];if(p.grade==='SSR'){el.classList.add('glow');gsap.to(el,{x:'+=5',duration:.05,repeat:9,yoyo:true,clearProps:'transform'});sfx('charge',.7,1.6);await wait(600);}
  el.classList.add('flip');if(p.grade==='SSR'){sfx('impact',.8);flash('#ff9ad8',.5);arpeggio([0,4,7,12,16,19,24],.05,.6);}else if(p.grade==='SR'){sfx('coin',.8);chime(7,.5);}else sfx('click',.7,1.3);await wait(p.grade==='R'?110:240);}
 cards.forEach(c=>c.classList.add('flip'));
 const featured=pulls.filter(p=>p.kind==='planet'&&(p.fresh||p.grade==='SSR'));const wall=stage.querySelector<HTMLElement>('.pull-wall')!;
 for(const p of featured){if(skip)break;wall.style.opacity='0';const pl=planet(p.id);scene.mode='scout';scene.reveal(p.id);sfx('whoosh');await wait(900);sfx(p.grade==='SSR'?'impact':'stamp');flash(p.grade==='SSR'?'#ffd0f0':'#ffffff',.6);if(p.grade==='SSR')scene.burst(['#ff5ec8','#ffc93c','#5fe39a','#3fd0ff'],420,12);
  const cap=document.createElement('div');cap.className='feature';cap.innerHTML=`<div class="f-top">${gradeBadge(p.grade)}${p.fresh?'<em class="new big">NEW</em>':''}</div><h1>${pl.name}</h1><p>${pl.title}</p><small>${icon('lightning')}${pl.skill}</small><span class="tap">클릭해서 계속</span>`;stage.append(cap);if(!reduced){gsap.from(cap.querySelector('h1'),{scale:2.4,opacity:0,duration:.35,ease:'power4.in'});gsap.from(cap.querySelectorAll('.f-top,p,small'),{y:20,opacity:0,stagger:.08,delay:.3});}
  if(p.grade==='SSR')fanfare();else arpeggio([0,4,7,12],.07,.55);
  await new Promise<void>(res=>{const t=setTimeout(res,3400);overlay.onclick=e=>{if((e.target as HTMLElement).closest('[data-skip]'))return;clearTimeout(t);res();};const iv=setInterval(()=>{if(skip){clearInterval(iv);clearTimeout(t);res();}},50);});overlay.onclick=null;cap.remove();wall.style.opacity='1';}
 overlay.querySelector('[data-skip]')?.remove();const done=document.createElement('div');done.className='sc-done';done.innerHTML=`<span>신규 <b>${pulls.filter(p=>p.fresh).length}</b> · 연구 조각 <b>+${pulls.reduce((a,p)=>a+p.shards,0)}</b></span><button class="go" data-ok>확인</button>`;stage.append(done);if(!reduced)gsap.from(done,{y:30,opacity:0,duration:.3});
 await new Promise<void>(res=>{done.querySelector<HTMLElement>('[data-ok]')!.onclick=()=>{sfx('confirm');res();};});
 overlay.className='overlay';overlay.innerHTML='';root.classList.remove('scouting');busy=false;const first=pulls.find(p=>p.kind==='planet'&&p.fresh);if(first)model.select(first.id);music('home');render();}

// ── Race presentation ──
async function startIntro(){const r=race!;const intro=ui.querySelector<HTMLElement>('#rc-intro')!;racePhase='intro';scene.mode='paddock';
 const str=planets.map(p=>strengthOf(r.config.entries.find(e=>e.planet===p.id)!,r.config.course));const order=[...str.keys()].sort((a,b)=>str[b]-str[a]);const me=model.career?.planet;
 intro.innerHTML=`${btn('소개 건너뛰기 '+icon('ff'),'skipIntro','ghost small skip-intro')}<div class="lower3"></div>`;const l3=intro.querySelector<HTMLElement>('.lower3')!;
 for(let i=0;i<planets.length;i++){if(racePhase!=='intro')return;const p=planets[i];scene.introIndex=i;l3.innerHTML=`<b class="gate g${i+1}">${i+1}</b><div><small>${p.en} · ${order.indexOf(i)+1}번 인기 · ${strategies[r.config.entries[i].strategy].name}</small><h2>${p.name}${p.id===me?'<em>내 선수</em>':''}</h2><p>${p.title}</p></div>`;if(!reduced)gsap.fromTo(l3,{x:-60,opacity:0},{x:0,opacity:1,duration:.3,ease:'power3.out'});sfx('whoosh',.3);await wait(p.id===me?1500:900);}
 if(racePhase==='intro')countdown();}
async function countdown(){racePhase='count';scene.introIndex=-1;scene.mode='race';const intro=ui.querySelector<HTMLElement>('#rc-intro');if(intro)intro.innerHTML='';const box=ui.querySelector<HTMLElement>('#rc-count');if(!box)return;
 for(const n of ['3','2','1']){box.innerHTML=`<b>${n}</b>`;sfx('beep');gsap.fromTo(box.firstElementChild,{scale:2,opacity:0},{scale:1,opacity:1,duration:.25,ease:'power3.out'});await wait(600);if(screen!=='race')return;}
 box.innerHTML='<b class="go">GO!</b>';sfx('gate');sfx('go');sfx('crowd',.8);music('race');gsap.fromTo(box.firstElementChild,{scale:.6,opacity:1},{scale:1.4,opacity:0,duration:.8,ease:'power2.out'});racePhase='run';}
function updateRaceHUD(full=false){if(!race)return;const r=race,me=model.career?.planet??'';const q=(s:string)=>ui.querySelector<HTMLElement>(s);
 const clock=q('#rc-clock');if(clock)clock.textContent=`${Math.floor(r.time/60)}:${(r.time%60).toFixed(1).padStart(4,'0')}`;const lead=r.ranking[0];const left=q('#rc-left');if(left)left.textContent=lead.finish?'FINISH':`${Math.ceil(r.course.length-lead.distance)} m`;
 const map=q('#rc-map');if(map)for(const el of map.querySelectorAll<SVGCircleElement>('circle[data-id]')){const rc=r.racer(el.dataset.id!);const th=(rc.distance/r.course.length-r.course.sun)*Math.PI*2;el.setAttribute('cx',(Math.cos(th)*78-53).toFixed(1));el.setAttribute('cy',(Math.sin(th)*56).toFixed(1));}
 const sp=q('#rc-spurt');const mr=me?r.racer(me):undefined;if(sp&&mr){const win=r.spurtWindow(mr);const f=mr.distance/r.course.length;const show=racePhase==='run'&&!mr.spurtDone&&f>=win.open-.04&&f<win.close;sp.classList.toggle('on',show);if(show){const span=win.close-win.open;sp.querySelector<HTMLElement>('.needle')!.style.left=`${Math.max(0,Math.min(100,(f-win.open)/span*100))}%`;const z=sp.querySelectorAll<HTMLElement>('.zone');z[0].style.cssText=`left:${(win.center-win.half*2.6-win.open)/span*100}%;width:${win.half*5.2/span*100}%`;z[1].style.cssText=`left:${(win.center-win.half-win.open)/span*100}%;width:${win.half*2/span*100}%`;}}
 if(!full&&performance.now()-hudClock<120)return;hudClock=performance.now();
 const ranks=q('#rc-ranks');if(ranks)ranks.innerHTML=r.ranking.map((v,i)=>`<li class="${v.id===me?'me':''} ${v.exhausted?'tired':''}" style="--c:${planet(v.planet).color}"><b>${i+1}</b><span>${planet(v.planet).name}</span>${v.effects.some(e=>e.mul>1)?icon('lightning'):''}</li>`).join('');}
function raceEvents(){if(!race)return;const r=race,me=model.career?.planet;for(let i=lastComment+1;i<r.events.length;i++){const e=r.events[i];lastComment=i;const box=ui.querySelector<HTMLElement>('#rc-comment p');
  if(box&&e.type!=='skill'){const text=e.text;box.textContent='';let k=0;const timer=setInterval(()=>{if(!box.isConnected||box.dataset.t!==String(i)){clearInterval(timer);return;}box.textContent=text.slice(0,++k);if(k>=text.length)clearInterval(timer);},16);box.dataset.t=String(i);if(!reduced)gsap.fromTo(box.parentElement,{x:-14},{x:0,duration:.25});}
  if(UNIQUE.has(e.type))cutIn(e.id,e.label??'');else if(e.type==='skill')chip(e.id,e.label??'');else if(e.type==='collide'){sfx('impact',.8);flash('#fff',.4);shake(ui,10);}else if(e.type==='pass')sfx('whoosh',.4);else if(e.type==='lastspurt'){sfx('crowd',.9);speedlines.classList.add('on');}else if(e.type==='exhaust'&&e.id===me)sfx('fail',.5);
  else if(e.type==='spurt'){const good=e.label==='PERFECT'||e.label==='GOOD';stamp(e.label==='자동'?'AUTO':e.label!,e.label==='PERFECT'?'rainbow':good?'great':'bad',.4);if(e.label==='PERFECT'){flash('#fff',.6);arpeggio([0,7,12,19],.05,.6);scene.kick(.3);}else sfx(good?'confirm':'back');}
  else if(e.type==='finish'&&r.racers.filter(x=>x.finish).length===1){sfx('bell');flash('#fff',.8);stamp('FINISH','great',.6);}}}
function cutIn(id:string,label:string){const el=ui.querySelector<HTMLElement>('#rc-cutin');if(!el)return;const p=planet(id);sfx('skill');el.innerHTML=`<div class="band" style="--c:${p.color}"><small>${p.name}${id===model.career?.planet?' · 내 선수':''}</small><b>${label}</b></div>`;el.classList.add('on');speedlines.classList.add('on');if(!reduced){gsap.fromTo(el.querySelector('.band'),{xPercent:110},{xPercent:0,duration:.28,ease:'power4.out'});gsap.fromTo(el.querySelector('b'),{scale:1.8,opacity:0},{scale:1,opacity:1,duration:.3,delay:.1,ease:'power3.out'});}
 setTimeout(()=>{const b=el.querySelector('.band');if(b)gsap.to(b,{xPercent:-120,duration:.3,ease:'power3.in',onComplete:()=>el.classList.remove('on')});if(!race?.events.some(e=>e.type==='lastspurt'))speedlines.classList.remove('on');},1500);}
function chip(id:string,label:string){const box=ui.querySelector<HTMLElement>('#rc-chips');if(!box)return;const c=document.createElement('div');c.className='chip-skill'+(id===model.career?.planet?' me':'');c.style.setProperty('--c',planet(id).color);c.innerHTML=`${icon('lightning')}<span>${planet(id).name}</span><b>${label}</b>`;box.prepend(c);if(id===model.career?.planet)sfx('sparkle',.6);gsap.timeline({onComplete:()=>c.remove()}).from(c,{x:-40,opacity:0,duration:.25}).to(c,{opacity:0,duration:.3,delay:2});}
function pressSpurt(){if(!race||racePhase!=='run')return;const mr=race.racer(model.career?.planet??'');if(!mr||mr.spurtDone)return;if(mr.distance/race.course.length<race.spurtWindow(mr).open-.04)return;const t=race.pressSpurt();if(t!==null)model.setSpurt(t);const b=ui.querySelector('.spurt-btn');if(b)gsap.fromTo(b,{scale:.85},{scale:1,duration:.3,ease:'back.out(3)'});}
async function finishRace(){racePhase='done';speedlines.classList.remove('on');await wait(1700);if(screen==='race'&&racePhase==='done')navigate('result');}
async function resultFx(){const r=race!;const me=r.racer(model.career?.planet??r.config.entries[0].planet);const rank=r.ranking.indexOf(me)+1;const el=ui.querySelector<HTMLElement>('.rank-big');if(el&&!reduced)gsap.from(el,{scale:3,opacity:0,rotate:-10,duration:.4,ease:'power4.in',delay:.25});await wait(650);sfx('stamp');shake(ui,8);
 if(rank===1){fanfare();confetti({particleCount:180,spread:90,origin:{y:.6},colors:['#ffd23f','#ff5e8a','#3fd0ff','#5fe39a','#ffffff'],disableForReducedMotion:true});setTimeout(()=>confetti({particleCount:120,angle:60,spread:70,origin:{x:0,y:.7},disableForReducedMotion:true}),300);setTimeout(()=>confetti({particleCount:120,angle:120,spread:70,origin:{x:1,y:.7},disableForReducedMotion:true}),500);}else if(rank<=3){arpeggio([0,4,7,12],.08,.6);confetti({particleCount:80,spread:60,origin:{y:.6},disableForReducedMotion:true});}else sfx('back');
 const cr=ui.querySelector<HTMLElement>('#rw-credits');if(cr&&cr.textContent==='0'){countUp(cr,0,+cr.dataset.v!,1);sfx('coin');}
 const cg=ui.querySelector<HTMLElement>('.cg');if(cg)setTimeout(()=>{if(!reduced)gsap.from(cg,{scale:3,opacity:0,duration:.35,ease:'power4.in'});sfx('stamp');},900);}

// ── Input ──
ui.addEventListener('pointerover',e=>{const b=(e.target as HTMLElement).closest('button');if(b&&!b.disabled&&b!==lastHover){lastHover=b;sfx('hover',.6);}const fac=(e.target as HTMLElement).closest<HTMLElement>('[data-fac]');if(fac&&screen==='training')ghost(+fac.dataset.fac!);});
ui.addEventListener('pointerout',e=>{if((e.target as HTMLElement).closest('[data-fac]'))ghost(-1);});
function ghost(i:number){if(!model.career||!model.canAct())return;const pv=i>=0?model.preview(i):null;ui.querySelectorAll<HTMLElement>('.stats-panel .stat').forEach((row,k)=>{const g=row.querySelector<HTMLElement>('.sgh')!;const v=pv?.gains[k]??0;g.textContent=v?`+${v}`:'';row.classList.toggle('preview',!!v);});}
ui.addEventListener('click',async e=>{const t=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-do]');if(!t||t.disabled)return;unlockAudio();const [a,arg]=t.dataset.do!.split(':');
 if(!['train','pull','spurt','start','race'].includes(a))sfx(a==='back'||a==='close'?'back':'click');
 switch(a){case'start':if(screen==='title'){sfx('impact');flash('#fff',.6);music('home');screen='home';render();enter();break;}if(model.career){openDialog(`<h2>진행 중인 시즌을 버릴까요?</h2><p class="muted">보유 선수와 카드는 유지됩니다.</p><div class="row">${btn('새 시즌 시작','confirmStart','go')}${btn('취소','close','ghost')}</div>`);}else{model.start();sfx('gate');navigate('training');}break;
  case'confirmStart':dialog='';model.start();navigate('training');break;
  case'nav':navigate(arg as Screen);break;case'back':navigate(screen==='paddock'?'training':'home');break;
  case'kind':kind=arg as typeof kind;render();break;case'select':model.select(arg);scene.reveal(arg);sfx('whoosh',.5);render();break;case'support':model.toggleSupport(arg);render();break;
  case'collect':model.select(arg);navigate('home');break;
  case'train':doTrain(+arg);break;
  case'rest':{const r=model.rest();render();if(r)vitalsFx(r.energy);break;}
  case'outing':{const r=model.outing();render();if(r)vitalsFx(r.energy,r.mood);break;}
  case'event':{const r=model.chooseEvent(+arg);sfx('confirm');render();if(r){r.delta.forEach((d,k)=>{if(!d)return;const row=ui.querySelector<HTMLElement>(`.stats-panel [data-stat="${k}"]`);if(row){const rr=row.getBoundingClientRect();floatText(rr.right-40,rr.top,`+${d}`,statColors[k],null,28);row.classList.add('up');chime(5);}});if(r.hint)toast(`${icon('hint')}스킬 힌트 획득`);}break;}
  case'skills':skillDialog();break;case'learn':if(model.learn(arg)){sfx('level');arpeggio([0,4,7,12],.05,.5);}skillDialog();break;case'special':specialDialog();break;
  case'pull':runScout(+arg);break;
  case'rates':openDialog(`<h2>스카우트 확률</h2><p>매회 SSR ${odds.SSR}% · SR ${odds.SR}% · R ${odds.R}%. 등급 안에서는 균등 선택.</p><div class="rate-table">${(kind==='planet'?planets:supports).map(v=>`<div>${gradeBadge(v.grade)}<span>${v.name}</span><b>${(odds[v.grade]/(kind==='planet'?planets:supports).filter(x=>x.grade===v.grade).length).toFixed(2)}%</b></div>`).join('')}</div><p class="muted">첫 천체 10회에서 앞 9회에 신규·SSR이 없으면 10번째는 SSR로 확정됩니다(그 1회만 기본 확률 미적용). 중복은 연구 조각(R 5 · SR 12 · SSR 30)과 돌파 보너스로 바뀝니다. 결제 없음, 무료 재화 전용.</p>`);break;
  case'exchange':if(model.exchange()){sfx('coin');render();toast(`${icon('coins')}연구 조각 30 → 300 크레딧`);}else toast('연구 조각 30개부터 교환할 수 있습니다.');break;
  case'course':course=+arg;render();break;case'strategy':strategy=+arg;render();break;
  case'race':{if(busy||!model.makeRace(course,strategy))break;sfx('gate');if(!scene.proceduralDone){t.innerHTML='<span>시드 행성 지형 생성 중…</span>';t.disabled=true;}busy=true;await scene.whenProcedural();busy=false;navigate('race');break;}
  case'skipIntro':if(racePhase==='intro')countdown();break;
  case'pause':paused=!paused;t.innerHTML=icon(paused?'play':'pause');break;case'speed':speed=speed===1?2:1;t.textContent=speed+'×';break;
  case'camera':scene.cameraMode=(scene.cameraMode+1)%cameraNames.length;ui.querySelector('#cam-name')!.textContent=cameraNames[scene.cameraMode];break;
  case'spurt':pressSpurt();break;
  case'skipRace':if(race){racePhase='done';race.finishAll();scene.skipEvents(race.events.length);lastComment=race.events.length;navigate('result');}break;
  case'replay':if(model.state.race)navigate('race');break;
  case'afterTrial':navigate('training');break;
  case'endCareer':model.endCareer();navigate('home');break;
  case'lab':await launchLab(arg);break;case'close':dialog='';render();break;
  case'sound':{const on=!(model.state.settings.bgm||model.state.settings.sfx);model.state.settings.bgm=on;model.state.settings.sfx=on;model.save();setAudio({...model.state.settings});render();break;}
  case'settings':settingsDialog();break;
  case'toggle':{const k=arg as 'bgm'|'sfx';model.state.settings[k]=!model.state.settings[k];model.save();setAudio({...model.state.settings});settingsDialog();break;}
  case'export':{const l=document.createElement('a');l.href=URL.createObjectURL(new Blob([JSON.stringify(model.state,null,2)],{type:'application/json'}));l.download='planet-musume-save.json';l.click();setTimeout(()=>URL.revokeObjectURL(l.href),500);break;}
  case'resetPrompt':openDialog(`<h2>모든 기록을 지울까요?</h2><p class="muted">보유 선수·카드·시즌·경기 기록이 삭제됩니다.</p><div class="row">${btn('초기화','reset','danger')}${btn('취소','close','ghost')}</div>`);break;
  case'reset':dialog='';model.reset();navigate('home');break;
  case'inspect':{const v=support(arg);openDialog(`<div class="inspect">${cardFace(arg)}<div><h2>${v.name}</h2><p class="muted">${v.team} · ${statNames[v.stat]} 전문</p><ul><li>함께 훈련하면 상승량 +${v.bonus+model.cardLevel(arg)*3}%</li><li>유대 ${FRIEND_BOND} 이상 + 전문 훈련 = 우정 트레이닝 (+${v.friend}%)</li><li>초기 유대 ${v.bond} · 실패율 −${v.fail}%p</li><li>스킬 힌트: ${skill(v.hint).name}</li></ul></div></div>`);break;}
 }});
function settingsDialog(){const st=model.state.settings;openDialog(`<h2>${icon('cog')}설정</h2><div class="toggles">${btn(`${icon('music')}배경음 ${st.bgm?'ON':'OFF'}`,'toggle:bgm',st.bgm?'on':'')}${btn(`${icon('sound')}효과음 ${st.sfx?'ON':'OFF'}`,'toggle:sfx',st.sfx?'on':'')}</div><p class="muted">기록은 이 브라우저에만 저장됩니다. ${model.storageError||'자동 저장 정상.'}</p><div class="row">${btn('저장 내보내기','export','ghost')}${btn('전체 초기화','resetPrompt','danger')}</div>`);}
scene.onPoke=()=>{if(screen!=='home')return;const p=planet(model.state.selected);const q=ui.querySelector<HTMLElement>('#quip');sfx('sparkle',.5);if(q){q.textContent=p.quips[(p.quips.indexOf(q.textContent??'')+1)%p.quips.length];if(!reduced)gsap.fromTo(q,{scale:.7,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(2.4)'});}};
window.addEventListener('keydown',e=>{if(inLegacy)return;unlockAudio();if(e.key==='Escape'&&dialog){dialog='';render();return;}
 if(screen==='race'&&e.code==='Space'){e.preventDefault();const mr=race?.racer(model.career?.planet??'');if(racePhase==='run'&&mr&&!mr.spurtDone&&mr.distance/race!.course.length>=race!.spurtWindow(mr).open-.04)pressSpurt();else paused=!paused;return;}
 if(screen==='training'&&/^[1-5]$/.test(e.key)&&!dialog)doTrain(+e.key-1);if(screen==='title'&&ready&&(e.key==='Enter'||e.code==='Space'))ui.querySelector<HTMLButtonElement>('.press-btn')?.click();});

// ── Loop ──
function loop(now:number){requestAnimationFrame(loop);const dt=Math.min(.1,(now-prev)/1000);prev=now;if(inLegacy){checkLab();return;}
 if(screen==='race'&&race){if(racePhase==='run'&&!paused&&!document.hidden){const [lead,second]=race.ranking;const lf=lead.distance/race.course.length;slowmo=(!lead.finish&&lf>.975&&Math.abs(lead.distance-second.distance)<3.5)||(lead.finish>0&&!second.finish&&race.time-lead.finish<.5)?.28:1;acc+=dt*speed*slowmo;while(acc>=1/60&&!race.done){race.step();acc-=1/60;}raceEvents();if(race.done)finishRace();}else slowmo=1;updateRaceHUD();}
 scene.update(now,screen==='race'||screen==='result'?race:undefined,dt*(screen==='race'?Math.max(.4,slowmo):1));}
requestAnimationFrame(loop);

// ── GAIA lab bridge (preserved: real lab controls gate special-training rewards) ──
async function launchLab(type:string){if(launching)return;launching=true;dialog='';labType=type;labProgress=false;labTouched=false;const seed=model.career?planet(model.career.planet).seed:planet(model.state.selected).seed;const mode=type==='core'?'anatomy':type==='seismic'?'seismic':type==='cosmos'||type==='impact'?'origins':'world';const url=type==='genesis'||type==='birth'?`${base}?genesis=1&seed=${seed}`:`${base}?lab=${mode}&seed=${seed}`;history.pushState(null,'',url);scene.active=false;inLegacy=true;root.hidden=true;music('none');document.querySelector<HTMLElement>('#root')!.style.display='block';
 const bridge=document.createElement('aside');bridge.id='game-lab-bridge';bridge.innerHTML=`<div><b>${['free','genesis','birth'].includes(type)?'GAIA//GENESIS':'행성무스메 특훈'}</b><span>${({core:'내핵을 선택하고 절개각을 120° 이상으로 변경하세요.',seismic:'파동을 발생시키고 300초 이후 S파를 선택하세요.',cosmos:'중력 실험의 중력값을 직접 변경하세요.',impact:'충돌 준비 완료 후 실험 시간을 직접 탐색하세요.'} as Record<string,string>)[type]??'기존 연구실과 32초 영화 · 모든 기능 유지'}</span></div><button data-return>← 게임으로</button><button data-claim disabled>과제 진행 중</button>`;document.body.append(bridge);if(['free','genesis','birth'].includes(type))bridge.querySelector<HTMLElement>('[data-claim]')!.hidden=true;
 bridge.querySelector<HTMLButtonElement>('[data-return]')!.onclick=()=>returnGame();bridge.querySelector<HTMLButtonElement>('[data-claim]')!.onclick=()=>{if(labProgress&&model.labReward(type)){returnGame();setTimeout(()=>{stamp('특훈 완료!','great');arpeggio([0,4,7,12],.06,.6);},600);}};
 try{if(!legacyLoaded){await import('../main');legacyLoaded=true;}const g=(window as any).gaia;g.suspend(false);if(g.snapshot.seed!==seed)g.newWorld(seed);
  const deadline=performance.now()+240000;while(!g.snapshot.ready||g.snapshot.building){if(!inLegacy){g.suspend(true);return;}if(performance.now()>deadline)throw Error('GAIA preparation timeout');await new Promise(r=>setTimeout(r,100));}if(!inLegacy){g.suspend(true);return;}
  if(type==='genesis'||type==='birth')g.play();else{if(type==='cosmos'||type==='impact')g.lab.set({experiment:type==='cosmos'?'cosmos':'impact'});g.openLab(mode);}launching=false;}catch(e){launching=false;bridge.querySelector('span')!.textContent='연구실 준비 실패. 게임으로 돌아가 다시 시도하세요.';console.error(e);}}
function returnGame(push=true){const g=(window as any).gaia;g?.suspend(true);document.querySelector<HTMLElement>('#root')!.style.display='none';document.querySelector('#game-lab-bridge')?.remove();inLegacy=false;launching=false;root.hidden=false;scene.active=true;labType='';const to:Screen=model.career?'training':'home';if(push)history.pushState(null,'',`${base}?game=${to}`);navigate(to,false,false);}
function checkLab(){if(!inLegacy||launching||labProgress)return;const g=(window as any).gaia,s=g?.labSnapshot;if(!s?.active)return;labProgress=labType==='core'?s.selected===0&&s.cut>=120:labType==='seismic'?s.quakeActive&&s.quakeClock>=300&&s.wave==='S':labType==='cosmos'?s.origins.experiment==='cosmos'&&s.origins.stats&&labTouched&&Number(document.querySelector<HTMLInputElement>('#origin-gravity')?.value)!==1:labType==='impact'?labTouched&&s.origins.experiment==='impact'&&!s.origins.preparing&&Number(document.querySelector<HTMLInputElement>('#impact-time')?.value)>1:false;if(labProgress){const b=document.querySelector<HTMLButtonElement>('#game-lab-bridge [data-claim]');if(b){b.disabled=false;b.textContent='과제 완료 · 보상 받기 →';}}}
document.addEventListener('input',e=>{if(inLegacy&&['origin-gravity','impact-time'].includes((e.target as HTMLElement).id))labTouched=true;},true);
window.addEventListener('popstate',()=>{if(inLegacy){if(new URLSearchParams(location.search).has('game'))returnGame(false);return;}const p=new URLSearchParams(location.search);if(p.has('game'))navigate((p.get('game')||'home') as Screen,false);else location.reload();});

// ── Boot ──
const requested=(new URLSearchParams(location.search).get('game')??'') as Screen;
render();
scene.prepare(p=>{loadPct=p;const bar=ui.querySelector<HTMLElement>('.loadbar i');if(bar)bar.style.width=`${Math.round(p*100)}%`;}).then(()=>{ready=true;model.state.intro=true;model.save();
 if(requested&&requested!=='title'&&Object.hasOwn(T,requested)){screen='home';navigate(requested,false,false);}else{render();if(!reduced)gsap.from('.press-btn',{scale:.6,opacity:0,duration:.5,ease:'back.out(2)'});}
}).catch(e=>{ui.innerHTML='<section class="title-screen"><div class="logo"><h1>행성<span>무스메</span></h1></div><p class="title-foot">WebGL2 가속이 필요합니다. 브라우저 하드웨어 가속을 켠 뒤 다시 시도하세요.</p><button class="go" onclick="location.reload()">다시 연결</button></section>';console.error(e);});
Object.assign(window,{musume:{model,scene,get race(){return race},get screen(){return screen},get snapshot(){return{screen,save:structuredClone(model.state),ready:scene.ready,race:race?{time:race.time,done:race.done,order:race.ranking.map(r=>r.id),events:race.events}:null}},navigate}});
