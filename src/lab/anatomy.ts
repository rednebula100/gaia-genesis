import * as THREE from 'three';
import {sphere,cap} from '../section-geometry';
import {vertex,surface,interior,clouds} from '../shaders';
import {layers,drawnRadius,properties,R} from './model';
import type {LabState} from './state';
const sharedGLSL=`
uniform float labCut,labPeel,labUnit,labView,labSelected,labR0,labR1,labPhysical0,labPhysical1,labIsFace;
uniform sampler2D labProfile;
float tearNoise(vec3 p){return fbm(p*18.)*.68+noise(p*54.)*.32;}
void labDiscard(){
 float phi=atan(vLocal.z,-vLocal.x);float d=abs(mod(phi-1.570796327+9.42477796,6.2831853)-3.14159265);
 if(labCut>0.0001&&d<labCut*.5-.00001)discard;
 float tear=(7.-labUnit)+tearNoise(normalize(vLocal));if(labPeel>tear)discard;
}
vec3 ramp(float x){x=clamp(x,0.,1.);return x<.33?mix(vec3(.025,.06,.11),vec3(.055,.30,.34),x/.33):x<.66?mix(vec3(.055,.30,.34),vec3(.60,.49,.21),(x-.33)/.33):mix(vec3(.60,.49,.21),vec3(1.1,.24,.06),(x-.66)/.34);}
void labFinish(){
 float f=clamp((length(vLocal)-labR0)/max(.00001,labR1-labR0),0.,1.);
 float rr=mix(labPhysical0,labPhysical1,f);vec4 data=texture2D(labProfile,vec2(rr,.5));
 if(labView>.5){float x=labView<1.5?data.r:labView<2.5?data.g:labView<3.5?data.b:data.a;vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;gl_FragColor.rgb=ramp(x)*(.38+.62*max(dot(n,normalize(vec3(-.3,.7,1.))),0.));float iso=pow(.5+.5*cos(rr*6371./250.*6.2831853),35.);gl_FragColor.rgb*=1.-iso*.16;}
 if(labView<.5){
  if(labUnit<.5)gl_FragColor.rgb*=vec3(.62,.49,.34);
  else if(labUnit<1.5){
   vec3 p=vLocal;float phase=atan(p.z,p.x)*14.+p.y*7.-uTime*.045;
   float warp=fbm(p*vec3(26.,6.,26.));float vein=pow(.5+.5*sin(phase+warp*8.),7.);
   float grain=noise(p*180.);vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
   vec3 key=normalize(vec3(-.45,.75,1.2)),v=normalize(cameraPosition-vWorld);
   float diffuse=.24+max(dot(n,key),0.)*.7;float spec=pow(max(dot(n,normalize(key+v)),0.),55.);
   vec3 iron=mix(vec3(.055,.017,.009),vec3(.24,.075,.021),warp);
   gl_FragColor.rgb=iron*diffuse+vec3(.34,.11,.022)*vein*.7+vec3(.34,.25,.12)*spec*(.2+grain*.2);
  }else if(labUnit<6.5){
   vec3 tint=labUnit<2.5?vec3(1.03,.65,.49):labUnit<3.5?vec3(.86,.87,.72):labUnit<4.5?vec3(.94,1.12,.78):labUnit<5.5?vec3(1.1,.91,.70):vec3(.82,1.05,.93);
   gl_FragColor.rgb*=tint;
  }
  if(labIsFace>.5){float boundary=1.-smoothstep(.0003,.0014,min(abs(length(vLocal)-labR0),abs(length(vLocal)-labR1)));gl_FragColor.rgb+=vec3(.04,.032,.02)*boundary;}
 }
 if(abs(labSelected-labUnit)<.1){float edge=labIsFace>.5?1.-smoothstep(.0005,.003,min(abs(length(vLocal)-labR0),abs(length(vLocal)-labR1))):pow(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),5.);gl_FragColor.rgb+=vec3(.06,.075,.035)*edge;}
 float hot=1.-smoothstep(.0,.045,abs((7.-labUnit)+tearNoise(normalize(vLocal))-labPeel));
 if(labPeel>.001)gl_FragColor.rgb+=vec3(.55,.14,.018)*hot;
}
`;
function fragment(source:string,face:boolean){return source.replace('void main(){','void originalMaterial(){')+sharedGLSL+`void main(){${face?'':'labDiscard();'}${face?'if(labPeel>(7.-labUnit)+tearNoise(normalize(vLocal)))discard;':''}originalMaterial();labFinish();}`;}
export class Anatomy{
 readonly group=new THREE.Group();readonly targets:THREE.Mesh[]=[];
 private units:{shell:THREE.Mesh;faces:THREE.Mesh[];materials:THREE.ShaderMaterial[]}[]=[];
 private cloud:THREE.Mesh;private profile:THREE.DataTexture;
 mix=1;cut=0;peel=0;
 private data:Float32Array;
 constructor(world:THREE.Group,private common:Record<string,THREE.IUniform>){
  world.add(this.group);this.group.visible=false;
  this.data=new Float32Array(2048*4);for(let i=0;i<2048;i++){const p=properties(i/2047*R);this.data.set([p.temperature/6500,p.density/13.5,p.pressure/400,p.vp/14],i*4);}this.profile=new THREE.DataTexture(this.data,2048,1,THREE.RGBAFormat,THREE.FloatType);this.profile.minFilter=this.profile.magFilter=THREE.LinearFilter;this.profile.needsUpdate=true;
  const labVertex='uniform mat3 labBasis;\n'+vertex.replace('vLocal=position;','vLocal=labBasis*position;');
  const build=(src:string,unit:number,face:boolean)=>new THREE.ShaderMaterial({vertexShader:labVertex,fragmentShader:fragment(src,face),side:face?THREE.DoubleSide:THREE.FrontSide,uniforms:{...common,uLayer:{value:unit===0?0:unit===1?1:unit===7?3:2},uFace:{value:face?1:0},labIsFace:{value:face?1:0},labBasis:{value:new THREE.Matrix3()},labCut:{value:0},labPeel:{value:0},labUnit:{value:unit},labView:{value:0},labSelected:{value:-1},labR0:{value:0},labR1:{value:1},labPhysical0:{value:0},labPhysical1:{value:1},labProfile:{value:this.profile}}});
  for(let i=0;i<8;i++){
   const sm=build(i===7?surface:interior,i,false),fm=[build(interior,i,true),build(interior,i,true)];
   const shell=new THREE.Mesh(sphere(1,0,Math.PI*2),sm);shell.userData.layer=i;shell.renderOrder=7-i;
   const faces=[0,1].map(j=>{const g=cap(0,1,0);const radial=g.getAttribute('position').clone();g.setAttribute('referencePosition',radial);const m=new THREE.Mesh(g,fm[j]);m.userData.layer=i;m.userData.cap=true;m.renderOrder=9;return m;});
   this.group.add(shell,...faces);this.targets.push(shell,...faces);this.units.push({shell,faces,materials:[sm,...fm]});
  }
  const cm=build(clouds,7,false);cm.transparent=true;cm.depthWrite=false;
  this.cloud=new THREE.Mesh(sphere(1.006,0,Math.PI*2),cm);this.cloud.renderOrder=10;this.group.add(this.cloud);
 }
 update(s:LabState,dt:number){
  const k=1-Math.exp(-dt*9);this.mix+=((s.schematic?1:0)-this.mix)*k;this.cut+=((s.mode==='world'?0:s.cut*Math.PI/180)-this.cut)*k;this.peel+=((s.mode==='world'?0:s.peel)-this.peel)*k;
  const view=['material','temperature','density','pressure','waveSpeed'].indexOf(s.view);
  this.units.forEach((u,i)=>{
   const a=drawnRadius(layers[i].a,this.mix),b=drawnRadius(layers[i].b,this.mix);u.shell.scale.setScalar(b);
   // Shader positions must retain global physical coordinates for coherent material fields.
   for(const m of u.materials){m.uniforms.labCut.value=this.cut;m.uniforms.labPeel.value=this.peel;m.uniforms.labView.value=view;m.uniforms.labSelected.value=s.hover!==null?properties(s.hover).layer:(s.selected??-1);m.uniforms.labR0.value=a;m.uniforms.labR1.value=b;m.uniforms.labPhysical0.value=layers[i].a/R;m.uniforms.labPhysical1.value=layers[i].b/R;}
   // vLocal for a shell is the drawn radius, not a unit sphere's radius.
   const g=u.shell.geometry,p=g.getAttribute('position') as THREE.BufferAttribute;
   if(Math.abs((g.userData.radius??0)-b)>1e-6){const n=g.getAttribute('normal');for(let j=0;j<p.count;j++)p.setXYZ(j,n.getX(j)*b,n.getY(j)*b,n.getZ(j)*b);p.needsUpdate=true;g.userData.radius=b;}u.shell.scale.setScalar(1);
   u.faces.forEach((f,j)=>{f.visible=this.cut>.0001;f.rotation.y=(Math.PI/2+(j?1:-1)*this.cut/2);(f.material as THREE.ShaderMaterial).uniforms.labBasis.value.setFromMatrix4(new THREE.Matrix4().makeRotationY(f.rotation.y));const p=f.geometry.getAttribute('position') as THREE.BufferAttribute,base=f.geometry.getAttribute('referencePosition');
    if(f.geometry.userData.a!==a||f.geometry.userData.b!==b){for(let v=0;v<p.count;v++){const x=base.getX(v),y=base.getY(v),z=base.getZ(v),r=Math.hypot(x,y,z),rr=a+(b-a)*r; // cap origin row has no direction: infer its theta from grid row
      const theta=Math.floor(v/41)/160*Math.PI;p.setXYZ(v,-rr*Math.sin(theta),rr*Math.cos(theta),0);}
     p.needsUpdate=true;f.geometry.computeBoundingSphere();f.geometry.userData.a=a;f.geometry.userData.b=b;
    }
   });
  });
  const cu=(this.cloud.material as THREE.ShaderMaterial).uniforms;cu.labCut.value=this.cut;cu.labPeel.value=this.peel;cu.labView.value=0;this.cloud.visible=s.clouds&&this.peel<.05;
 }
 /** Reject the same fragment-space cut and peel during CPU hit testing. */
 accepts(point:THREE.Vector3,unit:number,capFace:boolean){if(!capFace){const phi=Math.atan2(point.z,-point.x),d=Math.abs(((phi-Math.PI/2+Math.PI*3)%(Math.PI*2))-Math.PI);if(d<this.cut*.5-.00001)return false;}
  const fract=(v:number)=>v-Math.floor(v),seed=this.common.uSeed.value;
  const hash=(x:number,y:number,z:number)=>{let a=fract(x*.1031+seed),b=fract(y*.1031+seed),c=fract(z*.1031+seed);const d=a*(b+33.33)+b*(c+33.33)+c*(a+33.33);a+=d;b+=d;c+=d;return fract((a+b)*c);};
  const noise=(x:number,y:number,z:number)=>{const i=Math.floor(x),j=Math.floor(y),k=Math.floor(z);let a=fract(x),b=fract(y),c=fract(z);a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);const mix=(x:number,y:number,t:number)=>x+(y-x)*t;return mix(mix(mix(hash(i,j,k),hash(i+1,j,k),a),mix(hash(i,j+1,k),hash(i+1,j+1,k),a),b),mix(mix(hash(i,j,k+1),hash(i+1,j,k+1),a),mix(hash(i,j+1,k+1),hash(i+1,j+1,k+1),a),b),c);};
  const n=point.clone().normalize().multiplyScalar(18),f=noise(n.x,n.y,n.z)*.55+noise(n.x*2.07+13,n.y*2.07+13,n.z*2.07+13)*.27+noise(n.x*4.21+5,n.y*4.21+5,n.z*4.21+5)*.12+noise(n.x*8.3,n.y*8.3,n.z*8.3)*.06;
  return this.peel<=7-unit+f*.68+noise(n.x*3,n.y*3,n.z*3)*.32;
 }
 dispose(){this.units.forEach(u=>{u.shell.geometry.dispose();u.faces.forEach(f=>f.geometry.dispose());u.materials.forEach(m=>m.dispose());});this.cloud.geometry.dispose();(this.cloud.material as THREE.Material).dispose();this.profile.dispose();this.group.removeFromParent();}
}

