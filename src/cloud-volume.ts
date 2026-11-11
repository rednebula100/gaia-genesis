import * as THREE from 'three';
import {Pass} from 'postprocessing';

const vertex=`varying vec2 vUv;void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment=/* glsl */`
precision highp float;precision highp sampler3D;
varying vec2 vUv;
uniform sampler2D uDepth,uWeather;uniform sampler3D uNoise;
uniform mat4 uInvProjection,uViewWorld,uStill,uSector;uniform vec3 uCamera,uSun;
uniform float uTime,uAir,uRadius,uOpen;uniform vec2 uResolution;
const float INNER=1.001,OUTER=1.006;
vec2 sphere(vec3 ro,vec3 rd,float radius){float b=dot(ro,rd),c=dot(ro,ro)-radius*radius,h=b*b-c;if(h<0.)return vec2(1e5,-1e5);h=sqrt(h);return vec2(-b-h,-b+h);}
vec2 uvSphere(vec3 p){vec3 n=normalize(p);return vec2(atan(n.z,-n.x)/6.2831853,acos(clamp(n.y,-1.,1.))/3.14159265);}
float density(vec3 p,float piece){
 bool wedge=p.x>=0.&&p.z>=0.;if(piece<1.5&&((piece>.5&&!wedge)||(piece<.5&&wedge)))return 0.;
 float h=(length(p)-INNER)/(OUTER-INNER);if(h<0.||h>1.)return 0.;
 vec2 uv=uvSphere(p)+vec2(uTime*.00034,0.);vec4 weather=textureLod(uWeather,uv,0.);
 float coverage=weather.r*uAir;
 vec3 coord=p*5.+vec3(uTime*.001,0.,0.);vec4 shape=textureLod(uNoise,coord,0.);
 float profile=smoothstep(0.,.16,h)*(1.-smoothstep(mix(.38,.8,weather.g),1.,h));
 float body=smoothstep(.12,.7,coverage)*(.55+shape.r*.45)*(.4+weather.a*.6)*profile;
 body=max(0.,body-(1.-profile)*shape.g*.065);
 // Wispy upper clouds use the same finite density field; no independent temporal history.
 float wisps=weather.b*weather.b*shape.g*smoothstep(.65,.82,h)*(1.-smoothstep(.84,1.,h))*.045;
 return (body+wisps)*uAir*.55;
}
vec4 segment(vec3 ro,vec3 rd,vec3 light,float a,float b,float piece){
 vec3 color=vec3(0.);float trans=1.;if(b<=a)return vec4(0.);
 float stepSize=(b-a)/16.;
 // Stable spatial quadrature. No frame counter, accumulated history or random flicker on seek.
 float jitter=fract(dot(gl_FragCoord.xy,vec2(.75487766,.56984029)));
 for(int i=0;i<16;i++){
  vec3 p=ro+rd*(a+(float(i)+.35+jitter*.3)*stepSize);float d=density(p,piece);
  if(d>.003){
   float optical=0.;
   for(int j=1;j<=3;j++){float s=float(j)*.0012;optical+=density(p+light*s,piece)*.0012;}
   float shade=exp(-optical*1150.);
   float elevation=dot(normalize(p),light);
   float day=smoothstep(-.04,.12,elevation)*(.12+.88*sqrt(max(elevation,0.)));
   float mu=dot(rd,light),phase=.8+.2*pow(max(mu,0.),8.);
   // Beer extinction, multiple-scattering fill approximation and warm low sun.
   vec3 direct=mix(vec3(1.5,.57,.21),vec3(3.2,3.2,3.15),smoothstep(0.,.3,dot(normalize(p),light)));
   vec3 source=direct*(shade*.34+.09)*day*phase+vec3(.025,.038,.058)*(.35+.65*day);
   float alpha=1.-exp(-d*stepSize*420.);color+=trans*source*alpha;trans*=1.-alpha;
   if(trans<.015)break;
  }
 }
 return vec4(color,1.-trans);
}
vec4 volume(mat4 inv,vec3 rd,float limit,float piece){
 vec3 ro=(inv*vec4(uCamera,1.)).xyz,dir=normalize(mat3(inv)*rd),light=normalize(mat3(inv)*uSun);
 vec2 o=sphere(ro,dir,OUTER),n=sphere(ro,dir,INNER);float maxD=limit/uRadius;
 if(o.y<0.||o.x>maxD)return vec4(0.);
 vec4 a=segment(ro,dir,light,max(0.,o.x),min(min(n.x,o.y),maxD),piece);
 if(n.y>=0.&&n.y<o.y&&n.y<maxD){vec4 b=segment(ro,dir,light,max(max(0.,n.y),o.x),min(o.y,maxD),piece);a=vec4(a.rgb+(1.-a.a)*b.rgb,a.a+(1.-a.a)*b.a);}
 return a;
}
void main(){
 float depth=texture2D(uDepth,vUv).r;
 vec4 v=uInvProjection*vec4(vUv*2.-1.,1.,1.);vec3 rd=normalize(mat3(uViewWorld)*(v.xyz/v.w));
 vec4 hit=uInvProjection*vec4(vUv*2.-1.,depth*2.-1.,1.);hit/=hit.w;
 float limit=depth>.999999?100.:length(hit.xyz);
 if(uOpen<.001){gl_FragColor=volume(uStill,rd,limit,2.);return;}
 vec4 a=volume(uStill,rd,limit,0.);
 vec4 b=volume(uSector,rd,limit,1.);
 // Depth clips both volumes against the actual opened shells and their meridional caps.
 gl_FragColor=vec4(a.rgb+(1.-a.a)*b.rgb,a.a+(1.-a.a)*b.a);
}
`;
const composite=/* glsl */`
varying vec2 vUv;uniform sampler2D uScene,uCloud,uDepth;uniform vec2 uTexel;
void main(){
 // Bilateral upsample prevents a low-resolution cloud edge bleeding across a cut cap.
 float d=texture2D(uDepth,vUv).r;vec4 c=vec4(0.);float total=0.;
 for(int x=0;x<2;x++)for(int y=0;y<2;y++){
  vec2 uv=vUv+(vec2(float(x),float(y))-.5)*uTexel;
  float w=exp(-abs(texture2D(uDepth,uv).r-d)*1800.)+.001;
  c+=texture2D(uCloud,uv)*w;total+=w;
 }
 c/=total;vec3 base=texture2D(uScene,vUv).rgb;gl_FragColor=vec4(base*(1.-c.a)+c.rgb,1.);
}`;

export class CloudVolumePass extends Pass{
 scale=.5;private width=1;private height=1;
 readonly volume:THREE.ShaderMaterial;
 readonly combine:THREE.ShaderMaterial;
 private target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false});
 constructor(camera:THREE.PerspectiveCamera){
  super('Seeded cloud volume');this.needsDepthTexture=true;
  this.volume=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false,uniforms:{
   uDepth:{value:null},uWeather:{value:null},uNoise:{value:null},uInvProjection:{value:camera.projectionMatrixInverse},uViewWorld:{value:camera.matrixWorld},uCamera:{value:camera.position},uSun:{value:new THREE.Vector3()},uStill:{value:new THREE.Matrix4()},uSector:{value:new THREE.Matrix4()},uTime:{value:0},uAir:{value:0},uRadius:{value:1},uOpen:{value:0},uResolution:{value:new THREE.Vector2()}
  }});
  this.combine=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:composite,depthTest:false,depthWrite:false,uniforms:{uScene:{value:null},uCloud:{value:this.target.texture},uDepth:{value:null},uTexel:{value:new THREE.Vector2()}}});
 }
 override setDepthTexture(t:THREE.Texture){this.volume.uniforms.uDepth.value=t;this.combine.uniforms.uDepth.value=t;}
 reduceResolution(){if(this.scale>.25){this.scale=Math.max(.25,this.scale-.125);this.setSize(this.width,this.height);}}
 override setSize(w:number,h:number){this.width=w;this.height=h;const width=Math.max(1,Math.ceil(w*this.scale)),height=Math.max(1,Math.ceil(h*this.scale));this.target.setSize(width,height);this.volume.uniforms.uResolution.value.set(width,height);this.combine.uniforms.uTexel.value.set(1/width,1/height);}
 override render(renderer:THREE.WebGLRenderer,input:THREE.WebGLRenderTarget|null,output:THREE.WebGLRenderTarget|null){
  this.fullscreenMaterial=this.volume;renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);
  this.combine.uniforms.uScene.value=input!.texture;this.fullscreenMaterial=this.combine;renderer.setRenderTarget(this.renderToScreen?null:output);renderer.render(this.scene,this.camera);
 }
 override dispose(){this.target.dispose();this.volume.dispose();this.combine.dispose();super.dispose();}
}
