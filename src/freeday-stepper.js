/* Freeday — stepper/wizard enhancer (optional, zero-dependency).
 * Drives a step header + panels: prev/next navigation, completed/active state, and
 * clicking a reached step to revisit it (linear — can't skip ahead). Auto-inits
 * [data-fdy-stepper].
 *
 * Markup: <div data-fdy-stepper>
 *   <ol class="fdy-stepper">
 *     <li class="fdy-step"><button class="fdy-step__btn"><span class="fdy-step__marker">1</span>
 *       <span class="fdy-step__label">…</span></button></li>… </ol>
 *   <div class="fdy-step-panels">
 *     <div class="fdy-step-panel">…</div>… </div>
 *   <div class="fdy-step-nav"><button data-fdy-step-prev>…</button>
 *     <button data-fdy-step-next>…</button></div></div>
 * Emits bubbling "fdy-step-change" {index} and "fdy-step-finish" (Next on the last step).
 */
(function () {
  'use strict';

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';

  function initStepper(root) {
    if (root.dataset.fdyStepperReady === '1') return;
    root.dataset.fdyStepperReady = '1';

    var steps = Array.prototype.slice.call(root.querySelectorAll('.fdy-step'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.fdy-step-panel'));
    var prevBtn = root.querySelector('[data-fdy-step-prev]');
    var nextBtn = root.querySelector('[data-fdy-step-next]');
    if (!steps.length) return;

    var active = 0;
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].classList.contains('is-active')) { active = i; break; }
    }
    var maxReached = active;
    var nextLabel = nextBtn ? nextBtn.textContent : '';

    steps.forEach(function (s) {
      var marker = s.querySelector('.fdy-step__marker');
      if (marker && marker.dataset.num == null) marker.dataset.num = marker.textContent.trim();
    });

    function render() {
      steps.forEach(function (s, i) {
        s.classList.toggle('is-active', i === active);
        s.classList.toggle('is-complete', i < active);
        if (i === active) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
        var marker = s.querySelector('.fdy-step__marker');
        if (marker) marker.innerHTML = i < active ? CHECK : (marker.dataset.num || String(i + 1));
        var btn = s.querySelector('.fdy-step__btn');
        if (btn) btn.disabled = i > maxReached;
      });
      panels.forEach(function (p, i) { p.hidden = i !== active; });
      if (prevBtn) prevBtn.disabled = active === 0;
      if (nextBtn) nextBtn.textContent = active === steps.length - 1 ? 'Selesai' : (nextLabel || 'Lanjut');
      root.dispatchEvent(new CustomEvent('fdy-step-change', { bubbles: true, detail: { index: active } }));
    }

    function go(i) {
      if (i < 0 || i >= steps.length) return;
      active = i;
      if (active > maxReached) maxReached = active;
      render();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(active - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (active < steps.length - 1) go(active + 1);
      else root.dispatchEvent(new CustomEvent('fdy-step-finish', { bubbles: true }));
    });
    steps.forEach(function (s, i) {
      var btn = s.querySelector('.fdy-step__btn');
      if (btn) btn.addEventListener('click', function () { if (i <= maxReached) go(i); });
    });

    render();
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-stepper]')) initStepper(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-stepper]'), initStepper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayStepper = { init: initStepper, initAll: initAll };
})();
