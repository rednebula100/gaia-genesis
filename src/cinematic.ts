import {gsap} from 'gsap';
export const DURATION=32;
export const chapters=[
 {t:0,id:'01 / PLANETESIMALS',title:'From the dark'},
 {t:4.6,id:'02 / GIANT IMPACT',title:'Worlds collide'},
 {t:10,id:'03 / REACCRETION',title:'Gravity remembers'},
 {t:12.5,id:'04 / DIFFERENTIATION',title:'A heart of iron'},
 {t:15.7,id:'05 / CRUST',title:'Fire becomes stone'},
 {t:18.5,id:'06 / OCEAN & ATMOSPHERE',title:'The first blue'},
 {t:22.5,id:'07 / ANATOMY',title:'A world within'},
 {t:29.5,id:'08 / GENESIS',title:'A world, alive'}
];
export function createCinematic(){
 const state={heat:1,water:0,air:0,open:0,radius:1,distance:9,lookX:0,lookY:0,camX:0,camY:3.8,rotation:-.25,birth:0};
 const initial={...state},timeline=gsap.timeline({paused:true,defaults:{ease:'sine.inOut'}});
 timeline.to(state,{distance:5.2,camY:.5,duration:4.6},0)
 .to(state,{distance:7.0,lookX:-.55,camX:-.18,camY:.55,duration:1.1},4.6)
 .to(state,{distance:6.6,lookX:0,camX:0,camY:.18,duration:3.6},6.4)
 .to(state,{distance:4.8,duration:2.5},10)
 .to(state,{birth:1,duration:.6},11.9)
 .to(state,{open:.88,distance:5.0,rotation:-.14,camY:.28,duration:1.3},12.5)
 .to(state,{open:0,duration:1.35},14.25)
 .to(state,{heat:.27,distance:3.1,lookX:.34,lookY:.2,camX:.4,camY:.25,rotation:.05,duration:2.1},15.7)
 .to(state,{heat:0,duration:2.8},17.6)
 .to(state,{water:1,air:1,distance:4.65,lookX:0,lookY:0,camX:.3,camY:.18,rotation:.22,duration:3.6},18.5)
 .to(state,{open:1,distance:5.05,camX:.4,camY:.42,rotation:.08,duration:1.75,ease:'power2.inOut'},22.5)
 .to(state,{camX:.05,camY:.12,rotation:.2,distance:4.85,duration:3.1},24.3)
 .to(state,{open:0,duration:1.65,ease:'power2.inOut'},28)
 .to(state,{distance:4.8,camX:0,camY:.18,rotation:.36,duration:2.5},29.5);
 return {state,initial,timeline};
}
