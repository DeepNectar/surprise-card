/* ============================================================
   fireworks.js — Click-triggered firework bursts
   ============================================================ */
(function(){
'use strict';

const FW_COLORS = ['#8b0028','#c41e3a','#ffd700','#ffed4e','#d4a373','#ffe0e6','#ff69b4','#ff8a3d','#2a5fd1','#9d4edd'];

window.fireworksBurst = function(x,y){
  if(getShared('enableFireworks','true')!=='true') return;
  for(let i=0;i<26;i++){
    const p = document.createElement('div');
    p.className = 'firework';
    p.style.left = x+'px'; p.style.top = y+'px';
    p.style.backgroundColor = FW_COLORS[Math.floor(Math.random()*FW_COLORS.length)];
    const a = (i/26)*Math.PI*2 + Math.random()*0.3;
    const d = 60 + Math.random()*120;
    p.style.setProperty('--tx', Math.cos(a)*d+'px');
    p.style.setProperty('--ty', Math.sin(a)*d+'px');
    p.style.animationDuration = (0.9+Math.random()*0.7)+'s';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 1700);
  }
};

document.addEventListener('click', (e)=>{
  const t = e.target;
  if(t.closest('button, a, input, textarea, select, .gift-box, .modal, .panel-modal, .pw-modal, .lock-screen, .opening-screen, .cake-clickable, .home-screen, .info-modal, .slideshow-overlay, .lang-mini-tabs, .person-card')) return;
  fireworksBurst(e.clientX, e.clientY);
});

})();