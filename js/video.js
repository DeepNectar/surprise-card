/* ============================================================
   video.js — Video message playback
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;
let VM_CURRENT = null;

document.addEventListener('DOMContentLoaded', ()=>{
  const btn = $('videoMsgBtn');
  if(!btn) return;
  btn.onclick = ()=>{
    if(!S.CURR.video || !S.CURR.video.length) return;
    if(VM_CURRENT){
      try{ const v = VM_CURRENT.querySelector('video'); if(v){ v.pause(); v.currentTime = 0; v.src = ''; } }catch(e){}
      VM_CURRENT.remove(); VM_CURRENT = null;
    }
    const m = document.createElement('div');
    m.className = 'info-modal active';
    m.innerHTML = `<div class="info-content vm-modal-content">
      <button class="info-close" id="vmClose">✕</button>
      <div class="info-title">${(S.CURR.video[0].title||'A message').replace(/</g,'&lt;')}</div>
      <video src="${S.CURR.video[0].video_url}" controls playsinline autoplay class="vm-video"></video>
    </div>`;
    document.body.appendChild(m);
    VM_CURRENT = m;
    const vid = m.querySelector('video');
    const closeVM = ()=>{
      try{ vid.pause(); vid.currentTime = 0; vid.removeAttribute('src'); vid.load(); }catch(e){}
      m.remove();
      if(VM_CURRENT===m) VM_CURRENT = null;
    };
    vid.addEventListener('ended', closeVM);
    vid.addEventListener('error', ()=>{ setTimeout(closeVM, 600); });
    m.querySelector('#vmClose').onclick = closeVM;
    m.addEventListener('click', (e)=>{ if(e.target===m) closeVM(); });
    const p = vid.play();
    if(p && p.catch) p.catch(()=>{ vid.muted = true; vid.play().catch(()=>{}); });
  };
});

})();