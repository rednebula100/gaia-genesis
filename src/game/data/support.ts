export const supports=[
 {id:'tide',name:'조석력 연구',grade:'R',stat:1,bonus:7,fail:1,mark:'◒',note:'지구력 훈련 +7%'},
 {id:'orbit',name:'궤도 공명',grade:'R',stat:4,bonus:8,fail:1,mark:'◎',note:'궤도 훈련 +8%'},
 {id:'core',name:'내핵 관측',grade:'SR',stat:3,bonus:13,fail:2,mark:'◉',note:'자전 훈련 +13%'},
 {id:'roche',name:'로슈 한계',grade:'SSR',stat:2,bonus:20,fail:2,mark:'⊘',note:'중력 훈련 +20%'},
 {id:'assist',name:'중력 도움닫기',grade:'SR',stat:0,bonus:14,fail:1,mark:'↗',note:'속도 훈련 +14%'},
 {id:'wind',name:'태양풍 관측',grade:'R',stat:0,bonus:8,fail:1,mark:'≋',note:'속도 훈련 +8%'},
 {id:'air',name:'대기권 관통',grade:'SR',stat:1,bonus:15,fail:2,mark:'≡',note:'지구력 훈련 +15%'},
 {id:'collision',name:'충돌 역학',grade:'SSR',stat:2,bonus:23,fail:0,mark:'⋈',note:'중력 훈련 +23%'},
] as const;
export const support=(id:string)=>supports.find(s=>s.id===id)??supports[0];
