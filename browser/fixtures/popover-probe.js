/* Measuring instruments for the typed popover specs, shared by the Vue and the React fixture so
 * the two pages cannot drift into measuring different things. Classic script, loaded over file://.
 *
 * Nothing here asserts; each function reports numbers and browser/typed-popover.mjs decides. The
 * reason they live in the page rather than in the spec is that all three readings have to happen
 * inside one synchronous turn, before a layout the measurement itself would undo.
 */
(function () {
  'use strict';

  function rect(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  }

  /* Give the document's own scrollbar layout width, and report what the engine actually did.
     macOS overlay scrollbars take no space, so a spec that assumed otherwise would pass here while
     proving nothing. The probe div needs the descendant `::-webkit-scrollbar` rule or it keeps its
     own overlay scrollbar and reports 0, which is how the vanilla spec first went red. */
  window.__classicScrollbars = function () {
    document.documentElement.classList.add('classic-scrollbars');
    var probe = document.createElement('div');
    probe.className = 'sb-probe';
    probe.appendChild(document.createElement('div'));
    document.body.appendChild(probe);
    var width = probe.offsetWidth - probe.clientWidth;
    probe.remove();
    return {
      scrollbarWidth: width,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    };
  };

  /* The state usePopover's place() sees on entry, measured by showing the panel in the top layer
     WITHOUT letting the adapter position it: the component is still closed, so no watcher or
     effect runs. This is the premise of #079 as a set of numbers, panel still absolute, document
     taller, viewport narrower, trigger moved. Reverted before it returns, so the page is left as
     it was found and a later click opens the panel through the real code path. */
  window.__beforePlace = function (panelSel, triggerSel) {
    var panel = document.querySelector(panelSel);
    var trigger = document.querySelector(triggerSel);
    var out = {
      inlineTop: panel.style.top,
      inlineLeft: panel.style.left,
      scrollHeightAtRest: document.documentElement.scrollHeight,
      clientWidthAtRest: document.documentElement.clientWidth,
      triggerLeftAtRest: trigger.getBoundingClientRect().left,
    };
    panel.hidden = false;
    panel.showPopover();
    out.position = getComputedStyle(panel).position;
    out.panelTop = panel.getBoundingClientRect().top;
    out.viewportHeight = document.documentElement.clientHeight;
    out.scrollHeightShown = document.documentElement.scrollHeight;
    out.clientWidthShown = document.documentElement.clientWidth;
    out.triggerLeftShown = trigger.getBoundingClientRect().left;
    panel.hidePopover();
    panel.hidden = true;
    return out;
  };

  /* One reading of an open panel, with the facts that say WHICH code path produced it. A right
     edge that lines up proves nothing unless the panel is in the top layer and positioned by the
     adapter's inline coordinates. */
  window.__box = function (panelSel, triggerSel) {
    var panel = document.querySelector(panelSel);
    var trigger = document.querySelector(triggerSel);
    return {
      panel: rect(panel),
      trigger: rect(trigger),
      popoverOpen: panel.matches(':popover-open'),
      position: getComputedStyle(panel).position,
      inlineLeft: panel.style.left,
      vw: document.documentElement.clientWidth,
      vh: document.documentElement.clientHeight,
    };
  };

  /* True once nothing is animating on the panel. The entrance animation is vertical only, so it
     cannot move a left or a right edge, but measuring a moving box is how a spec starts failing
     once a fortnight. */
  window.__settled = function (panelSel) {
    var panel = document.querySelector(panelSel);
    if (panel === null) return false;
    var running = panel.getAnimations ? panel.getAnimations() : [];
    for (var i = 0; i < running.length; i++) if (running[i].playState === 'running') return false;
    return true;
  };
})();
