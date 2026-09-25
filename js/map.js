/* ============================================================
   map.js — Map of memories (pins + mini slideshow)
   ============================================================ */
(function(){
'use strict';

const S = window.__PAGE_STATE__;
let PIN_MINI = null;

window.renderMapPins = function(){
  const canvas = $('mapCanvas'); if(!canvas) return;
  const pins = S.CURR.pins || [];
  canvas.innerHTML = '';
  const valid = pins.filter(p=>!isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng)));
  if(!valid.length){ canvas.innerHTML = '<div class="map-empty">No memories pinned yet.</div>'; return; }
  const lats = valid.map(p=>parseFloat(p.lat));
  const lngs = valid.map(p=>parseFloat(p.lng));
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = (maxLat-minLat)||1, spanLng = (maxLng-minLng)||1;
  valid.forEach(p=>{
    const lat = parseFloat(p.lat), lng = parseFloat(p.lng);
    const x = 10 + ((lng-minLng)/spanLng)*80;
    const y = 90 - ((lat-minLat)/spanLat)*80;
    const pin = document.createElement('div');
    pin.className = 'map-pin';
    pin.style.left = x+'%'; pin.style.top = y+'%';
    pin.textContent = '📍';
    pin.title = p.label || '';
    pin.onclick = ()=> openPinDetail(p);
    canvas.appendChild(pin);
    if(p.label){
      const lbl = document.createElement('div');
      lbl.className = 'map-pin-label';
      lbl.style.left = x+'%'; lbl.style.top = (y+2)+'%';
      lbl.textContent = p.label;
      canvas.appendChild(lbl);
    }
  });
};

function openPinDetail(p){
  if(PIN_MINI){ PIN_MINI.stop(); PIN_MINI = null; }
  txt($('pinModalTitle'), p.label||'Memory');
  const v = $('pinModalViewer');
  const ids = splitDriveIds(p.photo_drive_id);
  let h = '';
  if(ids.length){ h += '<div id="pinSlideWrap"></div>'; }
  if(p.story) h += `<p style="font-size:1rem;line-height:1.6;">${p.story.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</p>`;
  v.innerHTML = h || '<p style="text-align:center;color:var(--c-text-muted);">No details.</p>';
  if(ids.length){ PIN_MINI = window.buildMiniSlideshow(v.querySelector('#pinSlideWrap'), ids, MODAL_IMG_DURATION_MS); }
  show($('pinModal'));
}

function closePinModal(){ if(PIN_MINI){ PIN_MINI.stop(); PIN_MINI = null; } hide($('pinModal')); }

document.addEventListener('DOMContentLoaded', ()=>{
  const btn = $('mapBtn');
  if(btn) btn.onclick = ()=>{ txt($('mapSelectedName'),''); renderMapPins(); show($('mapModal')); };
  const mc = $('mapClose'); if(mc) mc.onclick = ()=> hide($('mapModal'));
  const mm = $('mapModal'); if(mm) mm.addEventListener('click', (e)=>{ if(e.target===mm) hide($('mapModal')); });
  const pc = $('pinModalClose'); if(pc) pc.onclick = closePinModal;
  const pm = $('pinModal'); if(pm) pm.addEventListener('click', (e)=>{ if(e.target===pm) closePinModal(); });
});

})();