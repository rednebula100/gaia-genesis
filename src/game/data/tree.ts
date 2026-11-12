/** Observatory upgrades: permanent, bought with research shards (+ credits). */
export type Node={id:string;name:string;note:string;icon:string;max:number;cost:(lv:number)=>[number,number];req?:string};
export const tree:Node[]=[
 {id:'energy',name:'생명 유지 장치',note:'체력 상한 +5',icon:'sta',max:3,cost:l=>[20+l*25,300+l*300]},
 {id:'start',name:'기초 체력',note:'시작 능력 전부 +10',icon:'up',max:3,cost:l=>[25+l*30,400+l*300]},
 {id:'gear',name:'훈련 장비',note:'모든 훈련 상승량 +4%',icon:'cog',max:3,cost:l=>[30+l*35,500+l*400],req:'start'},
 {id:'bond',name:'공동 연구 협정',note:'서포트 초기 유대 +10',icon:'cards',max:2,cost:l=>[30+l*40,400+l*400]},
 {id:'sp',name:'전술 연구실',note:'시작 SP +30',icon:'skill',max:3,cost:l=>[20+l*25,300+l*300],req:'bond'},
 {id:'alarm',name:'예비 알람시계',note:'목표 실패 재도전 +1회',icon:'time',max:2,cost:l=>[60+l*60,800+l*600],req:'energy'},
 {id:'hint',name:'관측 데이터베이스',note:'스킬 힌트 확률 +8%p',icon:'hint',max:2,cost:l=>[40+l*40,600+l*400],req:'sp'},
 {id:'camp',name:'합숙 시설 확장',note:'합숙 훈련 상승량 +10%',icon:'sun',max:1,cost:()=>[120,2000],req:'gear'},
];
