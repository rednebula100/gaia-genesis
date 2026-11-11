export type Mode='world'|'anatomy'|'seismic'|'origins';
export type View='material'|'temperature'|'density'|'pressure'|'waveSpeed';
export type Experiment='cosmos'|'impact'|'stardust';
export type LabState={mode:Mode;experiment:Experiment;seed:number;cut:number;peel:number;selected:number|null;hover:number|null;view:View;schematic:boolean;clouds:boolean;atmosphere:boolean;labels:boolean;sun:number;quakeActive:boolean;quakeClock:number;quakeSpeed:number;quakePaused:boolean;wave:'both'|'P'|'S';tour:number|null};
export class LabController{
 state:LabState={mode:'world',experiment:'cosmos',seed:0,cut:90,peel:0,selected:null,hover:null,view:'material',schematic:true,clouds:true,atmosphere:true,labels:true,sun:0,quakeActive:false,quakeClock:0,quakeSpeed:90,quakePaused:false,wave:'both',tour:null};
 private subscribers=new Set<(s:LabState)=>void>();
 set(patch:Partial<LabState>){Object.assign(this.state,patch);this.subscribers.forEach(fn=>fn(this.state));}
 subscribe(fn:(s:LabState)=>void){this.subscribers.add(fn);fn(this.state);return()=>this.subscribers.delete(fn);}
}
