/* Freeday, stepper/wizard enhancer (optional, zero-dependency).
 * Drives a step header + panels: prev/next navigation, completed/active state, and
 * clicking a reached step to revisit it (linear, can't skip ahead). Auto-inits
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
 * Emits bubbling "fdy-step-change" {index} and "fdy-step-finish" (Next on the last step), and a
 * cancelable "fdy-step-before-change" {from, to, waitFor} that a guard refuses with
 * preventDefault() or defers by assigning a promise to detail.waitFor.
 */
(function () {
  'use strict';

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';


  /* User-facing strings. English by default since 2.0.0, documented and deliberate for the raw
   * enhancer path, and every one overridable per element with `data-fdy-text-<key>`, so a host
   * that speaks another language (an Indonesian app on the raw path) supplies its own without
   * forking this file. Keeping them in ONE table is also what lets a guard prove none is
   * hard-coded further down. */
  var TEXT = {
    done: 'Done',
    next: 'Next'
  };
  /* HTML lowercases attribute names, so a camelCase key like `filterText` can only ever be written
     as `data-fdy-text-filtertext`, while the kebab form anybody would reach for,
     `data-fdy-text-filter-text`, becomes a DIFFERENT attribute the enhancer never reads, and the
     override fails silently. So the key is kebab-cased for the lookup; the run-together spelling
     still resolves, for markup written against 1.39.0. */
  function textAttr(root, key) {
    if (!root || !root.getAttribute) return null;
    var kebab = root.getAttribute('data-fdy-text-' + key.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }));
    return kebab != null && kebab !== '' ? kebab : root.getAttribute('data-fdy-text-' + key);
  }
  function textOf(root, key, vars) {
    var custom = textAttr(root, key);
    var s = custom != null && custom !== '' ? custom : TEXT[key];
    if (vars) for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

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
      if (nextBtn) nextBtn.textContent = active === steps.length - 1 ? textOf(root, 'done') : (nextLabel || textOf(root, 'next'));
      root.dispatchEvent(new CustomEvent('fdy-step-change', { bubbles: true, detail: { index: active } }));
    }

    function go(i) {
      if (i < 0 || i >= steps.length) return;
      active = i;
      if (active > maxReached) maxReached = active;
      render();
    }

    /* Leaving a step is REFUSABLE, because a wizard whose Next cannot be stopped is a wizard that
     * validates nothing. Two ways to refuse, and the second is why an event alone was not enough:
     *
     *   sync   handler calls ev.preventDefault()      — the answer is already known
     *   async  handler sets ev.detail.waitFor = promise — the answer is a server round-trip away
     *
     * Resolving to `false` refuses; anything else advances, so a handler that forgets to return is
     * not read as a rejection. HOW validity is decided stays entirely with the app: the kit has no
     * opinion about form libraries and this is the line that keeps it that way. */
    var deciding = false;

    function lock(on) {
      deciding = on;
      var list = root.querySelector('.fdy-stepper');
      if (list) { if (on) list.setAttribute('aria-busy', 'true'); else list.removeAttribute('aria-busy'); }
      if (prevBtn) prevBtn.disabled = on || active === 0;
      if (nextBtn) nextBtn.disabled = on;
    }

    function request(to, onAllowed) {
      if (deciding) return;
      var ev = new CustomEvent('fdy-step-before-change', {
        bubbles: true,
        cancelable: true,
        detail: { from: active, to: to, waitFor: null },
      });
      root.dispatchEvent(ev);
      if (ev.defaultPrevented) return;

      var pending = ev.detail.waitFor;
      if (pending === null || typeof pending.then !== 'function') { onAllowed(); return; }

      lock(true);
      pending.then(
        function (ok) { lock(false); if (ok !== false) onAllowed(); },
        // A guard that THREW decided nothing, so it must not advance. Staying put with the nav
        // released is the only safe reading; the app's own error handling reports the failure.
        function () { lock(false); },
      );
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(active - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (active < steps.length - 1) request(active + 1, function () { go(active + 1); });
      else request(active + 1, function () { root.dispatchEvent(new CustomEvent('fdy-step-finish', { bubbles: true })); });
    });
    steps.forEach(function (s, i) {
      var btn = s.querySelector('.fdy-step__btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (i > maxReached) return;
        // Going BACK is always allowed — nothing is being committed. Jumping forward to a step
        // already reached still leaves the current one behind, so it asks the guard like Next does.
        if (i <= active) go(i);
        else request(i, function () { go(i); });
      });
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
