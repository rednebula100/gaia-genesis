export type Skill={id:string;name:string;cost:number;note:string;icon:string};
/** Every learnable skill changes the race model in race.ts. */
export const skills:Skill[]=[
 {id:'launch',name:'발사 창',cost:30,note:'출발 반응 단축, 첫 3초 가속 +40%',icon:'launch'},
 {id:'draft',name:'공전의 여유',cost:35,note:'뒤따를 때 체력 소모 −20%',icon:'draft'},
 {id:'corner',name:'궤도 수정',cost:40,note:'코너 속도 +5%',icon:'corner'},
 {id:'cooldown',name:'냉각 순항',cost:40,note:'중반 체력 8% 회복',icon:'cooldown'},
 {id:'slingshot',name:'스윙바이',cost:45,note:'추월 직후 2초간 속도 +6%',icon:'slingshot'},
 {id:'perturb',name:'섭동 견제',cost:45,note:'중반, 바로 앞 선수 체력 −6%',icon:'perturb'},
 {id:'guts',name:'탈출 속도',cost:50,note:'최종 25%에서 4위 이하면 속도 +6%',icon:'guts'},
 {id:'finish',name:'최종 가속',cost:55,note:'마지막 15% 구간 속도 +6%',icon:'finish'},
];
export const skill=(id:string)=>skills.find(s=>s.id===id)!;
