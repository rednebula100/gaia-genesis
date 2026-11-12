export type Stats=[number,number,number,number,number];
export const statNames=['속도','지구력','중력','자전력','궤도감각'] as const;
export const statShort=['SPD','STA','GRV','ROT','ORB'] as const;
export const statColors=['#3fd0ff','#ff7a59','#ffc93c','#b07bff','#5fe39a'] as const;
export type Grade='R'|'SR'|'SSR';
export type Planet={id:string;name:string;en:string;grade:Grade;body:string;seed:number;color:string;stats:Stats;aptitude:[number,number,number];skill:string;skillNote:string;title:string;quips:string[];radius:number};
/** Sport numbers are fiction. Appearance comes from real textures. */
export const planets:Planet[]=[
 {id:'earth',name:'지구',en:'EARTH',grade:'SR',body:'earth',seed:162711,color:'#58c4ff',stats:[104,117,99,99,104],aptitude:[1,1,1.03],skill:'제3행성의 품격',skillNote:'최종 직선, 체력이 남아 있으면 오래 버티는 가속.',title:'생명체 거주 가능 선수',quips:['표면의 71%가 물입니다. 수분 보충은 충분합니다.','자전 주기 24시간. 컨디션 관리에 유리합니다.','위성 동반 출전은 규정상 금지입니다.'],radius:.74},
 {id:'mercury',name:'수성',en:'MERCURY',grade:'SR',body:'mercury',seed:101,color:'#c9c4bb',stats:[126,77,77,99,108],aptitude:[1.06,1.06,.94],skill:'근일점에서 뵙겠습니다',skillNote:'태양 최근접 구간을 지나는 순간 폭발적 가속.',title:'공전 주기 88일의 스프린터',quips:['공전 속도 초속 47km. 오늘은 조금 늦춰 달립니다.','낮 기온 430도. 냉각은 각자 알아서.','대기가 없어 공기 저항이 없습니다. 이것은 핑계입니다.'],radius:.6},
 {id:'venus',name:'금성',en:'VENUS',grade:'SR',body:'venus',seed:102,color:'#f0c97a',stats:[95,108,104,126,72],aptitude:[.97,.98,1.06],skill:'역행도 진로입니다',skillNote:'코너에서 반대로 회전하며 가속. 진행 방향은 정상.',title:'유일한 역회전 선수',quips:['자전 방향이 반대입니다. 경기 방향은 같습니다.','하루가 일 년보다 깁니다. 조급하지 않습니다.','표면 기압 92기압. 압박에 강합니다.'],radius:.72},
 {id:'mars',name:'화성',en:'MARS',grade:'R',body:'mars',seed:103,color:'#ff7f50',stats:[108,99,86,99,113],aptitude:[1.04,1.02,.99],skill:'비가 올 확률은 낮습니다',skillNote:'먼지폭풍을 일으켜 뒤따르는 선수의 시야를 가린다.',title:'붉은 먼지의 선행마',quips:['올림푸스 산 높이 21km. 오르막 훈련은 끝났습니다.','먼지폭풍은 고의가 아닙니다. 계절입니다.','위성 둘은 관중석에 있습니다.'],radius:.66},
 {id:'jupiter',name:'목성',en:'JUPITER',grade:'SSR',body:'jupiter',seed:104,color:'#e3b58f',stats:[81,104,144,95,81],aptitude:[.93,.97,1.07],skill:'중력 앞에 평등은 없다',skillNote:'주변 선수를 자기 궤도로 끌어들여 감속시킨다.',title:'태양계 최중량급',quips:['질량이 나머지 행성 합계의 2.5배입니다. 체급 구분은 없습니다.','대적점은 350년째 같은 자리입니다. 끈기의 상징입니다.','위성 95개를 데려오지 않았습니다. 배려입니다.'],radius:.92},
 {id:'moon',name:'달',en:'MOON',grade:'R',body:'moon',seed:105,color:'#d8dbe0',stats:[113,86,72,117,117],aptitude:[1.07,1,.95],skill:'밀물은 기다리지 않는다',skillNote:'중반 가속. 지구 근처라면 조석 고정으로 끌려간다.',title:'행성 아님, 그러나 출전',quips:['행성이 아니라는 지적이 있었습니다. 접수만 했습니다.','늘 같은 면만 보여 드립니다. 신비주의입니다.','지구와 같은 경기에 나오면 표정이 굳습니다.'],radius:.56},
 {id:'seed-a',name:'시드 행성 162711',en:'GENESIS 162711',grade:'R',body:'procedural',seed:162711,color:'#86e0a0',stats:[99,104,108,99,95],aptitude:[1,1,1],skill:'기원 특성: 응집',skillNote:'막혔을 때 주변 물질을 끌어모아 밀고 나간다.',title:'GAIA 연구소 출신',quips:['GAIA 연구소에서 32초 만에 태어났습니다.','아직 이름이 없습니다. 번호로 불러 주십시오.','지각은 식었습니다. 의욕은 뜨겁습니다.'],radius:.7},
 {id:'seed-b',name:'시드 행성 847209',en:'GENESIS 847209',grade:'SSR',body:'procedural',seed:847209,color:'#8fb6ff',stats:[108,86,90,99,122],aptitude:[1.03,1.03,1.03],skill:'기원 특성: 공명',skillNote:'2~4위에서 궤도 공명을 일으켜 단숨에 치고 나간다.',title:'공명하는 신성',quips:['다른 출생, 다른 가속.','궤도 공명 2:1. 계산은 끝났습니다.','관측 기록이 아직 0건입니다. 오늘이 첫 건입니다.'],radius:.7},
];
export const planet=(id:string)=>planets.find(p=>p.id===id)??planets[0];
export const gradeOf=(v:number)=>v>=600?'SS':v>=500?'S':v>=420?'A':v>=350?'B':v>=280?'C':v>=220?'D':v>=160?'E':v>=110?'F':'G';
export const gradeColor=(g:string)=>({SS:'#ff5ec8',S:'#ffc93c',A:'#ff8a3c',B:'#ff5e8a',C:'#5fe39a',D:'#3fd0ff',E:'#8a9bff',F:'#9aa7b5',G:'#7c8794'} as Record<string,string>)[g]??'#fff';
