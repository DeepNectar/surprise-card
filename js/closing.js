/* ============================================================
   closing.js — Closing modal + review flow
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;
let RV_STARS = 0;

function releaseBalloons(){
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pool = ['🎈','💖','💕','🌹','✨','🎀','🌸','💝'];
  for(let i = 0; i < 18; i++){
    const b = document.createElement('div');
    b.className = 'balloon';
    b.textContent = pool[Math.floor(Math.random() * pool.length)];
    b.style.left = (Math.random() * 100) + '%';
    b.style.fontSize = (1.6 + Math.random() * 1.6) + 'rem';
    b.style.animationDuration = (4.5 + Math.random() * 3) + 's';
    b.style.animationDelay = (Math.random() * 0.8) + 's';
    document.body.appendChild(b);
    setTimeout(() => b.remove(), 9000);
  }
}

window.openClosingModal = function(){
  const t = S.CURR.texts || {};
  txt($('closingTitleEl'), t.closeTitle || '💖 With Love');

  const parts = [t.close1, t.close2, t.close3, t.close4].filter(Boolean);
  const body = $('closingBody');
  if(body){
    body.innerHTML = parts.length
      ? parts.map(p => '<p style="margin-bottom:.8rem;">' + esc(p).replace(/\n/g, '<br>') + '</p>').join('')
      : '<p style="text-align:center;font-style:italic;color:var(--c-text-muted);">Thank you for watching 💕</p>';
  }

  txt($('closingSignoff'), t.closeSignoff || '');
  txt($('closingDoneBtn'), t.closeBtn || '💛 Continue');

  releaseBalloons();
  show($('closingModal'));
};

function advanceAfterClosing(){
  hide($('closingModal'));
  const p = S.CURRENT_PERSON;
  if(!p){ window.refreshPage(); return; }
  if(window.hasReviewFor && window.hasReviewFor(p.slug)){
    window.refreshPage();
    return;
  }
  window.openReviewModal();
}

window.goHomeClean = function(){
  try{ window.SS_clearTimers && window.SS_clearTimers(); }catch(e){}
  try{ window.SS_stopFloaters && window.SS_stopFloaters(); }catch(e){}
  try{ window.SS_isOpen && (window.SS_isOpen = false); }catch(e){}
  try{ window.__closeAllModals__ && window.__closeAllModals__(); }catch(e){}

  const a = $('audioPlayer');
  if(a){ a.pause(); a.currentTime = 0; }

  hide($('slideshowOverlay'));
  hide($('viewerScreen'));
  hide($('lockScreen'));
  hide($('openingScreen'));

  S.CARD_STARTED = false;
  S.PREVIEW_MODE = false;
  S.REQUESTER_MODE = false;
  S.CURRENT_PERSON = null;

  window.scrollTo(0, 0);
  const hs = $('homeScreen');
  if(hs) hs.classList.remove('hidden');
};

function paintReviewStars(n){
  document.querySelectorAll('#reviewStars .star').forEach(s => {
    s.classList.toggle('on', +s.dataset.v <= n);
  });
  const hint = $('reviewStarHint');
  if(hint){
    hint.textContent = n ? ('You rated ' + n + '/5 ' + '★'.repeat(n)) : 'Tap a star to rate';
  }
}

window.openReviewModal = function(){
  const p = S.CURRENT_PERSON;
  if(!p){ window.refreshPage(); return; }

  txt($('reviewForWho'),
    'Review for ' + (p.display_name || p.slug || '') +
    (p.slug ? ' · #' + p.slug : '') +
    (p.requester_name ? ' · Requested by ' + p.requester_name : ''));

  RV_STARS = 0;
  S.REVIEW_STARS = 0;
  paintReviewStars(0);

  const rm = $('reviewMessage'); if(rm) rm.value = '';
  const re = $('reviewEmail');   if(re) re.value = '';

  const st = $('reviewStatus');
  if(st){ st.textContent = ''; st.className = 'panel-status'; }

  show($('reviewModal'));
};

document.addEventListener('DOMContentLoaded', () => {
  const cc = $('closingClose');
  if(cc) cc.onclick = advanceAfterClosing;
  const cd = $('closingDoneBtn');
  if(cd) cd.onclick = advanceAfterClosing;

  document.querySelectorAll('#reviewStars .star').forEach(s => {
    s.onclick = () => {
      RV_STARS = +s.dataset.v;
      S.REVIEW_STARS = RV_STARS;
      paintReviewStars(RV_STARS);
    };
    s.onmouseenter = () => paintReviewStars(+s.dataset.v);
  });
  const stars = $('reviewStars');
  if(stars) stars.onmouseleave = () => paintReviewStars(RV_STARS);

  const submit = $('reviewSubmit');
  if(submit) submit.onclick = async () => {
    const st = $('reviewStatus');

    if(!RV_STARS){
      st.textContent = '❌ Please tap a star to rate.';
      st.className = 'panel-status err';
      return;
    }

    const msg = $('reviewMessage').value.trim();
    if(!msg){
      st.textContent = '❌ Review message is required.';
      st.className = 'panel-status err';
      return;
    }

    const email = $('reviewEmail').value.trim();
    if(email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      st.textContent = '❌ Invalid email.';
      st.className = 'panel-status err';
      return;
    }

    const p = S.CURRENT_PERSON;
    if(!p){
      st.textContent = '❌ No person to review.';
      st.className = 'panel-status err';
      return;
    }

    const reqName = p.requester_name || 'Admin';
    const row = {
      person_id: p.id || null,
      person_slug: p.slug || '',
      person_name: p.display_name || p.slug || '',
      requester_name: reqName,
      requester_wa: '',
      guest_id: null,
      stars: RV_STARS,
      message: msg,
      email: email || null
    };

    st.textContent = '⏳ Saving…';
    st.className = 'panel-status';

    try{
      await sb.upsertReview(row);
      st.textContent = '✅ Thank you! Refreshing…';
      st.className = 'panel-status ok';
      __showToast('💛 Review submitted');
      setTimeout(() => window.refreshPage(), 900);
    }catch(e){
      st.textContent = '❌ ' + (e.message || 'Could not save');
      st.className = 'panel-status err';
    }
  };
});

})();