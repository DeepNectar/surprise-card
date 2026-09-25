/* ============================================================
   viewer.js — Viewer screen + person loading
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

window.loadPersonIntoState = async function(p){
  S.CURRENT_PERSON = p;
  S.CURR = {
    texts:{}, textsByLang:{en:{},gu:{},hi:{}}, shared:{},
    gifts:[], story:[], events:[], voice:[], video:[], pins:[], media:[]
  };
  if(!p) return;
  const set = await sb.getSet(p.id);
  S.CURRENT_SETTINGS = set;
  const shared = {};
  Object.keys(set).forEach(k=>{ if(k.startsWith('shared__')) shared[k.substring(8)] = set[k]; });
  S.CURR.shared = shared;

  function buildTextsForLang(L){
    const out = {}; const pref = 'texts__'+L+'_';
    Object.keys(set).forEach(k=>{ if(k.startsWith(pref)) out[k.substring(pref.length)] = set[k]; });
    if(L==='en'){
      Object.keys(set).forEach(k=>{
        if(!k.startsWith('texts__')) return;
        const rest = k.substring(7);
        if(/^(en|gu|hi)_/.test(rest)) return;
        if(out[rest]===undefined) out[rest] = set[k];
      });
    }
    return out;
  }
  S.CURR.textsByLang = {en:buildTextsForLang('en'), gu:buildTextsForLang('gu'), hi:buildTextsForLang('hi')};
  const def = (shared.defaultLang||'en').toLowerCase();
  S.CURR_LANG = (['en','gu','hi'].indexOf(def)>=0) ? def : 'en';
  S.CURR.texts = S.CURR.textsByLang[S.CURR_LANG] || {};

  const lt = $('langToggle');
  if(lt){
    lt.textContent = S.CURR_LANG==='en' ? 'EN' : (S.CURR_LANG==='gu' ? 'ગુ' : 'हि');
    lt.dataset.state = S.CURR_LANG;
  }

  S.CURR.gifts  = await sb.rows(T_GIFTS,  p.id) || [];
  S.CURR.story  = await sb.rows(T_STORY,  p.id) || [];
  S.CURR.events = await sb.rows(T_EVENTS, p.id) || [];
  S.CURR.voice  = await sb.rows(T_VOICE,  p.id) || [];
  S.CURR.video  = await sb.rows(T_VIDEO,  p.id) || [];
  S.CURR.pins   = await sb.rows(T_PINS,   p.id) || [];
  S.CURR.media  = await sb.rows(T_MEDIA,  p.id) || [];
};

window.__loadPersonIntoState__ = loadPersonIntoState;

window.showViewerFor = async function(person, startNow){
  if(!S.CURRENT_PERSON || S.CURRENT_PERSON.id !== person.id){
    await loadPersonIntoState(person);
  }
  $('homeScreen').classList.add('hidden');
  show($('viewerScreen'));
  $('viewerPreviewTag').style.display = S.PREVIEW_MODE ? 'inline-block' : 'none';
  $('viewerEditCardBtn').classList.toggle('visible', !!S.REQUESTER_MODE && !S.PREVIEW_MODE);
  $('musicToggle').classList.toggle('visible', window.buildPlaylistFor('card').length>0);
  $('langToggle').classList.toggle('visible', true);

  const lt = $('langToggle');
  if(lt){
    lt.textContent = S.CURR_LANG==='en' ? 'EN' : (S.CURR_LANG==='gu' ? 'ગુ' : 'हि');
    lt.dataset.state = S.CURR_LANG;
  }
  window.renderCardFull();
  if(startNow) window.startCard();
  window.scrollTo(0,0);
};

window.__showViewerForPreview__ = showViewerFor;

window.startCard = function(){
  if(S.CARD_STARTED) return;
  S.CARD_STARTED = true;
  window.restartTypewriter();
  window.updateCounters();
  window.startMusicFor('card');
};

window.renderCardFull = function(){
  const t = S.CURR.texts || {}, s = S.CURR.shared || {};
  document.body.setAttribute('data-theme', s.theme || 'romantic');
  document.title = t.pageTitle || 'A surprise awaits 💕';
  txt($('mainHeadlineEl'), t.mainHeadline || 'Happy Celebration!');
  $('subheadEl').innerHTML = (t.subhead1||'') + (t.subhead2 ? ('<br>'+t.subhead2) : '');
  txt($('typeGreeting'), '');
  txt($('namesBadgeEl'), t.namesBadge||'');
  txt($('fromLabel'), t.fromLabel||'Lots of love from');
  txt($('openMemoriesBtnTextEl'), t.openMemoriesBtn||'Open Memories');
  txt($('storyBtnTextEl'), t.storyBtnText||'Our Story');
  txt($('mapBtnTextEl'), t.mapBtnText||'Map of Memories');
  txt($('uploadBtnTextEl'), t.uploadBtnText||'Share Photo');
  txt($('voiceBtnTextEl'), t.voiceBtnText||'Play Voice Message');
  txt($('videoBtnTextEl'), t.videoBtnText||'Play Video Message');
  txt($('countersMainTitle'), t.countersTitle||'Our journey so far');

  COUNTERS.forEach(c=>{
    const label = s[c.labelKey] || '';
    txt($(c.mainLabel), label);
    txt($(c.mainDate), s[c.dispKey]||'');
    const on = String(s[c.showKey])!=='false';
    $(c.mainRow).classList.toggle('counter-hidden', !on);
  });
  const anyVisible = COUNTERS.some(c=>String(s[c.showKey])!=='false');
  $('countersMain').classList.toggle('hidden-box', !anyVisible);

  $('storyBtn').style.display = (s.enableStory==='true' && S.CURR.story.length) ? 'inline-flex' : 'none';
  $('mapBtn').style.display   = (s.enableMap==='true'   && S.CURR.pins.length)  ? 'inline-flex' : 'none';
  $('uploadBtn').style.display = (s.enableUpload==='true') ? 'inline-flex' : 'none';
  $('voiceRow').style.display   = (s.enableVoiceMsg==='true' && S.CURR.voice.length) ? 'flex' : 'none';
  $('videoMsgRow').style.display = (s.enableVideoMsg==='true' && S.CURR.video.length) ? 'flex' : 'none';

  window.renderGifts();
  window.renderEvents();
  window.updateCounters();
};

document.addEventListener('DOMContentLoaded', ()=>{
  const back = $('viewerBackBtn');
  if(back) back.onclick = ()=>{
    window.SS_clearSession && window.SS_clearSession();
    hide($('viewerScreen'));
    S.PREVIEW_MODE = false;
    S.CARD_STARTED = false;
    S.REQUESTER_MODE = false;
    if(window.__closeAllModals__) window.__closeAllModals__();
    if(S.ADMIN_MODE) show($('adminPanel'));
    else $('homeScreen').classList.remove('hidden');
  };
});

})();