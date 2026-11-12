export type Support={id:string;name:string;grade:'R'|'SR'|'SSR';stat:number;bonus:number;friend:number;bond:number;fail:number;hint:string;icon:string;team:string;start:number;note:string};
/** bonus: training % while present. friend: rainbow multiplier %. bond: starting bond. start: starting bonus to the card's stat. */
export const supports:Support[]=[
 {id:'tide',name:'조석력 연구',grade:'R',stat:1,bonus:8,friend:15,bond:20,fail:3,hint:'cooldown',icon:'tide',team:'해양역학팀',start:5,note:'달과 바다를 오래 본 사람들.'},
 {id:'orbit',name:'궤도 공명',grade:'R',stat:4,bonus:8,friend:15,bond:20,fail:5,hint:'draft',icon:'orbit',team:'천체역학팀',start:5,note:'계산이 맞으면 말이 없어진다.'},
 {id:'wind',name:'태양풍 관측',grade:'R',stat:0,bonus:8,friend:15,bond:20,fail:3,hint:'launch',icon:'wind',team:'우주기상팀',start:5,note:'예보는 늘 맞다. 체감은 다르다.'},
 {id:'arecibo',name:'아레시보 신호',grade:'R',stat:4,bonus:9,friend:16,bond:25,fail:4,hint:'position',icon:'eye',team:'전파천문팀',start:5,note:'지구에서 보낸 인사가 아직 날아가는 중.'},
 {id:'rosetta',name:'로제타 혜성팀',grade:'R',stat:3,bonus:9,friend:16,bond:20,fail:3,hint:'corner',icon:'comet',team:'혜성 착륙팀',start:5,note:'착륙은 세 번 튕긴 뒤에 성공했다.'},
 {id:'core',name:'내핵 관측',grade:'SR',stat:3,bonus:12,friend:22,bond:25,fail:5,hint:'corner',icon:'core',team:'지구물리팀',start:10,note:'지구 가장 깊은 곳까지 들여다본다.'},
 {id:'assist',name:'중력 도움닫기',grade:'SR',stat:0,bonus:12,friend:22,bond:25,fail:5,hint:'slingshot',icon:'assist',team:'궤도설계팀',start:10,note:'행성 하나를 지나칠 때마다 빨라진다.'},
 {id:'air',name:'대기권 관통',grade:'SR',stat:1,bonus:12,friend:22,bond:25,fail:5,hint:'guts',icon:'air',team:'대기물리팀',start:10,note:'뜨거운 건 잠깐이다.'},
 {id:'voyager',name:'보이저 탐사단',grade:'SR',stat:1,bonus:13,friend:24,bond:30,fail:6,hint:'stamina',icon:'journey',team:'성간 탐사팀',start:10,note:'47년째 달리는 중. 아직 연락이 된다.'},
 {id:'parker',name:'파커 태양탐사선',grade:'SR',stat:0,bonus:14,friend:22,bond:25,fail:4,hint:'finish',icon:'sun',team:'태양 근접팀',start:10,note:'인류가 만든 가장 빠른 물체.'},
 {id:'newhorizons',name:'뉴호라이즌스',grade:'SR',stat:3,bonus:13,friend:24,bond:25,fail:5,hint:'duel',icon:'telescope',team:'명왕성 탐사팀',start:10,note:'명왕성 하트를 처음 찍었다.'},
 {id:'cassini',name:'카시니 고리팀',grade:'SR',stat:2,bonus:13,friend:24,bond:25,fail:5,hint:'perturb',icon:'ringed',team:'고리 연구팀',start:10,note:'마지막에 토성으로 뛰어들었다.'},
 {id:'roche',name:'로슈 한계',grade:'SSR',stat:2,bonus:18,friend:35,bond:35,fail:8,hint:'perturb',icon:'roche',team:'조석붕괴 연구실',start:20,note:'가까이 오면 부순다. 그게 규칙이다.'},
 {id:'collision',name:'충돌 역학',grade:'SSR',stat:2,bonus:20,friend:30,bond:30,fail:0,hint:'finish',icon:'collision',team:'충돌실험동',start:20,note:'달은 사고의 산물이다.'},
 {id:'hubble',name:'허블 심우주팀',grade:'SSR',stat:4,bonus:18,friend:35,bond:35,fail:10,hint:'position',icon:'stars',team:'심우주 관측팀',start:20,note:'빛이 오는 데 134억 년 걸렸다.'},
 {id:'webb',name:'제임스 웹 적외선',grade:'SSR',stat:0,bonus:20,friend:32,bond:30,fail:6,hint:'launch',icon:'crystal',team:'적외선 관측팀',start:20,note:'금빛 거울 18장. 차갑게 본다.'},
];
export const support=(id:string)=>supports.find(s=>s.id===id)??supports[0];
