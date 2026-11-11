import {gsap} from 'gsap';
export function createCinematic(){
 const state={heat:1,water:0,air:0,open:0,radius:.035,distance:5.6,lookX:0,lookY:0,camX:-.2,camY:.18,rotation:-.25};
 const initial={...state},timeline=gsap.timeline({paused:true,defaults:{ease:'sine.inOut'}});
 timeline.to(state,{radius:.91,distance:4.8,duration:3.5,ease:'power1.inOut'},0)
  .to(state,{radius:1,open:.88,distance:5.0,rotation:-.14,camY:.28,duration:1.5},3.5)
  .to(state,{open:0,duration:1.4},5.5)
  .to(state,{heat:.27,distance:3.1,lookX:.34,lookY:.2,camX:.4,camY:.25,rotation:.05,duration:2.2},7)
  .to(state,{heat:0,duration:2.8},9)
  .to(state,{water:1,air:1,distance:4.65,lookX:0,lookY:0,camX:.3,camY:.18,rotation:.22,duration:3.6},10)
  .to(state,{open:1,distance:5.05,camX:.4,camY:.42,rotation:.08,duration:1.75,ease:'power2.inOut'},14)
  .to(state,{camX:.05,camY:.12,rotation:.2,distance:4.85,duration:2.4},15.8)
  .to(state,{open:0,duration:1.55,ease:'power2.inOut'},18)
  .to(state,{distance:4.8,camX:0,camY:.18,rotation:.36,duration:2.5},19.5);
 return {state,initial,timeline};
}
