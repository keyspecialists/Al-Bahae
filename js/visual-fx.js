/* ===== Visual Experience Layer (HTML/CSS/JS only — no frameworks) =====
   This file is an additive navigation layer:
   - Real clicks on internal site links show a 4s themed video transition.
   - Browser Back / Forward is never intercepted, so it returns instantly.
   - A cinematic 8s logo splash appears only once per browser session.
*/
(function(){
  'use strict';

  var TRANSITION_MS = 4000;
  var SPLASH_MS = 8000;
  var activeOverlay = null;
  var activeTimer = null;
  var navigatingByVisualClick = false;

  var THEMES = [
    {match:/duplicate|lost-key|flip-key/i, title:'نسخ مفاتيح السيارات', video:'fx-keys.mp4', canvas:'keys'},
    {match:/programming|transponder/i, title:'برمجة المفاتيح', video:'fx-programming.mp4', canvas:'tech'},
    {match:/immobilizer/i, title:'الإيموبلايزر', video:'fx-immobilizer.mp4', canvas:'immobilizer'},
    {match:/smart/i, title:'المفاتيح الذكية', video:'fx-smart.mp4', canvas:'smart'},
    {match:/remote/i, title:'ريموت السيارات', video:'fx-remote.mp4', canvas:'remote'},
    {match:/unlock/i, title:'فتح أبواب السيارات', video:'fx-unlock.mp4', canvas:'lock'},
    {match:/emergency/i, title:'طوارئ 24 ساعة', video:'fx-emergency.mp4', canvas:'emergency'},
    {match:/area-|areas\.html/i, title:'مناطق الخدمة', video:'fx-map.mp4', canvas:'map'},
    {match:/brand-|brands\.html/i, title:'الماركات المدعومة', video:'fx-brands.mp4', canvas:'tech'},
    {match:/contact/i, title:'تواصل معنا', video:'fx-contact.mp4', canvas:'contact'},
    {match:/about/i, title:'المتخصصون للمفاتيح', video:'fx-about.mp4', canvas:'safe'},
    {match:/services/i, title:'خدماتنا الاحترافية', video:'fx-keys.mp4', canvas:'keys'},
    {match:/index\.html$|\/$/i, title:'الصفحة الرئيسية', video:'fx-keys.mp4', canvas:'keys'}
  ];

  function isPagesPath(){
    return /\/pages\//.test(location.pathname);
  }

  function assetPath(kind, file){
    var base = isPagesPath() ? '../' : './';
    if (kind === 'video') return base + 'videos/' + file;
    if (kind === 'image') return base + 'images/' + file;
    return base + file;
  }

  function pickTheme(href){
    for (var i = 0; i < THEMES.length; i++){
      if (THEMES[i].match.test(href)) return THEMES[i];
    }
    return {title:'جاري الانتقال', video:'fx-keys.mp4', canvas:'keys'};
  }

  function isInternalPageLink(anchor){
    if (!anchor || !anchor.href) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    if (anchor.dataset && anchor.dataset.noVisualTransition === 'true') return false;

    var url;
    try { url = new URL(anchor.href, location.href); } catch (err) { return false; }
    if (url.origin !== location.origin) return false;
    if (/^(tel|mailto|sms|whatsapp):/i.test(anchor.getAttribute('href') || '')) return false;
    if (url.pathname === location.pathname && url.hash) return false;
    if (!(/\.html?$/i.test(url.pathname) || /\/$/.test(url.pathname))) return false;
    return true;
  }

  function removeOverlayNow(){
    if (activeTimer) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
    var overlays = document.querySelectorAll('#mk-fx-overlay, #mk-splash');
    for (var i = 0; i < overlays.length; i++){
      var c = overlays[i].querySelector('canvas');
      if (c && c._stop) c._stop();
      if (overlays[i].parentNode) overlays[i].parentNode.removeChild(overlays[i]);
    }
    activeOverlay = null;
    document.body.classList.remove('mk-locked');
  }

  function makeVideo(src, loop){
    var v = document.createElement('video');
    v.className = 'mk-video';
    v.src = src;
    v.autoplay = true;
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.preload = 'auto';
    if (loop) v.loop = true;
    v.addEventListener('canplay', function(){
      var p = v.play();
      if (p && p.catch) p.catch(function(){});
    }, {once:true});
    return v;
  }

  function buildSplash(logoSrc){
    removeOverlayNow();
    var splash = document.createElement('div');
    splash.id = 'mk-splash';
    splash.innerHTML =
      '<canvas></canvas>' +
      '<div class="mk-logo-wrap"><img alt="شعار المتخصصون لنسخ المفاتيح" src="' + logoSrc + '"></div>' +
      '<div class="mk-tagline">المتخصصون لنسخ المفاتيح • الباحة</div>' +
      '<div class="mk-progress" aria-hidden="true"><span></span></div>';
    splash.insertBefore(makeVideo(assetPath('video', 'fx-splash.mp4'), true), splash.firstChild);
    document.body.appendChild(splash);
    document.body.classList.add('mk-locked');
    runParticles(splash.querySelector('canvas'), 'splash');
    activeOverlay = splash;
    activeTimer = setTimeout(function(){
      splash.classList.add('mk-hide');
      document.body.classList.remove('mk-locked');
      setTimeout(function(){
        var c = splash.querySelector('canvas');
        if (c && c._stop) c._stop();
        if (splash.parentNode) splash.parentNode.removeChild(splash);
        if (activeOverlay === splash) activeOverlay = null;
      }, 650);
    }, SPLASH_MS);
  }

  function showTransition(info, destination){
    removeOverlayNow();
    var overlay = document.createElement('div');
    overlay.id = 'mk-fx-overlay';
    overlay.setAttribute('role', 'presentation');
    overlay.innerHTML =
      '<canvas></canvas>' +
      '<div class="mk-fx-title">' + escapeHtml(info.title) + '</div>' +
      '<div class="mk-fx-subtitle">تجربة بصرية مخصصة قبل فتح الصفحة</div>' +
      '<button class="mk-skip" type="button" aria-label="تخطي المؤثر والانتقال الآن">تخطي</button>';
    overlay.insertBefore(makeVideo(assetPath('video', info.video), false), overlay.firstChild);
    document.body.appendChild(overlay);
    document.body.classList.add('mk-locked');
    activeOverlay = overlay;
    runParticles(overlay.querySelector('canvas'), info.canvas);

    function go(){
      if (!navigatingByVisualClick) return;
      window.location.assign(destination);
    }

    overlay.querySelector('.mk-skip').addEventListener('click', go);
    activeTimer = setTimeout(go, TRANSITION_MS);
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function runParticles(canvas, theme){
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var running = true;

    function resize(){
      W = canvas.width = Math.max(1, Math.floor(innerWidth * DPR));
      H = canvas.height = Math.max(1, Math.floor(innerHeight * DPR));
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    var palettes = {
      splash:['#ffd76a','#5ab8ff','#ffffff','#ffb23a'],
      keys:['#ffd76a','#ffae3a','#fff2c0','#ffffff'],
      tech:['#55dfff','#3a92ff','#cff2ff','#ffffff'],
      lock:['#ffb46b','#ff8a3a','#ffffff'],
      map:['#6ce6d2','#81b9ff','#ffffff','#ffd45a'],
      emergency:['#ff5a5a','#ff8a3a','#ffd24a','#ffffff'],
      smart:['#a0e8ff','#5fb8ff','#ffffff'],
      remote:['#9bd1ff','#5fa9ff','#ffffff'],
      immobilizer:['#ff7676','#ffae3a','#ffffff'],
      contact:['#5cf08a','#ffd45a','#ffffff'],
      safe:['#c0c8d0','#8e98a8','#ffffff','#5fb8ff']
    };
    var palette = palettes[theme] || palettes.keys;
    var count = Math.max(70, Math.min(190, Math.floor((innerWidth * innerHeight) / 7800)));
    var particles = [];

    function resetParticle(i){
      var ang = Math.random() * Math.PI * 2;
      var speed = (Math.random() * 2.5 + .35) * DPR;
      return {
        x: W / 2 + (Math.random() - .5) * W * .85,
        y: H / 2 + (Math.random() - .5) * H * .85,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        r: (Math.random() * 2.4 + .7) * DPR,
        c: palette[i % palette.length]
      };
    }

    for (var i = 0; i < count; i++) particles.push(resetParticle(i));

    var start = performance.now();
    function loop(now){
      if (!running) return;
      var t = (now - start) / 1000;
      var cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      ctx.fillRect(0, 0, W, H);

      if (theme === 'map') drawGrid(ctx, W, H, DPR, t, '#6ce6d2');
      if (theme === 'emergency'){
        ctx.fillStyle = 'rgba(255,20,30,' + (0.09 + 0.06 * Math.sin(t * 10)) + ')';
        ctx.fillRect(0, 0, W, H);
      }
      if (theme === 'tech' || theme === 'immobilizer') drawCircuits(ctx, W, H, DPR, t);

      for (var p = 0; p < particles.length; p++){
        var item = particles[p];
        var dx = cx - item.x;
        var dy = cy - item.y;
        var dist = Math.sqrt(dx * dx + dy * dy) + .01;
        var pull = theme === 'splash' ? .045 : .018;
        item.vx += dx / dist * pull;
        item.vy += dy / dist * pull;
        item.vx *= .986;
        item.vy *= .986;
        item.x += item.vx;
        item.y += item.vy;
        if (item.x < -30 || item.x > W + 30 || item.y < -30 || item.y > H + 30) particles[p] = resetParticle(p);
        ctx.beginPath();
        ctx.fillStyle = item.c;
        ctx.shadowColor = item.c;
        ctx.shadowBlur = 14 * DPR;
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      var rad = (80 + Math.sin(t * 3) * 18) * DPR;
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 4);
      g.addColorStop(0, theme === 'emergency' ? 'rgba(255,70,60,.28)' : 'rgba(255,218,112,.28)');
      g.addColorStop(1, 'rgba(255,218,112,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 4, 0, Math.PI * 2);
      ctx.fill();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    canvas._stop = function(){
      running = false;
      window.removeEventListener('resize', resize);
    };
  }

  function drawGrid(ctx, W, H, DPR, t, color){
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * DPR;
    var step = 70 * DPR;
    var off = (t * 52 * DPR) % step;
    for (var x = -step + off; x < W; x += step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for (var y = -step + off; y < H; y += step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();
  }

  function drawCircuits(ctx, W, H, DPR, t){
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.strokeStyle = '#55dfff';
    ctx.lineWidth = 1.2 * DPR;
    for (var i = 0; i < 16; i++){
      var y = ((i * 90 + t * 80) % (H + 160)) - 80;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W * .28, y);
      ctx.lineTo(W * .42, y + 46 * DPR);
      ctx.lineTo(W, y + 46 * DPR);
      ctx.stroke();
    }
    ctx.restore();
  }

  function logoPath(){
    return assetPath('image', 'logo-mk.jpg');
  }

  function shouldShowSplash(){
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && (nav.type === 'back_forward' || nav.type === 'reload')) return false;
    } catch (err) {}
    try {
      if (sessionStorage.getItem('mk-splash-seen') === '1') return false;
      sessionStorage.setItem('mk-splash-seen', '1');
    } catch (err) {}
    return true;
  }

  function enhanceHomeHero(){
    var hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('.mk-hero-bg-video')) return;
    var video = makeVideo(assetPath('video', 'fx-home-bg.mp4'), true);
    video.className = 'mk-hero-bg-video';
    var visual = document.createElement('div');
    visual.className = 'mk-hero-visual-layer';
    hero.insertBefore(video, hero.firstChild);
    hero.insertBefore(visual, video.nextSibling);
  }

  function onDocumentClick(ev){
    /* Per user request: button click transitions are disabled.
       Links open instantly with no overlay video. The splash on first
       session load and the home-hero background video remain active. */
    return;
  }

  function init(){
    enhanceHomeHero();
    if (shouldShowSplash()) buildSplash(logoPath());
  }

  /* Click listener intentionally not attached — instant navigation. */

  window.addEventListener('popstate', function(){
    navigatingByVisualClick = false;
    removeOverlayNow();
  });

  window.addEventListener('pageshow', function(event){
    var restoredFromCache = event && event.persisted;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      restoredFromCache = restoredFromCache || (nav && nav.type === 'back_forward');
    } catch (err) {}
    if (restoredFromCache){
      navigatingByVisualClick = false;
      removeOverlayNow();
    }
    enhanceHomeHero();
  });

  window.addEventListener('pagehide', function(){
    if (!navigatingByVisualClick) removeOverlayNow();
  });

  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible' && !navigatingByVisualClick) removeOverlayNow();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
