/* ============================================================
   music.js — Music playback controller
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;
let MUSIC_ON = false;
let CURR_CTX = 'card';
let CURR_LIST = [];
let CURR_IDX = -1;

window.getVol = function(ctx){
  const s = S.CURR.shared || {};
  if(ctx === 'video')     return parseFloat(s.vol_video) || 1.0;
  if(ctx === 'slideshow') return parseFloat(s.vol_slide) || 0.85;
  return parseFloat(s.vol_card) || 0.45;
};

window.buildPlaylistFor = function(ctx){
  const s = S.CURR.shared || {};
  const mode = s.music_mode || 'both';
  if(mode === 'card' && ctx === 'slideshow') return [];
  if(mode === 'slideshow' && ctx === 'card') return [];

  const base = [];
  for(let i = 1; i <= 5; i++){
    const on = String(s['song' + i + '_on']) === 'true';
    const url = (s['song' + i + '_url'] || '').trim();
    const w = s['song' + i + '_where'] || 'both';
    if(!on || !url) continue;
    if(w === 'both' || w === ctx) base.push(url);
  }

  const orderStr = (s.musicOrder || '').trim();
  if(orderStr && base.length > 1){
    const idxs = orderStr.split(',')
      .map(x => parseInt(x, 10))
      .filter(x => !isNaN(x) && x >= 0 && x < base.length);
    if(idxs.length === base.length){
      const seen = new Set();
      const out = [];
      idxs.forEach(i => {
        if(!seen.has(i)){ seen.add(i); out.push(base[i]); }
      });
      base.forEach((u, i) => { if(!seen.has(i)) out.push(u); });
      return out;
    }
  }
  return base;
};

window.playNext = function(){
  if(!CURR_LIST.length) return;
  CURR_IDX = (CURR_IDX + 1) % CURR_LIST.length;

  const a = $('audioPlayer');
  if(!a) return;
  a.src = CURR_LIST[CURR_IDX];
  a.volume = window.getVol(CURR_CTX);
  a.play()
    .then(() => {
      MUSIC_ON = true;
      const mt = $('musicToggle');
      if(mt) mt.textContent = '🔊';
    })
    .catch(() => {
      MUSIC_ON = false;
      const mt = $('musicToggle');
      if(mt) mt.textContent = '🔇';
    });
};

window.startMusicFor = function(ctx){
  const list = buildPlaylistFor(ctx);
  const mt = $('musicToggle');
  if(mt) mt.classList.toggle('visible', list.length > 0);

  if(!list.length){
    const a = $('audioPlayer');
    if(a) a.pause();
    MUSIC_ON = false;
    if(mt) mt.textContent = '🔇';
    return;
  }

  const a = $('audioPlayer');
  if(CURR_CTX === ctx && MUSIC_ON && a && !a.paused) return;

  CURR_CTX = ctx;
  CURR_LIST = list;
  CURR_IDX = -1;
  playNext();
};

window.stopMusic = function(){
  const a = $('audioPlayer');
  if(a){
    try{
      a.pause();
      a.currentTime = 0;
      a.removeAttribute('src');
      a.load();
    }catch(e){}
  }
  MUSIC_ON = false;
  CURR_LIST = [];
  CURR_IDX = -1;
  const mt = $('musicToggle');
  if(mt) mt.textContent = '🔇';
};

document.addEventListener('DOMContentLoaded', () => {
  const a = $('audioPlayer');
  if(a) a.addEventListener('ended', () => { if(MUSIC_ON) playNext(); });

  const mt = $('musicToggle');
  if(mt) mt.onclick = () => {
    const a = $('audioPlayer');
    if(!a) return;
    if(MUSIC_ON && !a.paused){
      a.pause();
      MUSIC_ON = false;
      mt.textContent = '🔇';
    } else {
      MUSIC_ON = true;
      a.play().catch(() => {});
      mt.textContent = '🔊';
    }
  };
});

})();