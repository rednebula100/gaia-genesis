/** Per-planet star board (Genshin-constellation-style upgrades laid out like a node board).
 * Duplicates give planet-specific star crystals; nodes open outward from the core. */
import {planet} from './planets';
export type BKind='core'|'stat'|'big'|'star'|'all'|'energy'|'sp';
export type BNode={id:string;x:number;y:number;kind:BKind;stat:number;value:number;cost:[number,number];links:string[]};
const cache=new Map<string,BNode[]>();
export const leagueNames=['루키','브론즈','실버','골드','플래티넘','레전드'] as const;
export function boardOf(id:string):BNode[]{const hit=cache.get(id);if(hit)return hit;const p=planet(id);const order=[...p.stats.keys()].sort((a,b)=>p.stats[b]-p.stats[a]);
 const nodes:BNode[]=[{id:'c',x:0,y:0,kind:'core',stat:-1,value:0,cost:[0,0],links:[]}];const add=(n:BNode,from:string)=>{nodes.push(n);n.links.push(from);nodes.find(m=>m.id===from)!.links.push(n.id);};
 const dirs:[number,number][]=[[1,0],[-1,0],[0,-1],[0,1]];
 dirs.forEach(([dx,dy],a)=>{const stat=order[a];let prev='c';for(let d=1;d<=8;d++){const kind:BKind=d===8?'star':d%3===0?'big':'stat';const id=`a${a}d${d}`;add({id,x:dx*d,y:dy*d,kind,stat,value:kind==='star'?6:kind==='big'?12:5,cost:kind==='star'?[4,1200]:kind==='big'?[2,500]:[1,200],links:[]},prev);prev=id;
  if(d===2||d===5){for(const s of [-1,1]){let bp=id;for(let k=1;k<=2;k++){const ends:BKind[]=['all','energy','sp'];const kk:BKind=k===2?ends[(a+d+(s>0?1:0))%3]:'stat';const bid=`${id}s${s}k${k}`;add({id:bid,x:dx*d+(dy?s*k:0),y:dy*d+(dx?s*k:0),kind:kk,stat:order[4],value:kk==='all'?3:kk==='energy'?5:kk==='sp'?20:5,cost:kk==='stat'?[1,200]:kk==='sp'?[1,300]:[2,400],links:[]},bp);bp=bid;}}}}});
 cache.set(id,nodes);return nodes;}
export const crystalGain:Record<string,number>={R:2,SR:3,SSR:5};
