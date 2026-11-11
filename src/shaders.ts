
export const vertex=/* glsl */`
varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal;
void main(){vUv=uv;vLocal=position;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}
`;
export const common=/* glsl */`
precision highp float;
varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
uniform sampler2D uTerrain;uniform sampler2D uCloud;uniform sampler2D uBiome;uniform vec3 uSun;uniform vec3 uLocalSun;
uniform float uBirth;uniform float uTime;uniform float uHeat;uniform float uWater;uniform float uAir;uniform float uSea;uniform float uOpen;uniform float uSeed;uniform float uReference;
vec2 mapUV(vec2 uv){return vec2(uv.x,1.-uv.y);}
float hash(vec3 p){p=fract(p*.1031+uSeed);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.55+noise(p*2.07+13.)*.27+noise(p*4.21+5.)*.12+noise(p*8.3)*.06;}
float height(vec4 t){return (t.r*65280.+t.g*255.)/65535.;}
vec2 spherical(vec3 n){return vec2(atan(n.z,-n.x)/6.2831853,acos(clamp(n.y,-1.,1.))/3.14159265);}
float cloudShadow(vec3 local,vec3 L){
 vec3 p=normalize(local+L*.008/max(.15,dot(normalize(local),L)));
 vec2 uv=spherical(p)+vec2(uTime*.00034,0.);
 float a=texture2D(uCloud,uv).r;
 return exp(-smoothstep(.32,.8,a)*1.6*uAir);
}
vec3 relief(vec3 N,float h,float amount){vec3 a=dFdx(vWorld),b=dFdy(vWorld),c=cross(b,N),d=cross(N,a);float det=dot(a,c);return normalize(abs(det)*N-sign(det)*(dFdx(h)*c+dFdy(h)*d)*amount);}
`;
export const surface=common+/* glsl */`
void main(){
 // A coherent material-space front; no screen-door pixel dissolve.
 if(uBirth<.999&&fbm(vLocal*9.)>uBirth)discard;
 vec2 uv=mapUV(vUv);vec4 t=texture2D(uTerrain,uv);float h=height(t);
 float sea=mix(.22,uSea,uWater);float land=smoothstep(sea-.0008,sea+.0015,h);
 vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld),L=normalize(uSun);
 float altitude=max(h-uSea,0.);
 vec3 rockN=relief(N,altitude,.075);
 N=normalize(mix(N,rockN,land*(1.-smoothstep(.3,.9,uHeat))));
 float NoL=max(dot(N,L),0.),NoV=max(dot(N,V),.001);
 float depth=clamp((sea-h)*10.,0.,1.);
 vec3 earth=pow(texture2D(uBiome,uv).rgb,vec3(2.2));
 float ice=smoothstep(.88,.98,abs(normalize(vLocal).y)+altitude*.9);
 vec3 ocean=mix(vec3(.01,.09,.10),vec3(.0015,.012,.032),smoothstep(0.,.8,depth));
 ocean=mix(ocean,vec3(.38,.48,.48),ice*.88);
 vec3 albedo=mix(mix(ocean,earth,land),earth,uReference);
 float shadow=cloudShadow(vLocal,uLocalSun);
 vec3 irradiance=vec3(3.2,3.2,3.15)*NoL*shadow;
 vec3 color=albedo*(vec3(.009,.015,.024)+irradiance);
 // GGX dielectric ocean: F0=.0204. Land has diffuse response, never the ocean's lobe.
 vec3 H=normalize(L+V);float NoH=max(dot(N,H),0.),VoH=max(dot(V,H),0.);
 float rough=mix(.27,.21,depth),a2=pow(rough,4.);
 float D=a2/(3.14159265*pow(NoH*NoH*(a2-1.)+1.,2.)+.00001);
 float k=pow(rough+1.,2.)*.125,G=(NoL/(NoL*(1.-k)+k))*(NoV/(NoV*(1.-k)+k));
 float F=.0204+.9796*pow(1.-VoH,5.);
 color+=vec3(3.2,3.2,3.15)*D*G*F/max(4.*NoV,.01)*(1.-land)*(1.-ice)*uWater*shadow;
 if(uHeat>.001){
  // Uniform branch removes formation-only fractals entirely from the completed world.
  float macro=fbm(vLocal*6.),grain=fbm(vLocal*60.);
  vec3 basalt=mix(vec3(.005,.006,.007),vec3(.027,.023,.019),grain);
  float hot=smoothstep(macro*.62+.03,macro*.62+.29,uHeat);
  color=mix(color,basalt*(vec3(.009,.015,.024)+irradiance),smoothstep(.04,.4,uHeat));
  float fissure=1.-smoothstep(.018,.055,abs(fbm(vLocal*20.+macro*2.)-.49));
  float flow=fbm(vLocal*8.+vec3(uTime*.025,-uTime*.016,0.));
  float coolingEdge=hot*(.08+.75*smoothstep(.38,.66,flow));
  vec3 thermal=mix(vec3(.65,.016,.001),vec3(2.2,.43,.018),smoothstep(.4,.75,grain));
  color+=thermal*(coolingEdge+fissure*smoothstep(.03,.55,uHeat)*.15);
 }
 gl_FragColor=vec4(max(color,vec3(0.)),1.);
}
`;
// Restore the original fine weather skin. It supplies sharp, independently
// lit filaments over a restrained 3-D optical-depth underlayer.
export const clouds=common+/* glsl */`
void main(){
 vec2 uv=mapUV(vUv)+vec2(uTime*.00034,0.);vec4 t=texture2D(uCloud,uv);
 float density=smoothstep(.12,.7,t.r);if(density<.015||uAir<.001)discard;
 vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld);float day=dot(N,uSun);
 float shadow=texture2D(uCloud,uv+vec2(-.003,.002)).r;
 vec3 albedo=mix(vec3(.19,.25,.29),vec3(.91,.93,.86),clamp(t.r*.5+t.g*.45-shadow*.2,0.,1.));
 vec3 color=albedo*(vec3(.012,.022,.038)+vec3(2.9,2.85,2.7)*max(day,0.));
 color+=vec3(.17,.09,.035)*exp(-abs(day)*12.)*.3;
 float opacity=density*uAir*.88*(1.-pow(1.-max(dot(N,V),0.),7.)*.5);
 gl_FragColor=vec4(color,opacity);
}
`;
export const interior=common+/* glsl */`
uniform float uLayer;uniform float uFace;
void main(){
 vec3 p=vLocal,N=normalize(vNormal),V=normalize(cameraPosition-vWorld);
 if(!gl_FrontFacing)N=-N;
 float r=length(p),angular=atan(p.y,p.z),mature=smoothstep(18.5,22.,uTime);
 float fine=noise(p*270.),macro=fbm(p*12.);
 vec3 base;float emission=0.,rough=.85,thermal=0.;
 if(uLayer<.5){
  // Anisotropic grains are fixed in the solid iron-nickel, not animated liquid noise.
  vec3 crystal=p*vec3(180.,80.,145.);vec3 cell=floor(crystal);
  float grain=hash(cell),facet=sin(dot(p,normalize(cell+vec3(.1,2.,.3)))*360.);
  base=mix(vec3(.38,.24,.11),vec3(.85,.64,.34),grain*.45+facet*.08);
  thermal=.48+macro*.3;emission=.9;rough=.38+grain*.2;
  float liquid=fbm(p*25.+vec3(sin(angular*5.+uTime*.15),uTime*.03,0.));
  base=mix(mix(vec3(.36,.055,.008),vec3(.88,.34,.055),liquid),base,mature);
 }else if(uLayer<1.5){
  // Long helical streaks advect in an opaque liquid-metal field.
  float shear=angular*8.+r*29.-uTime*.19;
  vec3 q=p*vec3(12.,5.,12.)+vec3(sin(shear),cos(shear*.71),sin(shear*.53))*1.7;
  float flow=fbm(q+vec3(uTime*.018,-uTime*.027,0.));
  float ribbon=pow(.5+.5*sin(shear+flow*9.),5.);
  thermal=.15+flow*.25+ribbon*.16;
  base=mix(vec3(.11,.008,.002),vec3(.38,.045,.006),flow);base+=vec3(.55,.12,.012)*ribbon;
  emission=.35;rough=.34;
 }else if(uLayer<2.5){
  // Mostly solid silicate. Sparse plume/slab motifs are geological time compression.
  float depth=clamp((.985-r)/.439,0.,1.);
  float warp=fbm(p*18.);
  float strata=.5+.5*sin(r*153.+warp*11.);
  float fabric=fbm(p*vec3(95.,38.,72.)+warp*2.);
  float plume=pow(max(0.,sin(angular*9.+warp*2.2+r*3.)),18.)*smoothstep(.97,.58,r);
  float slab=pow(max(0.,cos(angular*13.+r*5.+warp)),22.)*smoothstep(.55,.9,r);
  base=mix(vec3(.075,.038,.024),vec3(.3,.12,.045),depth*.65+fabric*.25);
  base*=.88+strata*.045+fine*.11;base=mix(base,vec3(.025,.035,.038),slab*.75);
  thermal=plume*.45*depth;emission=.08+depth*.11;
  base+=vec3(.25,.05,.004)*plume*depth;
 }else{
  base=mix(vec3(.025,.029,.027),vec3(.11,.09,.062),macro)*(.8+fine*.35);rough=.96;
 }
 // The first differentiation contains one continuous liquid proto-core, without
 // a prematurely solid inner-core boundary. Metal enrichment advances inward-to-outward.
 if(uLayer<1.5&&mature<1.){
  float phase=angular*8.+r*29.-uTime*.19;
  float flow=fbm(p*vec3(12.,5.,12.)+vec3(sin(phase),cos(phase*.71),sin(phase*.53))*1.7+vec3(uTime*.018,-uTime*.027,0.));
  float coreFront=.17+.376*smoothstep(12.5,15.,uTime);
  float metal=1.-smoothstep(coreFront-.025,coreFront+.025,r);
  vec3 liquid=mix(vec3(.16,.026,.004),vec3(.64,.19,.024),flow);
  base=mix(mix(vec3(.07,.025,.012),liquid,metal),base,mature);
  thermal=mix(metal*(.26+flow*.42),thermal,mature);emission=mix(.5,emission,mature);rough=.45;
 }
 N=uLayer>=.5&&uLayer<1.5?relief(N,thermal,.004):relief(N,fbm(p*110.),uLayer<.5?.0012:.0035);
 // A fixed exhibit key is active only for the opened anatomy, shared across both cut faces.
 vec3 key=normalize(vec3(-.42,.66,1.1)),fill=normalize(vec3(.7,-.2,.8));
 float diffuse=.22+max(dot(N,key),0.)*.9+max(dot(N,fill),0.)*.23;
 vec3 H=normalize(key+V);float spec=pow(max(dot(N,H),0.),mix(110.,12.,rough))*(1.-rough);
 vec3 color=base*(diffuse+emission)+vec3(.8,.63,.37)*spec*.7;
 vec3 heatColor=uLayer>=.5&&uLayer<1.5?mix(vec3(.9,.025,.002),vec3(1.65,.22,.025),thermal):mix(vec3(.9,.07,.005),vec3(1.65,.65,.12),thermal);
 color+=heatColor*thermal*(uLayer<1.5?1.:.38);
 // Thin, restrained boundary light follows the actual radial surface.
 float scan=exp(-pow((r-(.19+fract((uTime-22.5)*.135)*.8))/.008,2.));
 color+=vec3(.18,.12,.065)*scan*uFace*smoothstep(23.,24.,uTime)*(1.-smoothstep(28.,29.,uTime));
 color*=uLayer<.5?.64:(uLayer<1.5?.38:.63);
 gl_FragColor=vec4(max(color,vec3(0.)),1.);
}
`;
