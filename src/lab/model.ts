/** Independent educational Earth-reference model. Fictional geography is NOT measured data.
 * Representative velocities/densities informed by Dziewonski & Anderson (1981),
 * PREM, doi:10.1016/0031-9201(81)90046-7. Boundaries of the shallow mantle vary.
 * Pressure is integrated hydrostatically from THIS density model, not fitted UI numbers.
 * Geotherm is illustrative. Atmosphere: NOAA JetStream's five thermal regions.
 */
export const R=6371;
export const layers=[
 {name:'내핵',en:'INNER CORE',a:0,b:1221,color:'#dbbc7c',phase:'고체 금속',composition:'철 · 니켈',note:'높은 압력으로 고체를 유지하는 결정질 금속. 초기 핵 분화보다 훨씬 뒤에 성장했습니다.'},
 {name:'외핵',en:'OUTER CORE',a:1221,b:3480,color:'#c57b43',phase:'액체 금속',composition:'철 · 니켈 · 경원소',note:'전도성 액체 금속의 느린 유동이 지구 자기장 생성에 기여합니다. S파는 통과하지 못합니다.'},
 {name:'Dʺ 경계층',en:'D″ BOUNDARY',a:3480,b:3630,color:'#af6540',phase:'주로 고체 규산염',composition:'고압 규산염 · 복합 광물',note:'핵과 맨틀 사이의 열적·화학적 경계. 두께와 구조가 지역마다 크게 다릅니다.'},
 {name:'하부 맨틀',en:'LOWER MANTLE',a:3630,b:5711,color:'#94714f',phase:'고체 · 느린 변형',composition:'브리지머나이트 · 페로페리클레이스',note:'뜨겁지만 대부분 고체입니다. 상승 플룸과 침강 슬래브는 수백만 년에 걸친 암석의 변형을 압축해 표현합니다.'},
 {name:'전이대',en:'TRANSITION ZONE',a:5711,b:5961,color:'#a18a64',phase:'고체 · 광물 상전이',composition:'와즐리아이트 · 링우다이트',note:'410–660 km 깊이. 압력에 따른 광물 구조 변화가 지진파 속도의 불연속을 만듭니다.'},
 {name:'연약권',en:'ASTHENOSPHERE',a:5961,b:6251,color:'#a99770',phase:'주로 고체 · 약한 영역',composition:'감람석계 규산염',note:'약 120–410 km를 대표 범위로 사용합니다. 전 지구가 액체인 층이 아니라, 지질학적 시간에 변형하기 쉬운 암석입니다.'},
 {name:'암석권 맨틀',en:'LITHOSPHERIC MANTLE',a:6251,b:6336,color:'#8f9680',phase:'단단한 고체',composition:'감람암',note:'지각과 함께 단단한 판을 이룹니다. 두께는 위치에 따라 달라지며 여기서는 대표적인 대륙 모델입니다.'},
 {name:'지각',en:'CRUST',a:6336,b:R,color:'#b2b5a3',phase:'고체 암석',composition:'규산염 · 현무암 · 화강암',note:'평균적인 대륙 지각 35 km를 가정합니다. 도식 모드에서는 얇은 층을 읽기 위해 두께를 과장합니다.'},
];
export const airLayers=[
 {name:'대류권',en:'TROPOSPHERE',a:0,b:12,note:'기상 현상과 대부분의 수증기. 평균적인 경계 고도입니다.',color:'#8db9bd'},
 {name:'성층권',en:'STRATOSPHERE',a:12,b:50,note:'오존의 자외선 흡수로 위쪽으로 온도가 오릅니다.',color:'#76a9b7'},
 {name:'중간권',en:'MESOSPHERE',a:50,b:85,note:'높아질수록 다시 냉각되는 대기층.',color:'#68899f'},
 {name:'열권',en:'THERMOSPHERE',a:85,b:600,note:'희박한 기체가 고에너지 복사를 흡수합니다. 입자의 높은 온도와 체감 열은 다릅니다.',color:'#71859a'},
 {name:'외기권',en:'EXOSPHERE',a:600,b:10000,note:'입자 사이가 매우 멀어지며 우주 공간으로 점진적으로 이어집니다.',color:'#8a8f9c'},
];
// Schematic radii are explicitly educational, never used for physical readouts.
const schematic=[0,.1916,.546,.574,.82,.865,.925,.975,1];
export function drawnRadius(radiusKm:number,schematicMix:number){let i=layers.findIndex(l=>radiusKm<=l.b);if(i<0)return 1+(radiusKm-R)/R;const l=layers[i],f=(radiusKm-l.a)/(l.b-l.a),s=schematic[i]+f*(schematic[i+1]-schematic[i]);return radiusKm/R*(1-schematicMix)+s*schematicMix;}
export function physicalRadius(drawn:number,schematicMix:number){for(let i=0;i<8;i++){const a=drawnRadius(layers[i].a,schematicMix),b=drawnRadius(layers[i].b,schematicMix);if(drawn<=b)return layers[i].a+(drawn-a)/(b-a)*(layers[i].b-layers[i].a);}return R;}
// Top/bottom limits within each region preserve the physical discontinuities.
const rho=[[13.05,12.76],[12.17,9.90],[5.57,5.45],[5.45,4.38],[4.00,3.55],[3.50,3.32],[3.32,3.30],[2.90,2.70]];
const vp=[[11.26,11.03],[10.36,8.06],[13.72,13.65],[13.65,10.79],[10.20,9.10],[8.90,8.05],[8.10,8.04],[6.8,5.8]];
const vs=[[3.67,3.50],[0,0],[7.26,7.25],[7.25,5.96],[5.61,4.95],[4.85,4.45],[4.55,4.48],[3.9,3.3]];
const heat=[[6300,5700],[5700,4000],[4000,3300],[3300,1900],[1900,1700],[1700,1550],[1550,900],[900,288]];
export function unitAt(r:number){return Math.max(0,layers.findIndex(l=>r<=l.b));}
function field(r:number,table:number[][]){const i=unitAt(r),l=layers[i],f=Math.max(0,Math.min(1,(r-l.a)/(l.b-l.a)));return table[i][0]+f*(table[i][1]-table[i][0]);}
const density=Float64Array.from({length:R+1},(_,r)=>field(r,rho)*1000),mass=new Float64Array(R+1),pressure=new Float64Array(R+1);
for(let r=1;r<=R;r++)mass[r]=mass[r-1]+4*Math.PI*((r-.5)*1000)**2*(density[r]+density[r-1])*.5*1000;
for(let r=R-1;r>=0;r--){const m=(mass[r+1]+mass[r])*.5;pressure[r]=pressure[r+1]+(density[r]+density[r+1])*.5*6.6743e-11*m/Math.max(250000,((r+.5)*1000)**2)*1000/1e9;}
export function properties(radiusKm:number){const r=Math.max(0,Math.min(R,radiusKm)),a=Math.floor(r),b=Math.min(R,a+1);return{layer:unitAt(r),radius:r,depth:R-r,temperature:field(r,heat),density:field(r,rho),pressure:pressure[a]+(pressure[b]-pressure[a])*(r-a),vp:field(r,vp),vs:field(r,vs)};}
export const velocity=(r:number,wave:'P'|'S')=>field(Math.max(0,Math.min(R,r)),wave==='P'?vp:vs);
export function airProperties(height:number){const h=Math.max(0,height),i=Math.max(0,airLayers.findIndex(l=>h<=l.b));const t=h<12?288.15-6.5*h:h<20?216.65:h<50?216.65+(h-20)*1.8:h<85?270-(h-50)*2.35:h<600?188+(h-85)*2.1:1270;
 // Integrated piecewise scale heights: pressure remains continuous and falls
 // monotonically. A coarse teaching curve, not a high-altitude gas prediction.
 const exponent=Math.min(h,85)/7.5+Math.max(0,Math.min(h,150)-85)/8+Math.max(0,Math.min(h,600)-150)/50+Math.max(0,h-600)/200,pressure=101325*Math.exp(-exponent);
 return{temperature:t,pressure,density:pressure*.02897/(8.314*t),layer:i};}
