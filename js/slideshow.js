/* ============================================================
   slideshow.js — Full-screen memories slideshow
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

let SS = [], SS_IDX = 0, SS_T = null, SS_VIDEO_TIMER = null, SS_TX_T = null;
let SS_isOpen = false;
let SS_musicDucked = false;
let SS_touchSX = 0, SS_touchSY = 0;
let SS_floaterTimer = null;
let SS_rafId = null;
let SS_timerToken = 0;
let SS_lastVisibilityChange = 0;
let SS_ownPlaylist = [];
let SS_ownIdx = -1;

const SS_PHOTO_EFFECTS = ['fx-ken-in','fx-ken-out','fx-pan-lr','fx-pan-rl','fx-pan-tb','fx-rotate','fx-fade','fx-blur','fx-scale-down'];
const SS_VIDEO_EFFECTS = ['vfx-fade','vfx-zoom','vfx-slide-right','vfx-blur'];
const SS_FLOAT_EMOJI = ['❤️','💕','✨','🌹','💖','🌸','⭐','💛','🎀','🕊️','🦋','💫','🌷','🎊','💗','🎈'];

window.SS_clearTimers = function(){
  if(SS_T){ clearTimeout(SS_T); SS_T = null; }
  if(SS_VIDEO_TIMER){ clearTimeout(SS_VIDEO_TIMER); SS_VIDEO_TIMER = null; }
  if(SS_TX_T){ clearTimeout(SS_TX_T); SS_TX_T = null; }
  if(SS_rafId){ cancelAnimationFrame(SS_rafId); SS_rafId = null; }
  SS_timerToken++;
};

function SS_photoDurationMs(){
  const v = clampDuration((S.CURR.shared||{}).photoDurationSec||'5', 5, 1, 60);
  return v * 1000;
}
function SS_effectsEnabled(){
  const s = S.CURR.shared || {};
  const v = s.slideEffectsEnabled;
  return v===undefined ? true : String(v)!=='false';
}
function SS_effectsIntensity(){
  const v = parseFloat((S.CURR.shared||{}).effectsIntensity||'1');
  if(!isFinite(v)||v<=0) return 1;
  return Math.max(0.5, Math.min(1.6, v));
}
function SS_floatersEnabled(){
  const s = S.CURR.shared || {};
  const v = s.floatersEnabled;
  return v===undefined ? true : String(v)!=='false';
}
function SS_floaterDensity(){
  const v = parseInt((S.CURR.shared||{}).floaterDensity||'1', 10);
  if(isNaN(v)) return 1;
  return Math.max(0, Math.min(2, v));
}
function SS_resetVideo(v){ try{ v.pause(); v.currentTime = 0; v.muted = true; v.volume = 0; }catch(e){} }
function SS_playVideo(v, unmuteBtn){
  try{ v.currentTime = 0; }catch(e){}
  v.muted = false; v.volume = 1;
  const p = v.play();
  if(p && p.then){
    p.then(()=>{ if(unmuteBtn) unmuteBtn.classList.remove('show'); })
     .catch(()=>{
       v.muted = true;
       const p2 = v.play();
       if(p2 && p2.then){ p2.then(()=>{ if(unmuteBtn) unmuteBtn.classList.add('show'); }).catch(()=>{ if(unmuteBtn) unmuteBtn.classList.add('show'); }); }
       else { if(unmuteBtn) unmuteBtn.classList.add('show'); }
     });
  }else{ if(unmuteBtn) unmuteBtn.classList.add('show'); }
}
function SS_fadeMusic(target, duration){
  const a = $('audioPlayer'); if(!a) return;
  if(a.paused && target>0 && a.src){ a.play().catch(()=>{}); }
  const start = a.volume;
  if(Math.abs(start-target)<0.01){ a.volume = target; return; }
  const steps = Math.max(1, Math.round((duration||400)/30));
  let i = 0;
  if(a._ssFadeTimer) clearInterval(a._ssFadeTimer);
  a._ssFadeTimer = setInterval(()=>{
    i++;
    const t = i/steps;
    a.volume = Math.max(0, Math.min(1, start+(target-start)*t));
    if(i>=steps){ clearInterval(a._ssFadeTimer); a._ssFadeTimer = null; a.volume = target; }
  }, 30);
}
function SS_normalMusicVol(){ return window.getVol('slideshow'); }
function SS_duckedMusicVol(){ return Math.max(0.05, SS_normalMusicVol()*0.35); }

function SS_ensureMusicPlaying(){
  const a = $('audioPlayer'); if(!a) return;
  const mode = (S.CURR.shared||{}).music_mode || 'both';
  if(mode==='card') return;
  const ssList = window.buildPlaylistFor('slideshow');
  const cardList = window.buildPlaylistFor('card');
  let wantList;
  if(mode==='slideshow') wantList = ssList;
  else wantList = (ssList && ssList.length) ? ssList : cardList;
  if(!wantList || !wantList.length) return;
  const sameList = SS_ownPlaylist && SS_ownPlaylist.length===wantList.length && SS_ownPlaylist.every((u,i)=>u===wantList[i]);
  if(sameList && SS_ownIdx>=0 && a.src && !a.paused){
    a.volume = window.getVol('slideshow');
    return;
  }
  SS_ownPlaylist = wantList;
  SS_ownIdx = 0;
  window.__setCurrCtx__ && window.__setCurrCtx__('slideshow', wantList);
  a.volume = window.getVol(ssList.length ? 'slideshow' : 'card');
  a.loop = false;
  a.src = wantList[0];
  try{ a.currentTime = 0; }catch(e){}
  a.play().then(()=>{
    const mt = $('musicToggle');
    if(mt){ mt.textContent='🔊'; mt.classList.add('visible'); }
  }).catch(()=>{});
}

function SS_advanceMusicOnSlideChange(){
  const mode = (S.CURR.shared||{}).music_mode || 'both';
  if(mode==='card') return;
  const a = $('audioPlayer'); if(!a) return;
  const ssList = window.buildPlaylistFor('slideshow');
  const cardList = window.buildPlaylistFor('card');
  let wantList;
  if(mode==='slideshow') wantList = ssList;
  else wantList = (ssList && ssList.length) ? ssList : cardList;
  if(!wantList || wantList.length<2) return;
  SS_ownPlaylist = wantList;
  SS_ownIdx = (SS_ownIdx+1)%wantList.length;
  a.src = wantList[SS_ownIdx];
  a.volume = window.getVol('slideshow');
  a.play().then(()=>{
    const mt = $('musicToggle'); if(mt){ mt.textContent='🔊'; mt.classList.add('visible'); }
  }).catch(()=>{});
}

function SS_applySavedMediaOrder(rows){
  const s = S.CURR.shared || {};
  const base = (rows||[]).slice();
  if(String(s.shuffleMediaOn)!=='true') return base;
  const orderStr = (s.mediaOrder||'').trim();
  if(!orderStr || base.length<2) return base;
  const idxs = orderStr.split(',').map(x=>parseInt(x,10)).filter(x=>!isNaN(x) && x>=0 && x<base.length);
  if(idxs.length!==base.length) return base;
  const seen = new Set(); const out = [];
  idxs.forEach(i=>{ if(!seen.has(i)){ seen.add(i); out.push(base[i]); } });
  base.forEach((r,i)=>{ if(!seen.has(i)) out.push(r); });
  return out;
}
function SS_movePhotoFirst(arr){
  if(!arr||!arr.length) return arr||[];
  const pi = arr.findIndex(r=>r.type!=='video');
  if(pi<=0) return arr;
  const out = arr.slice();
  const [p] = out.splice(pi,1);
  out.unshift(p);
  return out;
}

function SS_startFloaters(){
  const layer = $('ssFloaterLayer'); if(!layer) return;
  layer.innerHTML = '';
  if(!SS_floatersEnabled()) return;
  const density = SS_floaterDensity();
  if(density===0) return;
  const perSpawn = density===1 ? 2 : 3;
  const spawnEveryMs = density===1 ? 900 : 500;
  const seedCount = density===1 ? 12 : 20;
  const spawn = ()=>{
    if(!SS_isOpen) return;
    if(!SS_floatersEnabled()) return;
    for(let k=0;k<perSpawn;k++){
      const s = document.createElement('span');
      s.className = 'ss-floater';
      s.textContent = SS_FLOAT_EMOJI[Math.floor(Math.random()*SS_FLOAT_EMOJI.length)];
      s.style.left = (Math.random()*100)+'%';
      s.style.fontSize = (1.0 + Math.random()*1.6)+'rem';
      const dur = (8 + Math.random()*9) * (density===2 ? 0.7 : 1);
      s.style.animationDuration = dur+'s';
      s.style.animationDelay = (Math.random()*1.5)+'s';
      layer.appendChild(s);
      setTimeout(()=>{ if(s.parentNode) s.parentNode.removeChild(s); }, (dur+2)*1000);
    }
  };
  for(let i=0;i<seedCount;i++) setTimeout(spawn, i*(spawnEveryMs/seedCount));
  SS_floaterTimer = setInterval(spawn, spawnEveryMs);
}
window.SS_stopFloaters = function(){
  if(SS_floaterTimer){ clearInterval(SS_floaterTimer); SS_floaterTimer = null; }
  const layer = $('ssFloaterLayer'); if(layer) layer.innerHTML = '';
};

function SS_pickPhotoEffect(){ return SS_PHOTO_EFFECTS[Math.floor(Math.random()*SS_PHOTO_EFFECTS.length)]; }
function SS_pickVideoEffect(){ return SS_VIDEO_EFFECTS[Math.floor(Math.random()*SS_VIDEO_EFFECTS.length)]; }
function SS_applyIntensity(el){
  const inten = SS_effectsIntensity();
  const base = SS_photoDurationMs() + 2000;
  const dur = Math.max(2500, Math.round(base / inten));
  el.style.setProperty('--fx-dur', dur+'ms');
}

function SS_loadSlideImage(idx){
  const t = $('slidesTrack'); if(!t) return;
  const slideEl = t.children[idx]; if(!slideEl) return;
  const s = SS[idx];
  if(!s || s.type==='video') return;
  const img = slideEl.querySelector('img.fx-target'); if(!img) return;
  if(img.dataset.loaded==='1') return;
  if(!s.drive_id) return;
  img.dataset.loaded = '1';
  img.src = driveImg(s.drive_id, 2400);
  img.onerror = ()=>{ img.src = 'https://drive.google.com/thumbnail?id='+s.drive_id+'&sz=w'+(window.innerWidth < 700 ? 1200 : 2400); };
}
function SS_preloadAhead(){
  SS_loadSlideImage(SS_IDX);
  SS_loadSlideImage((SS_IDX+1)%SS.length);
  SS_loadSlideImage((SS_IDX+2)%SS.length);
  const t = $('slidesTrack'); if(!t) return;
  Array.from(t.children).forEach((slideEl,i)=>{
    const dist = Math.min(Math.abs(i-SS_IDX), SS.length-Math.abs(i-SS_IDX));
    if(dist>3){
      const img = slideEl.querySelector('img.fx-target');
      if(img && img.dataset.loaded==='1'){ img.removeAttribute('src'); img.dataset.loaded = '0'; }
    }
  });
}

window.SS_saveSession = function(){
  try{
    if(S.CURRENT_PERSON && S.CURRENT_PERSON.slug){
      sessionStorage.setItem('active_person_slug', S.CURRENT_PERSON.slug);
      sessionStorage.setItem('active_view', 'viewer');
    }
  }catch(e){}
};
window.SS_clearSession = function(){
  try{ sessionStorage.removeItem('active_person_slug'); sessionStorage.removeItem('active_view'); }catch(e){}
};
window.SS_restoreSession = function(){
  try{
    const slug = sessionStorage.getItem('active_person_slug');
    const view = sessionStorage.getItem('active_view');
    if(!slug || view!=='viewer') return false;
    const p = S.PEOPLE.find(x=>x.slug===slug);
    if(!p) return false;
    S.CURRENT_PERSON = p;
    window.__loadPersonIntoState__(p).then(()=>{
      $('homeScreen').classList.add('hidden');
      show($('viewerScreen'));
      S.PREVIEW_MODE = false;
      S.REQUESTER_MODE = false;
      $('viewerPreviewTag').style.display = 'none';
      $('viewerEditCardBtn').classList.remove('visible');
      $('musicToggle').classList.toggle('visible', window.buildPlaylistFor('card').length>0);
      $('langToggle').classList.toggle('visible', true);
      window.renderCardFull();
      window.startCard();
      window.scrollTo(0,0);
    }).catch(()=>{});
    return true;
  }catch(e){ return false; }
};

function SS_buildSlides(){
  const t = $('slidesTrack'); t.innerHTML = '';
  const dots = $('slideshowDots'); if(dots) dots.innerHTML = '';
  SS.forEach((s,i)=>{
    const d = document.createElement('div');
    d.className = 'slide' + (s.type==='video' ? ' video-slide' : '');
    d.dataset.i = i;
    if(s.type==='video'){
      const v = document.createElement('video');
      v.src = s.src;
      v.playsInline = true;
      v.setAttribute('playsinline','');
      v.setAttribute('webkit-playsinline','');
      v.preload = 'metadata';
      v.setAttribute('disablepictureinpicture','');
      v.muted = true;
      d.appendChild(v);
      const ub = document.createElement('button');
      ub.className = 'unmute-btn'; ub.type = 'button'; ub.textContent = '🔊 Tap for sound';
      ub.setAttribute('aria-label','Unmute video');
      const doUnmute = (e)=>{
        e.preventDefault(); e.stopPropagation();
        v.muted = false; v.volume = 1;
        const p = v.play();
        if(p && p.then) p.then(()=>{ ub.classList.remove('show'); }).catch(()=>{});
      };
      ub.addEventListener('click', doUnmute);
      ub.addEventListener('touchstart', doUnmute, {passive:false});
      d.appendChild(ub);
      v.addEventListener('ended', ()=>{
        if(SS_isOpen && SS[SS_IDX]===s){ SS_clearTimers(); SS_next(); }
      });
      v.addEventListener('error', ()=>{
        if(SS_isOpen && SS[SS_IDX]===s){ SS_clearTimers(); setTimeout(()=>{ if(SS_isOpen) SS_next(); }, 800); }
      });
    }else{
      const img = document.createElement('img');
      img.className = 'fx-target';
      img.decoding = 'async';
      img.dataset.loaded = '0';
      d.appendChild(img);
    }
    t.appendChild(d);
    if(dots){
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.dataset.i = i;
      dot.onclick = ()=>{ SS_IDX = i; SS_updateSlide(); };
      dots.appendChild(dot);
    }
  });
}

function SS_applyEffectToCurrent(){
  const t = $('slidesTrack');
  const cur = SS[SS_IDX];
  const slideEl = t.children[SS_IDX];
  if(!cur || !slideEl) return;
  SS_PHOTO_EFFECTS.forEach(c=>slideEl.classList.remove(c));
  SS_VIDEO_EFFECTS.forEach(c=>slideEl.classList.remove(c));
  if(!SS_effectsEnabled()) return;
  if(cur.type==='video'){
    const fx = SS_pickVideoEffect();
    slideEl.classList.add(fx);
    const v = slideEl.querySelector('video');
    if(v){ v.style.animation='none'; void v.offsetWidth; v.style.animation=''; }
  }else{
    const fx = SS_pickPhotoEffect();
    slideEl.classList.add(fx);
    SS_applyIntensity(slideEl);
    const img = slideEl.querySelector('img.fx-target');
    if(img){ img.style.animation='none'; void img.offsetWidth; img.style.animation=''; }
  }
}

function SS_animateTrackTo(){
  const t = $('slidesTrack');
  t.style.transition = 'transform .55s cubic-bezier(.7,0,.2,1)';
  t.style.transform = `translateX(-${SS_IDX*100}%)`;
}

function SS_updateSlide(){
  const t = $('slidesTrack');
  SS_animateTrackTo();
  txt($('slideshowCounter'), (SS_IDX+1)+' / '+SS.length);
  const dots = $('slideshowDots');
  if(dots) dots.querySelectorAll('.dot').forEach((el,i)=>el.classList.toggle('active', i===SS_IDX));
  SS_clearTimers();
  Array.from(t.children).forEach((slideEl,i)=>{
    if(i!==SS_IDX){
      const v = slideEl.querySelector('video'); if(v) SS_resetVideo(v);
      const ub = slideEl.querySelector('.unmute-btn'); if(ub) ub.classList.remove('show');
    }
  });
  const cur = SS[SS_IDX];
  const slideEl = t.children[SS_IDX];
  if(!cur || !slideEl) return;
  SS_applyEffectToCurrent();

  if(cur.type==='video'){
    if(SS_musicDucked!==true){ SS_fadeMusic(SS_duckedMusicVol(), 300); SS_musicDucked = true; }
    const v = slideEl.querySelector('video');
    const ub = slideEl.querySelector('.unmute-btn');
    if(v){
      const tryPlay = ()=>{ SS_playVideo(v, ub); };
      if(v.readyState>=1) tryPlay();
      else v.addEventListener('loadedmetadata', tryPlay, {once:true});
    }
    const pb = $('slideshowProgress');
    if(pb){ pb.style.transition='none'; pb.style.width='0%'; }
  }else{
    const a = $('audioPlayer');
    const mode = (S.CURR.shared||{}).music_mode || 'both';
    if(a && mode!=='card'){
      if(a.paused || !a.src){
        if(a.src){ a.play().catch(()=>{}); }
        else { SS_ensureMusicPlaying(); }
      } else {
        SS_advanceMusicOnSlideChange();
      }
    }
    if(SS_musicDucked!==false){ SS_fadeMusic(SS_normalMusicVol(), 300); SS_musicDucked = false; }

    SS_preloadAhead();

    const img = slideEl.querySelector('img.fx-target');
    const myToken = SS_timerToken;
    const curSlideRef = cur;

    const startTimer = ()=>{
      if(!SS_isOpen) return;
      if(SS[SS_IDX]!==curSlideRef) return;
      if(SS_timerToken!==myToken) return;
      const dur = SS_photoDurationMs();
      const pb = $('slideshowProgress');
      if(pb){
        pb.style.transition='none'; pb.style.width='0%';
        void pb.offsetWidth;
        pb.style.transition = 'width '+dur+'ms linear';
        pb.style.width = '100%';
      }
      SS_T = setTimeout(()=>{
        if(!SS_isOpen) return;
        if(SS[SS_IDX]!==curSlideRef) return;
        if(SS_timerToken!==myToken) return;
        SS_next();
      }, dur);
    };

    if(img && !img.complete){
      img.addEventListener('load', startTimer, {once:true});
      img.addEventListener('error', startTimer, {once:true});
      setTimeout(startTimer, 6000);
    }else{
      startTimer();
    }
  }
}

function SS_next(){
  if(!SS.length){ SS_close(); return; }
  SS_IDX = (SS_IDX+1)%SS.length;
  SS_updateSlide();
}
function SS_prev(){
  if(!SS.length) return;
  SS_IDX = (SS_IDX-1+SS.length)%SS.length;
  SS_updateSlide();
}
function SS_close(){
  SS_isOpen = false;
  hide($('slideshowOverlay'));
  SS_clearTimers();
  window.SS_stopFloaters();
  const t = $('slidesTrack');
  if(t) Array.from(t.children).forEach(slideEl=>{
    const v = slideEl.querySelector('video'); if(v) SS_resetVideo(v);
    const ub = slideEl.querySelector('.unmute-btn'); if(ub) ub.classList.remove('show');
    const img = slideEl.querySelector('img.fx-target'); if(img){ img.removeAttribute('src'); img.dataset.loaded='0'; }
  });
  if(t) t.innerHTML = '';
  const dots = $('slideshowDots'); if(dots) dots.innerHTML = '';
  const pb = $('slideshowProgress'); if(pb){ pb.style.transition='none'; pb.style.width='0%'; }
  SS_musicDucked = false;
  SS_ownPlaylist = []; SS_ownIdx = -1;
  const a = $('audioPlayer');
  if(a){ a.volume = window.getVol('card'); }
  if(typeof window.startMusicFor==='function') window.startMusicFor('card');
  if(!S.PREVIEW_MODE && S.CURRENT_PERSON) window.openClosingModal();
}

document.addEventListener('DOMContentLoaded', ()=>{
  const openBtn = $('openBtn');
  if(openBtn) openBtn.onclick = async ()=>{
    if(!S.CURRENT_PERSON){ alert('No person selected.'); return; }
    const rows = await sb.rows(T_MEDIA, S.CURRENT_PERSON.id) || [];
    const filtered = (rows||[]).filter(r=>(r.type==='video' && r.src) || (r.type==='photo' && r.drive_id));
    if(!filtered.length){ alert('No memories yet 💕'); return; }
    const ordered = SS_applySavedMediaOrder(filtered);
    SS = SS_movePhotoFirst(ordered);
    SS_IDX = 0;
    window.SS_saveSession();
    SS_buildSlides();
    show($('slideshowOverlay'));
    SS_isOpen = true;
    SS_musicDucked = false;

    SS_ensureMusicPlaying();

    const kick = ()=>{ if(SS_isOpen) SS_ensureMusicPlaying(); };
    const ov = $('slideshowOverlay');
    if(ov){
      ov.addEventListener('touchstart', kick, {once:true, passive:true});
      ov.addEventListener('mousedown', kick, {once:true});
      ov.addEventListener('click', kick, {once:true});
    }
    SS_startFloaters();
    SS_updateSlide();
    SS_ensureMusicPlaying();
  };

  const prevBtn = $('slideshowPrev'); if(prevBtn) prevBtn.onclick = SS_prev;
  const nextBtn = $('slideshowNext'); if(nextBtn) nextBtn.onclick = SS_next;
  const closeBtn = $('slideshowClose'); if(closeBtn) closeBtn.onclick = SS_close;

  const sc = $('slideshowContainer');
  if(sc){
    sc.addEventListener('touchstart', (e)=>{
      SS_touchSX = e.changedTouches[0].screenX;
      SS_touchSY = e.changedTouches[0].screenY;
    }, {passive:true});
    sc.addEventListener('touchend', (e)=>{
      const dx = SS_touchSX - e.changedTouches[0].screenX;
      const dy = SS_touchSY - e.changedTouches[0].screenY;
      if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){
        if(dx>0) SS_next(); else SS_prev();
      }
    }, {passive:true});
  }

  document.addEventListener('keydown', (e)=>{
    if(!SS_isOpen) return;
    if(e.key==='ArrowRight') SS_next();
    else if(e.key==='ArrowLeft') SS_prev();
    else if(e.key==='Escape') SS_close();
  });

  document.addEventListener('visibilitychange', ()=>{
    const now = Date.now();
    if(now - SS_lastVisibilityChange < 500) return;
    SS_lastVisibilityChange = now;
    if(document.hidden){
      if(SS_T){ clearTimeout(SS_T); SS_T = null; }
      if(SS_VIDEO_TIMER){ clearTimeout(SS_VIDEO_TIMER); SS_VIDEO_TIMER = null; }
      const t = $('slidesTrack');
      if(t) Array.from(t.children).forEach(slideEl=>{
        const v = slideEl.querySelector('video'); if(v && !v.paused) v.pause();
      });
      const a = $('audioPlayer'); if(a) a.pause();
    }else if(SS_isOpen){
      const a = $('audioPlayer');
      if(a && a.src){ a.play().catch(()=>{}); }
      const cur = SS[SS_IDX];
      if(cur && cur.type!=='video'){
        if(!SS_T){
          const dur = SS_photoDurationMs();
          const curSlideRef = cur;
          const myToken = SS_timerToken;
          SS_T = setTimeout(()=>{
            if(!SS_isOpen) return;
            if(SS[SS_IDX]!==curSlideRef) return;
            if(SS_timerToken!==myToken) return;
            SS_next();
          }, dur);
        }
      }
    }
  });
});

})();