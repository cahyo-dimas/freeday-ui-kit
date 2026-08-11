/* Freeday — Blazor JS interop (classic IIFE; registers window.FreedayBlazor).
 * Consistent with the other Freeday enhancers (plain <script>, no ES module),
 * so it serves from any static host without module-MIME strictness.
 *
 * Load it after dist/freeday.js in wwwroot, then call from a component:
 *   await JS.InvokeVoidAsync("FreedayBlazor.initAll", elementRef);        // after render
 *   var token = await JS.InvokeAsync<int>("FreedayBlazor.on",
 *                 elementRef, "fdy-cascade-change", dotNetRef, "OnCascade"); // [JSInvokable]
 *   await JS.InvokeVoidAsync("FreedayBlazor.off", token);                  // on dispose
 *
 * Requires dist/freeday.js loaded first (registers window.Freeday*). The
 * enhancers stay the source of truth; this only bridges hydrate + events to .NET.
 */
(function () {
  'use strict';

  // Re-run every registered Freeday enhancer over an element (or the whole document).
  function initAll(element) {
    var names = Object.getOwnPropertyNames(window);
    for (var i = 0; i < names.length; i++) {
      var key = names[i];
      if (key.slice(0, 7) === 'Freeday' && key !== 'FreedayBlazor') {
        var api = window[key];
        if (api && typeof api.initAll === 'function') api.initAll(element || undefined);
      }
    }
  }

  // JSON-safe copy of an event detail so it can cross to .NET (drop DOM nodes /
  // functions; a Date serialises to an ISO string, which .NET parses fine).
  function safeDetail(detail) {
    if (detail == null) return null;
    try {
      return JSON.parse(JSON.stringify(detail, function (k, v) {
        if (v instanceof Node) return undefined;
        if (typeof v === 'function') return undefined;
        return v;
      }));
    } catch (e) {
      return null;
    }
  }

  var subs = {};
  var seq = 0;

  // Subscribe to a bubbling fdy-* event on `element` (or document), forwarding the
  // event detail to a .NET [JSInvokable] method. Returns a token for off().
  function on(element, eventName, dotNetRef, methodName) {
    var el = element || document;
    var handler = function (e) { dotNetRef.invokeMethodAsync(methodName, safeDetail(e.detail)); };
    el.addEventListener(eventName, handler);
    var token = ++seq;
    subs[token] = { el: el, type: eventName, fn: handler };
    return token;
  }

  // Remove a subscription created by on().
  function off(token) {
    var s = subs[token];
    if (s) {
      s.el.removeEventListener(s.type, s.fn);
      delete subs[token];
    }
  }

  // Passthrough to the Freeday toast API.
  function toast(options) {
    if (window.Freeday && typeof window.Freeday.toast === 'function') window.Freeday.toast(options);
  }

  // Passthrough to a combo's programmatic setter (window.FreedayCombo.setValue) so a
  // Blazor @bind-Value can push an external value change onto the enhancer-owned DOM
  // without the enhancer echoing an fdy-change back.
  function comboSetValue(element, value) {
    if (window.FreedayCombo && typeof window.FreedayCombo.setValue === 'function') {
      window.FreedayCombo.setValue(element, value);
    }
  }

  // --- Native <dialog> control for FdyModal ---------------------------------
  // The kit styles `.fdy-modal` as a <dialog> but nothing drives it; Blazor can't call
  // showModal()/close() from C#, and Esc/backdrop dismissal must route through .NET state
  // (not close the DOM behind its back). dialogInit wires cancel + backdrop → a [JSInvokable]
  // dismiss callback; showModal()/close() are guarded (showModal on an open dialog throws).
  var dialogSubs = {};
  var dialogSeq = 0;

  function dialogInit(dialog, dotNetRef, dismissMethod, dismissible) {
    if (!dialog) return 0;
    var onCancel = function (e) {
      e.preventDefault(); // stop the native close; app state is the single source of truth
      if (dismissible) dotNetRef.invokeMethodAsync(dismissMethod);
    };
    var onClick = function (e) {
      // The ::backdrop is not a separate element — a click whose target is the dialog box
      // itself (not its content) is a backdrop click.
      if (dismissible && e.target === dialog) dotNetRef.invokeMethodAsync(dismissMethod);
    };
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('click', onClick);
    var token = ++dialogSeq;
    dialogSubs[token] = { el: dialog, cancel: onCancel, click: onClick };
    return token;
  }

  function dialogShow(dialog) {
    if (dialog && typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function dialogClose(dialog) {
    if (dialog && dialog.open) dialog.close();
  }

  function dialogDispose(token) {
    var s = dialogSubs[token];
    if (s) {
      s.el.removeEventListener('cancel', s.cancel);
      s.el.removeEventListener('click', s.click);
      delete dialogSubs[token];
    }
  }

  // Flip the document theme (data-theme on <html>), for the demo toggle.
  function toggleTheme() {
    var e = document.documentElement;
    e.setAttribute('data-theme', e.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  window.FreedayBlazor = {
    initAll: initAll, on: on, off: off, toast: toast, toggleTheme: toggleTheme,
    comboSetValue: comboSetValue,
    dialogInit: dialogInit, dialogShow: dialogShow, dialogClose: dialogClose, dialogDispose: dialogDispose,
  };
})();
