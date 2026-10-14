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
