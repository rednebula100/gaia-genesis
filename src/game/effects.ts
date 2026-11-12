import * as T from 'three';
import type {Race} from './race';
import {planet} from './data/planets';

/** Broadcast effects are driven by simulation time, never by simulation mutation. */
export class RaceEffects {
 readonly group=new T.Group();
 private rings=new Map<string,T.Group>();
 constructor(scene:T.Scene){
  const geometry=new T.TorusGeometry(1,.012,6,96);
  for(const id of ['earth','mercury','venus','mars','jupiter','moon','seed-a','seed-b']){
   const g=new T.Group();
   for(let i=0;i<3;i++){const material=new T.MeshBasicMaterial({color:planet(id).color,transparent:true,opacity:0,depthWrite:false});const ring=new T.Mesh(geometry,material);g.add(ring);}
   this.rings.set(id,g);this.group.add(g);
  }
  scene.add(this.group);
 }
 update(race:Race|undefined,actors:Map<string,T.Group>,visible:boolean){
  this.group.visible=visible;if(!visible||!race)return;
  for(const [id,g]of this.rings){const event=race.events.find(e=>e.type==='skill'&&e.id===id),age=event?race.time-event.time:-1;g.visible=age>=0&&age<3.4;if(!g.visible)continue;g.position.copy(actors.get(id)!.position);
   const strength=Math.sin(Math.PI*age/3.4);
   for(const [i,child]of g.children.entries()){const m=child as T.Mesh<T.TorusGeometry,T.MeshBasicMaterial>;const radius=id==='jupiter'?1+age*.8+i*.3:1.05+i*.22+age*.13;m.scale.setScalar(radius);m.rotation.set(.5+i*.65+age*.28,(id==='venus'?-1:1)*age*.7+i*.4,i*.4);m.material.opacity=strength*(id==='mars'?.32:.55);}
  }
 }
}
