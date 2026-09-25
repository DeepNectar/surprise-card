/* ============================================================
   voice.js — Voice message playback
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

document.addEventListener('DOMContentLoaded', ()=>{
  const btn = $('voicePlayBtn');
  if(!btn) return;
  btn.onclick = ()=>{
    if(!S.CURR.voice || !S.CURR.voice.length) return;
    const a = $('audioPlayer');
    if(a.src===S.CURR.voice[0].audio_url && !a.paused){ a.pause(); return; }
    a.src = S.CURR.voice[0].audio_url || '';
    a.volume = parseFloat((S.CURR.shared||{}).vol_card||'0.45') || 0.45;
    a.play().catch(()=>{});
  };
});

})();