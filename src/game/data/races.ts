export type Course={id:string;name:string;en:string;length:number;corners:[number,number][];sun:number;grade:string;note:string};
/** Track fractions; sun = fraction of the lap closest to the sun (perihelion). */
export const courses:Course[]=[
 {id:'belt',name:'메인벨트 신인전',en:'MAIN BELT NOVICE',length:1200,corners:[[.18,.36],[.6,.8]],sun:.45,grade:'예선',note:'단거리 · 데뷔 시즌 예선'},
 {id:'perihelion',name:'근일점 클래식',en:'PERIHELION CLASSIC',length:1800,corners:[[.14,.3],[.55,.74]],sun:.45,grade:'G1',note:'중거리 · 태양 최근접 직선'},
 {id:'lagrange',name:'라그랑주 스테이크스',en:'LAGRANGE STAKES',length:2400,corners:[[.1,.26],[.38,.52],[.62,.8]],sun:.45,grade:'G1',note:'장거리 · 연속 코너'},
];
export const strategies=[
 {id:'front',name:'도주',note:'초반부터 선두. 체력 소모 큼',early:1.07,late:.98,cost:1.12},
 {id:'pace',name:'선행',note:'선두권 유지. 균형',early:1.02,late:1.01,cost:1.02},
 {id:'late',name:'추입',note:'후방 대기 후 마지막에 폭발',early:.95,late:1.06,cost:.92},
];
