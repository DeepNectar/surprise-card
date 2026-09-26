/* ============================================================
   slideshow.js — Full-screen memories slideshow
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

let SS = [];
let SS_IDX = 0;
let SS_T = null;
let SS_VIDEO_TIMER = null;
let SS_TX_T = null;
let SS_isOpen = false;
let SS_musicDucked = false;
let SS_touchSX = 0;
let SS_touchSY = 0;
let SS_floaterTimer = null;

const SS_PHOTO_EFFECTS = ['fx-ken-in','fx-ken-out','fx-pan-lr','fx-pan-rl','fx-pan-tb','fx-rotate','fx-fade','fx-blur','fx-scale-down'];
const SS_VIDEO_EFFECTS = ['vfx-fade','vfx-zoom','vfx-slide-right','vfx-blur'];
const SS_FLOAT_EMOJI = ['❤️','💕','✨','🌹','💖','🌸','⭐','💛','🎀','🕊️','🦋','💫','🌷','🎊','💗','🎈'];

window.SS_clearTimers = function(){
  if(SS_T){ clearTimeout(SS_T); SS_T = null; }
  if(SS_VIDEO_TIMER){ clearTimeout(SS_VIDEO_TIMER); SS_VIDEO_TIMER = null; }
  if(SS_TX_T){ clearTimeout(SS_TX_T); SS_TX_T = null; }
};

function SS_photoDurationMs(){
  const v = parseFloat((S.CURR.shared || {}).photoDurationSec || '5');
  return (isFinite(v) && v > 0 ? v : 5) * 1000;
}
function SS_effectsEnabled(){
  const s = S.CURR.shared || {};
  const v = s.slideEffectsEnabled;
  return v === undefined ? true : String(v) !== 'false';
}
function SS_effectsIntensity(){
  const v = parseFloat((S.CURR.shared || {}).effectsIntensity || '1');
  if(!isFinite(v) || v <= 0) return 1;
  return Math.max(0.5, Math.min(1.6, v));
}
function SS_floatersEnabled(){
  const s = S.CURR.shared || {};
  const v = s.floatersEnabled;
  return v === undefined ? true : String(v) !== 'false';
}
function SS_floaterDensity(){
  const v = parseInt((S.CURR.shared || {}).floaterDensity || '1', 10);
  if(isNaN(v)) return 1;
  return Math.max(0, Math.min(2, v));
}

function SS_resetVideo(v){
  try{ v.pause(); v.currentTime = 0; }catch(e){}
}

function SS_playVideo(v, unmuteBtn){
  try{ v.currentTime = 0; }catch(e){}
  v.muted = false;
  const p = v.play();
  if(p && p.then){
    p.then(() => { if(unmuteBtn) unmuteBtn.classList.remove('show'); })
     .catch(() => {
       v.muted = true;
       const p2 = v.play();
       if(p2 && p2.then){
         p2.then(() => { if(unmuteBtn) unmuteBtn.classList.add('show'); })
           .catch(() => { if(unmuteBtn) unmuteBtn.classList.add('show'); });
       } else {
         if(unmuteBtn) unmuteBtn.classList.add('show');
       }
     });
  } else {
    if(unmuteBtn) unmuteBtn.classList.add('show');
  }
}

function SS_fadeMusic(target, duration){
  const a = $('audioPlayer');
  if(!a) return;
  const start = a.volume;
  if(Math.abs(start - target) < 0.01){ a.volume = target; return; }
  const steps = Math.max(1, Math.round((duration || 400) / 30));
  let i = 0;
  if(a._ssFadeTimer) clearInterval(a._ssFadeTimer);
  a._ssFadeTimer = setInterval(() => {
    i++;
    const t = i / steps;
    a.volume = Math.max(0, Math.min(1, start + (target - start) * t));
    if(i >= steps){
      clearInterval(a._ssFadeTimer);
      a._ssFadeTimer = null;
      a.volume = target;
    }
  }, 30);
}
function SS_normalMusicVol(){ return window.getVol('slideshow'); }
function SS_duckedMusicVol(){
  const s = S.CURR.shared || {};
  if(String(s.musicDuringVideo) === 'true'){
    const v = parseFloat(s.vol_video_music);
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.35;
  }
  return Math.max(0.05, SS_normalMusicVol() * 0.4);
}

function SS_applySavedMediaOrder(rows){
  const s = S.CURR.shared || {};
  const orderStr = (s.mediaOrder || '').trim();
  const base = (rows || []).slice();
  if(!orderStr || base.length < 2) return base;
  const idxs = orderStr.split(',')
    .map(x => parseInt(x, 10))
    .filter(x => !isNaN(x) && x >= 0 && x < base.length);
  if(idxs.length !== base.length) return base;
  const seen = new Set();
  const out = [];
  idxs.forEach(i => { if(!seen.has(i)){ seen.add(i); out.push(base[i]); } });
  base.forEach((r, i) => { if(!seen.has(i)) out.push(r); });
  return out;
}
function SS_movePhotoFirst(arr){
  if(!arr || !arr.length) return arr || [];
  const pi = arr.findIndex(r => r.type !== 'video');
  if(pi <= 0) return arr;
  const out = arr.slice();
  const [p] = out.splice(pi, 1);
  out.unshift(p);
  return out;
}

function SS_startFloaters(){
  const layer = $('ssFloaterLayer');
  if(!layer) return;
  layer.innerHTML = '';
  if(!SS_floatersEnabled()) return;
  const density = SS_floaterDensity();
  if(density === 0) return;
  const perSpawn = density === 1 ? 2 : 3;
  const spawnEveryMs = density === 1 ? 900 : 500;
  const seedCount = density === 1 ? 12 : 20;

  const spawn = () => {
    if(!SS_isOpen) return;
    if(!SS_floatersEnabled()) return;
    for(let k = 0; k < perSpawn; k++){
      const s = document.createElement('span');
      s.className = 'ss-floater';
      s.textContent = SS_FLOAT_EMOJI[Math.floor(Math.random() * SS_FLOAT_EMOJI.length)];
      s.style.left = (Math.random() * 100) + '%';
      s.style.fontSize = (1.0 + Math.random() * 1.6) + 'rem';
      const dur = (8 + Math.random() * 9) * (density === 2 ? 0.7 : 1);
      s.style.animationDuration = dur + 's';
      s.style.animationDelay = (Math.random() * 1.5) + 's';
      layer.appendChild(s);
      setTimeout(() => { if(s.parentNode) s.parentNode.removeChild(s); }, (dur + 2) * 1000);
    }
  };

  for(let i = 0; i < seedCount; i++) setTimeout(spawn, i * (spawnEveryMs / seedCount));
  SS_floaterTimer = setInterval(spawn, spawnEveryMs);
}

window.SS_stopFloaters = function(){
  if(SS_floaterTimer){ clearInterval(SS_floaterTimer); SS_floaterTimer = null; }
  const layer = $('ssFloaterLayer');
  if(layer) layer.innerHTML = '';
};

function SS_pickPhotoEffect(){
  return SS_PHOTO_EFFECTS[Math.floor(Math.random() * SS_PHOTO_EFFECTS.length)];
}
function SS_pickVideoEffect(){
  return SS_VIDEO_EFFECTS[Math.floor(Math.random() * SS_VIDEO_EFFECTS.length)];
}
function SS_applyIntensity(el){
  const inten = SS_effectsIntensity();
  const base = SS_photoDurationMs() + 2000;
  const dur = Math.max(2500, Math.round(base / inten));
  el.style.setProperty('--fx-dur', dur + 'ms');
}

/* ---------- Session ---------- */
window.SS_saveSession = function(){
  try{
    if(S.CURRENT_PERSON && S.CURRENT_PERSON.slug){
      sessionStorage.setItem('active_person_slug', S.CURRENT_PERSON.slug);
      sessionStorage.setItem('active_view', 'viewer');
    }
  }catch(e){}
};
window.SS_clearSession = function(){
  try{
    sessionStorage.removeItem('active_person_slug');
    sessionStorage.removeItem('active_view');
  }catch(e){}
};
window.SS_restoreSession = function(){
  try{
    const slug = sessionStorage.getItem('active_person_slug');
    const view = sessionStorage.getItem('active_view');
    if(!slug || view !== 'viewer') return false;
    const p = S.PEOPLE.find(x => x.slug === slug);
    if(!p) return false;

    S.CURRENT_PERSON = p;
    window.__loadPersonIntoState__(p).then(() => {
      $('homeScreen').classList.add('hidden');
      show($('viewerScreen'));
      S.PREVIEW_MODE = false;
      S.REQUESTER_MODE = false;
      $('viewerPreviewTag').style.display = 'none';
      $('viewerEditCardBtn').classList.remove('visible');
      $('musicToggle').classList.toggle('visible', window.buildPlaylistFor('card').length > 0);
      $('langToggle').classList.toggle('visible', true);
      window.setDarkMode(window.isDarkForPerson ? window.isDarkForPerson(p) : false);
      window.renderCardFull();
      window.startCard();
      window.scrollTo(0, 0);
    }).catch(() => {});
    return true;
  }catch(e){ return false; }
};

/* ---------- Build slides ---------- */
function SS_buildSlides(){
  const t = $('slidesTrack');
  if(!t) return;
  t.innerHTML = '';
  const dots = $('slideshowDots');
  if(dots) dots.innerHTML = '';

  SS.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'slide' + (s.type === 'video' ? ' video-slide' : '');
    d.dataset.i = i;

    if(s.type === 'video'){
      const v = document.createElement('video');
      v.src = s.src;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.preload = 'auto';
      v.setAttribute('disablepictureinpicture', '');
      v.muted = true;
      d.appendChild(v);

      const ub = document.createElement('button');
      ub.type = 'button';
      ub.className = 'unmute-btn';
      ub.textContent = '🔊 Tap for sound';
      ub.setAttribute('aria-label', 'Unmute video');
      const doUnmute = e => {
        e.preventDefault();
        e.stopPropagation();
        v.muted = false;
        v.volume = 1;
        const p = v.play();
        if(p && p.then) p.then(() => ub.classList.remove('show')).catch(() => {});
      };
      ub.addEventListener('click', doUnmute);
      ub.addEventListener('touchstart', doUnmute, {passive: false});
      d.appendChild(ub);

      v.addEventListener('ended', () => {
        if(SS_isOpen && SS[SS_IDX] && SS[SS_IDX] === s){
          SS_clearTimers();
          SS_next();
        }
      });
      v.addEventListener('error', () => {
        if(SS_isOpen && SS[SS_IDX] && SS[SS_IDX] === s){
          SS_clearTimers();
          setTimeout(() => { if(SS_isOpen) SS_next(); }, 800);
        }
      });
    } else {
      const img = document.createElement('img');
      img.src = 'https://lh3.googleusercontent.com/d/' + s.drive_id + '=w2400';
      img.onerror = () => { img.src = 'https://drive.google.com/thumbnail?id=' + s.drive_id + '&sz=w2400'; };
      img.className = 'fx-target';
      d.appendChild(img);
    }

    if(s.title){
      const cap = document.createElement('div');
      cap.className = 'slide-title';
      cap.textContent = String(s.title);
      d.appendChild(cap);
    }

    t.appendChild(d);

    if(dots){
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.dataset.i = i;
      dot.onclick = () => { SS_IDX = i; SS_updateSlide(); };
      dots.appendChild(dot);
    }
  });
}

function SS_applyEffectToCurrent(){
  const t = $('slidesTrack');
  if(!t) return;
  const cur = SS[SS_IDX];
  const slideEl = t.children[SS_IDX];
  if(!cur || !slideEl) return;

  SS_PHOTO_EFFECTS.forEach(c => slideEl.classList.remove(c));
  SS_VIDEO_EFFECTS.forEach(c => slideEl.classList.remove(c));

  if(!SS_effectsEnabled()) return;

  if(cur.type === 'video'){
    const fx = SS_pickVideoEffect();
    slideEl.classList.add(fx);
    const v = slideEl.querySelector('video');
    if(v){
      v.style.animation = 'none';
      void v.offsetWidth;
      v.style.animation = '';
    }
  } else {
    const fx = SS_pickPhotoEffect();
    slideEl.classList.add(fx);
    SS_applyIntensity(slideEl);
    const img = slideEl.querySelector('img.fx-target');
    if(img){
      img.style.animation = 'none';
      void img.offsetWidth;
      img.style.animation = '';
    }
  }
}

function SS_animateTrackTo(){
  const t = $('slidesTrack');
  if(!t) return;
  const choices = ['slide', 'fade', 'scale', 'slide'];
  const pick = choices[Math.floor(Math.random() * choices.length)];

  if(pick === 'fade'){
    t.classList.add('transition-fade');
    setTimeout(() => t.classList.remove('transition-fade'), 350);
  }
  if(pick === 'scale'){
    t.style.transition = 'transform .6s cubic-bezier(.7,0,.2,1), opacity .5s ease';
    t.classList.add('transition-scale');
    t.style.transform = `translateX(-${SS_IDX * 100}%) scale(1.05)`;
    setTimeout(() => {
      t.style.transform = `translateX(-${SS_IDX * 100}%) scale(1)`;
      t.classList.remove('transition-scale');
    }, 10);
    return;
  }
  t.style.transform = `translateX(-${SS_IDX * 100}%)`;
}

function SS_updateSlide(){
  const t = $('slidesTrack');
  if(!t) return;

  SS_animateTrackTo();
  txt($('slideshowCounter'), (SS_IDX + 1) + ' / ' + SS.length);

  const dots = $('slideshowDots');
  if(dots) dots.querySelectorAll('.dot').forEach((el, i) => el.classList.toggle('active', i === SS_IDX));

  SS_clearTimers();

  Array.from(t.children).forEach((slideEl, i) => {
    if(i !== SS_IDX){
      const v = slideEl.querySelector('video');
      if(v) SS_resetVideo(v);
      const ub = slideEl.querySelector('.unmute-btn');
      if(ub) ub.classList.remove('show');
    }
  });

  const cur = SS[SS_IDX];
  const slideEl = t.children[SS_IDX];
  if(!cur || !slideEl) return;

  SS_applyEffectToCurrent();

  if(cur.type === 'video'){
    if(SS_musicDucked !== true){
      SS_fadeMusic(SS_duckedMusicVol(), 400);
      SS_musicDucked = true;
    }
    const v = slideEl.querySelector('video');
    const ub = slideEl.querySelector('.unmute-btn');
    if(v){
      const tryPlay = () => SS_playVideo(v, ub);
      if(v.readyState >= 1) tryPlay();
      else {
        v.addEventListener('loadedmetadata', tryPlay, {once: true});
        setTimeout(() => {
          if(SS_isOpen && SS[SS_IDX] === cur && v.paused) tryPlay();
        }, 800);
      }
    }
    const pb = $('slideshowProgress');
    if(pb){ pb.style.transition = 'none'; pb.style.width = '0%'; }
  } else {
    if(SS_musicDucked !== false){
      SS_fadeMusic(SS_normalMusicVol(), 400);
      SS_musicDucked = false;
    }
    const dur = SS_photoDurationMs();
    const pb = $('slideshowProgress');
    if(pb){
      pb.style.transition = 'none';
      pb.style.width = '0%';
      void pb.offsetWidth;
      pb.style.transition = 'width ' + dur + 'ms linear';
      pb.style.width = '100%';
    }
    SS_T = setTimeout(() => { if(SS_isOpen) SS_next(); }, dur);
  }
}

function SS_next(){
  if(!SS.length){ SS_close(); return; }
  SS_IDX = (SS_IDX + 1) % SS.length;
  SS_updateSlide();
}
function SS_prev(){
  if(!SS.length) return;
  SS_IDX = (SS_IDX - 1 + SS.length) % SS.length;
  SS_updateSlide();
}

function SS_close(){
  SS_isOpen = false;
  hide($('slideshowOverlay'));
  SS_clearTimers();
  window.SS_stopFloaters();

  const t = $('slidesTrack');
  if(t){
    Array.from(t.children).forEach(slideEl => {
      const v = slideEl.querySelector('video');
      if(v) SS_resetVideo(v);
      const ub = slideEl.querySelector('.unmute-btn');
      if(ub) ub.classList.remove('show');
    });
    t.innerHTML = '';
  }

  const dots = $('slideshowDots');
  if(dots) dots.innerHTML = '';
  const pb = $('slideshowProgress');
  if(pb){ pb.style.transition = 'none'; pb.style.width = '0%'; }

  SS_musicDucked = false;

  // ✅ Restore card music so it keeps playing during the closing modal
  const a = $('audioPlayer');
  if(a) a.volume = window.getVol('card');
  if(typeof window.startMusicFor === 'function') window.startMusicFor('card');

  // ✅ Show closing modal (music continues underneath)
  if(!S.PREVIEW_MODE && S.CURRENT_PERSON) window.openClosingModal();
}

/* ---------- Bindings ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = $('openBtn');
  if(openBtn) openBtn.onclick = async (e) => {
    if(e && e.preventDefault) e.preventDefault();
    if(e && e.stopPropagation) e.stopPropagation();

    if(!S.CURRENT_PERSON){ alert('No person selected.'); return; }

    const rows = await sb.rows(T_MEDIA, S.CURRENT_PERSON.id) || [];
    const filtered = (rows || []).filter(r =>
      (r.type === 'video' && r.src) ||
      (r.type === 'photo' && r.drive_id)
    );
    if(!filtered.length){ alert('No memories yet 💕'); return; }

    const ordered = SS_applySavedMediaOrder(filtered);
    SS = SS_movePhotoFirst(ordered);
    SS_IDX = 0;
    SS_buildSlides();
    show($('slideshowOverlay'));
    SS_isOpen = true;
    window.SS_saveSession();
    if(typeof window.startMusicFor === 'function') window.startMusicFor('slideshow');
    SS_startFloaters();
    SS_updateSlide();
    return false;
  };

  const prevBtn = $('slideshowPrev');
  if(prevBtn) prevBtn.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); SS_prev(); };
  const nextBtn = $('slideshowNext');
  if(nextBtn) nextBtn.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); SS_next(); };
  const closeBtn = $('slideshowClose');
  if(closeBtn) closeBtn.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); SS_close(); };

  const sc = $('slideshowContainer');
  if(sc){
    sc.addEventListener('touchstart', e => {
      SS_touchSX = e.changedTouches[0].screenX;
      SS_touchSY = e.changedTouches[0].screenY;
    }, {passive: true});
    sc.addEventListener('touchend', e => {
      const dx = SS_touchSX - e.changedTouches[0].screenX;
      const dy = SS_touchSY - e.changedTouches[0].screenY;
      if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)){
        if(dx > 0) SS_next(); else SS_prev();
      }
    }, {passive: true});
  }

  document.addEventListener('keydown', e => {
    if(!SS_isOpen) return;
    if(e.key === 'ArrowRight') SS_next();
    else if(e.key === 'ArrowLeft') SS_prev();
    else if(e.key === 'Escape') SS_close();
  });

  document.addEventListener('visibilitychange', () => {
    if(document.hidden){
      SS_clearTimers();
      const t = $('slidesTrack');
      if(t){
        Array.from(t.children).forEach(slideEl => {
          const v = slideEl.querySelector('video');
          if(v && !v.paused) v.pause();
        });
      }
      const a = $('audioPlayer');
      if(a) a.pause();
    } else if(SS_isOpen){
      SS_updateSlide();
      const a = $('audioPlayer');
      if(a && a.src){ a.play().catch(() => {}); }
    }
  });
});

/* Expose for other modules */
window.SS_isOpen = false;
Object.defineProperty(window, 'SS_isOpen', {
  get: () => SS_isOpen,
  set: v => { SS_isOpen = v; }
});

})();