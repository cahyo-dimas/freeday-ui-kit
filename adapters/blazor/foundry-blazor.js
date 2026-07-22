/* Foundry — Blazor JS interop (classic IIFE; registers window.FoundryBlazor).
 * Consistent with the other Foundry enhancers (plain <script>, no ES module),
 * so it serves from any static host without module-MIME strictness.
 *
 * Load it after dist/foundry.js in wwwroot, then call from a component:
 *   await JS.InvokeVoidAsync("FoundryBlazor.initAll", elementRef);        // after render
 *   var token = await JS.InvokeAsync<int>("FoundryBlazor.on",
 *                 elementRef, "fdy-cascade-change", dotNetRef, "OnCascade"); // [JSInvokable]
 *   await JS.InvokeVoidAsync("FoundryBlazor.off", token);                  // on dispose
 *
 * Requires dist/foundry.js loaded first (registers window.Foundry*). The
 * enhancers stay the source of truth; this only bridges hydrate + events to .NET.
 */
(function () {
  'use strict';

  // Re-run every registered Foundry enhancer over an element (or the whole document).
  function initAll(element) {
    var names = Object.getOwnPropertyNames(window);
    for (var i = 0; i < names.length; i++) {
      var key = names[i];
      if (key.slice(0, 7) === 'Foundry' && key !== 'FoundryBlazor') {
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

  // Passthrough to the Foundry toast API.
  function toast(options) {
    if (window.Foundry && typeof window.Foundry.toast === 'function') window.Foundry.toast(options);
  }

  // Flip the document theme (data-theme on <html>), for the demo toggle.
  function toggleTheme() {
    var e = document.documentElement;
    e.setAttribute('data-theme', e.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  window.FoundryBlazor = { initAll: initAll, on: on, off: off, toast: toast, toggleTheme: toggleTheme };
})();
