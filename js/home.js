/* ============================================================
   home.js — Home screen, person grid, triple-click admin
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

/* -------- Triple-click admin trigger -------- */
let homeClickCount = 0;
let homeClickTimer = null;

window.triggerAdminPrompt = async function(){
  const gs = await sb.getSet(null);
  const flag = (gs && gs['shared__adminLoginEnabled']);
  const enabled = (flag===undefined) ? true : (String(flag)==='true');
  if(!enabled) return;
  openAdminLoginFull();
};

window.buildHome = function(){
  const g = $('homeGrid'); if(!g) return;
  g.innerHTML = '';
  const ep = S.PEOPLE.filter(p=>p.enabled!==false);
  ep.forEach(p=>{
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'home-btn';
    b.innerHTML = `<span class="home-btn-emoji">💝</span><span>${(p.display_name||p.slug||'Person').replace(/</g,'&lt;')}</span>`;
    b.onclick = ()=> onPersonClick(p);
    g.appendChild(b);
  });
  const gb = document.createElement('button');
  gb.type = 'button'; gb.className = 'home-btn guest';
  gb.innerHTML = '<span class="home-btn-emoji">✍️</span><span>Guest</span>';
  gb.onclick = ()=> window.openGuestPanel && window.openGuestPanel();
  g.appendChild(gb);
  if(window.renderHomeReviews) window.renderHomeReviews();
};

window.onPersonClick = function(p){
  S.LOGIN_TARGET = p;
  txt($('personLoginTitle'), 'Hi '+(p.display_name||p.slug||'')+' 💕');
  txt($('personLoginSub'), 'Enter your card password, or requester edit password.');
  $('personPwError').classList.remove('show');
  $('personPwInput').value = '';
  show($('personLoginModal'));
  setTimeout(()=>$('personPwInput').focus(), 150);
};

/* Wire triple-click on home emoji */
document.addEventListener('DOMContentLoaded', ()=>{
  const el = $('homeEmoji');
  if(!el) return;
  el.addEventListener('click', ()=>{
    homeClickCount++;
    if(homeClickTimer) clearTimeout(homeClickTimer);
    if(homeClickCount>=3){ homeClickCount = 0; triggerAdminPrompt(); return; }
    homeClickTimer = setTimeout(()=>{ homeClickCount = 0; }, 600);
  });
});

/* Wire home intro collapse toggle */
document.addEventListener('DOMContentLoaded', ()=>{
  const box = $('homeIntro');
  const btn = $('homeIntroToggle');
  if(!box||!btn) return;
  const KEY = 'homeIntroCollapsed';
  try{
    if(localStorage.getItem(KEY)==='1'){ box.classList.add('collapsed'); btn.textContent='Show more 👇'; }
  }catch(e){}
  btn.onclick = ()=>{
    const isCollapsed = box.classList.toggle('collapsed');
    btn.textContent = isCollapsed ? 'Show more 👇' : 'Hide 👆';
    try{ localStorage.setItem(KEY, isCollapsed?'1':'0'); }catch(e){}
  };
});

/* Person login modal wiring */
document.addEventListener('DOMContentLoaded', ()=>{
  const cancelBtn = $('personPwCancel');
  const input = $('personPwInput');
  const confirmBtn = $('personPwConfirm');
  if(cancelBtn) cancelBtn.onclick = ()=> hide($('personLoginModal'));
  if(input) input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); window.tryPersonPw(); } });
  if(confirmBtn) confirmBtn.onclick = ()=> window.tryPersonPw();
});

window.tryPersonPw = async function(){
  const pw = $('personPwInput').value;
  const p = S.LOGIN_TARGET;
  if(!p) return;
  const adminPw = (S.CURR.shared && S.CURR.shared.adminPassword) || FALLBACK_ADMIN_PW;
  if(pw===adminPw || pw===FALLBACK_ADMIN_PW){
    hide($('personLoginModal'));
    await window.startAdmin();
    return;
  }
  const editPw = getEditPasswordForPerson(p);
  const isRequester = editPw && pw===editPw;
  const expected = p.password || '';
  const isViewer = expected && pw===expected;
  if(!isRequester && !isViewer){
    $('personPwError').textContent = getText('pwError', '❌ Incorrect password.');
    $('personPwError').classList.add('show');
    return;
  }
  hide($('personLoginModal'));
  S.REQUESTER_MODE = isRequester;
  await window.__loadPersonIntoState__(p);
  const s = S.CURR.shared || {};
  const unlockIso = s.unlockDateISO || '';
  const showLock = s.showLockScreen==='true';
  const now = new Date();
  const unlockDate = unlockIso ? new Date(unlockIso) : null;
  const locked = unlockDate && !isNaN(unlockDate) && now < unlockDate;
  $('homeScreen').classList.add('hidden');
  if(locked || showLock){
    window.renderLockFull();
    show($('lockScreen'));
    if(locked) window.startCountdownFull(unlockDate);
    else txt($('countdownLabelEl'), '');
    return;
  }
  window.openOpeningFull();
};

/* Wire lock screen button here so it exists */
document.addEventListener('DOMContentLoaded', ()=>{
  const b = $('openEarlyBtn');
  if(b) b.onclick = ()=> window.__openEarlyHandler__ && window.__openEarlyHandler__();
});

})();