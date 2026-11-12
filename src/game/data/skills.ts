export type Skill={id:string;name:string;cost:number;note:string;icon:string;gold?:boolean};
/** Every learnable skill changes the race model in race.ts. */
export const skills:Skill[]=[
 {id:'launch',name:'발사 창',cost:40,note:'출발 반응 단축, 첫 3초 가속 +40%',icon:'launch'},
 {id:'position',name:'궤도 선점',cost:45,note:'초반 자리싸움에서 빈 레인을 빨리 찾는다',icon:'eye'},
 {id:'draft',name:'공전의 여유',cost:45,note:'뒤따를 때 체력 소모 −20%',icon:'draft'},
 {id:'corner',name:'궤도 수정',cost:50,note:'코너 속도 +5%',icon:'corner'},
 {id:'cooldown',name:'냉각 순항',cost:50,note:'중반 체력 8% 회복',icon:'cooldown'},
 {id:'stamina',name:'성간 항해',cost:60,note:'체력 소모 −8% (상시)',icon:'journey'},
 {id:'slingshot',name:'스윙바이',cost:55,note:'추월 직후 2초간 속도 +6%',icon:'slingshot'},
 {id:'perturb',name:'섭동 견제',cost:55,note:'중반, 바로 앞 선수 체력 −6%',icon:'perturb'},
 {id:'duel',name:'근접 공명',cost:60,note:'종반 경합 시 가속 두 배',icon:'vortex'},
 {id:'guts',name:'탈출 속도',cost:65,note:'최종 25%에서 4위 이하면 속도 +6%',icon:'guts'},
 {id:'finish',name:'최종 가속',cost:70,note:'마지막 15% 구간 속도 +6%',icon:'finish'},
 {id:'supernova',name:'초신성',cost:140,note:'최종 직선 진입 시 4초간 속도 +12% (금색 스킬)',icon:'sparkles',gold:true},
];
export const skill=(id:string)=>skills.find(s=>s.id===id)!;
