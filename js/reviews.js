/* ============================================================
   reviews.js — Home review rendering + admin review list
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

window.starsHtml = function(n){
  let s = '';
  for(let i=1;i<=5;i++) s += `<span style="color:${i<=n?'#ffb703':'#ddd'};">★</span>`;
  return s;
};

window.renderHomeReviews = function(){
  const wrap = $('homeReviews'), list = $('homeReviewsList'), moreWrap = $('homeReviewsMore');
  if(!wrap||!list) return;
  const revs = S.REVIEWS || [];
  if(!revs.length){ wrap.style.display='none'; return; }
  wrap.style.display = 'block';
  const lim = S.HOME_REVIEW_LIMIT;
  const shown = revs.slice(0, lim);
  list.innerHTML = shown.map(r=>{
    const stars = Math.max(1, Math.min(5, parseInt(r.stars)||0));
    const personLabel = (r.person_name||r.person_slug||'');
    const personId = r.person_slug ? ('#'+r.person_slug) : '';
    const req = r.requester_name || 'Admin';
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
    return `<div class="hr-item">
      <div class="hr-stars">${starsHtml(stars)}</div>
      <div class="hr-line"><strong>Person:</strong> ${(personLabel||'').replace(/</g,'&lt;')} ${personId?('<span style="opacity:.7;font-family:monospace;font-size:.75rem;">'+personId.replace(/</g,'&lt;')+'</span>'):''}</div>
      <div class="hr-line"><strong>Requested by:</strong> ${String(req).replace(/</g,'&lt;')}</div>
      <div class="hr-msg">"${String(r.message||'').replace(/</g,'&lt;')}"</div>
      <div class="hr-meta">${date?date:''}</div>
    </div>`;
  }).join('');
  moreWrap.style.display = (revs.length>lim) ? 'block' : 'none';
};

window.loadReviews = async function(){
  S.REVIEWS = await sb.reviews() || [];
  renderHomeReviews();
  if(S.ADMIN_MODE && window.renderAdminReviews) renderAdminReviews();
};

window.hasReviewFor = function(slug){
  if(!slug) return false;
  const low = slug.toLowerCase();
  return (S.REVIEWS||[]).some(r=>r.person_slug && r.person_slug.toLowerCase()===low);
};

document.addEventListener('DOMContentLoaded', ()=>{
  const btn = $('homeReviewsMoreBtn');
  if(btn) btn.onclick = ()=>{ S.HOME_REVIEW_LIMIT += 10; renderHomeReviews(); };
});

})();