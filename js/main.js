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

/* ---- Демо «Кайф зачёркивания»: просто демо — жест Х проигрывается сам по кругу, скролл страницы не блокируется ---- */
(function () {
  var phone = document.getElementById('crossPhone');
  if (!phone) return;
  var canvas = document.getElementById('xGestureCanvas');
  var hint = document.getElementById('crossHint');
  var zap = document.getElementById('crossZap');
  var tasks = document.getElementById('crossTasks');
  var ctx = canvas ? canvas.getContext('2d') : null;
  if (!canvas || !ctx || !hint) return;

  var strokes = [];        // завершённые штрихи: {points, time, matched}
  var current = null;      // штрих в работе
  var fadeRunning = false;
  var drawScheduled = false;
  var resetTimer = null;
  var swapTimer = null;
  var loopTimer = null;
  var playing = false;
  var visible = false;
  var reduced = false;
  var playedOnce = false;
  var origHint = hint.textContent;

  try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function sizeCanvas() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(w / r.width, 0, 0, h / r.height, 0, 0);
    // реплики задач масштабируются от ширины телефона: 1em = 10px исходного скриншота
    if (tasks) { var pr = phone.getBoundingClientRect(); if (pr.width) tasks.style.fontSize = (pr.width / 78) + 'px'; }
  }

  // штрихи рисуются как в приложении: широкое свечение + тонкое ядро
  function drawPath(pts, alpha, color, width) {
    if (pts.length < 2) return;
    ctx.strokeStyle = color.replace('ALPHA', alpha);
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function drawAll() {
    sizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var now = Date.now();
    strokes = strokes.filter(function (s) { return now - s.time < 1500; });
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i];
      var a = Math.max(0, 1 - (now - s.time) / 1500);
      if (s.matched) {
        drawPath(s.points, (0.5 * a).toFixed(3), 'rgba(0,255,140,ALPHA)', 14);
        drawPath(s.points, a.toFixed(3), 'rgba(0,255,140,ALPHA)', 6);
      } else {
        drawPath(s.points, (0.35 * a).toFixed(3), 'rgba(0,212,255,ALPHA)', 14);
        drawPath(s.points, (0.9 * a).toFixed(3), 'rgba(108,71,255,ALPHA)', 4);
      }
    }
    if (current && current.points.length >= 2) {
      drawPath(current.points, '0.5', 'rgba(0,212,255,ALPHA)', 14);
      drawPath(current.points, '1', 'rgba(108,71,255,ALPHA)', 4);
    }
  }

  function scheduleDraw() {
    if (drawScheduled) return;
    drawScheduled = true;
    requestAnimationFrame(function () { drawScheduled = false; drawAll(); });
  }

  function startFade() {
    if (fadeRunning) return;
    fadeRunning = true;
    var tick = function () {
      drawAll();
      if (strokes.length > 0 || current) { requestAnimationFrame(tick); }
      else { fadeRunning = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
    requestAnimationFrame(tick);
  }

  // празднование — как celebrateTaskDone в приложении: ✓ + 14 эмодзи-искры
  function celebrate() {
    var overlay = document.createElement('div');
    overlay.className = 'celebrate-overlay';
    var check = document.createElement('div');
    check.className = 'celebrate-check';
    check.textContent = '✓';
    overlay.appendChild(check);
    var particles = ['🎉', '✨', '⭐', '💥', '🔥', '⚡'];
    var count = 14;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      p.className = 'celebrate-particle';
      p.textContent = particles[Math.floor(Math.random() * particles.length)];
      var angle = (360 / count) * i + (Math.random() * 20 - 10);
      var distance = 80 + Math.random() * 70;
      var rad = angle * Math.PI / 180;
      p.style.setProperty('--tx', Math.cos(rad) * distance + 'px');
      p.style.setProperty('--ty', Math.sin(rad) * distance + 'px');
      p.style.animationDelay = (Math.random() * 0.06) + 's';
      overlay.appendChild(p);
    }
    phone.appendChild(overlay);
    if (navigator.vibrate) { try { navigator.vibrate(40); } catch (e) {} }
    setTimeout(function () { overlay.remove(); }, 1150);
  }

  function success() {
    phone.classList.add('is-done');
    if (zap) zap.hidden = false;
    celebrate();
    hint.textContent = '⚡ Есть! Задача закрыта — смотрим дальше';
    // как в приложении: после празднования задача уходит, следующая выезжает на главный
    swapTimer = setTimeout(function () {
      phone.classList.add('is-swapped');
      hint.textContent = '⚡ Новая задача выехала на главный — тапни, чтобы повторить';
    }, 950);
    resetTimer = setTimeout(reset, 2900);
  }

  function reset() {
    phone.classList.remove('is-done');
    phone.classList.remove('is-swapped');
    if (zap) zap.hidden = true;
    hint.textContent = origHint;
    playing = false;
    if (visible && !reduced) { clearTimeout(loopTimer); loopTimer = setTimeout(playAuto, 1100); }
  }

  function animateStroke(a, b, done) {
    current = { points: [{ x: a.x, y: a.y }], time: Date.now() };
    startFade();
    var t0 = performance.now(), D = 330;
    var step = function (t) {
      if (!current) { if (done) done(); return; }
      var k = Math.min(1, (t - t0) / D);
      var p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      var last = current.points[current.points.length - 1];
      if (Math.abs(last.x - p.x) > 1.2 || Math.abs(last.y - p.y) > 1.2) current.points.push(p);
      drawAll();
      if (k < 1) { requestAnimationFrame(step); }
      else { strokes.push(current); current = null; if (done) done(); }
    };
    requestAnimationFrame(step);
  }

  // автопоказ: два штриха Х по экрану (как в приложении), затем зелёная вспышка + празднование
  function playAuto() {
    if (playing || !visible) return;
    playing = true;
    var r = canvas.getBoundingClientRect();
    var w = r.width, h = r.height;
    animateStroke({ x: w * 0.16, y: h * 0.095 }, { x: w * 0.84, y: h * 0.245 }, function () {
      animateStroke({ x: w * 0.84, y: h * 0.095 }, { x: w * 0.16, y: h * 0.245 }, function () {
        strokes.forEach(function (s) { s.matched = true; s.time = Date.now(); });
        success();
      });
    });
  }

  // reduced-motion: статичный результат без анимаций и без цикла
  function instantDone() {
    sizeCanvas();
    var r = canvas.getBoundingClientRect();
    var w = r.width, h = r.height;
    drawPath([{ x: w * 0.16, y: h * 0.095 }, { x: w * 0.84, y: h * 0.245 }], '1', 'rgba(0,255,140,ALPHA)', 8);
    drawPath([{ x: w * 0.84, y: h * 0.095 }, { x: w * 0.16, y: h * 0.245 }], '1', 'rgba(0,255,140,ALPHA)', 8);
    phone.classList.add('is-done');
    if (zap) zap.hidden = false;
    hint.textContent = '✓ Задача выполнена — так это работает в приложении';
  }

  // тап = повтор (скролл никогда не блокируем: ни preventDefault, ни touch-action:none)
  phone.addEventListener('click', function () {
    if (playing) return;
    clearTimeout(resetTimer);
    clearTimeout(swapTimer);
    clearTimeout(loopTimer);
    phone.classList.remove('is-swapped');
    if (reduced) { instantDone(); return; }
    loopTimer = setTimeout(playAuto, 300);
  });
  phone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (playing) return;
      clearTimeout(resetTimer);
      clearTimeout(swapTimer);
      clearTimeout(loopTimer);
      phone.classList.remove('is-swapped');
      if (reduced) { instantDone(); return; }
      loopTimer = setTimeout(playAuto, 300);
    }
  });

  // автодемо, когда блок попадает в зону видимости; ушёл из вида — цикл останавливается
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      clearTimeout(loopTimer);
      if (!visible) return;
      if (reduced) { if (!playedOnce) { playedOnce = true; instantDone(); } return; }
      loopTimer = setTimeout(playAuto, 420);
    }, { threshold: 0.45 });
    io.observe(phone);
  } else {
    visible = true;
    loopTimer = setTimeout(playAuto, 420);
  }

  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();
})();
