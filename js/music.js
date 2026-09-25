/* ============================================================
   music.js — Music playback (card + slideshow contexts)
   Music is advanced ONLY by the 'ended' event on the audio
   element. Nothing else in the codebase should reload a.src
   or call playNext() except on genuine user actions.
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;
let MUSIC_ON = false, CURR_CTX = 'card', CURR_LIST = [], CURR_IDX = -1;

window.getVol = function(ctx){
  const s = S.CURR.shared || {};
  if(ctx==='video') return parseFloat(s.vol_video)||1.0;
  if(ctx==='slideshow') return parseFloat(s.vol_slide)||0.85;
  return parseFloat(s.vol_card)||0.45;
};

window.buildPlaylistFor = function(ctx){
  const s = S.CURR.shared || {};
  const mode = s.music_mode || 'both';
  if(mode==='card' && ctx==='slideshow') return [];
  if(mode==='slideshow' && ctx==='card') return [];
  const base = [];
  for(let i=1;i<=5;i++){
    const on = String(s['song'+i+'_on'])==='true';
    const url = (s['song'+i+'_url']||'').trim();
    const w = s['song'+i+'_where']||'both';
    if(!on||!url) continue;
    if(w==='both'||w===ctx) base.push(url);
  }
  return base; /* ✅ Always play in the order entered — no shuffle */
};

/* ✅ The ONLY place a new song starts. Called from:
   1. startMusicFor() when first starting a context.
   2. the 'ended' event.
   Never from slideshow.js. */
window.playNext = function(){
  if(!CURR_LIST.length) return;
  CURR_IDX = (CURR_IDX+1)%CURR_LIST.length;
  const a = $('audioPlayer');
  a.src = CURR_LIST[CURR_IDX];
  a.volume = window.getVol(CURR_CTX);
  a.play().then(()=>{
    MUSIC_ON = true;
    $('musicToggle').textContent = '🔊';
  }).catch(()=>{
    MUSIC_ON = false;
    $('musicToggle').textContent = '🔇';
  });
};

/* ✅ Expose a way for slideshow.js to update the shared CURR_CTX / CURR_LIST
   WITHOUT reloading the audio element. Keeps CURR_IDX pointing to the
   currently loaded song so the next 'ended' advances to the correct next track. */
window.__setCurrCtx__ = function(ctx, list){
  CURR_CTX = ctx;
  if(Array.isArray(list) && list.length){
    CURR_LIST = list.slice();
    const a = $('audioPlayer');
    if(a && a.src){
      const curIdx = CURR_LIST.findIndex(u => a.src.indexOf(u) !== -1 || u.indexOf(a.src) !== -1);
      CURR_IDX = curIdx >= 0 ? curIdx : 0;
    } else {
      CURR_IDX = 0;
    }
  }
};

window.startMusicFor = function(ctx){
  const list = buildPlaylistFor(ctx);
  $('musicToggle').classList.toggle('visible', list.length>0);
  if(!list.length){
    if(CURR_CTX!==ctx){
      const a = $('audioPlayer');
      if(a && !a.paused) a.pause();
      MUSIC_ON = false;
      $('musicToggle').textContent = '🔇';
    }
    return;
  }
  /* ✅ If the SAME list is already playing, do NOTHING — don't restart. */
  const sameList = CURR_LIST.length===list.length && CURR_LIST.every((u,i)=>u===list[i]);
  if(CURR_CTX===ctx && sameList && MUSIC_ON && !$('audioPlayer').paused) return;

  /* If context changed but the currently playing song is already in the new list,
     just adopt the new list/context without restarting the song. */
  const a = $('audioPlayer');
  if(a && a.src && !a.paused && CURR_CTX!==ctx){
    const curIdx = list.findIndex(u => a.src.indexOf(u) !== -1 || u.indexOf(a.src) !== -1);
    if(curIdx >= 0){
      CURR_CTX = ctx;
      CURR_LIST = list;
      CURR_IDX = curIdx;
      a.volume = window.getVol(ctx);
      return;
    }
  }

  /* Otherwise start fresh. */
  CURR_CTX = ctx; CURR_LIST = list; CURR_IDX = -1;
  playNext();
};

document.addEventListener('DOMContentLoaded', ()=>{
  const a = $('audioPlayer');
  /* ✅ The ONLY event that advances to the next song. */
  if(a) a.addEventListener('ended', ()=>{ if(MUSIC_ON) playNext(); });
  const mt = $('musicToggle');
  if(mt) mt.onclick = ()=>{
    const a = $('audioPlayer');
    if(MUSIC_ON && !a.paused){ a.pause(); MUSIC_ON = false; mt.textContent = '🔇'; }
    else { MUSIC_ON = true; a.play().catch(()=>{}); mt.textContent = '🔊'; }
  };
});

})();