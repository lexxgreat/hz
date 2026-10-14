(function () {
  'use strict';

  var deck = document.getElementById('deck');
  if (!deck) { return; }

  var sections = Array.prototype.slice.call(deck.querySelectorAll('.deck-slide'));
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

  /* --- v3-FLUID: масштабирование слайдов больше не нужно ---
     Раньше фрейм сжимался до 1280s×720s (letterbox → «рамки по краям» на
     широких экранах). Теперь слайд жидкий: iframe = всё окно, а типографика
     и отступы масштабаются внутри через --u (deck/global.css).
     Фреймы 100%×100% задаёт css/style.css, JS остаётся только для точек. */

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
