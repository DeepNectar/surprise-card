/* ============================================================
   admin.js — Admin panel: text, theme, people, lock, extras,
   slideshow, reviews, backup, security
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;

/* ---------- Admin login ---------- */
window.openAdminLoginFull = function(){
  $('adminPwError').classList.remove('show');
  $('adminPwInput').value = '';
  show($('adminLoginModal'));
  setTimeout(()=>$('adminPwInput').focus(), 150);
};
window.openAdminLogin = openAdminLoginFull;

window.tryAdminFull = async function(){
  const pw = $('adminPwInput').value;
  const exp = (S.CURR.shared && S.CURR.shared.adminPassword) || FALLBACK_ADMIN_PW;
  if(pw===exp || pw===FALLBACK_ADMIN_PW){
    hide($('adminLoginModal'));
    await window.startAdmin();
  }else{
    $('adminPwError').classList.add('show');
    $('adminPwInput').value = '';
  }
};

window.startAdmin = async function(){
  S.ADMIN_MODE = true;
  if(!S.PEOPLE.length) S.PEOPLE = await sb.people() || [];
  if(!S.ADMIN_EDIT_PERSON_ID && S.PEOPLE.length) S.ADMIN_EDIT_PERSON_ID = S.PEOPLE[0].id;
  if(S.ADMIN_EDIT_PERSON_ID){
    S.CURRENT_PERSON = S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID) || null;
    if(S.CURRENT_PERSON) await window.__loadPersonIntoState__(S.CURRENT_PERSON);
  }
  buildAdminPersonDropdown();
  loadAdminTextsForLang();
  applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
  fillAdminFields();
  renderPeopleRepeater();
  renderAdminGifts(); renderAdminStory(); renderAdminEvents();
  renderAdminVoice(); renderAdminVideo(); renderAdminPins(); renderAdminMedia();
  await window.loadReviews();
  show($('adminPanel'));
};

/* ---------- Admin text fields ---------- */
function loadAdminTextsForLang(){
  const set = S.CURRENT_SETTINGS || {};
  const byLang = {en:{}, gu:{}, hi:{}};
  TEXT_FIELDS.forEach(f=>{
    byLang.en[f] = set['texts__en_'+f]!==undefined ? set['texts__en_'+f] : (set['texts__'+f]||'');
    byLang.gu[f] = set['texts__gu_'+f]!==undefined ? set['texts__gu_'+f] : '';
    byLang.hi[f] = set['texts__hi_'+f]!==undefined ? set['texts__hi_'+f] : '';
  });
  S.CURRENT_TEXTS_BY_LANG = byLang;
}
function applyAdminTextsToFields(lang){
  const src = (S.CURRENT_TEXTS_BY_LANG && S.CURRENT_TEXTS_BY_LANG[lang]) || {};
  TEXT_FIELDS.forEach(f=>{
    const el = $('f_'+f);
    if(!el) return;
    el.value = src[f]!==undefined ? src[f] : '';
  });
}
function saveAdminTextsFromFields(lang){
  const dst = (S.CURRENT_TEXTS_BY_LANG = S.CURRENT_TEXTS_BY_LANG || {en:{},gu:{},hi:{}});
  dst[lang] = dst[lang] || {};
  TEXT_FIELDS.forEach(f=>{
    const el = $('f_'+f);
    if(!el) return;
    dst[lang][f] = el.value;
  });
}

/* ---------- Admin person dropdown ---------- */
function buildAdminPersonDropdown(){
  const s = $('adminPersonSelect'); if(!s) return;
  s.innerHTML = '';
  if(!S.PEOPLE.length){
    const o = document.createElement('option'); o.value=''; o.textContent='(no people yet)';
    s.appendChild(o); return;
  }
  S.PEOPLE.forEach(p=>{
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = '#'+p.id+' — '+(p.display_name||p.slug||'');
    s.appendChild(o);
  });
  if(S.ADMIN_EDIT_PERSON_ID) s.value = S.ADMIN_EDIT_PERSON_ID;
  s.onchange = async ()=>{
    saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
    S.ADMIN_EDIT_PERSON_ID = parseInt(s.value)||null;
    S.CURRENT_PERSON = S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID) || null;
    if(S.CURRENT_PERSON) await window.__loadPersonIntoState__(S.CURRENT_PERSON);
    loadAdminTextsForLang();
    applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
    fillAdminFields();
    renderAdminGifts(); renderAdminStory(); renderAdminEvents();
    renderAdminVoice(); renderAdminVideo(); renderAdminPins(); renderAdminMedia();
  };
}

/* ---------- Admin fields ---------- */
function fillAdminFields(){
  const sh = S.CURR.shared || {};
  const set = (id,v)=>{ const el = $(id); if(el) el.value = (v===undefined||v===null) ? '' : v; };
  ['ct1_datetime','ct2_datetime','ct3_datetime','unlockDateISO','hardExpiryISO'].forEach(key=>{
    const dtEl = $('f_'+key);
    const tzEl = $('f_'+key+'_tz');
    if(!dtEl) return;
    const tz = sh[key+'_tz'] || DEFAULT_TZ;
    if(tzEl && tzEl.options.length===0){
      TZ_OPTIONS.forEach(o=>{
        const opt = document.createElement('option'); opt.value = o.v; opt.textContent = o.l;
        tzEl.appendChild(opt);
      });
    }
    if(tzEl){ tzEl.value = TZ_OPTIONS.find(o=>o.v===tz) ? tz : DEFAULT_TZ; }
    dtEl.value = sh[key] ? utcToZonedLocal(sh[key], tz) : '';
  });
  set('f_ct1_dispdate', sh.ct1_dispdate); set('f_ct2_dispdate', sh.ct2_dispdate); set('f_ct3_dispdate', sh.ct3_dispdate);
  set('f_ct1_label2', sh.ct1_label||''); set('f_ct2_label2', sh.ct2_label||''); set('f_ct3_label2', sh.ct3_label||'');
  const cb = (id,v)=>{ const el = $(id); if(el) el.checked = (String(v)!=='false'); };
  cb('f_ct1_show', sh.ct1_show); cb('f_ct2_show', sh.ct2_show); cb('f_ct3_show', sh.ct3_show);
  set('f_adminPassword', sh.adminPassword||FALLBACK_ADMIN_PW);
  const dl = $('f_defaultLang'); if(dl) dl.value = sh.defaultLang||'en';
  const tgl = (id,v)=>{ const el = $(id); if(el) el.checked = (v==='true'); };
  tgl('f_enableFireworks', sh.enableFireworks); tgl('f_enableGiftBox', sh.enableGiftBox);
  tgl('f_enableVoiceMsg', sh.enableVoiceMsg); tgl('f_enableVideoMsg', sh.enableVideoMsg);
  tgl('f_enableEventCount', sh.enableEventCount); tgl('f_enableStory', sh.enableStory);
  tgl('f_enableMap', sh.enableMap); tgl('f_enableUpload', sh.enableUpload);
  tgl('f_showLockScreen', sh.showLockScreen);
  tgl('f_pinSlideshowEnabled', sh.pinSlideshowEnabled);
  tgl('f_storySlideshowEnabled', sh.storySlideshowEnabled);
  tgl('f_shuffleMediaOn', sh.shuffleMediaOn);
  tgl('f_slideEffectsEnabled', sh.slideEffectsEnabled!==undefined ? sh.slideEffectsEnabled : 'true');
  tgl('f_floatersEnabled', sh.floatersEnabled!==undefined ? sh.floatersEnabled : 'true');
  const pds = $('f_photoDurationSec'); if(pds) pds.value = sh.photoDurationSec||'5';
  const ei = $('f_effectsIntensity');
  if(ei){ ei.value = sh.effectsIntensity||'1'; const el = $('f_effectsIntensity_val'); if(el) el.textContent = ei.value; }
  const fd = $('f_floaterDensity');
  if(fd){ fd.value = (sh.floaterDensity!==undefined ? sh.floaterDensity : '1'); const el = $('f_floaterDensity_val'); if(el) el.textContent = fd.value; }
  document.querySelectorAll('input[name="music_mode"]').forEach(r=>{ r.checked = (r.value === (sh.music_mode||'both')); });
  for(let i=1;i<=5;i++){
    const onEl = $('f_song'+i+'_on'); if(onEl) onEl.checked = (String(sh['song'+i+'_on'])==='true');
    set('f_song'+i+'_url', sh['song'+i+'_url']);
    const wEl = $('f_song'+i+'_where'); if(wEl) wEl.value = sh['song'+i+'_where']||'both';
  }
  const v = (id,key,def)=>{ const el = $(id); if(!el) return; el.value = sh[key]||def; const lab = $(id+'_val'); if(lab) lab.textContent = el.value; };
  v('f_vol_card','vol_card','0.45');
  v('f_vol_slide','vol_slide','0.85');
  v('f_vol_video','vol_video','1.0');
  v('f_pinSlideDuration','pinSlideDuration','4');
  v('f_storySlideDuration','storySlideDuration','10');
  const el1 = $('f_pinSlideDefaultSec'); if(el1) el1.value = sh.pinSlideDefaultSec||'10';
  const el2 = $('f_storySlideDefaultSec'); if(el2) el2.value = sh.storySlideDefaultSec||'10';
  document.querySelectorAll('#themeGrid .theme-swatch').forEach(el=>{
    el.classList.toggle('selected', el.dataset.themePick === (sh.theme||'romantic'));
  });
  if(sh.theme) document.body.setAttribute('data-theme', sh.theme);
  const flagEl = $('f_adminLoginEnabled');
  if(flagEl){
    const v = sh.adminLoginEnabled;
    flagEl.checked = (v===undefined) ? true : (String(v)==='true');
  }
}

function readAdminFields(){
  const g = id => { const el = $(id); return el ? el.value : ''; };
  const gTz = id => { const el = $(id+'_tz'); return el ? el.value : DEFAULT_TZ; };
  const sh = S.CURR.shared || {};
  ['ct1_datetime','ct2_datetime','ct3_datetime','unlockDateISO','hardExpiryISO'].forEach(key=>{
    const localVal = g('f_'+key);
    const tz = gTz('f_'+key);
    sh[key] = localVal ? zonedToUTC(localVal, tz) : null;
    sh[key+'_tz'] = tz;
  });
  sh.ct1_dispdate = g('f_ct1_dispdate');
  sh.ct2_dispdate = g('f_ct2_dispdate');
  sh.ct3_dispdate = g('f_ct3_dispdate');
  sh.ct1_label = g('f_ct1_label2');
  sh.ct2_label = g('f_ct2_label2');
  sh.ct3_label = g('f_ct3_label2');
  sh.ct1_show = (($('f_ct1_show')||{}).checked) ? 'true' : 'false';
  sh.ct2_show = (($('f_ct2_show')||{}).checked) ? 'true' : 'false';
  sh.ct3_show = (($('f_ct3_show')||{}).checked) ? 'true' : 'false';
  sh.adminPassword = g('f_adminPassword')||FALLBACK_ADMIN_PW;
  const tgl = id => { const el = $(id); return el && el.checked ? 'true' : 'false'; };
  sh.enableFireworks = tgl('f_enableFireworks');
  sh.enableGiftBox = tgl('f_enableGiftBox');
  sh.enableVoiceMsg = tgl('f_enableVoiceMsg');
  sh.enableVideoMsg = tgl('f_enableVideoMsg');
  sh.enableEventCount = tgl('f_enableEventCount');
  sh.enableStory = tgl('f_enableStory');
  sh.enableMap = tgl('f_enableMap');
  sh.enableUpload = tgl('f_enableUpload');
  sh.showLockScreen = tgl('f_showLockScreen');
  sh.pinSlideshowEnabled = tgl('f_pinSlideshowEnabled');
  sh.storySlideshowEnabled = tgl('f_storySlideshowEnabled');
  sh.adminLoginEnabled = tgl('f_adminLoginEnabled');
  sh.shuffleMediaOn = tgl('f_shuffleMediaOn');
  sh.slideEffectsEnabled = tgl('f_slideEffectsEnabled');
  sh.floatersEnabled = tgl('f_floatersEnabled');
  const pds = $('f_photoDurationSec');
  sh.photoDurationSec = pds && pds.value ? pds.value : '5';
  const ei = $('f_effectsIntensity');
  sh.effectsIntensity = ei ? ei.value : '1';
  const fd = $('f_floaterDensity');
  sh.floaterDensity = fd ? fd.value : '1';
  document.querySelectorAll('input[name="music_mode"]').forEach(r=>{ if(r.checked) sh.music_mode = r.value; });
  for(let i=1;i<=5;i++){
    sh['song'+i+'_on'] = (($('f_song'+i+'_on')||{}).checked) ? 'true' : 'false';
    sh['song'+i+'_url'] = g('f_song'+i+'_url');
    sh['song'+i+'_where'] = (($('f_song'+i+'_where')||{}).value) || 'both';
  }
  sh.vol_card = g('f_vol_card');
  sh.vol_slide = g('f_vol_slide');
  sh.vol_video = g('f_vol_video');
  sh.pinSlideDuration = g('f_pinSlideDuration');
  sh.storySlideDuration = g('f_storySlideDuration');
  sh.pinSlideDefaultSec = g('f_pinSlideDefaultSec');
  sh.storySlideDefaultSec = g('f_storySlideDefaultSec');
  sh.defaultLang = g('f_defaultLang')||'en';
  S.CURR.shared = sh;
}

/* ---------- People repeater ---------- */
function personKey(p,i){ return p.id ? 'p-'+p.id : 'tmp-'+i; }

function renderPeopleRepeater(){
  const w = $('peopleRepeater'); if(!w) return;
  w.innerHTML = '';
  if(!S.PEOPLE.length){
    w.innerHTML = '<div style="padding:.8rem;text-align:center;color:var(--c-text-muted);font-style:italic;font-size:.85rem;">No people yet. Click ➕ Add New Person to create one.</div>';
    const info = $('peopleCountInfo'); if(info) info.textContent = '0 people';
    return;
  }
  const info = $('peopleCountInfo');
  if(info) info.textContent = S.PEOPLE.length+' person'+(S.PEOPLE.length===1?'':'s');

  S.PEOPLE.forEach((p,i)=>{
    const key = personKey(p,i);
    const isExpanded = S.EXPANDED_PEOPLE.has(key);
    const wipeTz = p.wipe_iso_tz || DEFAULT_TZ;
    const wipeLocal = p.wipe_iso ? utcToZonedLocal(p.wipe_iso, wipeTz) : '';
    const wipeBadge = p.wipe_iso ? ('<span class="wipe-badge">🗓️ '+wipeLocal.replace('T',' ')+' ('+wipeTz+')</span>') : '';
    const idPill = '<span class="person-id-pill">#'+(p.id||'new')+'</span>';
    const editPw = getEditPasswordForPerson(p);
    const editPwBadge = editPw
      ? '<span class="editpw-badge">✏️ '+editPw+'</span>'
      : '<span class="editpw-badge" style="background:#f8f8f8;color:#888;border-color:#888;">✏️ needs Requester name + WhatsApp</span>';
    const tzOptsHtml = TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===wipeTz?' selected':''}>${o.l}</option>`).join('');
    const loginId = (p.slug||'—');

    const card = document.createElement('div');
    card.className = 'person-card' + (isExpanded ? ' expanded' : '');
    card.dataset.personIndex = i;
    card.dataset.personKey = key;

    const summary = document.createElement('div');
    summary.className = 'person-summary';
    summary.innerHTML = `
      <div class="pc-emoji">💝</div>
      <div class="pc-body">
        <div class="pc-name">${(p.display_name||'Unnamed').replace(/</g,'&lt;')} ${idPill} ${wipeBadge} ${editPwBadge}</div>
        <div class="pc-meta"><span class="pc-id">Login ID: ${(loginId||'').replace(/</g,'&lt;')}</span></div>
      </div>
      <div class="pc-chev">▼</div>
    `;
    summary.onclick = ()=>{
      if(S.EXPANDED_PEOPLE.has(key)) S.EXPANDED_PEOPLE.delete(key);
      else S.EXPANDED_PEOPLE.add(key);
      renderPeopleRepeater();
    };
    card.appendChild(summary);

    if(isExpanded){
      const det = document.createElement('div');
      det.className = 'person-details';
      det.innerHTML = `
        <div class="panel-field" style="margin-top:.7rem;"><label class="panel-label">Display Name</label><input type="text" class="panel-input" data-pp="display_name" data-i="${i}" value="${(p.display_name||'').replace(/"/g,'&quot;')}"></div>
        <div class="panel-field"><label class="panel-label">Login ID / Slug</label><input type="text" class="panel-input" data-pp="slug" data-i="${i}" value="${(p.slug||'').replace(/"/g,'&quot;')}"></div>
        <div class="panel-field"><label class="panel-label">Birthday</label><input type="date" class="panel-input" data-pp="birthday" data-i="${i}" value="${(p.birthday||'').slice(0,10)}"></div>
        <div class="panel-field"><label class="panel-label">Card Password (viewer)</label><input type="text" class="panel-input" data-pp="password" data-i="${i}" value="${(p.password||'').replace(/"/g,'&quot;')}"></div>
        <div class="panel-field"><label class="panel-label">Requester name (shown on reviews)</label><input type="text" class="panel-input" data-pp="requester_name" data-i="${i}" value="${(p.requester_name||'').replace(/"/g,'&quot;')}" placeholder="e.g. Deep Patel"></div>
        <div class="panel-field"><label class="panel-label">Requester WhatsApp (used for edit password)</label><input type="tel" class="panel-input" data-pp="requester_whatsapp" data-i="${i}" value="${(p.requester_whatsapp||'').replace(/"/g,'&quot;')}" placeholder="e.g. +971 55 348 8512"></div>
        <div class="panel-field" style="padding:.5rem;background:#eef3ff;border:1px dashed #1a3d8f;border-radius:.6rem;">
          <label class="panel-label" style="color:#1a3d8f;">✏️ Requester EDIT password (auto)</label>
          <input type="text" class="panel-input" data-pp="editpw_readonly" data-i="${i}" readonly value="${editPw||''}" style="background:#f4f8ff;font-family:monospace;font-weight:800;color:#1a3d8f;">
          <div style="font-size:.68rem;color:#1a3d8f;font-style:italic;margin-top:.25rem;">Format: {FirstName}-EDIT-{last4digits}-{slug}</div>
        </div>
        <div class="panel-field" style="padding:.5rem;background:#fff0f0;border:1px dashed #8b0028;border-radius:.6rem;">
          <label class="panel-label" style="color:#8b0028;">🗓️ Auto-wipe this person on (date + time + timezone)</label>
          <div class="tz-row">
            <input type="datetime-local" class="panel-input" data-pp="wipe_local" data-i="${i}" value="${wipeLocal}">
            <select class="panel-select tz-select" data-pp="wipe_tz" data-i="${i}">${tzOptsHtml}</select>
          </div>
          <div style="font-size:.7rem;color:#8b0028;font-style:italic;margin-top:.35rem;">Reviews survive wipe.</div>
        </div>
        <div class="panel-field" style="text-align:center;display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;">
          <button type="button" class="repeat-add pw-gen" data-i="${i}" style="background:#2a5fd1;">🎲 Generate Viewer Password</button>
          <button type="button" class="repeat-add share-btn" data-i="${i}" style="background:linear-gradient(135deg,#25D366,#128C7E);">📲 Share via WhatsApp</button>
          <button type="button" class="view-details-btn" data-view-i="${i}">👁️ View Details</button>
          <button type="button" class="panel-btn danger" data-del-person="${i}" style="min-width:0;padding:.4rem .9rem;font-size:.8rem;">🗑️ Delete person</button>
        </div>
      `;
      card.appendChild(det);
    }
    w.appendChild(card);
  });

  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput = el.onchange = ()=>{
      const i = +el.dataset.i;
      if(el.dataset.pp==='editpw_readonly') return;
      if(el.dataset.pp==='wipe_local'){
        const tzEl = w.querySelector('.tz-select[data-pp="wipe_tz"][data-i="'+i+'"]');
        const tz = tzEl ? tzEl.value : DEFAULT_TZ;
        S.PEOPLE[i].wipe_local = el.value;
        S.PEOPLE[i].wipe_iso = el.value ? zonedToUTC(el.value, tz) : null;
        S.PEOPLE[i].wipe_iso_tz = tz;
        renderPeopleRepeater();
      } else if(el.dataset.pp==='wipe_tz'){
        const dtEl = w.querySelector('input[data-pp="wipe_local"][data-i="'+i+'"]');
        const tz = el.value;
        S.PEOPLE[i].wipe_iso_tz = tz;
        if(dtEl && dtEl.value) S.PEOPLE[i].wipe_iso = zonedToUTC(dtEl.value, tz);
        renderPeopleRepeater();
      } else if(el.dataset.pp){
        S.PEOPLE[i][el.dataset.pp] = el.value;
        if(el.dataset.pp==='requester_name' || el.dataset.pp==='requester_whatsapp' || el.dataset.pp==='slug'){
          const prevFocus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.pp;
          const prevVal = document.activeElement ? document.activeElement.value : '';
          renderPeopleRepeater();
          if(prevFocus){
            const sel = '[data-pp="'+prevFocus+'"][data-i="'+i+'"]';
            const nf = w.querySelector(sel);
            if(nf){ nf.focus(); try{ nf.setSelectionRange(prevVal.length, prevVal.length); }catch(e){} }
          }
        }
      }
    };
  });

  w.querySelectorAll('.pw-gen').forEach(b=>{
    b.onclick = (e)=>{
      e.stopPropagation();
      const i = +b.dataset.i;
      const p = S.PEOPLE[i];
      const nm = (p.display_name||'Friend').replace(/[^A-Za-z]/g,'').slice(0,10) || 'Friend';
      let dd = '0000';
      if(p.birthday){ const d = new Date(p.birthday); if(!isNaN(d.getTime())) dd = String(d.getDate()).padStart(2,'0')+String(d.getMonth()+1).padStart(2,'0'); }
      const words = ['Sunshine','Rainbow','Blossom','Starlight','Rose','Lotus','Velvet','Amber','Crystal','Dream'];
      const wd = words[Math.floor(Math.random()*words.length)];
      p.password = nm.charAt(0).toUpperCase()+nm.slice(1).toLowerCase()+'-'+dd+'-'+wd;
      S.EXPANDED_PEOPLE.add(personKey(p,i));
      renderPeopleRepeater();
    };
  });

  w.querySelectorAll('.share-btn').forEach(b=>{
    b.onclick = (e)=>{ e.stopPropagation(); window.openShareModal(S.PEOPLE[+b.dataset.i], null); };
  });

  w.querySelectorAll('[data-view-i]').forEach(b=>{
    b.onclick = (e)=>{ e.stopPropagation(); window.openPersonDetails(S.PEOPLE[+b.dataset.viewI]); };
  });

  w.querySelectorAll('[data-del-person]').forEach(b=>{
    b.onclick = (e)=>{
      e.stopPropagation();
      const i = +b.dataset.delPerson;
      const p = S.PEOPLE[i];
      if(!confirm('Delete "'+(p.display_name||p.slug||'this person')+'"?\n\nClick 💾 Save to apply.')) return;
      S.PEOPLE.splice(i,1);
      renderPeopleRepeater();
      buildAdminPersonDropdown();
    };
  });
}

/* ---------- Add person modal ---------- */
function apResetForm(){
  ['ap_name','ap_slug','ap_password','ap_birthday','ap_requester','ap_requester_wa','ap_wipe_local','ap_editpw_preview'].forEach(id=>{
    const el = $(id); if(el) el.value = '';
  });
  const tzEl = $('ap_wipe_tz');
  if(tzEl){ fillTzSelect(tzEl, DEFAULT_TZ); tzEl.value = DEFAULT_TZ; }
  const st = $('ap_status'); if(st){ st.textContent=''; st.className='panel-status'; }
}
function apRefreshEditPwPreview(){
  const pw = makeRequesterEditPassword($('ap_requester').value, $('ap_requester_wa').value, $('ap_slug').value);
  $('ap_editpw_preview').value = pw;
}
function apGeneratePw(){
  const nm = (($('ap_name').value||'Friend').replace(/[^A-Za-z]/g,'').slice(0,10)) || 'Friend';
  const bday = $('ap_birthday').value;
  let dd = '0000';
  if(bday){ const d = new Date(bday); if(!isNaN(d.getTime())) dd = String(d.getDate()).padStart(2,'0')+String(d.getMonth()+1).padStart(2,'0'); }
  const words = ['Sunshine','Rainbow','Blossom','Starlight','Rose','Lotus','Velvet','Amber','Crystal','Dream'];
  const wd = words[Math.floor(Math.random()*words.length)];
  $('ap_password').value = nm.charAt(0).toUpperCase()+nm.slice(1).toLowerCase()+'-'+dd+'-'+wd;
}
function apOpenModal(){
  apResetForm();
  const tzEl = $('ap_wipe_tz');
  if(tzEl && tzEl.options.length===0){
    TZ_OPTIONS.forEach(o=>{ const opt = document.createElement('option'); opt.value = o.v; opt.textContent = o.l; tzEl.appendChild(opt); });
  }
  if(tzEl) tzEl.value = DEFAULT_TZ;
  show($('addPersonModal'));
  setTimeout(()=>$('ap_name').focus(), 150);
}

async function apSavePerson(){
  const st = $('ap_status');
  const name = $('ap_name').value.trim();
  const slug = $('ap_slug').value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  const password = $('ap_password').value.trim();
  const birthday = $('ap_birthday').value.trim();
  const requester_name = $('ap_requester').value.trim();
  const requester_whatsapp = $('ap_requester_wa').value.trim();
  const wipeLocal = $('ap_wipe_local').value;
  const tzEl = $('ap_wipe_tz');
  const wipeTz = tzEl ? tzEl.value : DEFAULT_TZ;
  if(!name){ st.textContent='❌ Display Name is required.'; st.className='panel-status err'; return false; }
  if(!slug){ st.textContent='❌ Login ID / Slug is required.'; st.className='panel-status err'; return false; }
  const dupe = S.PEOPLE.find(p=>p.slug && p.slug.toLowerCase()===slug);
  if(dupe){ st.textContent='❌ Login ID "'+slug+'" is already used.'; st.className='panel-status err'; return false; }
  const wipeIso = wipeLocal ? zonedToUTC(wipeLocal, wipeTz) : null;
  const row = {slug, display_name:name, password:password||'', birthday:birthday||null, wipe_iso:wipeIso, enabled:true, sort_order:S.PEOPLE.length, requester_name:requester_name||'', requester_whatsapp:requester_whatsapp||''};
  st.textContent = '⏳ Saving to cloud…'; st.className = 'panel-status';
  let savedId = null;
  try{
    const r = await sb.insPerson(row);
    if(r && r[0] && r[0].id) savedId = r[0].id;
  }catch(e){
    const msg = (e.message||'').toLowerCase();
    if(msg.includes('requester_whatsapp')) delete row.requester_whatsapp;
    if(msg.includes('requester_name')) delete row.requester_name;
    if(msg.includes('wipe_iso')) delete row.wipe_iso;
    if(msg.includes('birthday')) delete row.birthday;
    try{
      const r2 = await sb.insPerson(row);
      if(r2 && r2[0] && r2[0].id) savedId = r2[0].id;
    }catch(e2){ st.textContent = '❌ '+((e2.message||'').slice(0,180)); st.className='panel-status err'; return false; }
  }
  if(!savedId){ st.textContent='❌ Person not saved (no id returned).'; st.className='panel-status err'; return false; }
  const newPerson = {id:savedId, slug, display_name:name, password:password||'', birthday:birthday||'', requester_name:requester_name||'', requester_whatsapp:requester_whatsapp||'', wipe_iso:wipeIso||null, wipe_iso_tz:wipeTz, enabled:true, sort_order:S.PEOPLE.length};
  S.PEOPLE.push(newPerson);
  S.EXPANDED_PEOPLE.add(personKey(newPerson, S.PEOPLE.length-1));
  if(window.buildHome) window.buildHome();
  renderPeopleRepeater();
  buildAdminPersonDropdown();
  st.textContent = '✅ Saved "'+name+'" (#'+savedId+')'; st.className='panel-status ok';
  return true;
}

/* ---------- Repeaters: gifts, story, events, voice, video, pins, media ---------- */
function renderAdminGifts(){
  const w = $('giftsRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.gifts||[]).forEach((g,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Emoji</label><input type="text" class="panel-input" data-gg="emoji" data-i="${i}" value="${(g.emoji||'🎁')}"></div>
      <div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-gg="title" data-i="${i}" value="${(g.title||'').replace(/"/g,'&quot;')}"></div>
      <div class="panel-field"><label class="panel-label">Message</label><textarea class="panel-textarea" data-gg="message" data-i="${i}">${(g.message||'')}</textarea></div>
      <div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-gg="photo_drive_id" data-i="${i}" value="${(g.photo_drive_id||'')}"></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input,textarea').forEach(el=>{ el.oninput = ()=>{ S.CURR.gifts[+el.dataset.i][el.dataset.gg] = el.value; }; });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.gifts.splice(+b.dataset.i,1); renderAdminGifts(); }; });
}

function renderAdminStory(){
  const w = $('storyRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.story||[]).forEach((s,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-st="title" data-i="${i}" value="${(s.title||'').replace(/"/g,'&quot;')}"></div>
      <div class="panel-field"><label class="panel-label">Body</label><textarea class="panel-textarea" data-st="body" data-i="${i}">${(s.body||'')}</textarea></div>
      <div class="panel-field"><label class="panel-label">Photo Drive ID (comma-separate for slideshow)</label><input type="text" class="panel-input" data-st="photo_drive_id" data-i="${i}" value="${(s.photo_drive_id||'')}"></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input,textarea').forEach(el=>{ el.oninput = ()=>{ S.CURR.story[+el.dataset.i][el.dataset.st] = el.value; }; });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.story.splice(+b.dataset.i,1); renderAdminStory(); }; });
}

function renderAdminEvents(){
  const w = $('eventsRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.events||[]).forEach((ev,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    const tz = ev.target_iso_tz || DEFAULT_TZ;
    const local = ev.target_iso ? utcToZonedLocal(ev.target_iso, tz) : '';
    const tzOptsHtml = TZ_OPTIONS.map(o=>`<option value="${o.v}"${o.v===tz?' selected':''}>${o.l}</option>`).join('');
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Icon</label><input type="text" class="panel-input" data-ev="icon" data-i="${i}" value="${(ev.icon||'📅')}"></div>
      <div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-ev="label" data-i="${i}" value="${(ev.label||'').replace(/"/g,'&quot;')}"></div>
      <div class="panel-field"><label class="panel-label">Target date &amp; time + timezone</label><div class="tz-row"><input type="datetime-local" class="panel-input" data-ev="target_local" data-i="${i}" value="${local}"><select class="panel-select tz-select" data-ev="target_tz" data-i="${i}">${tzOptsHtml}</select></div></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input,select').forEach(el=>{
    el.oninput = el.onchange = ()=>{
      const i = +el.dataset.i;
      if(el.dataset.ev==='target_local'){
        const tzEl = w.querySelector('.tz-select[data-ev="target_tz"][data-i="'+i+'"]');
        const tz = tzEl ? tzEl.value : DEFAULT_TZ;
        S.CURR.events[i].target_iso = el.value ? zonedToUTC(el.value, tz) : '';
        S.CURR.events[i].target_iso_tz = tz;
      } else if(el.dataset.ev==='target_tz'){
        const dtEl = w.querySelector('input[data-ev="target_local"][data-i="'+i+'"]');
        const tz = el.value;
        S.CURR.events[i].target_iso_tz = tz;
        if(dtEl && dtEl.value) S.CURR.events[i].target_iso = zonedToUTC(dtEl.value, tz);
      } else if(el.dataset.ev){ S.CURR.events[i][el.dataset.ev] = el.value; }
    };
  });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.events.splice(+b.dataset.i,1); renderAdminEvents(); }; });
}

function renderAdminVoice(){
  const w = $('voiceRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.voice||[]).forEach((v,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-vc="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div>
      <div class="panel-field"><label class="panel-label">Audio URL</label><input type="text" class="panel-input" data-vc="audio_url" data-i="${i}" value="${(v.audio_url||'')}"></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input').forEach(el=>{ el.oninput = ()=>{ S.CURR.voice[+el.dataset.i][el.dataset.vc] = el.value; }; });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.voice.splice(+b.dataset.i,1); renderAdminVoice(); }; });
}

function renderAdminVideo(){
  const w = $('videoRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.video||[]).forEach((v,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-vd="title" data-i="${i}" value="${(v.title||'').replace(/"/g,'&quot;')}"></div>
      <div class="panel-field"><label class="panel-label">Video URL</label><input type="text" class="panel-input" data-vd="video_url" data-i="${i}" value="${(v.video_url||'')}"></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input').forEach(el=>{ el.oninput = ()=>{ S.CURR.video[+el.dataset.i][el.dataset.vd] = el.value; }; });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.video.splice(+b.dataset.i,1); renderAdminVideo(); }; });
}

function renderAdminPins(){
  const w = $('pinsRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.pins||[]).forEach((p,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Label</label><input type="text" class="panel-input" data-pn="label" data-i="${i}" value="${(p.label||'').replace(/"/g,'&quot;')}"></div>
      <div class="panel-field"><label class="panel-label">Lat</label><input type="text" class="panel-input" data-pn="lat" data-i="${i}" value="${p.lat||''}"></div>
      <div class="panel-field"><label class="panel-label">Lng</label><input type="text" class="panel-input" data-pn="lng" data-i="${i}" value="${p.lng||''}"></div>
      <div class="panel-field"><label class="panel-label">Photo IDs (comma-separate for slideshow)</label><input type="text" class="panel-input" data-pn="photo_drive_id" data-i="${i}" value="${(p.photo_drive_id||'')}"></div>
      <div class="panel-field"><label class="panel-label">Story</label><textarea class="panel-textarea" data-pn="story" data-i="${i}">${(p.story||'')}</textarea></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input,textarea').forEach(el=>{ el.oninput = ()=>{ S.CURR.pins[+el.dataset.i][el.dataset.pn] = el.value; }; });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.pins.splice(+b.dataset.i,1); renderAdminPins(); }; });
}

function renderAdminMedia(){
  const w = $('mediaRepeater'); if(!w) return; w.innerHTML = '';
  (S.CURR.media||[]).forEach((m,i)=>{
    const row = document.createElement('div'); row.className = 'repeat-row';
    row.innerHTML = `<button type="button" class="repeat-remove" data-i="${i}">✕</button>
      <div class="panel-field"><label class="panel-label">Type</label><select class="panel-select" data-md="type" data-i="${i}"><option value="photo"${m.type==='photo'?' selected':''}>Photo</option><option value="video"${m.type==='video'?' selected':''}>Video</option></select></div>
      <div class="panel-field"><label class="panel-label">Drive ID (photo)</label><input type="text" class="panel-input" data-md="drive_id" data-i="${i}" value="${(m.drive_id||'')}"></div>
      <div class="panel-field"><label class="panel-label">Direct URL (video/photo)</label><input type="text" class="panel-input" data-md="src" data-i="${i}" value="${(m.src||'')}"></div>
      <div class="panel-field"><label class="panel-label">Title</label><input type="text" class="panel-input" data-md="title" data-i="${i}" value="${(m.title||'').replace(/"/g,'&quot;')}"></div>`;
    w.appendChild(row);
  });
  w.querySelectorAll('input,select').forEach(el=>{ el.onchange = el.oninput = ()=>{ S.CURR.media[+el.dataset.i][el.dataset.md] = el.value; }; });
  w.querySelectorAll('.repeat-remove').forEach(b=>{ b.onclick = ()=>{ S.CURR.media.splice(+b.dataset.i,1); renderAdminMedia(); }; });
}

/* ---------- Admin save-all ---------- */
async function saveAdminAll(){
  saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
  readAdminFields();
  const sh = S.CURR.shared || {};

  /* ✅ Music shuffle removed — always use the order entered */
  sh.musicOrder = '';

  if(String(sh.shuffleMediaOn)==='true'){
    const n = (S.CURR.media||[]).length;
    sh.mediaOrder = n>1 ? shuffleArray(Array.from({length:n},(_,i)=>i)).join(',') : '';
  }else{
    sh.mediaOrder = '';
  }

  const dbPeople = await sb.people() || [];
  const dbIds = new Set(dbPeople.map(p=>p.id));
  const keepIds = new Set();
  const usedSlugs = new Set();
  for(let i=0;i<S.PEOPLE.length;i++){
    const p = S.PEOPLE[i];
    if(!p.display_name && !p.slug) continue;
    let slug = (p.slug||('person-'+Date.now()+'-'+i)).toLowerCase().replace(/[^a-z0-9\-_]/g,'');
    while(usedSlugs.has(slug)) slug = slug+'-'+Math.floor(Math.random()*1000);
    usedSlugs.add(slug); p.slug = slug;
    const row = {slug, display_name:p.display_name||('Person '+(i+1)), password:p.password||'', birthday:p.birthday||null, wipe_iso:p.wipe_iso||null, enabled:true, sort_order:i, requester_name:p.requester_name||'', requester_whatsapp:p.requester_whatsapp||''};
    if(!p.id){
      let r;
      try{ r = await sb.insPerson(row); }
      catch(e){
        delete row.wipe_iso; delete row.birthday; delete row.requester_whatsapp; delete row.requester_name;
        r = await sb.insPerson(row);
      }
      if(r && r[0] && r[0].id) p.id = r[0].id;
    }else{
      try{ await sb.updPerson(p.id, row); }
      catch(e){
        delete row.wipe_iso; delete row.birthday; delete row.requester_whatsapp; delete row.requester_name;
        await sb.updPerson(p.id, row);
      }
    }
    if(p.id) keepIds.add(p.id);
  }
  const toDelete = [];
  dbIds.forEach(id=>{ if(!keepIds.has(id)) toDelete.push(id); });
  for(const id of toDelete) await wipeOnePerson(id);

  const tasks = [];
  if(S.CURRENT_PERSON && S.CURRENT_PERSON.id){
    const pid = S.CURRENT_PERSON.id;
    const settings = {};
    Object.keys(S.CURR.shared).forEach(k=>{ settings['shared__'+k] = S.CURR.shared[k]; });
    ['en','gu','hi'].forEach(lang=>{
      const tl = S.CURRENT_TEXTS_BY_LANG[lang]||{};
      TEXT_FIELDS.forEach(f=>{ settings['texts__'+lang+'_'+f] = tl[f]!==undefined ? tl[f] : ''; });
    });
    tasks.push(sb.upSet(settings, pid));

    const wi = async (table, rows)=>{
      await sb.wipe(table, pid);
      const clean = rows.filter(r=>r);
      if(clean.length) await sb.insBatch(table, clean);
    };
    tasks.push(wi(T_GIFTS, (S.CURR.gifts||[]).filter(g=>g.title||g.message||g.photo_drive_id).map(g=>({person_id:pid, emoji:g.emoji||'🎁', title:g.title||'', message:g.message||'', photo_drive_id:g.photo_drive_id||''}))));
    tasks.push(wi(T_STORY, (S.CURR.story||[]).filter(s=>s.title||s.body).map(s=>({person_id:pid, title:s.title||'', body:s.body||'', photo_drive_id:s.photo_drive_id||''}))));
    tasks.push(wi(T_EVENTS, (S.CURR.events||[]).filter(e=>e.label||e.target_iso).map(e=>({person_id:pid, icon:e.icon||'📅', label:e.label||'', target_iso:e.target_iso||''}))));
    tasks.push(wi(T_VOICE, (S.CURR.voice||[]).filter(v=>v.audio_url).map(v=>({person_id:pid, title:v.title||'', audio_url:v.audio_url||''}))));
    tasks.push(wi(T_VIDEO, (S.CURR.video||[]).filter(v=>v.video_url).map(v=>({person_id:pid, title:v.title||'', video_url:v.video_url||''}))));
    tasks.push(wi(T_PINS, (S.CURR.pins||[]).filter(p=>p.lat&&p.lng).map(p=>({person_id:pid, label:p.label||'', lat:p.lat, lng:p.lng, photo_drive_id:p.photo_drive_id||'', story:p.story||''}))));
    const cleanMedia = dedupeMedia((S.CURR.media||[]).filter(m=>m.drive_id||m.src));
    tasks.push(wi(T_MEDIA, cleanMedia.map(m=>({person_id:pid, type:m.type||'photo', drive_id:m.drive_id||'', src:m.src||'', title:m.title||'', sort_order:0}))));
  }
  const gsSet = { shared__adminLoginEnabled : String(S.CURR.shared.adminLoginEnabled!=='false') };
  tasks.push(sb.upSet(gsSet, null));
  await Promise.all(tasks);

  S.PEOPLE = await sb.people() || [];
  if(window.buildHome) window.buildHome();
  renderPeopleRepeater();
  buildAdminPersonDropdown();
}

/* ---------- Person details modal ---------- */
window.openPersonDetails = async function(p){
  if(!p){ alert('No person.'); return; }
  const titleEl = $('personDetailsTitle'), subEl = $('personDetailsSub'), bodyEl = $('personDetailsBody');
  titleEl.textContent = '👁️ #'+(p.id||'new')+' — '+(p.display_name||p.slug||'Person');
  const wipeDisplay = p.wipe_iso ? (utcToZonedLocal(p.wipe_iso, p.wipe_iso_tz||DEFAULT_TZ).replace('T',' ')+' ('+(p.wipe_iso_tz||DEFAULT_TZ)+')') : '';
  const editPw = getEditPasswordForPerson(p);
  subEl.textContent = 'Login ID: '+(p.slug||'—')+(p.birthday?' · Birthday: '+p.birthday:'')+' · Card PW: '+(p.password||'(not set)')+' · Edit PW: '+(editPw||'(missing requester info)')+(p.requester_name?' · Requester: '+p.requester_name:'')+(wipeDisplay?' · 🗓️ Wipes on: '+wipeDisplay:'');
  bodyEl.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--c-text-muted);font-style:italic;">Loading…</div>';
  show($('personDetailsModal'));

  let set = {}, gifts = [], story = [], events = [], voice = [], video = [], pins = [], media = [], reviews = [];
  if(p.id){
    try{
      set = await sb.getSet(p.id) || {};
      const [g,s,e,vo,vi,pi,me] = await Promise.all([
        sb.rows(T_GIFTS,p.id), sb.rows(T_STORY,p.id), sb.rows(T_EVENTS,p.id),
        sb.rows(T_VOICE,p.id), sb.rows(T_VIDEO,p.id), sb.rows(T_PINS,p.id), sb.rows(T_MEDIA,p.id)
      ]);
      gifts = g||[]; story = s||[]; events = e||[]; voice = vo||[]; video = vi||[]; pins = pi||[]; media = me||[];
      const allR = S.REVIEWS||[];
      reviews = allR.filter(r=>(r.person_id===p.id) || (r.person_slug && p.slug && r.person_slug.toLowerCase()===p.slug.toLowerCase()));
    }catch(e){ console.warn(e); }
  }else{
    const en = (S.CURRENT_TEXTS_BY_LANG && S.CURRENT_TEXTS_BY_LANG.en) || {};
    const gu = (S.CURRENT_TEXTS_BY_LANG && S.CURRENT_TEXTS_BY_LANG.gu) || {};
    const hi = (S.CURRENT_TEXTS_BY_LANG && S.CURRENT_TEXTS_BY_LANG.hi) || {};
    TEXT_FIELDS.forEach(f=>{
      if(en[f]!==undefined) set['texts__en_'+f] = en[f];
      if(gu[f]!==undefined) set['texts__gu_'+f] = gu[f];
      if(hi[f]!==undefined) set['texts__hi_'+f] = hi[f];
    });
    Object.keys(S.CURR.shared||{}).forEach(k=>{ set['shared__'+k] = S.CURR.shared[k]; });
    gifts = S.CURR.gifts||[]; story = S.CURR.story||[]; events = S.CURR.events||[]; voice = S.CURR.voice||[]; video = S.CURR.video||[]; pins = S.CURR.pins||[]; media = S.CURR.media||[];
  }
  const shared = {}; const texts = {en:{},gu:{},hi:{}};
  Object.keys(set).forEach(k=>{
    if(k.startsWith('shared__')){ shared[k.substring(8)] = set[k]; return; }
    if(k.startsWith('texts__en_')){ texts.en[k.substring(9)] = set[k]; return; }
    if(k.startsWith('texts__gu_')){ texts.gu[k.substring(9)] = set[k]; return; }
    if(k.startsWith('texts__hi_')){ texts.hi[k.substring(9)] = set[k]; return; }
    if(k.startsWith('texts__')){ texts.en[k.substring(7)] = set[k]; return; }
  });
  const esc = s => String(s==null?'':s).replace(/</g,'&lt;');
  const row = (label,val)=>{ if(val===undefined||val===null||val==='') return ''; return '<div class="detail-row"><strong>'+label+':</strong> '+esc(val)+'</div>'; };
  const thumbs = (items,getter)=>{ const html = items.map(getter).filter(Boolean); if(!html.length) return ''; return '<div class="thumb-grid">'+html.map(u=>'<div class="thumb"><img src="'+u+'" loading="lazy"></div>').join('')+'</div>'; };
  let h = '';
  const link = PUBLIC_CARD_LINK + (p.slug ? ('?person='+encodeURIComponent(p.slug)) : '');
  h += '<div class="detail-block"><div class="detail-block-title">👤 Person</div>'
    + row('ID',p.id) + row('Display Name',p.display_name) + row('Login ID / Slug',p.slug)
    + row('Birthday',p.birthday) + row('Card Password (viewer)',p.password||'(not set)')
    + row('Requester name',p.requester_name||'')
    + row('Requester WhatsApp',p.requester_whatsapp||'')
    + row('✏️ Requester EDIT password',editPw||'(missing requester name/whatsapp)')
    + row('🗓️ Wipe on',p.wipe_iso ? (new Date(p.wipe_iso).toISOString()+' · '+utcToZonedLocal(p.wipe_iso, p.wipe_iso_tz||DEFAULT_TZ)+' '+(p.wipe_iso_tz||DEFAULT_TZ)) : '')
    + row('Card link',link)
    + '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">⭐ Reviews for this person ('+reviews.length+')</div>';
  if(!reviews.length) h += '<div class="detail-count">No reviews yet.</div>';
  reviews.forEach(r=>{
    const stars = Math.max(1, Math.min(5, parseInt(r.stars)||0));
    h += '<div class="detail-row" style="color:#ffb703;font-size:.95rem;letter-spacing:2px;">'+'★'.repeat(stars)+'<span style="color:#ddd;">'+'★'.repeat(5-stars)+'</span></div>';
    h += '<div class="detail-row" style="padding-left:.3rem;">"'+(r.message||'').replace(/</g,'&lt;')+'"</div>';
    if(r.email) h += '<div class="detail-row" style="padding-left:.3rem;font-size:.75rem;color:var(--c-text-muted);">Email: '+(r.email||'').replace(/</g,'&lt;')+'</div>';
  });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">🎨 Theme & Features</div>'
    + row('Theme',shared.theme||'(default: romantic)')
    + row('Default language',shared.defaultLang||'(default: en)')
    + row('Music mode',shared.music_mode)
    + row('Card volume',shared.vol_card)
    + row('Slideshow volume',shared.vol_slide)
    + row('Video volume',shared.vol_video)
    + row('Photo duration (sec)',shared.photoDurationSec)
    + row('Slide effects enabled',shared.slideEffectsEnabled==='true'?'✅ On':'❌ Off')
    + row('Effects intensity',shared.effectsIntensity)
    + row('Floaters enabled',shared.floatersEnabled==='true'?'✅ On':'❌ Off')
    + row('Floater density',shared.floaterDensity)
    + row('Shuffle media on save',shared.shuffleMediaOn==='true'?'✅ On':'❌ Off');
  ['enableFireworks','enableGiftBox','enableVoiceMsg','enableVideoMsg','enableEventCount','enableStory','enableMap','enableUpload','showLockScreen','pinSlideshowEnabled','storySlideshowEnabled'].forEach(k=>{
    h += row(k, shared[k]==='true'?'✅ On':'❌ Off');
  });
  for(let i=1;i<=5;i++){
    if(shared['song'+i+'_url']) h += row('Song '+i+' ('+(shared['song'+i+'_where']||'both')+')', shared['song'+i+'_url']+' '+(shared['song'+i+'_on']==='true'?'✅':'❌'));
  }
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">💕 Counters</div>';
  COUNTERS.forEach((c,idx)=>{
    const on = String(shared[c.showKey])!=='false';
    const tz = shared[c.tzKey] || DEFAULT_TZ;
    const local = shared[c.dtKey] ? utcToZonedLocal(shared[c.dtKey], tz) : '';
    h += row('Counter '+(idx+1)+' show', on?'✅ On':'❌ Off');
    h += row('Counter '+(idx+1)+' label', shared[c.labelKey]);
    h += row('Counter '+(idx+1)+' date (UTC)', shared[c.dtKey]);
    h += row('Counter '+(idx+1)+' date ('+tz+')', local);
    h += row('Counter '+(idx+1)+' display', shared[c.dispKey]);
  });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">🔓 Unlock</div>'
    + row('Unlock date (UTC)',shared.unlockDateISO)
    + row('Unlock timezone',shared.unlockDateISO_tz)
    + row('Unlock local',shared.unlockDateISO ? utcToZonedLocal(shared.unlockDateISO, shared.unlockDateISO_tz||DEFAULT_TZ) : '')
    + '</div>';
  ['en','gu','hi'].forEach(lang=>{
    const tl = texts[lang]||{}; let any = false;
    TEXT_FIELDS.forEach(k=>{ if(tl[k]) any = true; });
    if(!any && lang!=='en') return;
    h += '<div class="detail-block"><div class="detail-block-title">💌 Texts — '+lang.toUpperCase()+'</div>';
    if(!any) h += '<div class="detail-count">No text saved for this language.</div>';
    TEXT_FIELDS.forEach(k=>{ if(tl[k]) h += row(k, tl[k]); });
    h += '</div>';
  });
  h += '<div class="detail-block"><div class="detail-block-title">🎁 Gifts ('+gifts.length+')</div>';
  if(!gifts.length) h += '<div class="detail-count">No gifts.</div>';
  gifts.forEach((g,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc((g.emoji||'🎁')+' '+(g.title||''))+'</div>'; if(g.message) h += '<div class="detail-row" style="padding-left:1rem;">💬 '+esc(g.message)+'</div>'; if(g.photo_drive_id) h += '<div class="detail-row" style="padding-left:1rem;">📷 Drive: '+esc(g.photo_drive_id)+'</div>'; });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">📖 Story ('+story.length+')</div>';
  if(!story.length) h += '<div class="detail-count">No story.</div>';
  story.forEach((s,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(s.title||'')+'</div>'; if(s.body) h += '<div class="detail-row" style="padding-left:1rem;">'+esc(s.body)+'</div>'; if(s.photo_drive_id) h += '<div class="detail-row" style="padding-left:1rem;">📷 '+esc(s.photo_drive_id)+'</div>'; });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">📅 Events ('+events.length+')</div>';
  if(!events.length) h += '<div class="detail-count">No events.</div>';
  events.forEach((e,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc((e.icon||'📅')+' '+(e.label||''))+' — '+esc(e.target_iso)+'</div>'; });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">🔊 Voice ('+voice.length+')</div>';
  if(!voice.length) h += '<div class="detail-count">No voice.</div>';
  voice.forEach((v,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(v.title||'')+' — '+esc(v.audio_url||'')+'</div>'; });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">🎬 Video ('+video.length+')</div>';
  if(!video.length) h += '<div class="detail-count">No video.</div>';
  video.forEach((v,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(v.title||'')+' — '+esc(v.video_url||'')+'</div>'; });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">🗺️ Pins ('+pins.length+')</div>';
  if(!pins.length) h += '<div class="detail-count">No pins.</div>';
  pins.forEach((pp,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(pp.label||'')+' — '+esc(pp.lat)+', '+esc(pp.lng)+'</div>'; if(pp.photo_drive_id) h += '<div class="detail-row" style="padding-left:1rem;">📷 '+esc(pp.photo_drive_id)+'</div>'; if(pp.story) h += '<div class="detail-row" style="padding-left:1rem;">'+esc(pp.story)+'</div>'; });
  h += '</div>';
  h += '<div class="detail-block"><div class="detail-block-title">📸 Slideshow ('+media.length+')</div>';
  if(!media.length) h += '<div class="detail-count">No photos.</div>';
  media.forEach((m,i)=>{ h += '<div class="detail-row"><strong>'+(i+1)+'.</strong> '+esc(m.type||'photo')+' '+esc(m.drive_id||m.src||'')+'</div>'; });
  h += thumbs(media, m=> m.drive_id ? ('https://lh3.googleusercontent.com/d/'+m.drive_id+'=w300') : (m.src||''));
  h += '</div>';
  bodyEl.innerHTML = h;
};

/* ---------- Admin reviews ---------- */
window.renderAdminReviews = function(){
  const el = $('adminReviewsList'); if(!el) return;
  const revs = S.REVIEWS || [];
  if(!revs.length){ el.innerHTML = '<div style="padding:.6rem;color:var(--c-text-muted);">No reviews yet.</div>'; return; }
  el.innerHTML = revs.map(r=>{
    const stars = Math.max(1, Math.min(5, parseInt(r.stars)||0));
    const date = r.created_at ? new Date(r.created_at).toLocaleString() : '';
    return `<div class="repeat-row" style="background:#fffdf8;">
      <div style="font-size:1rem;color:#ffb703;letter-spacing:2px;">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div>
      <div style="font-size:.85rem;line-height:1.6;margin-top:.3rem;">
        <strong>Person:</strong> ${(r.person_name||r.person_slug||'').replace(/</g,'&lt;')} ${r.person_slug?('<span class="person-id-pill">#'+r.person_slug.replace(/</g,'&lt;')+'</span>'):''}<br>
        <strong>Requester:</strong> ${(r.requester_name||'Admin').replace(/</g,'&lt;')}<br>
        <strong>Email:</strong> ${r.email?(String(r.email).replace(/</g,'&lt;')):'<em style="color:#a06c7a;">(none)</em>'}<br>
        <strong>When:</strong> ${date}
      </div>
      <div style="font-size:.9rem;line-height:1.6;font-style:italic;margin-top:.4rem;">"${(r.message||'').replace(/</g,'&lt;')}"</div>
      <div style="margin-top:.5rem;">
        <button type="button" class="panel-btn danger" style="min-width:0;padding:.35rem .8rem;font-size:.78rem;" data-del="${r.id}">🗑️ Delete review</button>
      </div>
    </div>`;
  }).join('');
  el.querySelectorAll('[data-del]').forEach(b=>{
    b.onclick = async ()=>{
      if(!confirm('Delete this review?')) return;
      try{
        await sb.delReview(parseInt(b.dataset.del));
        __showToast('🗑️ Deleted');
        await window.loadReviews();
      }catch(e){ __showToast('❌ '+e.message, false); }
    };
  });
};

/* ---------- Share modal ---------- */
let SHARE_CTX = {person:null, guest:null};
window.openShareModal = function(person, guest){
  if(!person){ __showToast('❌ No person to share', false); return; }
  if(!person.id){ __showToast('❌ Save the person first', false); return; }
  SHARE_CTX = {person, guest};
  const link = PUBLIC_CARD_LINK + (person.slug ? ('?person='+encodeURIComponent(person.slug)) : '');
  const requesterName = (guest && guest.guest_name) || (guest && guest.payload && guest.payload.guest_info && guest.payload.guest_info.name) || person.requester_name || '';
  const requesterWa = (guest && guest.guest_whatsapp) || (guest && guest.payload && guest.payload.guest_info && guest.payload.guest_info.whatsapp) || person.requester_whatsapp || '';
  const editPw = getEditPasswordForPerson(Object.assign({}, person, {requester_name:requesterName, requester_whatsapp:requesterWa}));
  const wa = String(requesterWa||'').replace(/[^0-9]/g,'');
  txt($('shareModalTitle'), '📲 Share "'+(person.display_name||person.slug)+'" with requester');
  const esc = s => String(s==null?'':s).replace(/</g,'&lt;');
  const body =
    '<div style="background:#fffdf8;border:1px dashed rgba(196,30,58,.35);border-radius:.8rem;padding:.8rem;margin-bottom:.8rem;font-size:.88rem;line-height:1.7;">'
    +'<div style="font-weight:900;color:var(--c-primary);margin-bottom:.5rem;">🔑 Card credentials</div>'
    +'<div><strong>Login ID / Slug:</strong> <code style="background:#fff0f0;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#8b0028;">'+esc(person.slug||'')+'</code></div>'
    +'<div><strong>Card Password (viewer):</strong> <code style="background:#fff0f0;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#8b0028;">'+esc(person.password||'(not set)')+'</code></div>'
    +'<div><strong>Requester EDIT password:</strong> <code style="background:#eef3ff;padding:.15rem .45rem;border-radius:.35rem;font-family:monospace;color:#1a3d8f;">'+esc(editPw||'(add Requester name + WhatsApp)')+'</code></div>'
    +'<div style="margin-top:.5rem;"><strong>Card link:</strong> <a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer" style="color:#0a4f8f;word-break:break-all;">'+esc(link)+'</a></div>'
    +'</div>'
    +'<div style="background:linear-gradient(135deg,#e8f5f0,#d3ede1);border:2px solid #0d5c4a;border-radius:.8rem;padding:.8rem;margin-bottom:.8rem;font-size:.86rem;line-height:1.7;">'
    +'<div style="font-weight:900;color:#0d5c4a;margin-bottom:.45rem;">📲 Send to requester (WhatsApp)</div>'
    +'<div><strong>Requester:</strong> '+esc(requesterName||'(unknown)')+'</div>'
    +'<div><strong>Number:</strong> '+esc(wa||'(not provided)')+'</div>'
    +'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;">'
    +'<button type="button" class="panel-btn wa" id="shareWaBtn">💬 Send on WhatsApp</button>'
    +'<button type="button" class="panel-btn save" id="shareCopyBtn">📋 Copy message</button>'
    +'<button type="button" class="panel-btn cancel" id="shareCloseBtn">Close</button>'
    +'</div>';
  $('shareModalBody').innerHTML = body;
  show($('shareModal'));
  const msg = buildShareMessage(requesterName, person, link, editPw);
  $('shareWaBtn').onclick = ()=>{
    const url = wa ? ('https://wa.me/'+wa+'?text='+encodeURIComponent(msg)) : ('https://wa.me/?text='+encodeURIComponent(msg));
    window.open(url, '_blank');
    if(SHARE_CTX.guest && SHARE_CTX.guest.id){
      sb.updGuest(SHARE_CTX.guest.id, {approved_login_id:person.slug||'', approved_password:person.password||'', approved_share_link:link, approved_at:new Date().toISOString()}).catch(()=>{});
    }
  };
  $('shareCopyBtn').onclick = async ()=>{
    try{ await navigator.clipboard.writeText(msg); __showToast('✅ Message copied'); }
    catch(e){ prompt('Copy this message:', msg); }
  };
  $('shareCloseBtn').onclick = ()=> hide($('shareModal'));
};

function buildShareMessage(requesterName, person, link, editPw){
  const name = requesterName || 'there';
  return ['Hi '+name+' 💕','','Your surprise for *'+(person.display_name||person.slug)+'* is ready! 🎉','','🔑 Login ID: '+(person.slug||''),'🔒 Card Password (viewer): '+(person.password||''),'✏️ Requester EDIT password: '+(editPw||''),'🌐 Open here: '+link,'','How to use:','• To VIEW the surprise → use the Card Password.','• To EDIT the card → use the Requester EDIT password (you will see an ✏️ Edit Card button).','','Steps:','1) Open the link above.','2) Tap the button with the person\'s name.','3) Enter the Card Password (view) OR the Requester EDIT password (edit).','4) Tap the 🎂 cake to reveal the surprise.','','Enjoy! 💖'].join('\n');
}

/* ---------- Admin boot / wiring ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const cancel = $('adminPwCancel'); if(cancel) cancel.onclick = ()=> hide($('adminLoginModal'));
  const confirm = $('adminPwConfirm'); if(confirm) confirm.onclick = ()=> window.tryAdminFull();
  const input = $('adminPwInput'); if(input) input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); window.tryAdminFull(); } });

  document.querySelectorAll('#adminLangTabs button').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('#adminLangTabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
      S.ADMIN_EDIT_LANG = btn.dataset.adminLang;
      applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
    };
  });

  document.querySelectorAll('#themeGrid .theme-swatch').forEach(el=>{
    el.onclick = ()=>{
      S.CURR.shared.theme = el.dataset.themePick;
      document.querySelectorAll('#themeGrid .theme-swatch').forEach(x=>x.classList.toggle('selected', x===el));
      document.body.setAttribute('data-theme', el.dataset.themePick);
    };
  });

  document.addEventListener('input', (e)=>{
    ['f_vol_card','f_vol_slide','f_vol_video','f_pinSlideDuration','f_storySlideDuration','f_effectsIntensity'].forEach(id=>{
      if(e.target && e.target.id===id){ const lab = $(id+'_val'); if(lab) lab.textContent = e.target.value; }
    });
    if(e.target && e.target.id==='f_floaterDensity'){ const lab = $('f_floaterDensity_val'); if(lab) lab.textContent = e.target.value; }
  });

  const openAdd = $('openAddPersonBtn'); if(openAdd) openAdd.onclick = ()=> apOpenModal();
  const closeAdd = $('addPersonClose'); if(closeAdd) closeAdd.onclick = ()=> hide($('addPersonModal'));
  const apCancel = $('ap_cancel'); if(apCancel) apCancel.onclick = ()=> hide($('addPersonModal'));
  const apGen = $('ap_generatePw'); if(apGen) apGen.onclick = ()=> apGeneratePw();
  ['ap_requester','ap_requester_wa','ap_slug'].forEach(id=>{
    const el = $(id); if(!el) return;
    el.addEventListener('input', apRefreshEditPwPreview);
  });
  const apSaveClose = $('ap_saveClose'); if(apSaveClose) apSaveClose.onclick = async ()=>{ const ok = await apSavePerson(); if(ok) setTimeout(()=> hide($('addPersonModal')), 700); };
  const apSaveNew = $('ap_saveNew'); if(apSaveNew) apSaveNew.onclick = async ()=>{ const ok = await apSavePerson(); if(ok) setTimeout(()=> apResetForm(), 500); };
  ['ap_name','ap_slug','ap_password','ap_birthday','ap_requester','ap_requester_wa','ap_wipe_local'].forEach(id=>{
    const el = $(id); if(!el) return;
    el.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); $('ap_saveClose').click(); } });
  });

  const toggleAll = $('peopleToggleAll');
  if(toggleAll) toggleAll.onclick = ()=>{
    const anyCollapsed = S.PEOPLE.some((p,i)=>!S.EXPANDED_PEOPLE.has(personKey(p,i)));
    if(anyCollapsed){ S.PEOPLE.forEach((p,i)=>S.EXPANDED_PEOPLE.add(personKey(p,i))); }
    else { S.EXPANDED_PEOPLE.clear(); }
    renderPeopleRepeater();
  };
  const addPersonRow = $('addPersonRow');
  if(addPersonRow) addPersonRow.onclick = ()=>{
    const newPerson = {id:null, slug:'', display_name:'', birthday:'', password:'', requester_name:'', requester_whatsapp:'', wipe_iso:null, wipe_iso_tz:DEFAULT_TZ, enabled:true, sort_order:S.PEOPLE.length};
    S.PEOPLE.push(newPerson);
    S.EXPANDED_PEOPLE.add(personKey(newPerson, S.PEOPLE.length-1));
    renderPeopleRepeater();
    buildAdminPersonDropdown();
  };

  const addGift = $('addGiftRow'); if(addGift) addGift.onclick = ()=>{ S.CURR.gifts = S.CURR.gifts||[]; S.CURR.gifts.push({emoji:'🎁', title:'', message:'', photo_drive_id:''}); renderAdminGifts(); };
  const addStory = $('addStoryRow'); if(addStory) addStory.onclick = ()=>{ S.CURR.story = S.CURR.story||[]; S.CURR.story.push({title:'', body:'', photo_drive_id:''}); renderAdminStory(); };
  const addEvent = $('addEventRow'); if(addEvent) addEvent.onclick = ()=>{ S.CURR.events = S.CURR.events||[]; S.CURR.events.push({icon:'📅', label:'', target_iso:'', target_iso_tz:DEFAULT_TZ}); renderAdminEvents(); };
  const addVoice = $('addVoiceRow'); if(addVoice) addVoice.onclick = ()=>{ S.CURR.voice = S.CURR.voice||[]; S.CURR.voice.push({title:'', audio_url:''}); renderAdminVoice(); };
  const addVideo = $('addVideoRow'); if(addVideo) addVideo.onclick = ()=>{ S.CURR.video = S.CURR.video||[]; S.CURR.video.push({title:'', video_url:''}); renderAdminVideo(); };
  const addPin = $('addPinRow'); if(addPin) addPin.onclick = ()=>{ S.CURR.pins = S.CURR.pins||[]; S.CURR.pins.push({label:'', lat:'', lng:'', photo_drive_id:'', story:''}); renderAdminPins(); };
  const addMedia = $('addMediaRow'); if(addMedia) addMedia.onclick = ()=>{ S.CURR.media = S.CURR.media||[]; S.CURR.media.push({type:'photo', drive_id:'', src:'', title:''}); renderAdminMedia(); };

  const saveBtn = $('adminSave');
  if(saveBtn) saveBtn.onclick = async ()=>{
    const t0 = Date.now();
    __showToast('⏳ Saving…');
    try{
      await saveAdminAll();
      __showToast('✅ Saved in '+Math.round((Date.now()-t0)/100)/10+'s');
      setTimeout(()=> hide($('adminPanel')), 300);
    }catch(e){ __showToast('❌ '+(e.message||'Save failed'), false); console.error(e); }
  };
  const savePreview = $('adminSavePreviewBtn');
  if(savePreview) savePreview.onclick = async ()=>{
    const t0 = Date.now();
    __showToast('⏳ Saving then previewing…');
    try{
      await saveAdminAll();
      const fresh = S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID);
      if(!fresh){ __showToast('❌ No person selected', false); return; }
      S.CURRENT_PERSON = fresh;
      await window.__loadPersonIntoState__(fresh);
      hide($('adminPanel'));
      S.PREVIEW_MODE = true;
      S.REQUESTER_MODE = false;
      await window.showViewerFor(fresh, true);
      __showToast('✅ Saved & previewing ('+Math.round((Date.now()-t0)/100)/10+'s)');
    }catch(e){ __showToast('❌ '+(e.message||'Preview failed'), false); console.error(e); }
  };
  const previewBtn = $('adminPreviewBtn');
  if(previewBtn) previewBtn.onclick = async ()=>{
    if(!S.CURRENT_PERSON){ alert('Pick a person first.'); return; }
    saveAdminTextsFromFields(S.ADMIN_EDIT_LANG);
    readAdminFields();
    S.CURR.textsByLang = S.CURR.textsByLang || {en:{},gu:{},hi:{}};
    ['en','gu','hi'].forEach(L=>{
      S.CURR.textsByLang[L] = Object.assign({}, S.CURR.textsByLang[L]||{}, S.CURRENT_TEXTS_BY_LANG[L]||{});
    });
    S.CURR_LANG = S.ADMIN_EDIT_LANG || 'en';
    S.CURR.texts = S.CURR.textsByLang[S.CURR_LANG] || {};
    const lt = $('langToggle');
    if(lt){ lt.textContent = S.CURR_LANG==='en' ? 'EN' : (S.CURR_LANG==='gu' ? 'ગુ' : 'हि'); lt.dataset.state = S.CURR_LANG; }
    hide($('adminPanel'));
    S.PREVIEW_MODE = true;
    S.REQUESTER_MODE = false;
    await window.showViewerFor(S.CURRENT_PERSON, true);
  };

  const resetBtn = $('adminReset');
  if(resetBtn) resetBtn.onclick = async ()=>{
    if(!confirm('🧹 This deletes ALL people and content from cloud (reviews stay). Continue?')) return;
    await sb.wipeAll(T_MEDIA); await sb.wipeAll(T_GIFTS); await sb.wipeAll(T_STORY);
    await sb.wipeAll(T_EVENTS); await sb.wipeAll(T_VOICE); await sb.wipeAll(T_VIDEO);
    await sb.wipeAll(T_PINS); await sb.wipeAll(T_PEOPLE); await sb.wipeAll(T_SETTINGS);
    await sb.wipeAll(T_GUEST);
    try{ localStorage.clear(); }catch(e){}
    location.reload();
  };
  const apc = $('adminPanelClose'); if(apc) apc.onclick = ()=>{ hide($('adminPanel')); S.ADMIN_MODE = false; };
  const ac = $('adminCancel'); if(ac) ac.onclick = ()=>{ hide($('adminPanel')); S.ADMIN_MODE = false; };

  document.querySelectorAll('#adminPanel .panel-tab').forEach(tab=>{
    tab.onclick = ()=>{
      document.querySelectorAll('#adminPanel .panel-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('#adminPanel .admin-pane, #adminPanel .panel-pane').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      const p = $(tab.dataset.pane); if(p) p.classList.add('active');
      if(tab.dataset.pane==='pane-guests'){ if(window.loadGuestApprovals) loadGuestApprovals(); if(window.loadGuestHistory) loadGuestHistory(); }
      if(tab.dataset.pane==='pane-reviews'){ window.loadReviews(); }
      if(tab.dataset.pane==='pane-people'){ renderPeopleRepeater(); }
    };
  });

  const refreshRev = $('adminRefreshReviews'); if(refreshRev) refreshRev.onclick = window.loadReviews;

  const pdClose = $('personDetailsClose'); if(pdClose) pdClose.onclick = ()=> hide($('personDetailsModal'));
  const pdModal = $('personDetailsModal'); if(pdModal) pdModal.addEventListener('click', (e)=>{ if(e.target===pdModal) hide($('personDetailsModal')); });

  const smc = $('shareModalClose'); if(smc) smc.onclick = ()=> hide($('shareModal'));
  const sm = $('shareModal'); if(sm) sm.addEventListener('click', (e)=>{ if(e.target===sm) hide($('shareModal')); });

  /* Admin Export / Import */
  const exportBtn = $('adminExportBtn');
  if(exportBtn) exportBtn.onclick = async ()=>{
    const st = $('adminDataStatus');
    st.textContent = '⏳ Building…'; st.className = 'panel-status';
    try{
      if(!window.XLSX) throw new Error('XLSX library not loaded.');
      const wb = XLSX.utils.book_new();
      const allPeople = await sb.people() || [];
      const peopleRows = allPeople.map(p=>({id:p.id||'', slug:p.slug||'', display_name:p.display_name||'', birthday:p.birthday||'', password:p.password||'', requester_name:p.requester_name||'', requester_whatsapp:p.requester_whatsapp||'', edit_password:getEditPasswordForPerson(p), wipe_iso:p.wipe_iso||'', enabled:p.enabled!==false?'true':'false', sort_order:p.sort_order||0}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(peopleRows.length?peopleRows:[{slug:'',display_name:''}]), 'people');
      const textRows = [], sharedRows = [];
      for(const p of allPeople){
        const s = await sb.getSet(p.id);
        Object.keys(s).forEach(k=>{
          if(k.startsWith('texts__')) textRows.push({person_slug:p.slug||'', key:k.substring(7), value:s[k]});
          else if(k.startsWith('shared__')) sharedRows.push({person_slug:p.slug||'', key:k.substring(8), value:s[k]});
        });
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(textRows.length?textRows:[{person_slug:'',key:'',value:''}]), 'texts');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sharedRows.length?sharedRows:[{person_slug:'',key:'',value:''}]), 'shared');
      const giftRows = [];
      for(const p of allPeople) (await sb.rows(T_GIFTS,p.id)||[]).forEach(g=>giftRows.push({person_slug:p.slug||'', emoji:g.emoji||'', title:g.title||'', message:g.message||'', photo_drive_id:g.photo_drive_id||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(giftRows.length?giftRows:[{person_slug:'',emoji:'',title:'',message:'',photo_drive_id:''}]), 'gifts');
      const evRows = [];
      for(const p of allPeople) (await sb.rows(T_EVENTS,p.id)||[]).forEach(e=>evRows.push({person_slug:p.slug||'', icon:e.icon||'', label:e.label||'', target_iso:e.target_iso||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evRows.length?evRows:[{person_slug:'',icon:'',label:'',target_iso:''}]), 'events');
      const vcRows = [];
      for(const p of allPeople) (await sb.rows(T_VOICE,p.id)||[]).forEach(v=>vcRows.push({person_slug:p.slug||'', title:v.title||'', audio_url:v.audio_url||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vcRows.length?vcRows:[{person_slug:'',title:'',audio_url:''}]), 'voice');
      const vdRows = [];
      for(const p of allPeople) (await sb.rows(T_VIDEO,p.id)||[]).forEach(v=>vdRows.push({person_slug:p.slug||'', title:v.title||'', video_url:v.video_url||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vdRows.length?vdRows:[{person_slug:'',title:'',video_url:''}]), 'video');
      const pinRows = [];
      for(const p of allPeople) (await sb.rows(T_PINS,p.id)||[]).forEach(pp=>pinRows.push({person_slug:p.slug||'', label:pp.label||'', lat:pp.lat||'', lng:pp.lng||'', photo_drive_id:pp.photo_drive_id||'', story:pp.story||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pinRows.length?pinRows:[{person_slug:'',label:'',lat:'',lng:'',photo_drive_id:'',story:''}]), 'pins');
      const stRows = [];
      for(const p of allPeople) (await sb.rows(T_STORY,p.id)||[]).forEach(s=>stRows.push({person_slug:p.slug||'', title:s.title||'', body:s.body||'', photo_drive_id:s.photo_drive_id||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stRows.length?stRows:[{person_slug:'',title:'',body:'',photo_drive_id:''}]), 'story');
      const mediaRows = (await sb.rows(T_MEDIA)||[]).map(m=>({person_slug:(allPeople.find(p=>p.id===m.person_id)||{}).slug||'', type:m.type||'', src:m.src||'', drive_id:m.drive_id||'', title:m.title||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mediaRows.length?mediaRows:[{person_slug:'',type:'',src:'',drive_id:'',title:''}]), 'media');
      const revRows = (S.REVIEWS||[]).map(r=>({person_slug:r.person_slug||'', person_name:r.person_name||'', requester_name:r.requester_name||'', stars:r.stars||0, message:r.message||'', email:r.email||'', created_at:r.created_at||''}));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(revRows.length?revRows:[{person_slug:'',person_name:'',requester_name:'',stars:0,message:'',email:'',created_at:''}]), 'reviews');
      XLSX.writeFile(wb, 'surprise-backup-'+new Date().toISOString().slice(0,10)+'.xlsx');
      st.textContent = '✅ Exported.'; st.className = 'panel-status ok';
    }catch(e){ console.error(e); st.textContent = '❌ '+(e.message||'Export failed'); st.className = 'panel-status err'; }
  };

  const importBtn = $('adminImportBtn'); if(importBtn) importBtn.onclick = ()=> $('adminExcelInput').click();
  const excelInput = $('adminExcelInput');
  if(excelInput) excelInput.onchange = async (e)=>{
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const st = $('adminDataStatus');
    st.textContent = '⏳ Reading…'; st.className = 'panel-status';
    try{
      if(!window.XLSX) throw new Error('XLSX library not loaded');
      if(!confirm('Import this file?\n\n• "people" sheet replaces the People list (in memory — click Save).\n• Content sheets apply to the currently-selected person.\n\nContinue?')){ st.textContent=''; st.className='panel-status'; e.target.value=''; return; }
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, {type:'array'});
      const readSheet = name => wb.Sheets[name] ? XLSX.utils.sheet_to_json(wb.Sheets[name], {defval:''}) : [];
      const has = name => !!wb.Sheets[name];
      if(has('people')){
        const rows = readSheet('people');
        S.PEOPLE = rows.filter(r=>r.slug||r.display_name).map((r,i)=>({
          id:null,
          slug:String(r.slug||'').trim() || ('person-'+Date.now()+'-'+i),
          display_name:String(r.display_name||'').trim() || ('Person '+(i+1)),
          birthday:String(r.birthday||''), password:String(r.password||''),
          requester_name:String(r.requester_name||''),
          requester_whatsapp:String(r.requester_whatsapp||''),
          wipe_iso:String(r.wipe_iso||''), wipe_iso_tz:DEFAULT_TZ,
          enabled:String(r.enabled).toLowerCase()!=='false', sort_order:i
        }));
        S.EXPANDED_PEOPLE.clear();
        renderPeopleRepeater(); buildAdminPersonDropdown();
      }
      const cur = S.PEOPLE.find(p=>p.id===S.ADMIN_EDIT_PERSON_ID) || S.CURRENT_PERSON;
      const curSlug = (cur && cur.slug) || '';
      const matchSlug = row => { const rs = String(row.person_slug||'').trim().toLowerCase(); if(!rs) return true; return rs===curSlug.toLowerCase(); };
      const skipped = [];
      if(!cur){ st.textContent = '✅ Imported people. Select a person, then re-import to load content.'; st.className='panel-status ok'; e.target.value=''; return; }
      if(has('texts')){
        const rows = readSheet('texts').filter(matchSlug);
        const others = readSheet('texts').filter(r=>!matchSlug(r));
        if(others.length) skipped.push('texts:'+others.length);
        const map = {};
        rows.forEach(r=>{ const k = String(r.key||'').trim(); if(!k) return; const v = String(r.value==null?'':r.value); map['texts__'+k] = v; });
        const byLang = {en:{},gu:{},hi:{}};
        Object.keys(map).forEach(k=>{
          if(!k.startsWith('texts__')) return;
          const rest = k.substring(7);
          const m = rest.match(/^(en|gu|hi)_(.+)$/);
          if(m){ byLang[m[1]][m[2]] = map[k]; }
          else { ['en','gu','hi'].forEach(L=>{ byLang[L][rest] = map[k]; }); }
        });
        S.CURRENT_TEXTS_BY_LANG = byLang;
        applyAdminTextsToFields(S.ADMIN_EDIT_LANG);
      }
      if(has('shared')){
        const rows = readSheet('shared').filter(matchSlug);
        const others = readSheet('shared').filter(r=>!matchSlug(r));
        if(others.length) skipped.push('shared:'+others.length);
        rows.forEach(r=>{ const k = String(r.key||'').trim(); if(!k) return; S.CURR.shared[k] = String(r.value==null?'':r.value); });
        fillAdminFields();
      }
      if(has('gifts')){ const rows = readSheet('gifts').filter(matchSlug).filter(r=>r.emoji||r.title||r.message||r.photo_drive_id); S.CURR.gifts = rows.map(r=>({emoji:String(r.emoji||'🎁'), title:String(r.title||''), message:String(r.message||''), photo_drive_id:String(r.photo_drive_id||'')})); renderAdminGifts(); }
      if(has('story')){ const rows = readSheet('story').filter(matchSlug).filter(r=>r.title||r.body||r.photo_drive_id); S.CURR.story = rows.map(r=>({title:String(r.title||''), body:String(r.body||''), photo_drive_id:String(r.photo_drive_id||'')})); renderAdminStory(); }
      if(has('events')){ const rows = readSheet('events').filter(matchSlug).filter(r=>r.icon||r.label||r.target_iso); S.CURR.events = rows.map(r=>({icon:String(r.icon||'📅'), label:String(r.label||''), target_iso:String(r.target_iso||''), target_iso_tz:String(r.target_iso_tz||DEFAULT_TZ)})); renderAdminEvents(); }
      if(has('voice')){ const rows = readSheet('voice').filter(matchSlug).filter(r=>r.title||r.audio_url); S.CURR.voice = rows.map(r=>({title:String(r.title||''), audio_url:String(r.audio_url||'')})); renderAdminVoice(); }
      if(has('video')){ const rows = readSheet('video').filter(matchSlug).filter(r=>r.title||r.video_url); S.CURR.video = rows.map(r=>({title:String(r.title||''), video_url:String(r.video_url||'')})); renderAdminVideo(); }
      if(has('pins')){ const rows = readSheet('pins').filter(matchSlug).filter(r=>r.label||r.lat||r.lng||r.photo_drive_id||r.story); S.CURR.pins = rows.map(r=>({label:String(r.label||''), lat:String(r.lat||''), lng:String(r.lng||''), photo_drive_id:String(r.photo_drive_id||''), story:String(r.story||'')})); renderAdminPins(); }
      if(has('media')){
        const all = readSheet('media').filter(r=>(r.drive_id||r.src));
        const rows = all.filter(matchSlug); const others = all.filter(r=>!matchSlug(r));
        if(others.length) skipped.push('media:'+others.length);
        const rawMedia = rows.map(r=>({type:String(r.type||'photo'), src:String(r.src||''), drive_id:String(r.drive_id||''), title:String(r.title||'')}));
        const before = rawMedia.length;
        S.CURR.media = dedupeMedia(rawMedia);
        const removed = before - S.CURR.media.length;
        renderAdminMedia();
        if(removed>0) __showToast('✅ '+S.CURR.media.length+' media row(s) · '+removed+' duplicate removed');
      }
      const msgParts = ['✅ Imported content into "'+(cur.display_name||cur.slug)+'".'];
      if(skipped.length) msgParts.push('⚠️ Skipped rows for other people: '+skipped.join(', '));
      msgParts.push('Click 💾 Save to push to cloud.');
      st.textContent = msgParts.join(' '); st.className = 'panel-status ok';
    }catch(err){ console.error(err); st.textContent = '❌ '+(err.message||'Import failed'); st.className = 'panel-status err'; }
    finally{ e.target.value = ''; }
  };
});

})();