/* Foundry — chart renderer (optional, zero-dependency, no external chart lib).
 * Renders a sparkline / bar / donut into an element from data attributes. Auto-inits
 * [data-fdy-chart]. Colours reference semantic tokens by name (primary, accent, success,
 * warning, danger, info). Charts are an enhancement — put a table/text fallback inside the
 * element and it will be replaced on render; give the element role="img" + aria-label.
 *
 *  Sparkline: <span data-fdy-chart="sparkline" data-values="4,6,5,8,7,10" data-fdy-color="primary">
 *  Bar:       <div  data-fdy-chart="bar" data-values="12,19,8,15" data-labels="Sen,Sel,Rab,Kam">
 *  Donut:     <div  data-fdy-chart="donut" data-values="45,30,25" data-labels="Lunas,Tertunda,Batal"
 *                   data-fdy-colors="success,warning,danger" data-fdy-center="120">
 */
(function () {
  'use strict';

  var PALETTE = ['primary', 'accent', 'success', 'warning', 'danger', 'info'];

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
      bar.setAttribute('title', (labels[i] || ('#' + (i + 1))) + ': ' + v);
      track.appendChild(val); track.appendChild(bar);
      col.appendChild(track);
      if (labels[i]) {
        var lab = document.createElement('div'); lab.className = 'fdy-bars__label'; lab.textContent = labels[i];
        col.appendChild(lab);
      }
      el.appendChild(col);
    });
    ensureImg(el);
  }

  function renderDonut(el) {
    var vals = nums(el, 'data-values');
    if (!vals.length) return;
    var labels = strs(el, 'data-labels');
    var colors = strs(el, 'data-fdy-colors');
    var total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
    var stops = [], acc = 0;
    var colorAt = function (i) { return colorVar(colors[i] || PALETTE[i % PALETTE.length]); };
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

  window.FoundryChart = { init: initChart, initAll: initAll };
})();
