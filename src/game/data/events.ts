export type Choice={label:string;stats?:Partial<Record<number,number>>;energy?:number;mood?:number;sp?:number;bond?:number;hint?:string};
export type StoryEvent={id:string;turn?:number;title:string;text:string;choices:Choice[]};
export const storyEvents:StoryEvent[]=[
 {id:'flare',turn:3,title:'태양풍 주의보',text:'우주기상팀이 강한 태양풍을 예보했습니다. 훈련 방침을 정해 주십시오.',choices:[{label:'바람을 가르며 달린다',stats:{0:20},energy:-10},{label:'자기권 안에서 쉰다',energy:20,mood:1}]},
 {id:'fanmail',turn:6,title:'첫 팬레터',text:'관측소로 첫 팬레터가 도착했습니다. 발신지는 안드로메다입니다. 250만 년 전에 보낸 편지입니다.',choices:[{label:'답장을 쓴다',mood:1,sp:20},{label:'연습으로 답한다',stats:{1:15,3:10}}]},
 {id:'camp',turn:13,title:'근일점 합숙 시작',text:'태양 가까이에서 합숙이 시작됩니다. 3턴 동안 모든 훈련이 최고 레벨입니다. 덥습니다.',choices:[{label:'선크림을 바른다',energy:10},{label:'정신력으로 버틴다',stats:{3:20},energy:-5}]},
 {id:'rules',turn:19,title:'결승선의 정의',text:'목성 측이 "결승선의 중력적 구속 여부"를 공식 문의했습니다. 심판단은 회신을 미루고 있습니다.',choices:[{label:'선부터 통과하고 생각한다',stats:{0:20,2:15},mood:1},{label:'규정집을 정독한다',stats:{4:30},sp:30}]},
 {id:'camp2',turn:21,title:'두 번째 합숙',text:'두 번째 근일점 합숙입니다. 작년보다 3,000도 덜 덥습니다. 기분 탓입니다.',choices:[{label:'전력으로 간다',stats:{0:15,1:15},energy:-10},{label:'페이스 조절',energy:15,mood:1}]},
];
export const cardEvents:{title:string;text:string;choices:Choice[]}[]=[
 {title:'야간 관측',text:'{team}이 밤샘 관측에 함께하자고 합니다.',choices:[{label:'함께한다',bond:14,stats:{4:12},energy:-6},{label:'오늘은 쉰다',energy:12,bond:5}]},
 {title:'계산 착오',text:'{team}의 궤도 계산에서 소수점이 하나 밀렸습니다. 결과적으로 더 빨라졌습니다.',choices:[{label:'그대로 쓴다',stats:{0:16},bond:8},{label:'다시 계산한다',stats:{4:16},bond:10}]},
 {title:'연구 노트',text:'{team}이 정리한 노트를 건넸습니다. 여백에 스킬 아이디어가 적혀 있습니다.',choices:[{label:'스킬 힌트를 받는다',hint:'card',bond:8},{label:'능력 위주로 정리한다',stats:{1:12,3:12},bond:8}]},
 {title:'장비 점검',text:'{team}이 측정 장비를 새로 들여왔습니다. 성능은 확인되지 않았습니다.',choices:[{label:'바로 써 본다',stats:{2:18},energy:-8,bond:10},{label:'매뉴얼부터',sp:25,bond:6}]},
 {title:'회식',text:'{team}이 관측 성공 기념 회식을 엽니다. 메뉴는 냉동건조 아이스크림입니다.',choices:[{label:'참석한다',mood:1,energy:8,bond:12},{label:'훈련 영상을 본다',stats:{4:14},bond:4}]},
];
