/* Freeday — chart renderer (optional, zero-dependency, no external chart lib).
 * Renders sparkline / bar / line / area / donut into an element from data attributes.
 * Auto-inits [data-fdy-chart] once; call FreedayChart.update(el) to re-render after the
 * data attributes change (used by the freeday/vue <FdyChart> wrapper for reactive data).
 *
 * Single-series colour (sparkline / simple bar / single line) via data-fdy-color references a
 * semantic token by name (primary, accent, success, warning, danger, info). Multi-series
 * defaults draw from the validated categorical --chart-1..8 palette in fixed order (never
 * cycled, 8-series cap); pass data-fdy-colors to override — a name is a semantic token
 * (var(--color-<name>)) OR a slot "chart-1".."chart-8" (var(--chart-N)) to pin a series to the
 * validated palette. Both data-fdy-color and data-fdy-colors accept the chart-N form.
 * Cartesian charts (line/area, multi-series/stacked bar) draw themed axes from --chart-grid /
 * --chart-tick and format ticks + tooltips via data-fdy-format (number|percent|currency). Their
 * viewBox is sized to the measured plot (1 user unit = 1 CSS pixel) and repainted from a
 * ResizeObserver, so axis type stays in real pixels and is set in CSS via --fdy-chart-tick-size.
 * Charts are an enhancement — put a table/text fallback inside the element and it will be
 * replaced on render; give the element role="img" + aria-label.
 *
 *  Sparkline: <span data-fdy-chart="sparkline" data-values="4,6,5,8,7,10" data-fdy-color="primary">
 *  Bar:       <div  data-fdy-chart="bar" data-values="12,19,8,15" data-labels="Sen,Sel,Rab,Kam">
 *  Donut:     <div  data-fdy-chart="donut" data-values="45,30,25" data-labels="Lunas,Tertunda,Batal">
 *  Line/area/multi bar (axes + legend + formatting):
 *    <div data-fdy-chart="line" data-labels="Jan,Feb,Mar,Apr" data-fdy-format="percent"
 *         data-series='[{"label":"Posted","values":[12,19,8,15]},{"label":"Draft","values":[4,6,5,8]}]'>
 *    <div data-fdy-chart="bar" data-fdy-stacked data-labels="..." data-series='[...]'>
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  // Categorical chart palette: 8 validated fixed-order slots (--chart-1..8). Series index i
  // (0-based) -> slot i+1; series beyond the 8-slot cap reuse --chart-8 (never cycled).
  function chartSlotVar(i) { return 'var(--chart-' + (i < 8 ? i + 1 : 8) + ')'; }
  // Resolve a colour name to a CSS var(). A semantic name (primary/accent/success/warning/
  // danger/info) reaches --color-<name>; a slot name "chart-1".."chart-8" reaches the validated
  // categorical token --chart-N instead, so a data-fdy-colors override can pin a series to the
  // palette (stable per category) rather than being forced onto the nearest semantic hue.
  function colorVar(name) {
    name = name || 'primary';
    return name.indexOf('chart-') === 0 ? 'var(--' + name + ')' : 'var(--color-' + name + ')';
  }

  function nums(el, attr) {
    var v = el.getAttribute(attr);
    return v ? v.split(',').map(function (s) { return parseFloat(s.trim()); }).filter(function (n) { return !isNaN(n); }) : [];
  }
  function strs(el, attr) {
    var v = el.getAttribute(attr);
    return v ? v.split(',').map(function (s) { return s.trim(); }) : [];
  }
  // role="img" is Children Presentational per ARIA, so the docs used to say a chart's rendered
  // legend, bar values and donut centre are not exposed. No browser actually prunes that subtree —
  // measured in Chrome's AX tree, every one of those nodes is live and unignored; what saves the
  // advice is only that AT treats a NAMED role="img" as a leaf and does not descend. So the kit
  // hides them itself, and the author's aria-label really is the whole text alternative.
  //
  // Only for a chart that HAS a name: hiding the contents of an unlabelled one would leave an image
  // with no text at all, which is worse than the leak. An author who sets some other role owns the
  // subtree and gets no help from here.
  function ensureImg(el) {
    if (!el.hasAttribute('role')) el.setAttribute('role', 'img');
    if (el.getAttribute('role') !== 'img') return;
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) return;
    Array.prototype.forEach.call(el.children, function (child) { child.setAttribute('aria-hidden', 'true'); });
  }
  function svgEl(name) { return document.createElementNS(NS, name); }

  // Cartesian charts size their viewBox to the measured plot, so a width change needs a repaint.
  // Guarded on width alone: a render can change the element's own height (the legend wrapping to a
  // second row) but never its own width, so this settles instead of looping.
  var cartesianRO = typeof ResizeObserver === 'function' ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) {
      var target = entry.target;
      if (!target.isConnected) { cartesianRO.unobserve(target); return; }
      var w = Math.round(entry.contentRect.width);
      if (w && w !== target.__fdyChartW) renderChart(target);
    });
  }) : null;

  // Multi-series model: data-series (JSON) wins; else the data-values single-series shortcut.
  function getSeries(el) {
    var raw = el.getAttribute('data-series');
    if (raw) {
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(function (s) {
          return { label: s && s.label != null ? String(s.label) : '', values: ((s && s.values) || []).map(Number) };
        });
      } catch (e) { /* fall through to data-values */ }
    }
    var vals = nums(el, 'data-values');
    return vals.length ? [{ label: el.getAttribute('data-fdy-label') || '', values: vals }] : [];
  }

  // Value formatter for ticks + tooltips.
  function makeFormat(kind) {
    if (kind === 'percent') return function (v) { return (Math.round(v * 10) / 10) + '%'; };
    if (kind === 'currency' || kind === 'usd') return function (v) { return '$' + Math.round(v).toLocaleString('en-US'); };
    return function (v) { return (Math.round(v * 100) / 100).toLocaleString(); };
  }
  // Round a positive number up to a "nice" axis maximum (1/2/2.5/5/10 * 10^n).
  function niceCeil(x) {
    if (x <= 0) return 1;
    var exp = Math.floor(Math.log10(x)), base = Math.pow(10, exp), f = x / base;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * base;
  }

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

  // Simple single-series flex bar (legacy, unchanged look). Rich/multi-series/stacked bars
  // with axes go through renderCartesian instead.
  function renderBars(el) {
    var vals = nums(el, 'data-values');
    if (!vals.length) return;
    var labels = strs(el, 'data-labels');
    el.style.setProperty('--fdy-chart', colorVar(el.getAttribute('data-fdy-color')));
    var max = Math.max.apply(null, vals) || 1;
    el.innerHTML = '';
    var tip = makeTip(el);
    vals.forEach(function (v, i) {
      var col = document.createElement('div'); col.className = 'fdy-bars__col';
      var track = document.createElement('div'); track.className = 'fdy-bars__track';
      var val = document.createElement('span'); val.className = 'fdy-bars__val'; val.textContent = v;
      var bar = document.createElement('div'); bar.className = 'fdy-bars__bar';
      bar.style.height = Math.max(2, (v / max) * 100) + '%';
      var text = (labels[i] || ('#' + (i + 1))) + ': ' + v;
      track.appendChild(val); track.appendChild(bar);
      col.appendChild(track);
      if (labels[i]) {
        var lab = document.createElement('div'); lab.className = 'fdy-bars__label'; lab.textContent = labels[i];
        col.appendChild(lab);
      }
      // Per-column hover so re-render (update) never stacks document/element listeners.
      col.addEventListener('mousemove', function (e) { showTip(tip, el, e.clientX, e.clientY, text); });
      col.addEventListener('mouseleave', function () { hideTip(tip); });
      el.appendChild(col);
    });
    ensureImg(el);
  }

  // ---- Cartesian engine: line / area / grouped+stacked bar with themed axes + legend ----
  function renderCartesian(el, type) {
    var series = getSeries(el);
    if (!series.length) return;
    var labels = strs(el, 'data-labels');
    var fmt = makeFormat(el.getAttribute('data-fdy-format'));
    var stacked = type === 'bar' && el.hasAttribute('data-fdy-stacked');
    var overrides = strs(el, 'data-fdy-colors');
    var singleColor = el.getAttribute('data-fdy-color');
    function colorFor(i) {
      if (overrides[i]) return colorVar(overrides[i]);
      if (series.length === 1 && singleColor) return colorVar(singleColor);
      return chartSlotVar(i);
    }

    var n = series.reduce(function (m, s) { return Math.max(m, s.values.length); }, 0);
    if (!n) return;

    // y-domain (baseline at 0 unless data dips below).
    var dataMax = -Infinity, dataMin = Infinity;
    if (stacked) {
      for (var c = 0; c < n; c++) {
        var sum = 0; series.forEach(function (s) { sum += (s.values[c] || 0); });
        if (sum > dataMax) dataMax = sum; if (sum < dataMin) dataMin = sum;
      }
    } else {
      series.forEach(function (s) { s.values.forEach(function (v) { if (v > dataMax) dataMax = v; if (v < dataMin) dataMin = v; }); });
    }
    if (dataMax === -Infinity) dataMax = 1;
    var base = Math.min(0, dataMin);
    var top = niceCeil(dataMax > base ? dataMax : base + 1);
    if (top <= base) top = base + 1;

    // Lay the chrome out first so the plot can be measured, then size the viewBox to it in CSS
    // pixels: one user unit is one pixel, so font-size / r / stroke-width mean what they say at
    // every container width. (A fixed 320x180 viewBox stretched by CSS multiplied every declared
    // size by plotWidth/320 instead — a 9px axis label rendered ~39px on a 1728px viewport.)
    var legendMode = el.getAttribute('data-fdy-legend') || 'auto';
    var showLegend = legendMode !== 'none' && (series.length >= 2 || legendMode === 'always');
    el.classList.add('fdy-chart-xy');
    el.innerHTML = '';
    if (showLegend) {
      var legend = document.createElement('ul');
      legend.className = 'fdy-chart__legend fdy-chart__legend--row';
      series.forEach(function (s, si) {
        var li = document.createElement('li');
        var sw = document.createElement('span'); sw.className = 'fdy-chart__swatch'; sw.style.background = colorFor(si);
        li.appendChild(sw);
        li.appendChild(document.createTextNode(s.label || ('Seri ' + (si + 1))));
        legend.appendChild(li);
      });
      el.appendChild(legend);
    }
    var plot = document.createElement('div'); plot.className = 'fdy-chart-xy__plot';
    el.appendChild(plot);

    // Measured while empty: .fdy-chart-xy__plot carries its own width / aspect-ratio / min-height,
    // so the box is already final. A detached or display:none chart measures 0 — fall back to the
    // legacy box and let the ResizeObserver repaint it once it is actually laid out.
    var box = plot.getBoundingClientRect();
    var W = Math.round(box.width) || 320, H = Math.round(box.height) || 180;
    var FS = parseFloat(getComputedStyle(plot).fontSize) || 12;   // axis type size, owned by CSS
    var charW = FS * 0.6;                                         // mono/body advance is ~0.6em

    // Tick values are known before the gutter is, so size PL to the widest one: a currency axis
    // needs more room than a percent axis, and a fixed gutter only ever suited one of them.
    var TICKS = 4;
    var tickText = [];
    for (var t0 = 0; t0 <= TICKS; t0++) tickText.push(fmt(base + (top - base) * t0 / TICKS));
    var widestTick = 0;
    tickText.forEach(function (t) { widestTick = Math.max(widestTick, t.length * charW); });
    var PL = Math.min(Math.ceil(widestTick) + 10, Math.round(W * 0.35));
    var PR = 10, PT = 10, PB = Math.round(FS * 2.2);
    var plotW = W - PL - PR, plotH = H - PT - PB;
    function mapY(v) { return PT + plotH * (1 - (v - base) / (top - base)); }
    var slot = plotW / n;
    function xCenter(i) { return PL + slot * (i + 0.5); }             // bar / band centre
    function xLine(i) { return PL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW); }

    var svg = svgEl('svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('aria-hidden', 'true');

    // y gridlines + formatted ticks (bottom line at `base` doubles as the zero baseline).
    for (var k = 0; k <= TICKS; k++) {
      var val = base + (top - base) * k / TICKS;
      var gy = mapY(val);
      var gl = svgEl('line');
      gl.setAttribute('x1', PL); gl.setAttribute('x2', PL + plotW);
      gl.setAttribute('y1', gy.toFixed(1)); gl.setAttribute('y2', gy.toFixed(1));
      gl.setAttribute('class', 'fdy-chart-xy__grid');
      svg.appendChild(gl);
      var tk = svgEl('text');
      tk.setAttribute('x', PL - 5); tk.setAttribute('y', (gy + FS * 0.35).toFixed(1));
      tk.setAttribute('text-anchor', 'end'); tk.setAttribute('class', 'fdy-chart-xy__tick');
      tk.textContent = tickText[k];
      svg.appendChild(tk);
    }

    // x category labels with autoskip. Labels are author-supplied, so estimate the widest one instead
    // of assuming a fixed 40px slot; keep every step-th plus the last, then drop any kept label that
    // would collide with the one before it — including the forced last one (a fraction-of-a-slot
    // overlap happens when n-1 lands next to the last kept multiple of step, e.g. n=24 at most widths).
    var widest = 0;
    for (var wi = 0; wi < n; wi++) widest = Math.max(widest, String(labels[wi] || ('#' + (wi + 1))).length * charW);
    var minGap = widest + 8;
    var maxTicks = Math.max(2, Math.floor(plotW / minGap)), step = Math.ceil(n / maxTicks);
    var xPos = function (i) { return (type === 'bar') ? xCenter(i) : xLine(i); };
    var kept = [];
    for (var xi = 0; xi < n; xi++) {
      if (xi % step === 0 || xi === n - 1) kept.push(xi);
    }
    // The last label is worth forcing, but not on top of its neighbour — drop the penultimate one.
    if (kept.length >= 2 && xPos(kept[kept.length - 1]) - xPos(kept[kept.length - 2]) < minGap) {
      kept.splice(kept.length - 2, 1);
    }
    kept.forEach(function (xk) {
      var xt = svgEl('text');
      xt.setAttribute('x', xPos(xk).toFixed(1)); xt.setAttribute('y', H - Math.round(FS * 0.7));
      xt.setAttribute('text-anchor', 'middle'); xt.setAttribute('class', 'fdy-chart-xy__xlabel');
      xt.textContent = labels[xk] || ('#' + (xk + 1));
      svg.appendChild(xt);
    });

    if (type === 'bar') {
      var S = series.length;
      var groupW = slot * 0.72;
      var barW = stacked ? slot * 0.55 : groupW / S;
      var acc = [];                                   // running top per category (stacked)
      for (var ci = 0; ci < n; ci++) acc[ci] = base;
      series.forEach(function (s, si) {
        s.values.forEach(function (v, ci2) {
          if (v == null || isNaN(v)) return;
          var x, y0, y1;
          if (stacked) {
            x = xCenter(ci2) - barW / 2;
            y0 = mapY(acc[ci2]); y1 = mapY(acc[ci2] + v); acc[ci2] += v;
          } else {
            x = PL + slot * ci2 + (slot - groupW) / 2 + barW * si;
            y0 = mapY(base); y1 = mapY(v);
          }
          var rect = svgEl('rect');
          rect.setAttribute('x', x.toFixed(1)); rect.setAttribute('width', Math.max(1, barW - 1).toFixed(1));
          rect.setAttribute('y', Math.min(y0, y1).toFixed(1)); rect.setAttribute('height', Math.max(0.5, Math.abs(y1 - y0)).toFixed(1));
          rect.setAttribute('rx', '2'); rect.setAttribute('class', 'fdy-chart-xy__bar');
          rect.style.fill = colorFor(si);
          svg.appendChild(rect);
        });
      });
    } else {
      // line / area: fill (area) beneath the stroke, then a small dot per vertex.
      series.forEach(function (s, si) {
        var pts = [];
        for (var i = 0; i < n; i++) { var v = s.values[i]; if (v == null || isNaN(v)) continue; pts.push([xLine(i), mapY(v)]); }
        if (!pts.length) return;
        var d = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
        if (type === 'area') {
          var y0 = mapY(base).toFixed(1);
          var poly = svgEl('polygon');
          poly.setAttribute('points', pts[0][0].toFixed(1) + ',' + y0 + ' ' + d + ' ' + pts[pts.length - 1][0].toFixed(1) + ',' + y0);
          poly.setAttribute('class', 'fdy-chart-xy__area');
          poly.style.fill = colorFor(si);
          svg.appendChild(poly);
        }
        if (pts.length >= 2) {
          var pl = svgEl('polyline');
          pl.setAttribute('points', d); pl.setAttribute('class', 'fdy-chart-xy__line');
          pl.style.stroke = colorFor(si);
          svg.appendChild(pl);
        }
        pts.forEach(function (p) {
          var dot = svgEl('circle');
          dot.setAttribute('cx', p[0].toFixed(1)); dot.setAttribute('cy', p[1].toFixed(1)); dot.setAttribute('r', '3');
          dot.setAttribute('class', 'fdy-chart-xy__dot'); dot.style.fill = colorFor(si);
          svg.appendChild(dot);
        });
      });
    }

    plot.appendChild(svg);

    // Hover: one transparent band per category → readout of every series at that x.
    var tip = makeTip(el);
    var bandW = (type === 'bar') ? slot : (n > 1 ? plotW / (n - 1) : plotW);
    for (var b = 0; b < n; b++) {
      var bx = (type === 'bar') ? (PL + slot * b) : (xLine(b) - bandW / 2);
      var band = svgEl('rect');
      band.setAttribute('x', Math.max(0, bx).toFixed(1)); band.setAttribute('y', PT);
      band.setAttribute('width', bandW.toFixed(1)); band.setAttribute('height', plotH);
      band.setAttribute('class', 'fdy-chart-xy__band');
      var parts = series.map(function (s) {
        var v = s.values[b];
        return (v == null || isNaN(v)) ? null : (series.length > 1 ? s.label + ' ' : '') + fmt(v);
      }).filter(Boolean);
      var text = (labels[b] || ('#' + (b + 1))) + (parts.length ? ' · ' + parts.join(', ') : '');
      band.addEventListener('mousemove', (function (t) { return function (e) { showTip(tip, el, e.clientX, e.clientY, t); }; })(text));
      band.addEventListener('mouseleave', function () { hideTip(tip); });
      svg.appendChild(band);
    }
    el.__fdyChartW = W;
    if (cartesianRO) cartesianRO.observe(el);
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
    var svg = svgEl('svg');
    svg.setAttribute('class', 'fdy-donut__hit');
    svg.setAttribute('viewBox', '0 0 128 128');
    var ringTip = makeTip(ring), acc2 = 0;
    vals.forEach(function (v, i) {
      var a0 = (acc2 / total) * 360, a1 = ((acc2 + v) / total) * 360; acc2 += v;
      var path = svgEl('path');
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
    el.appendChild(ring);
    // Honour data-fdy-legend for the donut too — a caller may supply its own richer legend. 'auto'
    // keeps today's behaviour (a donut is unreadable without labels, so it shows); 'none' suppresses it.
    if ((el.getAttribute('data-fdy-legend') || 'auto') !== 'none') el.appendChild(legend);
    ensureImg(el);
  }

  // Full (re-)render from current data attributes. Idempotent — safe to call repeatedly.
  function renderChart(el) {
    var type = el.getAttribute('data-fdy-chart');
    if (type === 'sparkline') renderSparkline(el);
    else if (type === 'donut') renderDonut(el);
    else if (type === 'line' || type === 'area') renderCartesian(el, type);
    else if (type === 'bar') {
      if (el.getAttribute('data-series') || el.hasAttribute('data-fdy-stacked') || el.hasAttribute('data-fdy-axes')) renderCartesian(el, 'bar');
      else renderBars(el);
    }
  }

  // Auto-init renders once; explicit update() re-renders after data changes.
  function initChart(el) {
    if (el.dataset.fdyChartReady === '1') return;
    el.dataset.fdyChartReady = '1';
    renderChart(el);
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-chart]')) initChart(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-chart]'), initChart);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayChart = { init: initChart, initAll: initAll, update: renderChart };
})();
