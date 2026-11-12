export type Choice={label:string;stats?:Partial<Record<number,number>>;energy?:number;mood?:number;sp?:number;bond?:number;hint?:string};
export type StoryEvent={id:string;turn?:number;card?:string;title:string;text:string;choices:Choice[]};
export const storyEvents:StoryEvent[]=[
 {id:'flare',turn:3,title:'태양풍 주의보',text:'우주기상팀이 강한 태양풍을 예보했습니다. 훈련 방침을 정해 주십시오.',choices:[{label:'바람을 가르며 달린다',stats:{0:14},energy:-10},{label:'자기권 안에서 쉰다',energy:18,mood:1}]},
 {id:'rules',turn:9,title:'결승선의 정의',text:'목성 측이 "결승선의 중력적 구속 여부"를 공식 문의했습니다. 심판단은 회신을 미루고 있습니다.',choices:[{label:'선부터 통과하고 생각한다',stats:{0:10,2:8},mood:1},{label:'규정집을 정독한다',stats:{4:18},sp:20}]},
];
export const cardEvents:{title:string;text:string;choices:Choice[]}[]=[
 {title:'야간 관측',text:'{team}이 밤샘 관측에 함께하자고 합니다.',choices:[{label:'함께한다',bond:12,stats:{4:8},energy:-6},{label:'오늘은 쉰다',energy:10,bond:4}]},
 {title:'계산 착오',text:'{team}의 궤도 계산에서 소수점이 하나 밀렸습니다. 결과적으로 더 빨라졌습니다.',choices:[{label:'그대로 쓴다',stats:{0:10},bond:6},{label:'다시 계산한다',stats:{4:10},bond:8}]},
 {title:'연구 노트',text:'{team}이 정리한 노트를 건넸습니다. 여백에 스킬 아이디어가 적혀 있습니다.',choices:[{label:'스킬 힌트를 받는다',hint:'card',bond:6},{label:'능력 위주로 정리한다',stats:{1:8,3:8},bond:6}]},
 {title:'장비 점검',text:'{team}이 측정 장비를 새로 들여왔습니다. 성능은 확인되지 않았습니다.',choices:[{label:'바로 써 본다',stats:{2:12},energy:-8,bond:8},{label:'매뉴얼부터',sp:15,bond:5}]},
];
