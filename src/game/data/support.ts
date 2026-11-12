export type Support={id:string;name:string;grade:'R'|'SR'|'SSR';stat:number;bonus:number;friend:number;bond:number;fail:number;hint:string;icon:string;team:string};
/** bonus: training % while present. friend: extra multiplier on rainbow training. bond: starting bond. */
export const supports:Support[]=[
 {id:'tide',name:'조석력 연구',grade:'R',stat:1,bonus:8,friend:15,bond:20,fail:3,hint:'cooldown',icon:'tide',team:'해양역학팀'},
 {id:'orbit',name:'궤도 공명',grade:'R',stat:4,bonus:8,friend:15,bond:20,fail:5,hint:'draft',icon:'orbit',team:'천체역학팀'},
 {id:'wind',name:'태양풍 관측',grade:'R',stat:0,bonus:8,friend:15,bond:20,fail:3,hint:'launch',icon:'wind',team:'우주기상팀'},
 {id:'core',name:'내핵 관측',grade:'SR',stat:3,bonus:12,friend:22,bond:25,fail:5,hint:'corner',icon:'core',team:'지구물리팀'},
 {id:'assist',name:'중력 도움닫기',grade:'SR',stat:0,bonus:12,friend:22,bond:25,fail:5,hint:'slingshot',icon:'assist',team:'궤도설계팀'},
 {id:'air',name:'대기권 관통',grade:'SR',stat:1,bonus:12,friend:22,bond:25,fail:5,hint:'guts',icon:'air',team:'대기물리팀'},
 {id:'roche',name:'로슈 한계',grade:'SSR',stat:2,bonus:18,friend:35,bond:35,fail:8,hint:'perturb',icon:'roche',team:'조석붕괴 연구실'},
 {id:'collision',name:'충돌 역학',grade:'SSR',stat:2,bonus:20,friend:30,bond:30,fail:0,hint:'finish',icon:'collision',team:'충돌실험동'},
];
export const support=(id:string)=>supports.find(s=>s.id===id)??supports[0];
