/* ============================================================
   supabase.js — REST helpers with atomic upserts (V2.2)
   ============================================================ */
(function(){
'use strict';

const URL = window.SUPABASE_URL;
const KEY = window.SUPABASE_ANON_KEY;
const S   = window.__PAGE_STATE__;

function hdr(extra){
  const h = {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Content-Type': 'application/json'
  };
  if(extra) Object.assign(h, extra);
  return h;
}

async function req(path, opts){
  opts = opts || {};
  const r = await fetch(URL + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    headers: hdr(opts.headers),
    body: opts.body,
    cache: 'no-store'
  });
  if(!r.ok){
    let t = '';
    try{ t = await r.text(); }catch(e){}
    throw new Error((opts.label || path) + ' ' + r.status + ' ' + (t || '').slice(0, 200));
  }
  if(opts.raw) return r;
  if(r.status === 204) return null;
  try{ return await r.json(); }catch(e){ return null; }
}

window.sb = {
  h(){ return hdr({'Prefer':'return=representation'}); },
  hd(){ return hdr(); },

  /* ---------- People ---------- */
  async people(){
    try{ return await req(T_PEOPLE + '?select=*&order=sort_order.asc,id.asc'); }
    catch(e){ console.warn('people()', e.message); return []; }
  },
  async insPerson(row){
    return req(T_PEOPLE, {
      method:'POST',
      headers:{'Prefer':'return=representation'},
      body: JSON.stringify(row),
      label:'insert person'
    });
  },
  async updPerson(id, patch){
    return req(T_PEOPLE + '?id=eq.' + encodeURIComponent(id), {
      method:'PATCH',
      headers:{'Prefer':'return=representation'},
      body: JSON.stringify(patch),
      label:'update person'
    });
  },
  async delPerson(id){
    await req(T_PEOPLE + '?id=eq.' + encodeURIComponent(id), {
      method:'DELETE',
      headers:{'Prefer':'return=minimal'},
      label:'delete person'
    });
  },
  async findPersonBySlug(slug){
    try{
      const rows = await req(T_PEOPLE + '?select=id,slug&slug=eq.'
        + encodeURIComponent(slug) + '&limit=1');
      return (rows && rows[0]) || null;
    }catch(e){ return null; }
  },

  /* ---------- Generic row operations ---------- */
  async rows(table, pid){
    try{
      let u = table + '?select=*';
      if(pid != null) u += '&person_id=eq.' + encodeURIComponent(pid);
      return await req(u) || [];
    }catch(e){ return []; }
  },
  async insBatch(table, rows){
    if(!rows || !rows.length) return null;
    return req(table, {
      method:'POST',
      headers:{'Prefer':'return=minimal'},
      body: JSON.stringify(rows),
      label:'insert ' + table
    });
  },
  async upd(table, id, patch){
    return req(table + '?id=eq.' + encodeURIComponent(id), {
      method:'PATCH',
      headers:{'Prefer':'return=representation'},
      body: JSON.stringify(patch),
      label:'update ' + table
    });
  },
  async wipe(table, pid){
    try{
      await req(table + '?person_id=eq.' + encodeURIComponent(pid), {
        method:'DELETE',
        headers:{'Prefer':'return=minimal'}
      });
    }catch(e){}
  },
  async wipeAll(table){
    try{
      await req(table + '?id=gt.0', {
        method:'DELETE',
        headers:{'Prefer':'return=minimal'}
      });
    }catch(e){}
  },

  /* ---------- Safe replace (insert first, then delete olds) ---------- */
  async safeReplace(table, pid, rows){
    rows = (rows || []).filter(Boolean);
    let newIds = [];
    if(rows.length){
      const res = await req(table, {
        method:'POST',
        headers:{'Prefer':'return=representation'},
        body: JSON.stringify(rows),
        label:'insert ' + table
      });
      newIds = (res || []).map(x => x && x.id).filter(Boolean);
    }
    try{
      let delUrl = table + '?person_id=eq.' + encodeURIComponent(pid);
      if(newIds.length) delUrl += '&id=not.in.(' + newIds.join(',') + ')';
      await req(delUrl, {
        method:'DELETE',
        headers:{'Prefer':'return=minimal'}
      });
    }catch(e){ console.warn('safeReplace delete', table, e.message); }
  },

  /* ---------- Settings (key/value per person) ---------- */
  async getSet(pid){
    try{
      let u = T_SETTINGS + '?select=key,value';
      if(pid === null) u += '&person_id=is.null';
      else if(pid != null) u += '&person_id=eq.' + encodeURIComponent(pid);
      const rows = await req(u) || [];
      const o = {};
      rows.forEach(x => { o[x.key] = x.value; });
      return o;
    }catch(e){ return {}; }
  },

  async upSet(obj, pid){
    const keys = Object.keys(obj || {});
    if(!keys.length) return null;
    const rows = keys.map(k => {
      const r = {key: k, value: String(obj[k])};
      if(pid != null) r.person_id = pid;
      return r;
    });
    const url = T_SETTINGS + '?on_conflict=key,person_id';
    try{
      return await req(url, {
        method:'POST',
        headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
        body: JSON.stringify(rows),
        label:'upsert settings'
      });
    }catch(e){
      console.warn('upSet upsert failed, falling back', e.message);
      const keyList = keys.map(k => '"' + k.replace(/"/g, '""') + '"').join(',');
      let delUrl = T_SETTINGS + '?key=in.(' + encodeURIComponent(keyList) + ')';
      if(pid != null) delUrl += '&person_id=eq.' + encodeURIComponent(pid);
      else delUrl += '&person_id=is.null';
      await req(delUrl, {method:'DELETE', headers:{'Prefer':'return=minimal'}});
      return req(T_SETTINGS, {
        method:'POST',
        headers:{'Prefer':'return=minimal'},
        body: JSON.stringify(rows),
        label:'insert settings'
      });
    }
  },

  /* ---------- Guests ---------- */
  async guests(){
    try{ return await req(T_GUEST + '?select=*&order=created_at.desc') || []; }
    catch(e){ return []; }
  },
  async insGuest(row){
    return req(T_GUEST, {
      method:'POST',
      headers:{'Prefer':'return=representation'},
      body: JSON.stringify(row),
      label:'insert guest'
    });
  },
  async updGuest(id, patch){
    return this.upd(T_GUEST, id, patch);
  },

  /* ---------- Wipe expired ---------- */
  async wipeExpired(){
    try{
      const r = await fetch(URL + '/rest/v1/rpc/wipe_expired_people', {
        method:'POST', headers: hdr(), body: '{}'
      });
      if(!r.ok) return 0;
      const n = await r.json();
      return typeof n === 'number' ? n : 0;
    }catch(e){ return 0; }
  },

  /* ---------- Reviews ---------- */
  async reviews(){
    try{ return await req(T_REVIEWS + '?select=*&order=created_at.desc') || []; }
    catch(e){ return []; }
  },
  async upsertReview(row){
    const slug = (row.person_slug || '').toLowerCase();
    let existing = [];
    try{
      existing = await req(T_REVIEWS + '?select=id&person_slug=ilike.'
        + encodeURIComponent(slug)) || [];
    }catch(e){}
    if(existing && existing[0]){
      return this.upd(T_REVIEWS, existing[0].id, row);
    }
    return this.insBatch(T_REVIEWS, [row]);
  },
  async delReview(id){
    await req(T_REVIEWS + '?id=eq.' + encodeURIComponent(id), {
      method:'DELETE',
      headers:{'Prefer':'return=minimal'}
    });
  }
};

/* ---------- Wipe one person completely ---------- */
window.wipeOnePerson = async function(pid){
  if(!pid) return;
  try{
    await Promise.all([
      sb.wipe(T_MEDIA,   pid),
      sb.wipe(T_GIFTS,   pid),
      sb.wipe(T_STORY,   pid),
      sb.wipe(T_EVENTS,  pid),
      sb.wipe(T_VOICE,   pid),
      sb.wipe(T_VIDEO,   pid),
      sb.wipe(T_PINS,    pid),
      sb.wipe(T_UPLOADS, pid),
      sb.wipe(T_SETTINGS,pid)
    ]);
    await sb.delPerson(pid);
  }catch(e){ console.warn('[wipe] failed for ' + pid, e.message); }
};

window.checkWipe = async function(){
  try{
    await sb.wipeExpired();
    const all = await sb.people();
    if(!all || !all.length) return;
    const now = Date.now();
    const toWipe = [];
    for(const p of all){
      if(!p.wipe_iso) continue;
      const d = new Date(p.wipe_iso);
      if(isNaN(d.getTime())) continue;
      if(now >= d.getTime()) toWipe.push(p.id);
    }
    for(const id of toWipe) await wipeOnePerson(id);
    S.PEOPLE = await sb.people() || [];
    if(window.buildHome) window.buildHome();
  }catch(e){}
};

})();