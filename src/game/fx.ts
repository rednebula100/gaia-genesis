import gsap from 'gsap';
export const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let layer:HTMLElement;
export function fxLayer(root:HTMLElement){layer=document.createElement('div');layer.className='fx-layer';root.append(layer);return layer;}
const el=(cls:string,html='')=>{const e=document.createElement('div');e.className=cls;e.innerHTML=html;layer.append(e);return e;};
/** Number that pops out, then flies to a target element (stat panels). */
export function floatText(x:number,y:number,text:string,color:string,to?:HTMLElement|null,size=34){const e=el('float-text',text);e.style.cssText=`left:${x}px;top:${y}px;color:${color};font-size:${size}px`;const tl=gsap.timeline({onComplete:()=>e.remove()});tl.fromTo(e,{scale:.2,y:0,opacity:0},{scale:1.25,y:-46,opacity:1,duration:.28,ease:'back.out(3)'}).to(e,{scale:1,duration:.12});if(to&&!reduced){const r=to.getBoundingClientRect();tl.to(e,{x:r.left+r.width/2-x,y:r.top+r.height/2-y,scale:.5,opacity:.2,duration:.42,ease:'power2.in',delay:.25});}else tl.to(e,{opacity:0,y:-80,duration:.5,delay:.35});return tl;}
export function flash(color='#fff',peak=.85,dur=.45){if(reduced)peak*=.3;const e=el('fx-flash');e.style.background=color;gsap.fromTo(e,{opacity:peak},{opacity:0,duration:dur,ease:'power2.out',onComplete:()=>e.remove()});}
export function shake(target:Element,amount=10,dur=.35){if(reduced)return;gsap.fromTo(target,{x:0,y:0},{duration:dur,ease:'none',keyframes:Array.from({length:8},(_,i)=>({x:(Math.random()-.5)*amount*(1-i/8),y:(Math.random()-.5)*amount*(1-i/8)})),clearProps:'transform'});}
/** Big diagonal stamp in the middle of the screen. */
export function stamp(text:string,cls='',hold=.7){const e=el('fx-stamp '+cls,`<span>${text}</span>`);const tl=gsap.timeline({onComplete:()=>e.remove()});tl.fromTo(e,{scale:2.6,opacity:0,rotate:-14},{scale:1,opacity:1,rotate:-6,duration:.22,ease:'power4.in'}).to(e,{scale:1.04,duration:.08,yoyo:true,repeat:1}).to(e,{opacity:0,scale:.9,duration:.3,delay:hold});return tl;}
export function countUp(target:HTMLElement,from:number,to:number,dur=.6,fmt=(v:number)=>Math.round(v).toLocaleString()){const o={v:from};return gsap.to(o,{v:to,duration:dur,ease:'power2.out',onUpdate:()=>{target.textContent=fmt(o.v);}});}
/** Diagonal wipe between screens. Resolves when the screen is covered. */
export function wipe(color='#ffd23f'):Promise<void>{return new Promise(res=>{if(reduced){res();return;}const e=el('fx-wipe',`<i style="background:${color}"></i><i></i><i style="background:${color}"></i>`);const bars=[...e.children];const tl=gsap.timeline({onComplete:()=>e.remove()});tl.fromTo(bars,{xPercent:-130},{xPercent:0,duration:.26,ease:'power3.in',stagger:.04}).add(()=>res()).to(bars,{xPercent:130,duration:.3,ease:'power3.out',stagger:.04,delay:.04});});}
export const hitstop=(ms=80)=>new Promise(r=>setTimeout(r,reduced?0:ms));
export const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
