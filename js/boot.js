/* ============================================================
   boot.js — Main boot sequence
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

/* ---------- Home floaters ---------- */
function initHomeFloaters(){
  const fl = $('homeFloaters');
  if(!fl) return;
  fl.innerHTML = '';
  const pool = ['❤️','💕','✨','🌹','💖','⭐','💛','🎀','🦋','💫','🌸','🎈','💝','🕊️'];
  for(let i = 0; i < 18; i++){
    const s = document.createElement('span');
    s.className = 'hf';
    s.textContent = pool[Math.floor(Math.random() * pool.length)];
    s.style.left = (Math.random() * 100) + '%';
    s.style.fontSize = (0.9 + Math.random() * 1.3) + 'rem';
    s.style.animationDuration = (9 + Math.random() * 10) + 's';
    s.style.animationDelay = (Math.random() * 10) + 's';
    fl.appendChild(s);
  }
}

/* ---------- Body floaters (fewer + lighter for speed) ---------- */
function initBodyFloaters(){
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const emo = ['❤️','💛','🌹','💕','✨','💗','🌺','💝','🌸','💞'];
  for(let i = 0; i < 12; i++){
    const sp = document.createElement('span');
    sp.className = 'float-item';
    sp.textContent = emo[Math.floor(Math.random() * emo.length)];
    sp.style.left = (Math.random() * 100) + '%';
    sp.style.fontSize = (1.2 + Math.random() * 1.4) + 'rem';
    sp.style.animationDuration = (9 + Math.random() * 9) + 's';
    sp.style.animationDelay = (Math.random() * 8) + 's';
    document.body.appendChild(sp);
  }
}

/* ---------- Boot ---------- */
async function boot(){
  // Home always uses romantic theme; viewer keeps its own scoped theme.
  document.body.setAttribute('data-theme', 'romantic');
  const viewer = document.getElementById('viewerScreen');
  if(viewer){
    viewer.setAttribute('data-theme', 'romantic');
    viewer.setAttribute('data-darkmode', 'false');
  }

  /* Init all timezone selects before anything else */
  initAllTzSelects();

  /* Decorative floaters */
  initBodyFloaters();
  initHomeFloaters();

  /* Show home skeleton immediately so UI paints fast */
  if(window.renderHomeSkeleton) window.renderHomeSkeleton();

  /* Wipe expired people — capture them for finished list */
  try{
    const wiped = await sb.wipeExpiredAndReturn();
    if(wiped && wiped.length) S.__justWiped = wiped;
  }catch(e){}

  /* Load people */
  S.PEOPLE = await sb.people() || [];

  /* Load shared settings for admin login check */
  const gs = await sb.getSet(null);
  S.CURR.shared = {
    adminPassword: (gs && gs['shared__adminPassword']) || FALLBACK_ADMIN_PW,
    adminLoginEnabled: (gs && gs['shared__adminLoginEnabled'])
  };

  /* ✅ Load reviews BEFORE building home so they render on first paint */
  try{
    await window.loadReviews();
  }catch(e){
    console.warn('loadReviews failed', e && e.message);
    S.REVIEWS = [];
  }

  /* Build home (fast) — now S.REVIEWS is already populated */
  if(window.buildHome) window.buildHome();

  /* Restore session */
  if(window.SS_restoreSession && window.SS_restoreSession()) return;

  /* Wipe check (periodic). Reviews already loaded above. */
  setInterval(window.checkWipe, 60000);

  /* Auto-open person from URL */
  const urlP = new URLSearchParams(location.search).get('person');
  if(urlP){
    const p = S.PEOPLE.find(x => x.slug === urlP);
    if(p){
      setTimeout(() => {
        const ep = S.PEOPLE.filter(x => x.enabled !== false);
        const btns = document.querySelectorAll('#homeGrid .home-btn');
        const idx = ep.findIndex(x => x.id === p.id);
        if(idx >= 0 && btns[idx]) btns[idx].click();
      }, 250);
    }
  }
}

/* ---------- Close all modals helper ---------- */
window.__closeAllModals__ = function(){
  ['closingModal','adminPanel','guestPanel','guestEditModal','requesterEditModal',
   'addPersonModal','personLoginModal','adminLoginModal','reviewModal',
   'storyModal','mapModal','pinModal','uploadModal',
   'personDetailsModal','shareModal'].forEach(id => {
    const el = $(id);
    if(el) el.classList.remove('active');
  });
  const ss = $('slideshowOverlay');
  if(ss) ss.classList.remove('active');
};

/* ---------- Kick off ---------- */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
