/* ============================================================
   opening.js — Cake opening screen
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

window.openOpeningFull = function(){
  txt($('openLine1El'), getText('openLine1','A special day…'));
  txt($('openLine2El'), getText('openLine2','Happy Birthday!'));
  txt($('cakeHintEl'), getText('cakeHint','Tap the cake to open 💕'));
  hide($('viewerScreen'));
  S.CARD_STARTED = false;
  $('openingScreen').classList.remove('hidden');
  show($('openingScreen'));
};

document.addEventListener('DOMContentLoaded', ()=>{
  const cake = $('cakeClickable');
  if(!cake) return;
  cake.onclick = async ()=>{
    $('openingScreen').classList.add('hidden');
    setTimeout(()=>hide($('openingScreen')), 800);
    if(!S.CURRENT_PERSON) return;
    window.showViewerFor(S.CURRENT_PERSON, true);
  };
});

})();