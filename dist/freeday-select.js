/* Freeday — combobox enhancer (optional, zero-dependency).
 * Implements the WAI-ARIA APG "select-only combobox" pattern for every
 * [data-fdy-combo] on the page. Progressive enhancement: the markup is the
 * component, this script wires behavior. In a Vue/React/Blazor app you would
 * bind your own state instead — this is the framework-agnostic reference.
 *
 * Expected markup:
 *   <div class="fdy-combo" data-fdy-combo data-value="x">
 *     <button type="button" class="fdy-combo__button" role="combobox"
 *             aria-haspopup="listbox" aria-expanded="false"
 *             aria-labelledby="LBL VAL">
 *       <span class="fdy-combo__value" id="VAL">Label</span>
 *     </button>
 *     <ul class="fdy-combo__listbox" role="listbox" hidden>
 *       <li class="fdy-combo__option" role="option" data-value="x"
 *           aria-selected="true"><span class="fdy-combo__check">✓</span>Label</li>
 *     </ul>
 *   </div>
 *
 * Emits a bubbling "fdy-change" CustomEvent on the root with detail.value.
 */
(function () {
  'use strict';

  var seq = 0;
  var openClose = null; // close() of the currently-open combo, or null

  function optionLabel(opt) {
    var check = opt.querySelector('.fdy-combo__check');
    var node = check && check.nextSibling ? check.nextSibling.textContent : opt.textContent;
    return (node || '').trim();
  }

  function initCombo(root) {
    if (root.dataset.fdyComboReady === '1') return; // idempotent
    var button = root.querySelector('.fdy-combo__button');
    var listbox = root.querySelector('.fdy-combo__listbox');
    var valueEl = root.querySelector('.fdy-combo__value');
    var options = Array.prototype.slice.call(root.querySelectorAll('.fdy-combo__option'));
    if (!button || !listbox || !valueEl || options.length === 0) return;
    root.dataset.fdyComboReady = '1';

    seq += 1;
    if (!listbox.id) listbox.id = 'fdy-combo-list-' + seq;
    button.setAttribute('aria-controls', listbox.id);
    options.forEach(function (opt, i) {
      if (!opt.id) opt.id = listbox.id + '-opt-' + i;
    });

    var typed = '';
    var typedTimer = null;

    function highlightedIndex() {
      for (var i = 0; i < options.length; i++) {
        if (options[i].classList.contains('is-highlighted')) return i;
      }
      return -1;
    }
    function setHighlight(i) {
      options.forEach(function (opt, idx) {
        opt.classList.toggle('is-highlighted', idx === i);
      });
      if (i >= 0) {
        button.setAttribute('aria-activedescendant', options[i].id);
        options[i].scrollIntoView({ block: 'nearest' });
      } else {
        button.removeAttribute('aria-activedescendant');
      }
    }
    function isOpen() {
      return !listbox.hidden;
    }
    function open() {
      if (openClose && openClose !== close) openClose();
      listbox.hidden = false;
      button.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
      var selected = options.findIndex(function (opt) {
        return opt.getAttribute('aria-selected') === 'true';
      });
      setHighlight(selected < 0 ? 0 : selected);
      openClose = close;
    }
    function close() {
      listbox.hidden = true;
      button.classList.remove('is-open');
      button.setAttribute('aria-expanded', 'false');
      button.removeAttribute('aria-activedescendant');
      setHighlight(-1);
      if (openClose === close) openClose = null;
    }
    function choose(opt) {
      options.forEach(function (other) {
        var on = other === opt;
        other.setAttribute('aria-selected', on ? 'true' : 'false');
        var check = other.querySelector('.fdy-combo__check');
        if (check) check.textContent = on ? '✓' : '';
      });
      root.setAttribute('data-value', opt.getAttribute('data-value') || '');
      valueEl.textContent = optionLabel(opt);
      valueEl.classList.remove('fdy-combo__value--placeholder');
      root.dispatchEvent(new CustomEvent('fdy-change', {
        bubbles: true,
        detail: { value: opt.getAttribute('data-value') }
      }));
      close();
      button.focus();
    }

    button.addEventListener('click', function () {
      isOpen() ? close() : open();
    });
    options.forEach(function (opt, i) {
      opt.addEventListener('click', function () { choose(opt); });
      opt.addEventListener('mousemove', function () { setHighlight(i); });
    });

    root.addEventListener('keydown', function (e) {
      var hi = highlightedIndex();
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          isOpen() ? setHighlight((hi + 1) % options.length) : open();
          break;
        case 'ArrowUp':
          e.preventDefault();
          isOpen() ? setHighlight((hi - 1 + options.length) % options.length) : open();
          break;
        case 'Home':
          if (isOpen()) { e.preventDefault(); setHighlight(0); }
          break;
        case 'End':
          if (isOpen()) { e.preventDefault(); setHighlight(options.length - 1); }
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen() && hi >= 0) choose(options[hi]); else open();
          break;
        case 'Escape':
          if (isOpen()) { e.preventDefault(); close(); button.focus(); }
          break;
        case 'Tab':
          if (isOpen()) close();
          break;
        default:
          if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
            typed += e.key.toLowerCase();
            clearTimeout(typedTimer);
            typedTimer = setTimeout(function () { typed = ''; }, 500);
            var match = options.findIndex(function (opt) {
              return optionLabel(opt).toLowerCase().indexOf(typed) === 0;
            });
            if (match >= 0) { if (!isOpen()) open(); setHighlight(match); }
          }
      }
    });

    // Close when focus leaves the whole combo (e.g. Shift+Tab off the button).
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) close();
    });
  }

  function initAll(context) {
    var scope = context || document;
    Array.prototype.forEach.call(
      scope.querySelectorAll('[data-fdy-combo]'),
      initCombo
    );
  }

  // One global handler closes the open combo on an outside click.
  document.addEventListener('click', function (e) {
    if (openClose && !(e.target.closest && e.target.closest('.fdy-combo'))) {
      openClose();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayCombo = { init: initCombo, initAll: initAll };
})();
