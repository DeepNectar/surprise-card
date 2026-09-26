/* ============================================================
   home.js — Home screen, person grid, finished tab, admin login
   ============================================================ */
(function(){
'use strict';
const S = window.__PAGE_STATE__;

let homeClickCount = 0;
let homeClickTimer = null;
let FINISHED_COLLAPSED = true;

/* ---------- Birthday helpers ---------- */
function daysUntilBirthday(birthday){
  if(!birthday) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const parts = String(birthday).slice(0,10).split('-');
  if(parts.length !== 3) return null;
  const m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if(isNaN(m) || isNaN(d)) return null;
  let next = new Date(today.getFullYear(), m - 1, d);
  if(next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}
function birthdayLabelForPerson(p){
  if(!p || !p.birthday) return '';
  const d = daysUntilBirthday(p.birthday);
  if(d === null) return '';
  if(d === 0) return '🎂 Birthday today!';
  if(d === 1) return '🎂 Birthday tomorrow';
  return '🎂 Birthday in ' + d + ' days';
}
function isBirthdayToday(p){
  return p && p.birthday && daysUntilBirthday(p.birthday) === 0;
}

/* ---------- Fast skeleton renderer (shows instantly while people load) ---------- */
window.renderHomeSkeleton = function(){
  const g = $('homeGrid');
  if(!g || g.children.length > 0) return;
  let html = '';
  for(let i = 0; i < 4; i++){
    html += '<div class="home-btn skeleton skel-btn"></div>';
  }
  g.innerHTML = html;
};

/* ---------- Admin login trigger ---------- */
window.triggerAdminPrompt = async function(){
  const gs = await sb.getSet(null);
  const flag = (gs && gs['shared__adminLoginEnabled']);
  const enabled = (flag === undefined) ? true : (String(flag) === 'true');
  if(!enabled) return;
  window.openAdminLoginFull();
};

/* ---------- Render home (fast) ---------- */
window.buildHome = function(){
  const g = $('homeGrid');
  if(!g) return;

  // Build a DocumentFragment for speed
  const frag = document.createDocumentFragment();

  const ep = (S.PEOPLE || []).filter(p => p.enabled !== false);

  ep.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'home-btn';
    const bdayLabel = birthdayLabelForPerson(p);
    const bdayToday = isBirthdayToday(p);
    b.innerHTML =
      '<span class="home-btn-emoji">💝</span>' +
      '<span>' + esc(p.display_name || p.slug || 'Person') + '</span>' +
      (bdayLabel
        ? '<span class="home-btn-bday' + (bdayToday ? ' today' : '') + '">' + bdayLabel + '</span>'
        : '');
    b.onclick = (e) => {
      if(e && e.preventDefault) e.preventDefault();
      window.onPersonClick(p);
    };
    frag.appendChild(b);
  });

  const gb = document.createElement('button');
  gb.type = 'button';
  gb.className = 'home-btn guest';
  gb.innerHTML = '<span class="home-btn-emoji">✍️</span><span>Guest</span>';
  gb.onclick = (e) => {
    if(e && e.preventDefault) e.preventDefault();
    if(window.openGuestPanel) window.openGuestPanel();
  };
  frag.appendChild(gb);

  g.innerHTML = '';
  g.appendChild(frag);

  // Render finished section
  renderFinishedSection();

  if(window.renderHomeReviews) window.renderHomeReviews();
  renderHomeStats();
};

/* ---------- Finished section (auto-wiped people) ---------- */
function renderFinishedSection(){
  const wrap = $('homeFinished');
  if(!wrap) return;

  const finished = window.getFinishedPeople ? getFinishedPeople() : [];
  if(!finished.length){
    wrap.style.display = 'none';
    wrap.classList.add('collapsed');
    return;
  }

  wrap.style.display = 'block';

  const list = $('homeFinishedList');
  if(list){
    list.innerHTML = finished.map(p => {
      const when = p.wiped_at ? new Date(p.wiped_at).toLocaleDateString() : '';
      return '<button type="button" class="home-btn finished-btn" data-slug="' + escAttr(p.slug) + '">' +
        '<span class="home-btn-emoji">💐</span>' +
        '<span>' + esc(p.display_name || p.slug) + '</span>' +
        (when ? '<span class="home-btn-bday finished-date">💐 ' + esc(when) + '</span>' : '') +
      '</button>';
    }).join('');
  }

  // Toggle collapse
  const head = $('homeFinishedHead');
  if(head && head.dataset._bound !== '1'){
    head.dataset._bound = '1';
    head.onclick = () => {
      FINISHED_COLLAPSED = !FINISHED_COLLAPSED;
      wrap.classList.toggle('collapsed', FINISHED_COLLAPSED);
    };
  }

  // Buttons — show "this surprise is finished" message (or remove if admin)
  wrap.querySelectorAll('.finished-btn').forEach(btn => {
    btn.onclick = async (e) => {
      if(e && e.preventDefault) e.preventDefault();
      const slug = btn.dataset.slug;
      const isAdmin = !!S.ADMIN_MODE;
      if(isAdmin){
        const ok = await __confirm({
          icon: '💐',
          title: 'Remove from finished list?',
          message: 'This person has already been auto-wiped. Remove them from the finished list permanently?',
          okText: 'Remove',
          danger: true
        });
        if(!ok) return;
        removeFinishedPerson(slug);
        renderFinishedSection();
      } else {
        alert('💐 This surprise has been completed and archived.\n\nThank you for being part of it 💕');
      }
    };
  });
}
window.renderFinishedSection = renderFinishedSection;

/* ---------- Stats chip bar ---------- */
function renderHomeStats(){
  const bar = $('homeStatsBar');
  if(!bar) return;
  const people = (S.PEOPLE || []).filter(p => p.enabled !== false).length;
  const reviews = (S.REVIEWS || []).length;
  const avg = reviews
    ? Math.round((S.REVIEWS.reduce((a, r) => a + (parseInt(r.stars) || 0), 0) / reviews) * 10) / 10
    : 0;
  const hasUpcoming = (S.PEOPLE || []).some(p => {
    const d = daysUntilBirthday(p.birthday);
    return d !== null && d >= 0 && d <= 7;
  });
  let html = '';
  html += '<div class="home-stat-chip"><span class="hsc-num">' + people + '</span> person' + (people === 1 ? '' : 's') + '</div>';
  if(reviews){
    html += '<div class="home-stat-chip">⭐ <span class="hsc-num">' + avg + '</span> avg</div>';
    html += '<div class="home-stat-chip"><span class="hsc-num">' + reviews + '</span> review' + (reviews === 1 ? '' : 's') + '</div>';
  }
  if(hasUpcoming) html += '<div class="home-stat-chip">🎂 <span class="hsc-num">upcoming</span></div>';
  bar.innerHTML = html;
  bar.style.display = people ? 'flex' : 'none';
}

/* ---------- Person click ---------- */
window.onPersonClick = function(p){
  S.LOGIN_TARGET = p;
  txt($('personLoginTitle'), 'Hi ' + (p.display_name || p.slug || '') + ' 💕');
  txt($('personLoginSub'), 'Enter your card password, or requester edit password.');
  $('personPwError').classList.remove('show');
  $('personPwInput').value = '';
  show($('personLoginModal'));
  setTimeout(() => $('personPwInput').focus(), 80);
};

/* ---------- Admin login ---------- */
window.openAdminLoginFull = function(){
  const m = $('adminLoginModal');
  if(!m) return;
  const inp = $('adminPwInput');
  if(inp) inp.value = '';
  const err = $('adminPwError');
  if(err) err.classList.remove('show');
  show(m);
  setTimeout(() => inp && inp.focus(), 80);
};

window.tryAdminLogin = async function(){
  const pw = ($('adminPwInput') || {}).value || '';
  const err = $('adminPwError');
  const stored = (S.CURR.shared && S.CURR.shared.adminPassword) || FALLBACK_ADMIN_PW;
  const ok = (pw === stored) || (pw === FALLBACK_ADMIN_PW);
  if(!ok){
    if(err){
      err.textContent = '❌ Incorrect password.';
      err.classList.add('show');
    }
    return;
  }
  hide($('adminLoginModal'));
  S.ADMIN_MODE = true;
  await window.startAdmin();
};

window.startAdmin = async function(){
  try{
    if(!S.PEOPLE || !S.PEOPLE.length){
      S.PEOPLE = await sb.people() || [];
    }
    if(window.openAdminPanel) window.openAdminPanel();
  }catch(e){
    __showToast('❌ Admin load failed: ' + e.message, false);
  }
};

/* ---------- Boot bindings ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const el = $('homeEmoji');
  if(el) el.addEventListener('click', () => {
    homeClickCount++;
    if(homeClickTimer) clearTimeout(homeClickTimer);
    if(homeClickCount >= 3){
      homeClickCount = 0;
      triggerAdminPrompt();
      return;
    }
    homeClickTimer = setTimeout(() => { homeClickCount = 0; }, 600);
  });

  const box = $('homeIntro');
  const btn = $('homeIntroToggle');
  if(box && btn){
    const KEY = 'homeIntroCollapsed';
    try{
      if(localStorage.getItem(KEY) === '1'){
        box.classList.add('collapsed');
        btn.textContent = 'Show more 👇';
      }
    }catch(e){}
    btn.onclick = (e) => {
      if(e && e.preventDefault) e.preventDefault();
      const isCollapsed = box.classList.toggle('collapsed');
      btn.textContent = isCollapsed ? 'Show more 👇' : 'Hide 👆';
      try{ localStorage.setItem(KEY, isCollapsed ? '1' : '0'); }catch(e){}
    };
  }

  const cbox = $('homeChangelog');
  const chead = $('homeChangelogHead');
  if(cbox && chead){
    const KEY = 'homeChangelogCollapsed';
    try{
      if(localStorage.getItem(KEY) === '0') cbox.classList.remove('collapsed');
    }catch(e){}
    chead.addEventListener('click', () => {
      const isCollapsed = cbox.classList.toggle('collapsed');
      try{ localStorage.setItem(KEY, isCollapsed ? '1' : '0'); }catch(e){}
    });
  }

  const rhead = $('homeReviewsHead');
  if(rhead) rhead.addEventListener('click', () => {
    S.REVIEWS_COLLAPSED = !S.REVIEWS_COLLAPSED;
    if(window.applyHomeReviewsCollapsed) window.applyHomeReviewsCollapsed();
  });

  // Finished section initial state
  const fwrap = $('homeFinished');
  if(fwrap){
    fwrap.classList.toggle('collapsed', FINISHED_COLLAPSED);
  }

  const cancelBtn = $('personPwCancel');
  const input = $('personPwInput');
  const confirmBtn = $('personPwConfirm');
  if(cancelBtn) cancelBtn.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); hide($('personLoginModal')); };
  if(input) input.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); window.tryPersonPw(); }
  });
  if(confirmBtn) confirmBtn.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); window.tryPersonPw(); };

  const aCancel = $('adminPwCancel');
  const aInput = $('adminPwInput');
  const aConfirm = $('adminPwConfirm');
  if(aCancel) aCancel.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); hide($('adminLoginModal')); };
  if(aInput) aInput.addEventListener('keydown', e => {
    if(e.key === 'Enter'){ e.preventDefault(); window.tryAdminLogin(); }
  });
  if(aConfirm) aConfirm.onclick = (e) => { if(e && e.preventDefault) e.preventDefault(); window.tryAdminLogin(); };

  const b = $('openEarlyBtn');
  if(b) b.onclick = (e) => {
    if(e && e.preventDefault) e.preventDefault();
    if(window.__openEarlyHandler__) window.__openEarlyHandler__();
  };
});

/* ---------- Person password check ---------- */
window.tryPersonPw = async function(){
  const pw = $('personPwInput').value;
  const p = S.LOGIN_TARGET;
  if(!p) return;

  const adminPw = (S.CURR.shared && S.CURR.shared.adminPassword) || FALLBACK_ADMIN_PW;
  if(pw === adminPw || pw === FALLBACK_ADMIN_PW){
    hide($('personLoginModal'));
    S.ADMIN_MODE = true;
    await window.startAdmin();
    return;
  }

  const editPw = getEditPasswordForPerson(p);
  const isRequester = editPw && pw === editPw;
  const expected = p.password || '';
  const isViewer = expected && pw === expected;

  if(!isRequester && !isViewer){
    $('personPwError').textContent = getText('pwError', '❌ Incorrect password.');
    $('personPwError').classList.add('show');
    return;
  }

  hide($('personLoginModal'));
  S.REQUESTER_MODE = isRequester;
  S.PREVIEW_MODE = false;
  await window.__loadPersonIntoState__(p);

  const s = S.CURR.shared || {};
  const unlockIso = s.unlockDateISO || '';
  const showLock = s.showLockScreen === 'true';
  const now = new Date();
  const unlockDate = unlockIso ? new Date(unlockIso) : null;
  const locked = unlockDate && !isNaN(unlockDate) && now < unlockDate;

  $('homeScreen').classList.add('hidden');

  if(locked || showLock){
    window.renderLockFull();
    show($('lockScreen'));
    if(locked) window.startCountdownFull(unlockDate);
    else txt($('countdownLabelEl'), '');
    return;
  }

  window.openOpeningFull();
};

})();