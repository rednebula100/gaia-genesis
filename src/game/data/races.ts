import {Track,type V3} from './track';
export type Theme={base:[number,number,number];lane:[number,number,number];edge:[number,number,number];arch:string;arch2:string;sky:[number,number,number]};
export type Course={id:string;name:string;en:string;length:number;grade:string;note:string;points:V3[];sunPos:V3;backdrop:string;theme:Theme;track:Track;corners:[number,number][];sun:number};
const TH={space:{base:[.006,.014,.034],lane:[.08,.3,.62],edge:[1,.7,.3],arch:'#3fd0ff',arch2:'#ffd23f',sky:[.6,.65,.8]},nebula:{base:[.03,.006,.03],lane:[.6,.15,.55],edge:[1,.45,.9],arch:'#ff6ad5',arch2:'#b07bff',sky:[.95,.55,.9]},horizon:{base:[.02,.01,.004],lane:[.7,.35,.08],edge:[1,.55,.15],arch:'#ff9a3c',arch2:'#ffffff',sky:[.5,.4,.35]},ice:{base:[.01,.02,.03],lane:[.4,.8,.9],edge:[.7,.95,1],arch:'#9ff4ff',arch2:'#ffffff',sky:[.6,.75,.85]}} satisfies Record<string,Theme>;
const ring=(n:number,f:(t:number)=>V3)=>Array.from({length:n},(_,i)=>f(i/n*Math.PI*2));
function make(c:Omit<Course,'track'|'corners'|'sun'>):Course{const track=new Track(c.points);const mean=track.samples.reduce((a,s)=>a+s.curv,0)/track.n;const corners=track.corners(mean*1.5);return{...c,track,corners,sun:track.nearest(c.sunPos)};}
/** World units come from the control points. Sim distances use `length` (meters). */
export const courses:Course[]=[
 make({theme:TH.space,id:'belt',name:'메인벨트 데뷔전',en:'MAIN BELT DEBUT',length:1200,grade:'데뷔',note:'단거리 · 소행성대를 가르는 콩 모양 코스',sunPos:[0,0,-150],backdrop:'asteroids',points:ring(12,t=>[Math.cos(t)*120+Math.cos(2*t)*-18,Math.sin(t*3)*4,Math.sin(t)*72+Math.sin(2*t)*18])}),
 make({theme:TH.space,id:'perihelion',name:'근일점 클래식',en:'PERIHELION CLASSIC',length:1800,grade:'G1',note:'중거리 · 태양을 향해 내리꽂는 급강하 직선',sunPos:[150,-30,0],backdrop:'sun',points:ring(14,t=>[Math.cos(t)*170,-((Math.max(0,Math.cos(t)))**3)*26+Math.sin(t*2)*3,Math.sin(t)*95])}),
 make({theme:TH.ice,id:'lagrange',name:'라그랑주 스테이크스',en:'LAGRANGE STAKES',length:2400,grade:'G1',note:'장거리 · 8자 교차 고가와 연속 코너',sunPos:[0,-60,-260],backdrop:'twin',points:ring(18,t=>[Math.sin(t)*190,Math.cos(t)*12,Math.sin(2*t)*70])}),
 make({theme:TH.space,id:'rings',name:'카시니 링 서킷',en:'CASSINI RING CIRCUIT',length:2000,grade:'G2',note:'중장거리 · 거대 가스 행성 고리 위의 물결 코스',sunPos:[-300,40,-200],backdrop:'gasgiant',points:ring(16,t=>[Math.cos(t)*150,Math.sin(t*3)*7,Math.sin(t)*130+Math.cos(t*2)*-15])}),
 make({theme:TH.nebula,id:'nebula',name:'오리온 성운 스프린트',en:'ORION NEBULA SPRINT',length:1600,grade:'G2',note:'중거리 · 분홍 성운 속 S자 연속 코너',sunPos:[-220,60,-300],backdrop:'nebula',points:ring(16,t=>[Math.cos(t)*160+Math.sin(t*3)*26,Math.sin(t*2)*10,Math.sin(t)*90+Math.cos(t*3)*20])}),
 make({theme:TH.horizon,id:'horizon',name:'사건의 지평선 컵',en:'EVENT HORIZON CUP',length:2200,grade:'G1',note:'장거리 · 블랙홀 강착원반을 스치는 나선 고저차',sunPos:[0,-20,0],backdrop:'blackhole',points:ring(18,t=>[Math.cos(t)*(150+Math.sin(t*2)*30),Math.sin(t)*18,Math.sin(t)*(120+Math.cos(t*2)*24)])}),
];
export const strategies=[
 {id:'front',name:'도주',note:'초반부터 선두. 체력 소모 큼',gap:0,early:1.05,late:.99,cost:1.1},
 {id:'pace',name:'선행',note:'선두권 유지. 균형',gap:6,early:1.02,late:1.01,cost:1.02},
 {id:'mid',name:'차단',note:'중단에서 기회를 본다',gap:13,early:1,late:1.03,cost:.97},
 {id:'late',name:'추입',note:'후방 대기 후 마지막에 폭발',gap:22,early:.97,late:1.06,cost:.92},
];
/** Career race calendar. Goal races end a season; open races are optional. */
export const goals=[{turn:8,course:0,need:5,name:'데뷔전',grade:'데뷔'},{turn:16,course:3,need:3,name:'카시니 링 G2',grade:'G2'},{turn:24,course:-1,need:1,name:'오비탈 그랑프리 G1',grade:'G1'}];
export const finalCourses=[1,2,5];
export const openRaceCourse=(turn:number)=>(turn<8?[0,4]:turn<16?[4,3]:[1,5,2])[turn%(turn<16?2:3)];
