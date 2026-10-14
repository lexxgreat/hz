(function () {
  'use strict';

  var deck = document.getElementById('deck');
  if (!deck) { return; }

  var sections = Array.prototype.slice.call(deck.querySelectorAll('.deck-slide'));
  var frames = Array.prototype.slice.call(deck.querySelectorAll('.deck-frame'));
  var dotsWrap = document.querySelector('.deck-dots');
  var dots = [];

  /* --- Точки-навигация --- */
  if (dotsWrap) {
    sections.forEach(function (sec, i) {
      var b = document.createElement('button');
      b.className = 'deck-dot';
      b.type = 'button';
      b.setAttribute('aria-label', 'Слайд ' + (i + 1) + ' из ' + sections.length);
      b.addEventListener('click', function () {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      dotsWrap.appendChild(b);
      dots.push(b);
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var i = sections.indexOf(e.target);
            dots.forEach(function (d, j) { d.classList.toggle('active', j === i); });
          }
        });
      }, { root: deck, threshold: 0.6 });
      sections.forEach(function (sec) { io.observe(sec); });
    }
  }

  /* --- Масштаб слайдов: канва 1280×720 → размер окна ---
     Фрейму задаём размер 1280s×720s, а сам слайд внутри
     применяет zoom = s (см. фит-скрипт в slide_*.html),
     поэтому текст остаётся чётким, а не растянутым. */
  var deckVisible = function () {
    return window.getComputedStyle(deck).display !== 'none';
  };

  function sizeFrames() {
    if (!deckVisible()) { return; }
    var vw = deck.clientWidth;
    var vh = deck.clientHeight;
    if (!vw || !vh) { return; }
    var s = Math.min(vw / 1280, vh / 720);
    frames.forEach(function (f) {
      f.style.width = (1280 * s) + 'px';
      f.style.height = (720 * s) + 'px';
    });
  }

  var raf = null;
  window.addEventListener('resize', function () {
    if (raf) { cancelAnimationFrame(raf); }
    raf = requestAnimationFrame(sizeFrames);
  });
  window.addEventListener('load', sizeFrames);
  sizeFrames();

  /* --- Клавиатура: стрелки / PgUp / PgDn / Home / End --- */
  function currentIndex() {
    return Math.round(deck.scrollTop / Math.max(deck.clientHeight, 1));
  }

  function goTo(i, smooth) {
    i = Math.max(0, Math.min(sections.length - 1, i));
    var top = i * deck.clientHeight;
    deck.scrollTo({ top: top, behavior: smooth === false ? 'auto' : 'smooth' });
  }

  document.addEventListener('keydown', function (e) {
    if (!deckVisible()) { return; }
    var handled = true;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'PageDown':
        goTo(currentIndex() + 1); break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'PageUp':
        goTo(currentIndex() - 1); break;
      case 'Home':
        goTo(0); break;
      case 'End':
        goTo(sections.length - 1); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); }
  });
})();
