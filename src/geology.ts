// Art-directed plate neighbourhoods, not a tectonic or climate solver.
export function rng(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export interface Plate { x:number;y:number;z:number;tx:number;ty:number;tz:number;size:number;stretch:number;continental:boolean;stress:number }
export function plates(random:()=>number):Plate[]{
 return Array.from({length:15},(_,i)=>{const y=random()*1.8-.9,a=random()*Math.PI*2,s=Math.sqrt(1-y*y),x=Math.cos(a)*s,z=Math.sin(a)*s;
  return{x,y,z,tx:-Math.sin(a),ty:0,tz:Math.cos(a),size:.18+random()*.17,stretch:1.3+random()*1.3,continental:i<6,stress:random()};});
}
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(a:number,b:number,n:number)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t)};
