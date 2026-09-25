/* ============================================================
   supabase.js — All Supabase REST calls + wipe helpers
   ============================================================ */
(function(){
'use strict';

const URL = window.SUPABASE_URL;
const KEY = window.SUPABASE_ANON_KEY;
const S = window.__PAGE_STATE__;

window.sb = {
  h(){ return {'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':'return=representation'}; },
  hd(){ return {'apikey':KEY,'Authorization':'Bearer '+KEY}; },

  async people(){
    try{
      const r = await fetch(`${URL}/rest/v1/${T_PEOPLE}?select=*&order=sort_order.asc,id.asc`, {headers:this.h(), cache:'no-store'});
      if(!r.ok) return [];
      return r.json();
    }catch(e){ return []; }
  },
  async insPerson(row){
    const r = await fetch(`${URL}/rest/v1/${T_PEOPLE}`, {method:'POST', headers:this.h(), body:JSON.stringify(row)});
    if(!r.ok){ const t = await r.text(); throw new Error('insert person '+r.status+' '+t); }
    return r.json();
  },
  async updPerson(id,p){
    const r = await fetch(`${URL}/rest/v1/${T_PEOPLE}?id=eq.${id}`, {method:'PATCH', headers:this.h(), body:JSON.stringify(p)});
    if(!r.ok){ const t = await r.text(); throw new Error('update person '+r.status+' '+t); }
    return r.json();
  },
  async delPerson(id){
    const r = await fetch(`${URL}/rest/v1/${T_PEOPLE}?id=eq.${id}`, {method:'DELETE', headers:this.hd()});
    if(!r.ok){ const t = await r.text(); throw new Error('delete person '+r.status+' '+t); }
  },
  async rows(table,pid){
    try{
      let u = `${URL}/rest/v1/${table}?select=*`;
      if(pid!=null) u += `&person_id=eq.${pid}`;
      const r = await fetch(u, {headers:this.h(), cache:'no-store'});
      if(!r.ok) return [];
      return r.json();
    }catch(e){ return []; }
  },
  async getSet(pid){
    try{
      let u = `${URL}/rest/v1/${T_SETTINGS}?select=key,value`;
      if(pid===null) u += '&person_id=is.null';
      else if(pid!=null) u += `&person_id=eq.${pid}`;
      const r = await fetch(u, {headers:this.h(), cache:'no-store'});
      if(!r.ok) return {};
      const rows = await r.json();
      const o = {};
      rows.forEach(x=>{ o[x.key] = x.value; });
      return o;
    }catch(e){ return {}; }
  },
  async upSet(obj,pid){
    const keys = Object.keys(obj);
    if(!keys.length) return;
    try{
      const keyList = keys.map(k=>'"'+k+'"').join(',');
      let delUrl = `${URL}/rest/v1/${T_SETTINGS}?key=in.(${keyList})`;
      if(pid!=null) delUrl += `&person_id=eq.${pid}`;
      else delUrl += '&person_id=is.null';
      await fetch(delUrl, {method:'DELETE', headers:this.hd()});
    }catch(e){}
    const rows = keys.map(k=>{
      const r = {key:k, value:String(obj[k])};
      if(pid!=null) r.person_id = pid;
      return r;
    });
    const r = await fetch(`${URL}/rest/v1/${T_SETTINGS}`, {
      method:'POST',
      headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify(rows)
    });
    if(!r.ok){ const t = await r.text(); throw new Error('settings '+r.status+' '+t); }
    return r.json();
  },
  async insBatch(table,rows){
    if(!rows||!rows.length) return;
    const r = await fetch(`${URL}/rest/v1/${table}`, {method:'POST', headers:this.h(), body:JSON.stringify(rows)});
    if(!r.ok){ const t = await r.text(); throw new Error('batch insert '+table+' '+r.status+' '+t); }
    return r.json();
  },
  async upd(table,id,patch){
    const r = await fetch(`${URL}/rest/v1/${table}?id=eq.${id}`, {method:'PATCH', headers:this.h(), body:JSON.stringify(patch)});
    if(!r.ok){ const t = await r.text(); throw new Error('update '+table+' '+t); }
    return r.json();
  },
  async wipe(table,pid){
    try{ await fetch(`${URL}/rest/v1/${table}?person_id=eq.${pid}`, {method:'DELETE', headers:this.hd()}); }catch(e){}
  },
  async wipeAll(table){
    try{ await fetch(`${URL}/rest/v1/${table}?id=gt.0`, {method:'DELETE', headers:this.hd()}); }catch(e){}
  },
  async guests(){
    try{
      const r = await fetch(`${URL}/rest/v1/${T_GUEST}?select=*&order=created_at.desc`, {headers:this.h(), cache:'no-store'});
      if(!r.ok) return [];
      return r.json();
    }catch(e){ return []; }
  },
  async updGuest(id,patch){ return this.upd(T_GUEST,id,patch); },
  async wipeExpired(){
    try{
      const r = await fetch(`${URL}/rest/v1/rpc/wipe_expired_people`, {method:'POST', headers:this.h(), body:'{}'});
      if(!r.ok) return 0;
      const n = await r.json();
      return n || 0;
    }catch(e){ return 0; }
  },
  async reviews(){
    try{
      const r = await fetch(`${URL}/rest/v1/${T_REVIEWS}?select=*&order=created_at.desc`, {headers:this.h(), cache:'no-store'});
      if(!r.ok) return [];
      return r.json();
    }catch(e){ return []; }
  },
  async upsertReview(row){
    const slug = (row.person_slug||'').toLowerCase();
    let existing = [];
    try{
      const r = await fetch(`${URL}/rest/v1/${T_REVIEWS}?select=id&person_slug=ilike.${encodeURIComponent(slug)}`, {headers:this.h(), cache:'no-store'});
      if(r.ok) existing = await r.json();
    }catch(e){}
    if(existing && existing[0]) return this.upd(T_REVIEWS, existing[0].id, row);
    return this.insBatch(T_REVIEWS, [row]);
  },
  async delReview(id){
    await fetch(`${URL}/rest/v1/${T_REVIEWS}?id=eq.${id}`, {method:'DELETE', headers:this.hd()});
  }
};

window.wipeOnePerson = async function(pid){
  if(!pid) return;
  try{
    await Promise.all([
      sb.wipe(T_MEDIA,pid), sb.wipe(T_GIFTS,pid), sb.wipe(T_STORY,pid),
      sb.wipe(T_EVENTS,pid), sb.wipe(T_VOICE,pid), sb.wipe(T_VIDEO,pid),
      sb.wipe(T_PINS,pid), sb.wipe(T_UPLOADS,pid), sb.wipe(T_SETTINGS,pid)
    ]);
    await sb.delPerson(pid);
  }catch(e){ console.warn('[wipe] failed for '+pid, e.message); }
};

window.checkWipe = async function(){
  try{
    await sb.wipeExpired();
    const all = await sb.people();
    if(!all||!all.length) return;
    const now = Date.now(); const toWipe = [];
    for(const p of all){
      if(!p.wipe_iso) continue;
      const d = new Date(p.wipe_iso); if(isNaN(d.getTime())) continue;
      if(now >= d.getTime()) toWipe.push(p.id);
    }
    if(toWipe.length) for(const id of toWipe) await wipeOnePerson(id);
    S.PEOPLE = await sb.people() || [];
    if(window.buildHome) window.buildHome();
  }catch(e){}
};

})();