export const vertex=/* glsl */`
varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal;
void main(){vUv=uv;vLocal=position;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}
`;
export const common=/* glsl */`
precision highp float;
varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
uniform sampler2D uTerrain;uniform sampler2D uCloud;uniform vec3 uSun;
uniform float uTime;uniform float uHeat;uniform float uWater;uniform float uAir;uniform float uSea;uniform float uOpen;
vec2 mapUV(vec2 uv){return vec2(uv.x,1.-uv.y);}
vec3 finish(vec3 c){return pow(max(c,vec3(0.)),vec3(1./2.2));}
`;
export const surface=common+/* glsl */`
void main(){
 vec2 uv=mapUV(vUv);vec4 t=texture2D(uTerrain,uv);float h=t.r;
 float sea=mix(.23,uSea,uWater);float land=smoothstep(sea-.002,sea+.004,h);
 vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld);vec3 L=normalize(uSun);
 float terrainHeight=max(h-uSea,0.)*(.55+t.g*.45);
 // Derivative-based relief follows the same height field, and remains stable on both shell pieces.
 vec3 dp1=dFdx(vWorld),dp2=dFdy(vWorld);vec3 r1=cross(dp2,N),r2=cross(N,dp1);
 float det=dot(dp1,r1);vec3 grad=sign(det)*(dFdx(terrainHeight)*r1+dFdy(terrainHeight)*r2);
 vec3 bump=normalize(abs(det)*N-grad*.065);N=normalize(mix(N,bump,land*(1.-uHeat)));
 float day=dot(N,L);float diffuse=max(day,0.);
 float latitude=abs(normalize(vLocal).y);
 vec3 fertile=mix(vec3(.055,.10,.063),vec3(.18,.22,.105),t.b);
 float dry=smoothstep(.22,.48,latitude)*(1.-smoothstep(.5,.7,latitude));
 vec3 earth=mix(fertile,vec3(.32,.235,.13),dry*.72);
 earth=mix(earth,vec3(.34,.31,.245),smoothstep(uSea+.095,uSea+.22,h)*t.g);
 float ice=smoothstep(.86,.96,latitude+(h-uSea)*.65);
 earth=mix(earth,vec3(.67,.74,.72),ice);
 float depth=clamp((sea-h)*9.,0.,1.);
 vec3 ocean=mix(vec3(.025,.16,.17),vec3(.006,.035,.075),pow(depth,.38));
 vec3 albedo=mix(ocean,earth,land);
 vec3 basalt=mix(vec3(.012,.014,.015),vec3(.055,.041,.028),t.b);
 albedo=mix(albedo,basalt,smoothstep(.08,.8,uHeat));
 vec2 cuv=uv+vec2(uTime*.00048,0.);
 float shadow=texture2D(uCloud,cuv+vec2(-.009,.006)).r;
 float cloudShadow=1.-shadow*.6*uAir*(1.-uOpen*.8);
 vec3 color=albedo*(vec3(.024,.035,.048)+vec3(1.55,1.43,1.22)*diffuse*cloudShadow);
 vec3 H=normalize(L+V);float fres=.021+.979*pow(1.-max(dot(N,V),0.),5.);
 float wave=sin(uv.x*3800.+uTime*.12)*sin(uv.y*2300.-uTime*.09)*.07+.93;
 float spec=pow(max(dot(N,H),0.),mix(150.,65.,depth))*wave;
 color+=vec3(.85,.91,.83)*spec*(.25+fres)*3.*(1.-land)*uWater*max(day,0.)*cloudShadow;
 float crack=1.-smoothstep(.015,.055,abs(t.g-(.32+.04*sin(uTime*.45+t.b*16.))));
 float molten=smoothstep(.42,.92,uHeat)*(1.-smoothstep(.20,.62,t.b));
 float glow=max(crack*smoothstep(.07,.72,uHeat),molten);
 vec3 lava=mix(vec3(.65,.042,.003),vec3(1.8,.64,.095),t.b);
 color+=lava*glow*(.7+sin(uTime*.5+t.r*30.)*.09);
 float rim=pow(1.-max(dot(normalize(vNormal),V),0.),4.);
 color+=vec3(.035,.10,.14)*rim*smoothstep(-.23,.4,day)*uAir;
 gl_FragColor=vec4(finish(color),1.);
}
`;
export const clouds=common+/* glsl */`
void main(){vec2 uv=mapUV(vUv)+vec2(uTime*.00048,0.);vec4 t=texture2D(uCloud,uv);
 float density=smoothstep(.12,.7,t.r);if(density<.015)discard;
 vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld);float day=dot(N,uSun);
 float shadow=texture2D(uCloud,uv+vec2(-.003,.002)).r;
 vec3 color=mix(vec3(.19,.25,.29),vec3(.91,.93,.86),clamp(t.r*.5+t.g*.45-shadow*.2,0.,1.));
 color*=vec3(.025,.037,.055)+vec3(1.55,1.46,1.33)*max(day,0.);
 color+=vec3(.17,.09,.035)*exp(-abs(day)*12.)*.3;
 float opacity=density*uAir*.92*(1.-pow(1.-max(dot(N,V),0.),7.)*.5);
 gl_FragColor=vec4(finish(color),opacity);}
`;
export const atmosphere=common+/* glsl */`
void main(){vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld);float facing=abs(dot(N,V));
 float rim=pow(1.-facing,5.5);float sun=dot(N,uSun);float light=smoothstep(-.28,.55,sun);
 vec3 c=mix(vec3(.10,.31,.45),vec3(.25,.51,.60),light);
 gl_FragColor=vec4(c,rim*light*uAir*.39*(1.-uOpen));}
`;
export const interior=common+/* glsl */`
uniform float uLayer;uniform float uFace;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float rock(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float pattern(vec3 p){float f=rock(p*7.+uTime*.012);return rock(p*23.+f*2.)*.65+rock(p*65.)*.25+rock(p*170.)*.1;}
void main(){vec3 N=normalize(vNormal),V=normalize(cameraPosition-vWorld);float day=max(dot(N,uSun),0.);
 float r=length(vLocal);float flow=pattern(vLocal);
 float fine=rock(vLocal*210.);
 vec3 base;float emission;
 if(uLayer<.5){base=mix(vec3(.38,.22,.085),vec3(.83,.57,.26),flow*.38+fine*.12);emission=.25;}
 else if(uLayer<1.5){base=mix(vec3(.42,.095,.014),vec3(.83,.33,.055),flow*.4);emission=.42;}
 else if(uLayer<2.5){base=mix(vec3(.085,.023,.014),vec3(.38,.14,.053),smoothstep(.2,.8,flow)*.74+fine*.1);emission=.10;}
 else {base=mix(vec3(.025,.033,.03),vec3(.13,.15,.105),flow*.45);emission=.015;}
 // The early differentiation view has a single liquid metal core; the mature solid inner core belongs to the later anatomical projection.
 if(uLayer<.5){base=mix(vec3(.62,.19,.025),base,uWater);}
 float metal=pow(max(dot(reflect(-uSun,N),V),0.),uLayer<.5?34.:12.);
 vec3 c=base*(.15+day*.9+emission)+vec3(.45,.29,.12)*metal*.32;
 if(uFace>.5){float grain=rock(vLocal*340.);c*=.84+.22*grain;c+=base*.1;}
 gl_FragColor=vec4(finish(c),1.);}
`;
