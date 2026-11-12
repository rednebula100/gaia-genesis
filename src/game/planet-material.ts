import * as T from 'three';
import type {Look} from './data/planets';

/** Shared light uniforms so every procedural body follows the stage light or the race sun. */
export const lightUniforms={uLightPos:{value:new T.Vector3(-9,4,7)},uPoint:{value:0}};
const types:Record<string,number>={gas:0,rock:1,ice:2,lava:3,haze:4,super:5,diamond:6,glass:7};
const noise=`
vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.+2.*fract(sin(p)*43758.5453);}
float sn(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.-2.*f);
 return mix(mix(mix(dot(h3(i),f),dot(h3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(h3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(h3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
 mix(mix(dot(h3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(h3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(h3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(h3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*sn(p);p*=2.03;a*=.5;}return s;}
float cell(vec3 p){vec3 i=floor(p),f=fract(p);float d=8.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)for(int z=-1;z<=1;z++){vec3 g=vec3(x,y,z);vec3 o=.5+.5*h3(i+g);d=min(d,length(g+o-f));}return d;}`;
export function proceduralMaterial(look:Look){
 const u={...lightUniforms,uC0:{value:new T.Color(look.c[0])},uC1:{value:new T.Color(look.c[1])},uC2:{value:new T.Color(look.c[2])},uC3:{value:new T.Color(look.c[3])},uSeed:{value:look.seed},uType:{value:types[look.type]??1},uAtmo:{value:new T.Color(look.atmo??look.c[2])},uTime:{value:0}};
 return new T.ShaderMaterial({uniforms:u,
  vertexShader:'varying vec3 vP;varying vec3 vN;varying vec3 vW;void main(){vP=normalize(position);vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:`uniform vec3 uC0,uC1,uC2,uC3,uAtmo,uLightPos;uniform float uSeed,uPoint,uTime;uniform int uType;varying vec3 vP;varying vec3 vN;varying vec3 vW;${noise}
  void main(){vec3 p=vP+uSeed;vec3 col;float emit=0.;float spec=0.;float lat=vP.y;
   if(uType==0||uType==7){float w=fbm(p*vec3(1.2,3.,1.2)+vec3(uTime*.01,0,0));float b=sin(lat*(uType==7?9.:14.)+w*3.2+uSeed);float b2=sin(lat*31.+w*5.);col=mix(uC1,uC0,smoothstep(-.6,.6,b));col=mix(col,uC2,smoothstep(.3,.9,b2)*.35);float storm=smoothstep(.12,.0,length(vec2(vP.x-.55,(lat+.25)*1.6)));col=mix(col,uC3,storm*.75);if(uType==7){col=mix(col,uC3,smoothstep(.55,.85,fbm(p*vec3(6.,24.,6.)))*.4);spec=.6;}}
   else if(uType==1){float h=fbm(p*2.2);float c=cell(p*5.);float c2=cell(p*13.);col=mix(uC1,uC2,smoothstep(-.3,.4,h));col*=.75+.5*smoothstep(.05,.35,c);col+=uC3*smoothstep(.12,.0,abs(c-.32))*.25;col*=.85+.3*smoothstep(.0,.3,c2);}
   else if(uType==2){float h=fbm(p*1.6);col=mix(uC2,uC3,smoothstep(-.2,.5,h));float cr=abs(sn(p*7.)+sn(p*15.)*.5);col=mix(uC1,col,smoothstep(.0,.06,cr));col=mix(col,uC0,smoothstep(.25,.6,fbm(p*.9+3.))*.35);float heart=smoothstep(.36,.2,length(vec2(vP.x-.55,vP.y+.1)*vec2(1.,1.4)));col=mix(col,uC3,heart*step(8.,uSeed)*.8);}
   else if(uType==3){float h=fbm(p*2.6);float r=1.-abs(sn(p*6.)*2.);col=mix(uC0,uC1,smoothstep(-.4,.5,h));col=mix(col,uC2,smoothstep(.3,.7,fbm(p*4.+1.))*.6);emit=smoothstep(.82,.98,r)*smoothstep(-.1,.4,h);col+=uC3*emit*1.4;}
   else if(uType==4){float w=fbm(p*vec3(1.,2.4,1.)+uTime*.005);col=mix(uC1,uC2,smoothstep(-.5,.5,sin(lat*6.+w*2.)));col=mix(col,uC3,.25);}
   else if(uType==5){float h=fbm(p*1.7);float land=smoothstep(.02,.08,h);col=mix(uC0,uC1,land);col=mix(col,uC2,smoothstep(.75,.9,abs(lat))*1.);float cl=smoothstep(.15,.5,fbm(p*3.+vec3(uTime*.01,0,0)));col=mix(col,vec3(1.),cl*.65);spec=(1.-land)*.5;}
   else{float c=cell(p*9.);float f2=cell(p*22.);col=mix(uC0,uC1,smoothstep(.1,.6,c));col=mix(col,uC2,smoothstep(.85,.95,1.-f2)*.8);float r=1.-abs(sn(p*5.)*2.);emit=smoothstep(.9,.99,r);col+=uC3*emit;spec=1.;}
   vec3 L=uPoint>.5?normalize(uLightPos-vW):normalize(uLightPos);vec3 N=normalize(vN);vec3 V=normalize(cameraPosition-vW);float d=max(dot(N,L),0.);
   float term=smoothstep(-.05,.25,dot(N,L));vec3 lit=col*(d*1.35+.035)+emit*uC3*.9;vec3 H=normalize(L+V);lit+=spec*pow(max(dot(N,H),0.),48.)*term*.8;
   float fr=pow(1.-max(dot(N,V),0.),3.);lit+=uAtmo*fr*(.25+term*.9);gl_FragColor=vec4(lit,1.);}`});}
export function ringMaterial(c:string){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{...lightUniforms,uC:{value:new T.Color(c)}},
 vertexShader:'varying vec2 vU;varying vec3 vW;void main(){vU=uv;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
 fragmentShader:'uniform vec3 uC;varying vec2 vU;varying vec3 vW;void main(){float r=vU.x;float b=.55+.45*sin(r*90.)*sin(r*23.+1.);float a=smoothstep(0.,.08,r)*smoothstep(1.,.85,r)*b*(r>.62&&r<.66?.15:1.);gl_FragColor=vec4(uC*(.7+.5*b),a*.85);}'});}
/** RingGeometry with radial uv.x so the shader can draw bands. */
export function ringGeometry(inner:number,outer:number){const g=new T.RingGeometry(inner,outer,160,4);const pos=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pos.count;i++){const r=Math.hypot(pos.getX(i),pos.getY(i));uv.setXY(i,(r-inner)/(outer-inner),0);}return g;}
