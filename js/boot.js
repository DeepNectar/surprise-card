/* ============================================================
   boot.js — Main boot sequence (robust + visible errors)
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

/* ---------- Body floaters ---------- */
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

/* ---------- Visible fatal error ---------- */
function showBootError(err){
  console.error('BOOT FAILED:', err);
  const g = document.getElementById('homeGrid');
  if(g){
    g.innerHTML =
      '<div style="grid-column:1/-1;color:#fff;padding:1.2rem;text-align:center;' +
      'background:rgba(196,30,58,.45);border-radius:.9rem;border:2px solid #ffd700;' +
      'font-size:.9rem;line-height:1.55;max-width:520px;margin:0 auto;">' +
      '<strong style="font-size:1.1rem;">⚠️ Could not load the home screen</strong><br><br>' +
      '<span style="opacity:.9;font-size:.82rem;word-break:break-word;">' +
      (err && err.message ? esc(err.message) : 'Unknown error') +
      '</span><br><br>' +
      '<button onclick="location.reload()" style="background:#ffd700;color:#4a0016;border:none;' +
      'padding:.55rem 1.3rem;border-radius:40px;font-weight:800;cursor:pointer;font-size:.85rem;">' +
      '🔄 Reload page</button></div>';
  }
  if(window.__diagLog) window.__diagLog('BOOT ERROR: ' + (err && err.message));
}

/* ---------- Boot ---------- */
async function boot(){
  try{
    document.body.setAttribute('data-theme', 'romantic');
    const viewer = document.getElementById('viewerScreen');
    if(viewer){
      viewer.setAttribute('data-theme', 'romantic');
      viewer.setAttribute('data-darkmode', 'false');
    }

    initAllTzSelects();
    initBodyFloaters();
    initHomeFloaters();

    if(window.renderHomeSkeleton) window.renderHomeSkeleton();

    // Critical globals check
    if(typeof sb === 'undefined' || !sb || typeof sb.people !== 'function'){
      throw new Error('Supabase helper (sb) is missing. Check that supabase.js loaded.');
    }
    if(typeof window.__PAGE_STATE__ === 'undefined'){
      throw new Error('config.js did not initialise __PAGE_STATE__. Check load order.');
    }
    if(typeof window.buildHome !== 'function'){
      throw new Error('home.js did not load (buildHome missing).');
    }

    // Wipe expired (non-blocking for UI)
    try{
      const wiped = await sb.wipeExpiredAndReturn();
      if(wiped && wiped.length) S.__justWiped = wiped;
    }catch(e){
      console.warn('wipeExpiredAndReturn failed:', e && e.message);
    }

    S.PEOPLE = await sb.people() || [];

    let gs = {};
    try{
      gs = await sb.getSet(null) || {};
    }catch(e){
      console.warn('getSet(null) failed:', e && e.message);
    }
    S.CURR.shared = {
      adminPassword: (gs && gs['shared__adminPassword']) || FALLBACK_ADMIN_PW,
      adminLoginEnabled: (gs && gs['shared__adminLoginEnabled'])
    };

    // Reviews first so home paints with them
    try{
      await window.loadReviews();
    }catch(e){
      console.warn('loadReviews failed', e && e.message);
      S.REVIEWS = [];
    }

    if(window.buildHome) window.buildHome();

    // Session restore (after home is painted)
    if(window.SS_restoreSession && window.SS_restoreSession()) return;

    setInterval(window.checkWipe, 60000);

    // Deep-link ?person=slug
    const urlP = new URLSearchParams(location.search).get('person');
    if(urlP){
      const p = S.PEOPLE.find(x => x.slug === urlP);
      if(p){
        setTimeout(() => {
          const ep = S.PEOPLE.filter(x => x.enabled !== false);
          const btns = document.querySelectorAll('#homeGrid .home-btn:not(.guest)');
          const idx = ep.findIndex(x => x.id === p.id);
          if(idx >= 0 && btns[idx]) btns[idx].click();
        }, 300);
      }
    }
  }catch(err){
    showBootError(err);
  }
}

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

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();