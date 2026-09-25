/* ============================================================
   boot.js — Main boot sequence (must be last script)
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

async function boot(){
  document.body.setAttribute('data-theme','romantic');
  initAllTzSelects();

  /* Floating emoji background */
  const emo = ['❤️','💛','🌹','💕','✨','💗','🌺','💝','🌸','💞'];
  for(let i=0;i<18;i++){
    const sp = document.createElement('span');
    sp.className = 'float-item';
    sp.textContent = emo[Math.floor(Math.random()*emo.length)];
    sp.style.left = (Math.random()*100)+'%';
    sp.style.fontSize = (1.2+Math.random()*1.4)+'rem';
    sp.style.animationDuration = (9+Math.random()*9)+'s';
    sp.style.animationDelay = (Math.random()*8)+'s';
    document.body.appendChild(sp);
  }

  try{ await sb.wipeExpired(); }catch(e){}

  S.PEOPLE = await sb.people() || [];
  const gs = await sb.getSet(null);
  S.CURR.shared = {
    adminPassword: (gs && gs['shared__adminPassword']) || FALLBACK_ADMIN_PW,
    adminLoginEnabled: (gs && gs['shared__adminLoginEnabled'])
  };

  if(window.buildHome) window.buildHome();
  if(window.SS_restoreSession && window.SS_restoreSession()) return;

  await window.checkWipe();
  await window.loadReviews();
  setInterval(window.checkWipe, 60000);

  const urlP = new URLSearchParams(location.search).get('person');
  if(urlP){
    const p = S.PEOPLE.find(x=>x.slug===urlP);
    if(p) setTimeout(()=>{
      const ep = S.PEOPLE.filter(x=>x.enabled!==false);
      const btns = document.querySelectorAll('#homeGrid .home-btn');
      const idx = ep.findIndex(x=>x.id===p.id);
      if(idx>=0 && btns[idx]) btns[idx].click();
    }, 400);
  }
}

/* Wait for DOMContentLoaded in case this loads before HTML body ends */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
}else{
  boot();
}

})();