// Original GAIA instrument artwork. Native range inputs retain a single accessible focus target.
import './instruments.css';
const point=(a:number,r=39)=>[Math.cos(a*Math.PI/180)*r+54,Math.sin(a*Math.PI/180)*r+54];
const path=(start:number,end:number)=>{const a=point(start),b=point(end);return `M${a} A39 39 0 ${end-start>180?1:0} 1 ${b}`;};
export const icons:Record<string,string>={
 world:'<circle cx="16" cy="16" r="10"/><path d="M6 16h20M16 6c-7 7-7 13 0 20 7-7 7-13 0-20Z"/>',
 anatomy:'<path d="M24 9a11 11 0 1 0 0 14L16 16Z"/><circle cx="15" cy="16" r="3"/><path d="m19 14 8-4m-8 8 8 4"/>',
 seismic:'<path d="M2 16h6l3-8 5 17 5-19 3 10h6"/>',
 origins:'<ellipse cx="16" cy="16" rx="14" ry="6" transform="rotate(-30 16 16)"/><circle cx="16" cy="16" r="3"/><circle cx="26" cy="10" r="2"/>',
 atlas:'<circle cx="16" cy="16" r="10"/><path d="M16 1v7m0 16v7M1 16h7m16 0h7m-24-9 5 5m8 8 5 5"/>',
 impact:'<path d="m2 6 9 6M4 20l8-3m14-10-7 7"/><circle cx="14" cy="16" r="5"/><circle cx="26" cy="6" r="3"/>',
 stardust:'<circle cx="16" cy="16" r="5"/><path d="M2 4l8 8m20-8-8 8M4 28l8-8m16 8-8-8"/>',
};
export const icon=(name:string)=>`<svg class="tool-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">${icons[name]??icons.origins}</svg>`;
const strata=['지각','암석권 맨틀','연약권','전이대','하부 맨틀','Dʺ 경계층','외핵','내핵','전체 제거'];
export function enhanceInstruments(root:HTMLElement){
 root.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(input=>{
  input.setAttribute('aria-label',input.getAttribute('aria-label')||input.parentElement?.firstChild?.textContent?.trim()||'계측값');
  const paint=()=>input.style.setProperty('--fill',`${100*(+input.value-+input.min)/(+input.max-+input.min)}%`);paint();input.addEventListener('input',paint);
  const key=input.dataset.control;if(!['sun','cut','peel'].includes(key??''))return;
  const label=input.closest('label')!;const output=label.querySelector('output')!;label.classList.add('instrument',`instrument-${key}`);
  label.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent='';});
  const title=document.createElement('span');title.className='instrument-caption';title.innerHTML=key==='sun'?'SOLAR BEARING<small>태양 방위 / 상대각</small>':key==='cut'?'SECTION ANGLE<small>절개각 / GONIOMETER</small>':'STRATA REVEAL<small>깊이 / 층 박리</small>';label.prepend(title);
  const face=document.createElement('span');face.className='instrument-face';label.insertBefore(face,input);
  const draw=()=>{const value=+input.value,f=(value-+input.min)/(+input.max-+input.min);if(key==='peel'){
   face.innerHTML=`<svg viewBox="0 0 228 58" aria-hidden="true">${Array.from({length:8},(_,i)=>`<path d="M${8+i*27} 9v34h22V9" fill="${value>i?'#d1a16f':'#1b2527'}" stroke="${value>i?'#d1a16f':'#63736b'}" opacity="${value>=i+1?.28:1}"/><text x="${19+i*27}" y="55">${i+1}</text>`).join('')}<path d="M${8+f*211} 3v43" stroke="#dfe4d9" stroke-width="2"/></svg><span class="reveal-name">${strata[Math.min(8,Math.floor(value))]}</span>`;
   output.textContent=`${value.toFixed(2)} / 8`;
  }else{const start=key==='sun'?90:135,sweep=key==='sun'?359.9:270,end=start+f*sweep,p=point(end);face.innerHTML=`<svg viewBox="0 0 108 108" aria-hidden="true"><path d="${path(start,start+sweep)}" fill="none" stroke="#384648" stroke-width="2"/>${[0,.25,.5,.75,1].map(t=>{const a=point(start+t*sweep,35),b=point(start+t*sweep,42);return `<path d="M${a}L${b}" stroke="#99a99e"/>`;}).join('')}<path d="${path(start,start+Math.max(.01,f*sweep))}" fill="none" stroke="${key==='sun'?'#dfe4d9':'#d1a16f'}" stroke-width="2"/>${key==='cut'?`<path d="M54 54L${point(start)} A39 39 0 ${f*sweep>180?1:0} 1 ${p}Z" fill="#d1a16f" opacity=".12"/>`:''}<path d="M54 54L${p}" stroke="#d1a16f"/><circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#dfe4d9"/><circle cx="54" cy="54" r="3" fill="#d1a16f"/>${(key==='cut'?[0,90,180,270]:[-180,-90,0,90]).map((v,i)=>{const q=point(start+i*sweep/(key==='cut'?3:4),51);return `<text x="${q[0]}" y="${q[1]+2}">${key==='sun'&&i===0?'±180':v}°</text>`;}).join('')}</svg>`;output.textContent=`${value.toFixed(0)}°`;}
  };draw();input.addEventListener('input',draw);input.title='드래그 · 방향키 · Home/End · 0 초기화';input.addEventListener('keydown',e=>{if(e.key==='0'){e.preventDefault();input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));}});
  // The transparent native input handles keyboard, Home/End and accessibility;
  // pointer capture supplies actual polar / stratigraphic coordinates.
  const move=(e:PointerEvent)=>{const b=face.getBoundingClientRect();let f;if(key==='peel')f=(e.clientX-b.left)/b.width;else{const a=Math.atan2(e.clientY-b.top-b.height/2,e.clientX-b.left-b.width/2)*180/Math.PI;const start=key==='sun'?90:135;let delta=(a-start+360)%360;if(key==='cut'&&delta>270)delta=delta>315?0:270;f=delta/(key==='sun'?360:270);}const step=+input.step||1;input.value=String(Math.max(+input.min,Math.min(+input.max,Math.round((+input.min+f*(+input.max-+input.min))/step)*step)));input.dispatchEvent(new Event('input',{bubbles:true}));};
  input.onpointerdown=e=>{e.preventDefault();input.focus();input.setPointerCapture(e.pointerId);move(e);};input.onpointermove=e=>{if(input.hasPointerCapture(e.pointerId))move(e);};input.onpointerup=input.onpointercancel=e=>{if(input.hasPointerCapture(e.pointerId))input.releasePointerCapture(e.pointerId);};
 });
}
