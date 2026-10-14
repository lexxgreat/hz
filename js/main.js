(function () {
  'use strict';

  /* --- Reveal on scroll --- */
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  /* --- Active nav link --- */
  var links = document.querySelectorAll('.nav-links a');
  var map = {};
  links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window && Object.keys(map).length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55%' });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) { obs.observe(s); }
    });
  }

  /* --- Mobile menu --- */
  var burger = document.getElementById('navBurger');
  var mobile = document.getElementById('navMobile');
  if (burger && mobile) {
    burger.addEventListener('click', function () {
      var open = mobile.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobile.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobile.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- Footer year --- */
  var year = document.getElementById('year');
  if (year) { year.textContent = String(new Date().getFullYear()); }

  /* --- Полоса прогресса чтения (v101: стили вернулись — нужен JS) --- */
  var pl = document.getElementById('progressLine');
  if (pl) {
    var plUpd = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      pl.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', plUpd, { passive: true });
    window.addEventListener('resize', plUpd);
    plUpd();
  }

  /* --- Звёздное небо (canvas#stars, v101) ---
     Канвас фиксирован позади контента (z-index:-1). Мягкое мерцание ~30fps;
     на десктопе дека закрывает фон непрозрачными слайдами — анимация встает на паузу. */
  var starsCv = document.getElementById('stars');
  if (starsCv && starsCv.getContext && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var sctx = starsCv.getContext('2d');
    var sList = [], sRaf = null, sW = 0, sH = 0;
    var starResize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      sW = window.innerWidth; sH = window.innerHeight;
      starsCv.width = sW * dpr; starsCv.height = sH * dpr;
      starsCv.style.width = sW + 'px'; starsCv.style.height = sH + 'px';
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(130, Math.round((sW * sH) / 11000));
      sList = [];
      for (var i = 0; i < count; i++) {
        sList.push({
          x: Math.random() * sW, y: Math.random() * sH,
          r: Math.random() * 1.2 + 0.3,
          p: Math.random() * Math.PI * 2,
          s: 0.35 + Math.random() * 1.1
        });
      }
    };
    var starDraw = function (t) {
      sctx.clearRect(0, 0, sW, sH);
      sctx.fillStyle = '#CFE2FF';
      for (var i = 0; i < sList.length; i++) {
        var st = sList[i];
        sctx.globalAlpha = 0.16 + 0.5 * Math.abs(Math.sin(st.p + (t / 1400) * st.s));
        sctx.beginPath();
        sctx.arc(st.x, st.y, st.r, 0, 6.2832);
        sctx.fill();
      }
      sctx.globalAlpha = 1;
    };
    var deckEl = document.getElementById('deck');
    var starLoop = function (t) {
      if (deckEl && window.getComputedStyle(deckEl).display !== 'none') { sRaf = null; return; }
      starDraw(t);
      sRaf = requestAnimationFrame(starLoop);
    };
    var starKick = function () { if (!sRaf) { sRaf = requestAnimationFrame(starLoop); } };
    window.addEventListener('resize', function () { starResize(); starKick(); });
    starResize();
    starKick();
  }
})();

/* ---- Демо «Кайф зачёркивания»: тап — задачу накрывает символ Х, разлетаются искры, падает ⚡ ---- */
(function () {
  var card = document.getElementById('crossCard');
  if (!card) return;
  var hint = document.getElementById('crossHint');
  var canvas = document.getElementById('confetti');
  var ctx = canvas.getContext('2d');
  var sparks = [];
  var raf = null;
  var resetTimer = null;
  var done = false;
  var origHint = hint.textContent;

  function sizeCanvas() {
    var r = card.getBoundingClientRect();
    if (!r.width || !r.height) return;
    canvas.width = Math.max(1, Math.round(r.width * (window.devicePixelRatio || 1)));
    canvas.height = Math.max(1, Math.round(r.height * (window.devicePixelRatio || 1)));
    ctx.setTransform(canvas.width / r.width, 0, 0, canvas.height / r.height, 0, 0);
  }

  var COLORS = ['#8F6BFF', '#6C47FF', '#00D4FF', '#FFD166', '#FF5470', '#7CFFB2'];
  function burst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.2832;
      var sp = 1.6 + Math.random() * 4.2;
      sparks.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2.2,
        life: 0.9 + Math.random() * 0.3,
        r: 1.4 + Math.random() * 2.4,
        c: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    var w = ctx.canvas.clientWidth || parseFloat(canvas.style.width) || canvas.width;
    var h = ctx.canvas.clientHeight || parseFloat(canvas.style.height) || canvas.height;
    ctx.clearRect(0, 0, w, h);
    sparks = sparks.filter(function (p) { return p.life > 0; });
    for (var i = 0; i < sparks.length; i++) {
      var p = sparks[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.022;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (sparks.length) { raf = requestAnimationFrame(tick); } else { raf = null; ctx.clearRect(0, 0, w, h); }
  }

  function play() {
    if (done) return;
    done = true;
    sizeCanvas();
    card.classList.add('is-done');
    var zap = document.createElement('span');
    zap.className = 'cross-zap';
    zap.textContent = '⚡';
    card.appendChild(zap);
    var r = card.getBoundingClientRect();
    burst(r.width * 0.86, r.height * 0.38, 24);
    burst(r.width * 0.62, r.height * 0.5, 16);
    hint.textContent = '⚡ Заряд капнул! Пару секунд — и можно попробовать снова';
    resetTimer = setTimeout(reset, 3400);
  }
  function reset() {
    done = false;
    card.classList.remove('is-done');
    var z = card.querySelector('.cross-zap');
    if (z) z.remove();
    sparks = [];
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hint.textContent = origHint;
  }

  card.addEventListener('click', play);
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
  });
  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();
})();
