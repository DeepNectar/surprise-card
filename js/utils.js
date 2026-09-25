/* ============================================================
   utils.js — DOM helpers, timezone conversion, password gen
   ============================================================ */
(function(){
'use strict';

window.$ = function(id){ return document.getElementById(id); };
window.txt = function(el,v){ if(el) el.textContent = v||''; };
window.show = function(el){ if(el) el.classList.add('active'); };
window.hide = function(el){ if(el) el.classList.remove('active'); };

window.zonedToUTC = function(localStr,tz){
  if(!localStr) return null;
  const m = localStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(!m) return null;
  const y=+m[1],mo=+m[2]-1,d=+m[3],h=+m[4],mi=+m[5],s=+(m[6]||0);
  tz = tz || window.DEFAULT_TZ;
  const guess = Date.UTC(y,mo,d,h,mi,s);
  const dtf = new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  const parts = dtf.formatToParts(new Date(guess));
  const get = k => +parts.find(p=>p.type===k).value;
  const asZoned = Date.UTC(get('year'),get('month')-1,get('day'),get('hour')%24,get('minute'),get('second'));
  const offset = guess - asZoned;
  return new Date(guess+offset).toISOString();
};

window.utcToZonedLocal = function(iso,tz){
  if(!iso) return '';
  const d = new Date(iso); if(isNaN(d.getTime())) return '';
  tz = tz || window.DEFAULT_TZ;
  const dtf = new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const parts = dtf.formatToParts(d);
  const get = k => parts.find(p=>p.type===k).value;
  let hour = get('hour'); if(hour==='24') hour='00';
  return get('year')+'-'+get('month')+'-'+get('day')+'T'+hour+':'+get('minute');
};

window.fillTzSelect = function(el,current){
  if(!el) return;
  const cur = current || window.DEFAULT_TZ;
  if(el.options.length===0){
    window.TZ_OPTIONS.forEach(o=>{
      const opt = document.createElement('option');
      opt.value = o.v; opt.textContent = o.l;
      el.appendChild(opt);
    });
  }
  el.value = window.TZ_OPTIONS.find(o=>o.v===cur) ? cur : window.DEFAULT_TZ;
};

window.initAllTzSelects = function(){
  document.querySelectorAll('.tz-select').forEach(el=>{
    fillTzSelect(el, el.dataset.currentTz || window.DEFAULT_TZ);
  });
};

window.dedupeMedia = function(rows){
  const seen = new Set(); const out = [];
  (rows||[]).forEach(r=>{
    if(!r) return;
    const key = ((r.drive_id||'').trim().toLowerCase()) || ((r.src||'').trim().toLowerCase());
    if(!key) return;
    if(seen.has(key)) return;
    seen.add(key); out.push(r);
  });
  return out;
};

window.last4Digits = function(s){
  const digits = String(s||'').replace(/\D/g,'');
  if(digits.length<4) return digits.padStart(4,'0');
  return digits.slice(-4);
};

window.firstNameOf = function(name){
  const n = String(name||'').trim();
  if(!n) return '';
  return n.split(/\s+/)[0].replace(/[^A-Za-z]/g,'') || '';
};

window.makeRequesterEditPassword = function(requesterName,requesterWhatsapp,slug){
  const fn = firstNameOf(requesterName);
  const l4 = last4Digits(requesterWhatsapp);
  const sl = String(slug||'').toLowerCase().replace(/[^a-z0-9\-_]/g,'');
  if(!fn || !l4 || !sl) return '';
  return fn+'-EDIT-'+l4+'-'+sl;
};

window.getEditPasswordForPerson = function(p){
  if(!p) return '';
  return makeRequesterEditPassword(p.requester_name||'', p.requester_whatsapp||'', p.slug||'');
};

window.shuffleArray = function(arr){
  const a = (arr||[]).slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};

window.splitDriveIds = function(raw){
  return String(raw||'').split(',').map(x=>x.trim()).filter(Boolean);
};

window.driveImg = function(id,w){ return 'https://lh3.googleusercontent.com/d/'+id+'=w'+(w||2000); };

window.getShared = function(k,def){ const s = window.__PAGE_STATE__.CURR.shared||{}; return s[k]!==undefined ? s[k] : def; };
window.getText = function(k,def){ const t = window.__PAGE_STATE__.CURR.texts||{}; return t[k]!==undefined ? t[k] : def; };

window.clampDuration = function(v,def,min,max){
  let n = parseFloat(v);
  if(!isFinite(n)||n<=0) n = def;
  return Math.max(min, Math.min(max, n));
};

window.__showToast = function(msg,ok){
  const t = $('globalToast'); if(!t) return;
  t.textContent = msg||'';
  t.style.background = ok===false ? 'rgba(196,30,58,.95)' : 'rgba(10,122,61,.95)';
  t.classList.add('show');
  clearTimeout(t._tt);
  t._tt = setTimeout(()=>t.classList.remove('show'), 2400);
};

window.refreshPage = function(){
  try{ window.location.reload(); }catch(e){ location.href = location.href; }
};

})();