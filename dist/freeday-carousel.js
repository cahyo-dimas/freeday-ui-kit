/* Freeday — carousel enhancer (optional, zero-dependency).
 * Scroll-snap slider with prev/next arrows, generated dot indicators, keyboard (←/→),
 * and optional autoplay (data-fdy-autoplay="4000", pauses on hover/focus). Auto-inits
 * [data-fdy-carousel].
 *
 * Markup: <div class="fdy-carousel" data-fdy-carousel role="region"
 *            aria-roledescription="carousel" aria-label="…" tabindex="0">
 *   <button class="fdy-carousel__arrow fdy-carousel__arrow--prev" aria-label="Sebelumnya">…</button>
 *   <div class="fdy-carousel__viewport">
 *     <div class="fdy-carousel__slide" role="group" aria-roledescription="slide">…</div>…
 *   </div>
 *   <button class="fdy-carousel__arrow fdy-carousel__arrow--next" aria-label="Berikutnya">…</button>
 *   <div class="fdy-carousel__dots"></div>   <!-- dots generated here -->
 * </div>
 * Emits a bubbling "fdy-carousel-change" CustomEvent (detail {index}).
 */
(function () {
  'use strict';

  function initCarousel(root) {
    if (root.dataset.fdyCarouselReady === '1') return;
    root.dataset.fdyCarouselReady = '1';

    var viewport = root.querySelector('.fdy-carousel__viewport');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.fdy-carousel__slide'));
    if (!viewport || !slides.length) return;
    var prev = root.querySelector('.fdy-carousel__arrow--prev');
    var next = root.querySelector('.fdy-carousel__arrow--next');
    var dotsWrap = root.querySelector('.fdy-carousel__dots');
    var index = 0;

    slides.forEach(function (s, i) {
      if (!s.hasAttribute('aria-label')) s.setAttribute('aria-label', (i + 1) + ' dari ' + slides.length);
    });

    var dots = [];
    if (dotsWrap) {
      slides.forEach(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'fdy-carousel__dot';
        b.setAttribute('aria-label', 'Slide ' + (i + 1));
        b.addEventListener('click', function () { goTo(i); });
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }

    function clamp(i) { return Math.max(0, Math.min(slides.length - 1, i)); }

    function sync() {
      dots.forEach(function (d, i) { d.setAttribute('aria-current', i === index ? 'true' : 'false'); });
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
    }

    function goTo(i) {
      index = clamp(i);
      viewport.scrollTo({ left: index * viewport.clientWidth, behavior: 'smooth' });
      sync();
      root.dispatchEvent(new CustomEvent('fdy-carousel-change', { bubbles: true, detail: { index: index } }));
    }

    if (prev) prev.addEventListener('click', function () { goTo(index - 1); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    });

    // Keep index in sync when the user swipes/scrolls the viewport directly.
    var ticking = false;
    viewport.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var w = viewport.clientWidth || 1;
        var i = clamp(Math.round(viewport.scrollLeft / w));
        if (i !== index) { index = i; sync(); }
      });
    }, { passive: true });

    var autoplay = parseInt(root.getAttribute('data-fdy-autoplay'), 10);
    if (autoplay > 0) {
      var timer = null;
      var start = function () { if (!timer) timer = setInterval(function () { goTo(index >= slides.length - 1 ? 0 : index + 1); }, autoplay); };
      var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
      root.addEventListener('mouseenter', stop);
      root.addEventListener('mouseleave', start);
      root.addEventListener('focusin', stop);
      root.addEventListener('focusout', start);
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) start();
    }

    sync();
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-carousel]')) initCarousel(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-carousel]'), initCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayCarousel = { init: initCarousel, initAll: initAll };
})();
