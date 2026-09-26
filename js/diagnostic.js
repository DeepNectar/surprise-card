/* ============================================================
   diagnostic.js — Visible on-screen boot diagnostics
   Load this FIRST, before everything else.
   ============================================================ */
(function(){
'use strict';

window.__DIAG__ = {
  logs: [],
  errors: [],
  startTime: Date.now()
};

function log(msg){
  const t = Date.now() - window.__DIAG__.startTime;
  window.__DIAG__.logs.push('[' + t + 'ms] ' + msg);
  console.log('[DIAG +' + t + 'ms]', msg);
}

window.__diagLog = log;

/* ---------- Catch all errors ---------- */
window.addEventListener('error', function(e){
  const msg = (e.message || 'Unknown') + ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?');
  window.__DIAG__.errors.push(msg);
  console.error('[DIAG ERROR]', msg, e.error);
  renderOverlay();
});

window.addEventListener('unhandledrejection', function(e){
  const msg = 'Promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason);
  window.__DIAG__.errors.push(msg);
  console.error('[DIAG REJECTION]', e.reason);
  renderOverlay();
});

/* ---------- Track script loads ---------- */
document.addEventListener('DOMContentLoaded', function(){
  const scripts = document.querySelectorAll('script[src]');
  log('DOM ready. ' + scripts.length + ' external scripts found.');

  scripts.forEach(function(s){
    if(s.dataset._diagBound) return;
    s.dataset._diagBound = '1';
    s.addEventListener('error', function(){
      const msg = '❌ Script failed to load: ' + s.src;
      window.__DIAG__.errors.push(msg);
      console.error(msg);
      renderOverlay();
    });
  });

  /* ---------- Check critical globals after 3 seconds ---------- */
  setTimeout(function(){
    const checks = [
      ['config.js',   typeof window.__PAGE_STATE__],
      ['utils.js',    typeof window.$],
      ['supabase.js', typeof window.sb],
      ['home.js',     typeof window.buildHome],
      ['boot.js',     typeof window.__closeAllModals__],
      ['reviews.js',  typeof window.loadReviews],
      ['slideshow.js',typeof window.SS_clearTimers]
    ];
    log('--- GLOBAL CHECK ---');
    checks.forEach(function(c){
      const ok = c[1] !== 'undefined';
      log((ok ? '✅' : '❌') + ' ' + c[0] + ' → ' + c[1]);
      if(!ok) window.__DIAG__.errors.push('Missing global from ' + c[0]);
    });

    /* Check if home grid is populated */
    const grid = document.getElementById('homeGrid');
    if(grid){
      log('homeGrid children: ' + grid.children.length);
      const firstChild = grid.firstElementChild;
      log('First child class: ' + (firstChild ? firstChild.className : 'NONE'));
    } else {
      window.__DIAG__.errors.push('homeGrid element not found in DOM');
    }

    renderOverlay();
  }, 3000);
});

/* ---------- Render overlay if errors exist ---------- */
function renderOverlay(){
  if(!window.__DIAG__.errors.length) return;
  let box = document.getElementById('__diagBox');
  if(!box){
    box = document.createElement('div');
    box.id = '__diagBox';
    box.style.cssText =
      'position:fixed;bottom:0;left:0;right:0;max-height:45vh;overflow:auto;' +
      'background:rgba(20,0,10,.96);color:#fff;z-index:2147483647;' +
      'padding:1rem;font-family:monospace;font-size:.72rem;line-height:1.5;' +
      'border-top:3px solid #ff4d6d;';
    document.body.appendChild(box);
  }
  box.innerHTML =
    '<div style="color:#ffd700;font-weight:900;margin-bottom:.5rem;">' +
      '⚠️ DIAGNOSTIC — ' + window.__DIAG__.errors.length + ' error(s)' +
    '</div>' +
    '<div style="color:#ff8a9e;margin-bottom:.6rem;">' + window.__DIAG__.errors.map(function(e){
      return '• ' + escapeHtml(e);
    }).join('<br>') + '</div>' +
    '<details style="margin-top:.6rem;">' +
      '<summary style="cursor:pointer;color:#ffd700;">📋 Full log (' + window.__DIAG__.logs.length + ')</summary>' +
      '<pre style="white-space:pre-wrap;color:#aaa;font-size:.68rem;margin-top:.4rem;">' +
        escapeHtml(window.__DIAG__.logs.join('\n')) +
      '</pre>' +
    '</details>' +
    '<button onclick="this.parentNode.remove()" style="' +
      'margin-top:.6rem;background:#ff4d6d;color:#fff;border:none;' +
      'padding:.4rem 1rem;border-radius:20px;font-weight:700;cursor:pointer;">' +
      'Close' +
    '</button>';
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

})();