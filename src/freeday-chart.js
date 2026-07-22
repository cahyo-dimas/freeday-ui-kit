/* Freeday — chart renderer (optional, zero-dependency, no external chart lib).
 * Renders a sparkline / bar / donut into an element from data attributes. Auto-inits
 * [data-fdy-chart]. Single-series sparkline/bar colour via data-fdy-color reference a
 * semantic token by name (primary, accent, success, warning, danger, info). The donut's
 * multi-series default draws from the validated categorical --chart-1..8 palette in fixed
 * order (never cycled, 8-series cap); pass data-fdy-colors to override with semantic
 * names instead. Charts are an enhancement — put a table/text fallback inside the
 * element and it will be replaced on render; give the element role="img" + aria-label.
 *
 *  Sparkline: <span data-fdy-chart="sparkline" data-values="4,6,5,8,7,10" data-fdy-color="primary">
 *  Bar:       <div  data-fdy-chart="bar" data-values="12,19,8,15" data-labels="Sen,Sel,Rab,Kam">
 *  Donut:     <div  data-fdy-chart="donut" data-values="45,30,25" data-labels="Lunas,Tertunda,Batal">
 *  Donut (override): add data-fdy-colors="success,warning,danger" data-fdy-center="120">
 */
(function () {
  'use strict';

  // Categorical chart palette: 8 validated fixed-order slots (--chart-1..8). Series
  // index i (0-based) -> slot i+1; series beyond the 8-slot cap reuse --chart-8 (never
  // cycled — repeating a colour on adjacent slices reads as one category, so beyond 8
  // series the caller should pre-aggregate or pass explicit data-fdy-colors).
  function chartSlotVar(i) { return 'var(--chart-' + (i < 8 ? i + 1 : 8) + ')'; }

  function nums(el, attr) {
    var v = el.getAttribute(attr);
    return v ? v.split(',').map(function (s) { return parseFloat(s.trim()); }).filter(function (n) { return !isNaN(n); }) : [];
  }
  function strs(el, attr) {
    var v = el.getAttribute(attr);
    return v ? v.split(',').map(function (s) { return s.trim(); }) : [];
  }
  function colorVar(name) { return 'var(--color-' + (name || 'primary') + ')'; }
  function ensureImg(el) { if (!el.hasAttribute('role')) el.setAttribute('role', 'img'); }

  // ---- Interactive tooltip (Chart.js-style hover readout; purely visual) ----
  function makeTip(container) {
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    var tip = document.createElement('div');
    tip.className = 'fdy-chart__tip';
    tip.setAttribute('aria-hidden', 'true');
    container.appendChild(tip);
    return tip;
  }
  function showTip(tip, container, clientX, clientY, text) {
    var r = container.getBoundingClientRect();
    tip.textContent = text;
    tip.style.left = (clientX - r.left) + 'px';
    tip.style.top = (clientY - r.top) + 'px';
    tip.classList.add('is-visible');
  }
  function hideTip(tip) { tip.classList.remove('is-visible'); }

  // Donut sector geometry (SVG path for a ring slice between two radii/angles).
  function polar(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function sectorPath(cx, cy, R, r, a0, a1) {
    var large = (a1 - a0) > 180 ? 1 : 0;
    var p0 = polar(cx, cy, R, a0), p1 = polar(cx, cy, R, a1), p2 = polar(cx, cy, r, a1), p3 = polar(cx, cy, r, a0);
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2)
      + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2)
      + ' L' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2)
      + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p3[0].toFixed(2) + ' ' + p3[1].toFixed(2) + ' Z';
  }

  function renderSparkline(el) {
    var vals = nums(el, 'data-values');
    if (vals.length < 2) return;
    el.style.setProperty('--fdy-chart', colorVar(el.getAttribute('data-fdy-color')));
    var W = 128, H = 36, P = 3;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
    var pts = vals.map(function (v, i) {
      var x = P + (i / (vals.length - 1)) * (W - 2 * P);
      var y = H - P - ((v - min) / span) * (H - 2 * P);
      return [x, y];
    });
    var line = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var area = P + ',' + H + ' ' + line + ' ' + (W - P) + ',' + H;
    var last = pts[pts.length - 1];
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'
      + '<polygon class="fdy-sparkline__area" points="' + area + '"/>'
      + '<polyline class="fdy-sparkline__line" points="' + line + '" vector-effect="non-scaling-stroke"/>'
      + '<circle class="fdy-sparkline__dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.5"/>'
      + '</svg>';
    ensureImg(el);
  }

  function renderBars(el) {
    var vals = nums(el, 'data-values');
    if (!vals.length) return;
    var labels = strs(el, 'data-labels');
    el.style.setProperty('--fdy-chart', colorVar(el.getAttribute('data-fdy-color')));
    var max = Math.max.apply(null, vals) || 1;
    el.innerHTML = '';
    vals.forEach(function (v, i) {
      var col = document.createElement('div'); col.className = 'fdy-bars__col';
      var track = document.createElement('div'); track.className = 'fdy-bars__track';
      var val = document.createElement('span'); val.className = 'fdy-bars__val'; val.textContent = v;
      var bar = document.createElement('div'); bar.className = 'fdy-bars__bar';
      bar.style.height = Math.max(2, (v / max) * 100) + '%';
      col.setAttribute('data-tip', (labels[i] || ('#' + (i + 1))) + ': ' + v);
      track.appendChild(val); track.appendChild(bar);
      col.appendChild(track);
      if (labels[i]) {
        var lab = document.createElement('div'); lab.className = 'fdy-bars__label'; lab.textContent = labels[i];
        col.appendChild(lab);
      }
      el.appendChild(col);
    });
    // Hover tooltip that follows the cursor over each column.
    var tip = makeTip(el);
    el.addEventListener('mousemove', function (e) {
      var col = e.target.closest('.fdy-bars__col');
      if (col && col.hasAttribute('data-tip')) showTip(tip, el, e.clientX, e.clientY, col.getAttribute('data-tip'));
      else hideTip(tip);
    });
    el.addEventListener('mouseleave', function () { hideTip(tip); });
    ensureImg(el);
  }

  function renderDonut(el) {
    var vals = nums(el, 'data-values');
    if (!vals.length) return;
    var labels = strs(el, 'data-labels');
    var colors = strs(el, 'data-fdy-colors');
    var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
    var stops = [], acc = 0;
    var colorAt = function (i) { return colors[i] ? colorVar(colors[i]) : chartSlotVar(i); };
    vals.forEach(function (v, i) {
      var from = (acc / total) * 360, to = ((acc + v) / total) * 360;
      acc += v;
      stops.push(colorAt(i) + ' ' + from.toFixed(1) + 'deg ' + to.toFixed(1) + 'deg');
    });
    el.innerHTML = '';
    var ring = document.createElement('div'); ring.className = 'fdy-donut__ring';
    ring.style.background = 'conic-gradient(' + stops.join(',') + ')';
    var center = document.createElement('div'); center.className = 'fdy-donut__center';
    var centerLabel = el.getAttribute('data-fdy-center');
    center.innerHTML = centerLabel ? '<b></b>' : '<b></b><span>Total</span>';
    center.querySelector('b').textContent = centerLabel != null ? centerLabel : String(total);
    ring.appendChild(center);
    // Transparent SVG sector per slice → per-segment hover (pop + tooltip).
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'fdy-donut__hit');
    svg.setAttribute('viewBox', '0 0 128 128');
    var ringTip = makeTip(ring), acc2 = 0;
    vals.forEach(function (v, i) {
      var a0 = (acc2 / total) * 360, a1 = ((acc2 + v) / total) * 360; acc2 += v;
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('class', 'fdy-donut__seg');
      path.setAttribute('d', sectorPath(64, 64, 64, 33, a0, a1));
      var text = (labels[i] || ('#' + (i + 1))) + ': ' + v + ' (' + Math.round((v / total) * 100) + '%)';
      path.addEventListener('mousemove', function (e) { showTip(ringTip, ring, e.clientX, e.clientY, text); });
      path.addEventListener('mouseleave', function () { hideTip(ringTip); });
      svg.appendChild(path);
    });
    ring.appendChild(svg);
    var legend = document.createElement('ul'); legend.className = 'fdy-chart__legend';
    vals.forEach(function (v, i) {
      var li = document.createElement('li');
      var sw = document.createElement('span'); sw.className = 'fdy-chart__swatch'; sw.style.background = colorAt(i);
      li.appendChild(sw);
      li.appendChild(document.createTextNode((labels[i] || ('#' + (i + 1))) + ' — ' + Math.round((v / total) * 100) + '%'));
      legend.appendChild(li);
    });
    el.appendChild(ring); el.appendChild(legend);
    ensureImg(el);
  }

  function initChart(el) {
    if (el.dataset.fdyChartReady === '1') return;
    el.dataset.fdyChartReady = '1';
    var type = el.getAttribute('data-fdy-chart');
    if (type === 'sparkline') renderSparkline(el);
    else if (type === 'bar') renderBars(el);
    else if (type === 'donut') renderDonut(el);
  }

  function initAll(context) {
    Array.prototype.forEach.call((context || document).querySelectorAll('[data-fdy-chart]'), initChart);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayChart = { init: initChart, initAll: initAll };
})();
