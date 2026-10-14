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


/* ---- Демо «Кайф зачёркивания»: живой скриншот главного экрана + жест Х, порт из приложения ---- */
(function () {
  var phone = document.getElementById('crossPhone');
  if (!phone) return;
  var canvas = document.getElementById('xGestureCanvas');
  var hint = document.getElementById('crossHint');
  var strike = document.getElementById('crossStrike');
  var zap = document.getElementById('crossZap');
  var ctx = canvas ? canvas.getContext('2d') : null;
  if (!canvas || !ctx || !hint || !strike) return;

  var strokes = [];        // завершённые штрихи: {points, type, time, matched}
  var current = null;      // штрих в работе
  var fadeRunning = false;
  var drawScheduled = false;
  var resetTimer = null;
  var downAt = 0;
  var origHint = hint.textContent;

  function sizeCanvas() {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(w / r.width, 0, 0, h / r.height, 0, 0);
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
    strike.classList.add('on');
    if (zap) zap.hidden = false;
    celebrate();
    hint.textContent = '✓ Задача выполнена — искры, ⚡ и кайф. Ещё раз?';
    resetTimer = setTimeout(reset, 3600);
  }

  function reset() {
    phone.classList.remove('is-done');
    strike.classList.remove('on');
    if (zap) zap.hidden = true;
    hint.textContent = origHint;
  }

  function pt(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  phone.addEventListener('pointerdown', function (e) {
    if (current || phone.classList.contains('is-done')) return;
    e.preventDefault();
    if (phone.setPointerCapture) { try { phone.setPointerCapture(e.pointerId); } catch (err) {} }
    sizeCanvas();
    current = { points: [pt(e)], time: 0 };
    downAt = Date.now();
    startFade();
  });

  phone.addEventListener('pointermove', function (e) {
    if (!current) return;
    var p = pt(e);
    var last = current.points[current.points.length - 1];
    if (Math.abs(last.x - p.x) < 2 && Math.abs(last.y - p.y) < 2) return;
    current.points.push(p);
    scheduleDraw();
  });

  phone.addEventListener('pointerup', function (e) {
    if (!current) return;
    gestureEnd(pt(e));
  });

  phone.addEventListener('pointercancel', function () {
    if (!current) return;
    strokes.push(current); current = null; startFade();
  });

  function gestureEnd(p) {
    var pts = current.points;
    var last = pts[pts.length - 1];
    if (Math.abs(last.x - p.x) > 2 || Math.abs(last.y - p.y) > 2) pts.push(p);
    current.time = Date.now();
    var start = pts[0], end = pts[pts.length - 1];
    var dx = end.x - start.x, dy = end.y - start.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var r = canvas.getBoundingClientRect();
    var minSide = Math.min(r.width, r.height);

    // тап почти без движения — сами показываем жест
    if (dist < 14 && Date.now() - downAt < 400) { current = null; playAuto(); return; }

    var saveAndFade = function () { strokes.push(current); current = null; startFade(); };
    if (dist < minSide * 0.5) { saveAndFade(); return; }
    var ratio = Math.abs(dx) / (Math.abs(dy) || 1);
    if (ratio < 0.4 || ratio > 2.5) { saveAndFade(); return; }

    var type = (dx * dy > 0) ? 'backslash' : 'slash';
    var midX = (start.x + end.x) / 2, midY = (start.y + end.y) / 2;
    var now = Date.now();
    current.type = type;
    strokes.push(current);
    current = null;
    strokes = strokes.filter(function (s) { return now - s.time < 1200; });
    var tol = minSide * 0.4;
    var match = null;
    for (var i = 0; i < strokes.length; i++) {
      var s = strokes[i];
      if (s.type && s.type !== type) {
        var mx = (s.points[0].x + s.points[s.points.length - 1].x) / 2;
        var my = (s.points[0].y + s.points[s.points.length - 1].y) / 2;
        if (Math.abs(mx - midX) < tol && Math.abs(my - midY) < tol) { match = s; break; }
      }
    }
    if (match) {
      match.matched = true; match.time = now;
      var ls = strokes[strokes.length - 1];
      if (ls) { ls.matched = true; ls.time = now; }
      success();
    }
    startFade();
  }

  // тап = автопоказ: два штриха Х по экрану, как будто провёл пальцем
  function playAuto() {
    if (phone.classList.contains('is-done') || current) return;
    var r = canvas.getBoundingClientRect();
    var w = r.width, h = r.height;
    animateStroke({ x: w * 0.16, y: h * 0.095 }, { x: w * 0.84, y: h * 0.245 }, function () {
      animateStroke({ x: w * 0.84, y: h * 0.095 }, { x: w * 0.16, y: h * 0.245 }, function () {});
    });
  }

  function animateStroke(a, b, done) {
    var t0 = performance.now(), D = 420;
    current = { points: [{ x: a.x, y: a.y }], time: 0 };
    startFade();
    var step = function (t) {
      if (!current) { if (done) done(); return; }
      var k = Math.min(1, (t - t0) / D);
      var p = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
      var last = current.points[current.points.length - 1];
      if (Math.abs(last.x - p.x) > 2 || Math.abs(last.y - p.y) > 2) current.points.push(p);
      drawAll();
      if (k < 1) { requestAnimationFrame(step); }
      else { var cb = done; gestureEnd(b); if (cb) cb(); }
    };
    requestAnimationFrame(step);
  }

  phone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playAuto(); }
  });
  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();
})();
