/* Vinder mobile shell: what makes the web app feel like a phone app.
   Launch screen, push/pop transitions, swipe back from the left edge, drag-to-close sheets,
   long-press on messages, keyboard-aware layout, install prompt, status-bar colour, offline cache. */
(function () {
  'use strict';
  const UI = window.VinderUI, C = window.VinderCore, K = window.VinderKit;
  const { A, ic, vlogo, wordmark, $, esc } = K;
  const doc = document.documentElement;
  const view = document.getElementById('view');
  const app = document.getElementById('app');

  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const hosted = /^https?:$/.test(location.protocol);
  if (standalone()) doc.classList.add('standalone');

  // ---------- launch screen ----------
  const splash = document.getElementById('splash');
  if (splash) {
    splash.innerHTML = `<div class="sp"><img src="${A.mascot}" alt=""><div class="row">${vlogo()}${wordmark()}</div><small>For the VinUni community</small></div>`;
    const hide = () => { splash.classList.add('out'); setTimeout(() => splash.remove(), 500); };
    // Long enough to read as a launch screen, short enough not to be in the way.
    setTimeout(hide, standalone() ? 900 : 650);
    splash.addEventListener('click', hide);
  }

  // ---------- keyboard-aware height ----------
  // The visual viewport shrinks when the keyboard opens; fit the app to it so the composer stays visible.
  const vv = window.visualViewport;
  function fit() {
    const h = vv ? vv.height : window.innerHeight;
    doc.style.setProperty('--app-h', Math.round(h) + 'px');
    doc.style.setProperty('--app-top', Math.round(vv ? vv.offsetTop : 0) + 'px');
    if (UI.current().page === 'chat') { const m = $('#main'); if (m) m.scrollTop = m.scrollHeight; }
  }
  if (vv) { vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  fit();

  // ---------- status bar colour ----------
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.append(meta); }
  function paintStatusBar(page) {
    const dark = doc.dataset.theme === 'dark' || (!doc.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const navy = page === 'welcome' || page === 'vouch' || !!document.querySelector('#layer .match');
    meta.content = navy ? '#0A1834' : dark ? '#0D1120' : '#FBF7F9';
  }

  // ---------- push / pop transitions ----------
  const DEPTH = { welcome: 0, discover: 0, matches: 0, vincupid: 0, me: 0, vouch: 0, chat: 1, settings: 1, premium: 1, profile: 1.5, edit: 2 };
  const depth = (p, arg) => p === 'onboarding' ? 1 + (parseInt(arg, 10) || 1) / 20 : (p in DEPTH ? DEPTH[p] : 1);
  function animate(cls) {
    view.classList.remove('v-push', 'v-pop', 'v-fade', 'v-out', 'v-back');
    view.style.transform = '';
    void view.offsetWidth;
    view.classList.add(cls);
    view.addEventListener('animationend', () => view.classList.remove(cls), { once: true });
  }
  UI.hooks.afterRender.push((page, arg, prev) => {
    paintStatusBar(page);
    bindInstall(page);
    if (!prev.page || (prev.page === page && prev.arg === arg)) return;
    const d = depth(page, arg) - depth(prev.page, prev.arg);
    animate(d > 0 ? 'v-push' : d < 0 ? 'v-pop' : 'v-fade');
  });
  UI.hooks.afterLayer.push(() => paintStatusBar(UI.current().page));

  // ---------- swipe back from the left edge (pushed screens only) ----------
  // Touch events, not pointer events: the browser cancels pointers once it decides a drag is a pan.
  let edge = null;
  view.addEventListener('touchstart', e => {
    const { page, arg } = UI.current();
    if (e.touches.length !== 1 || UI.layerOpen() || depth(page, arg) <= 0) return;
    if (page === 'onboarding' && (parseInt(arg, 10) || 1) === 1) return;
    const t = e.touches[0];
    if (t.clientX - app.getBoundingClientRect().left > 24) return;
    edge = { x: t.clientX, y: t.clientY, t: performance.now(), dx: 0, on: false };
  }, { passive: true });
  view.addEventListener('touchmove', e => {
    if (!edge) return;
    const t = e.touches[0], dx = t.clientX - edge.x, dy = t.clientY - edge.y;
    if (!edge.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > dx) { edge = null; return; }
      if (dx > Math.abs(dy) && e.cancelable) e.preventDefault();
      if (dx < 10) return;
      edge.on = true;
      view.classList.add('dragging');
    }
    if (e.cancelable) e.preventDefault();
    edge.dx = Math.max(0, dx);
    view.style.transform = `translateX(${edge.dx}px)`;
    app.style.setProperty('--edge', String(Math.max(0, 1 - edge.dx / app.clientWidth)));
  }, { passive: false });
  const edgeEnd = () => {
    if (!edge) return;
    const { on, dx, t } = edge;
    edge = null;
    if (!on) return;
    view.classList.remove('dragging');
    app.style.removeProperty('--edge');
    const fast = dx / Math.max(1, performance.now() - t) > 0.5;
    if (dx > app.clientWidth * 0.3 || (fast && dx > 40)) {
      view.classList.add('v-out');
      UI.haptic('light');
      setTimeout(() => { view.classList.remove('v-out'); view.style.transform = ''; UI.back(); }, 190);
    } else {
      view.classList.add('v-back');
      view.style.transform = '';
      setTimeout(() => view.classList.remove('v-back'), 260);
    }
  };
  view.addEventListener('touchend', edgeEnd);
  view.addEventListener('touchcancel', edgeEnd);

  // ---------- drag a sheet down by its handle to close it ----------
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const grab = e.target.closest('.sheet .grab');
    if (!grab) return;
    const sheet = grab.closest('.sheet');
    drag = { sheet, scrim: sheet.previousElementSibling, y: e.clientY, t: performance.now(), dy: 0, id: e.pointerId };
    sheet.classList.add('dragging');
    try { grab.setPointerCapture(e.pointerId); } catch (_) { /* gone */ }
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dy = Math.max(0, e.clientY - drag.y);
    drag.sheet.style.transform = `translateY(${drag.dy}px)`;
    if (drag.scrim) drag.scrim.style.opacity = String(Math.max(0.2, 1 - drag.dy / 400));
  });
  const dragEnd = () => {
    if (!drag) return;
    const { sheet, scrim, dy, t } = drag;
    drag = null;
    sheet.classList.remove('dragging');
    const fast = dy / Math.max(1, performance.now() - t) > 0.6;
    if (dy > 110 || (fast && dy > 30)) {
      sheet.classList.add('closing');
      if (scrim) { scrim.style.transition = 'opacity .22s'; scrim.style.opacity = '0'; }
      setTimeout(UI.closeLayer, 200);
    } else {
      sheet.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
      sheet.style.transform = '';
      if (scrim) scrim.style.opacity = '';
      setTimeout(() => { sheet.style.transition = ''; }, 260);
    }
  };
  document.addEventListener('pointerup', dragEnd);
  document.addEventListener('pointercancel', dragEnd);

  // ---------- long-press a chat bubble: copy, or report what they sent ----------
  // Our timer covers iOS; Android also fires contextmenu on a long press. The tap the browser sends
  // when the finger lifts must not land on the sheet's backdrop, so that one click is swallowed.
  let press = null, swallowClick = false;
  const openFromPress = b => {
    if (press) { clearTimeout(press.timer); press = null; }
    b.classList.remove('pressed');
    if (UI.layerOpen()) return;
    swallowClick = true;
    messageMenu(b);
  };
  document.addEventListener('pointerdown', e => {
    swallowClick = false;
    const b = e.target.closest('#msgs .b');
    if (!b || UI.current().page !== 'chat') return;
    press = { b, x: e.clientX, y: e.clientY, timer: setTimeout(() => openFromPress(b), 420) };
    b.classList.add('pressed');
  });
  const cancelPress = e => {
    if (!press) return;
    if (e && e.type === 'pointermove' && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 10) return;
    clearTimeout(press.timer);
    press.b.classList.remove('pressed');
    press = null;
  };
  document.addEventListener('pointermove', cancelPress);
  document.addEventListener('pointerup', cancelPress);
  document.addEventListener('pointercancel', cancelPress);
  document.addEventListener('contextmenu', e => {
    const b = e.target.closest('#msgs .b');
    if (!b) return;
    e.preventDefault();
    openFromPress(b);
  });
  document.addEventListener('click', e => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  function messageMenu(b) {
    const u = C.byId(UI.current().arg), msg = u && (C.acc().chats[u.id] || []).find(m => m.id === b.dataset.mid);
    if (!u || !msg) return;
    const theirs = msg.from === u.id;
    UI.haptic('medium');
    UI.sheet(`<p class="b ${theirs ? 'them' : 'me'}" style="max-width:100%;margin:0 0 14px;animation:none">${esc(msg.text)}</p>
      <div class="menu">
        <button id="mcopy"><span class="mi">${ic('copy')}</span>Copy text</button>
        ${theirs ? `<button id="mrep"><span class="mi" style="background:var(--red-50);color:var(--red)">${ic('flag')}</span>Report this message</button>` : ''}
      </div>`, el => {
      $('#mcopy', el).onclick = async () => {
        UI.closeLayer();
        try { await navigator.clipboard.writeText(msg.text); UI.toast('Copied'); } catch (e) { UI.toast('Copy is blocked in this browser.'); }
      };
      const rep = $('#mrep', el);
      if (rep) rep.onclick = () => UI.reportSheet(u, msg.flag || 'harassment');
    });
  }

  // ---------- install: Android prompt, iPhone instructions ----------
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    if (UI.current().page === 'me') UI.render();
  });
  window.addEventListener('appinstalled', () => { deferred = null; UI.toast('Vinder is on your Home Screen.', true); });
  UI.hooks.meExtra.push(() => (standalone() || !hosted) ? '' : `<div class="card pad install"><span class="ii">${ic('mobile')}</span>
    <span class="grow"><b style="display:block">Add Vinder to your Home Screen</b><span class="small muted">Full screen, offline-ready, one tap away.</span></span>
    <button class="btn sm" id="inst">${deferred ? 'Install' : 'How'}</button></div>`);
  function bindInstall(page) {
    const btn = page === 'me' && document.getElementById('inst');
    if (!btn) return;
    btn.onclick = async () => {
      if (deferred) {
        deferred.prompt();
        const choice = await deferred.userChoice.catch(() => null);
        deferred = null;
        if (choice && choice.outcome === 'accepted') UI.haptic('success');
        UI.render();
        return;
      }
      UI.sheet(`<h3 class="t">Add Vinder to your Home Screen</h3>
        <ol class="steps">${isIOS
          ? `<li><span>Tap ${ic('share', 'sm')} <b>Share</b> in Safari's toolbar.</span></li><li><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li><li><span>Tap <b>Add</b>. Vinder opens full screen from your Home Screen.</span></li>`
          : `<li><span>Open your browser menu (<b>⋮</b>).</span></li><li><span>Tap <b>Install app</b> or <b>Add to Home screen</b>.</span></li><li><span>Confirm. Vinder opens full screen from your launcher.</span></li>`}</ol>
        <button class="btn block" data-close style="margin-top:16px">Got it</button>`);
    };
  }

  // ---------- network ----------
  window.addEventListener('offline', () => UI.toast("You're offline. VinCupid's offline rules still work.", true));
  window.addEventListener('online', () => UI.toast('Back online.'));

  // Offline cache, only for the hosted PWA build (it ships sw.js next to index.html).
  if ('serviceWorker' in navigator && hosted && document.querySelector('link[rel="manifest"]')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* not deployed with a worker */ }));
  }
})();
