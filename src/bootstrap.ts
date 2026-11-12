const p=new URLSearchParams(location.search);const legacy=['lab','tour','reference','inspect','seed','genesis'].some(k=>p.has(k))&&!p.has('game');
if(legacy){await import('./main');const link=document.createElement('a');link.href=import.meta.env.BASE_URL+'?game=home';link.textContent='← 행성무스메';link.style.cssText='position:fixed;left:42px;top:78px;z-index:12;color:#b8c9a7;font:12px sans-serif;text-decoration:none';document.body.append(link);}
else{await import('./game/app');}
