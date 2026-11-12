export type Stats=[number,number,number,number,number];
export const statNames=['속도','지구력','중력','자전력','궤도감각'];
export type Planet={id:string;name:string;en:string;grade:'R'|'SR'|'SSR';body:string;seed:number;color:string;stats:Stats;aptitude:number[];skill:string;description:string};
export const planets:Planet[]=[
 {id:'earth',name:'지구',en:'EARTH',grade:'SR',body:'earth',seed:162711,color:'#72c8da',stats:[210,260,210,210,230],aptitude:[1,1.05],skill:'제3행성의 품격',description:'마지막 직선, 남은 지구력으로 증명합니다.'},
 {id:'mercury',name:'수성',en:'MERCURY',grade:'SR',body:'mercury',seed:101,color:'#b5b4af',stats:[280,170,170,220,240],aptitude:[1.08,.95],skill:'근일점에서 뵙겠습니다',description:'태양에 가까워질수록 빨라지는 선수.'},
 {id:'venus',name:'금성',en:'VENUS',grade:'SR',body:'venus',seed:102,color:'#e2bd78',stats:[210,240,230,280,160],aptitude:[.98,1.06],skill:'역행도 진로입니다',description:'회전은 반대. 결승선은 같습니다.'},
 {id:'mars',name:'화성',en:'MARS',grade:'R',body:'mars',seed:103,color:'#e8956a',stats:[240,220,190,220,250],aptitude:[1.04,1],skill:'비가 올 확률은 낮습니다',description:'먼지 속에서도 자기 경로를 지킵니다.'},
 {id:'jupiter',name:'목성',en:'JUPITER',grade:'SSR',body:'jupiter',seed:104,color:'#d8b39c',stats:[180,230,320,210,180],aptitude:[.95,1.06],skill:'중력 앞에 평등은 없다',description:'접근하는 것만으로 경기가 달라집니다.'},
 {id:'moon',name:'달',en:'MOON',grade:'R',body:'moon',seed:105,color:'#d6d9d8',stats:[250,190,160,260,260],aptitude:[1.05,.98],skill:'밀물은 기다리지 않는다',description:'중반의 짧은 가속을 놓치지 않습니다.'},
 {id:'seed-a',name:'시드 행성 162711',en:'GENESIS 162711',grade:'R',body:'procedural',seed:162711,color:'#97c8a0',stats:[220,230,240,220,210],aptitude:[1,1],skill:'기원 특성 · 응집',description:'아직 쓰이지 않은 궤도의 기록.'},
 {id:'seed-b',name:'시드 행성 847209',en:'GENESIS 847209',grade:'SSR',body:'procedural',seed:847209,color:'#a5bddb',stats:[240,190,200,220,270],aptitude:[1.03,1.02],skill:'기원 특성 · 공명',description:'다른 출생, 다른 가속의 순간.'},
];
export const planet=(id:string)=>planets.find(p=>p.id===id)??planets[0];
