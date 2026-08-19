/* Freeday — file-upload enhancer (optional, zero-dependency).
 * A drop target that also opens the file dialog on click / Enter / Space, validates each file
 * (accept + max size), and renders a per-file row with explicit state. Actual upload is the
 * consumer's job — this is a controlled reference: wire the emitted event's row API to your
 * upload call, or set data-fdy-upload-simulate for a demo progress animation.
 *
 * Markup contract:
 *  <div class="fdy-dropzone" data-fdy-dropzone role="button" tabindex="0"
 *       data-max-size="10485760" data-filelist="#dz-list" [data-fdy-upload-simulate]
 *       aria-label="Unggah berkas — seret ke sini atau tekan Enter">
 *    <span class="fdy-dropzone__icon">…svg…</span>
 *    <span class="fdy-dropzone__title">…</span>
 *    <span class="fdy-dropzone__hint">…</span>
 *    <input type="file" accept=".pdf,application/pdf" multiple hidden>
 *  </div>
 *  <div class="fdy-filelist" id="dz-list"></div>
 *
 * Emits bubbling CustomEvents — BOTH on the dropzone element, which is the one target a consumer
 * needs to listen on:
 *   "fdy-upload-add"    {file, rejected, reason, row}
 *   "fdy-upload-remove" {file}
 * `row` is the state machine over the rendered .fdy-file:
 *   .ready() (rest — where a dropped file starts) / .uploading() / .setProgress(pct) /
 *   .waiting(label) (sent, awaiting the server) / .done() / .fail(msg) / .el
 * Note the file list is a SIBLING of the dropzone above, so nothing dispatched on a row would ever
 * bubble through the zone — which is why removal fires on the zone and not on the row.
 */
(function () {
  'use strict';

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  var FILE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>';
  var OK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m8 12 3 3 5-6"></path></svg>';
  var ERR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>';

  function accepts(file, acceptAttr) {
    if (!acceptAttr) return true;
    var name = file.name.toLowerCase();
    var type = (file.type || '').toLowerCase();
    return acceptAttr.split(',').map(function (s) { return s.trim().toLowerCase(); }).some(function (a) {
      if (!a) return false;
      if (a.charAt(0) === '.') return name.slice(-a.length) === a;
      if (a.slice(-2) === '/*') return type.indexOf(a.slice(0, -1)) === 0;
      return type === a;
    });
  }


  /* User-facing strings. Indonesian by default — documented and deliberate for the raw enhancer
   * path — and every one overridable per element, so a host that speaks another language (the
   * Blazor adapters, an English app on the raw path) supplies its own without forking this file.
   * Keeping them in ONE table is also what lets a guard prove none is hard-coded further down. */
  var TEXT = {
    remove: 'Hapus {name}',
    progress: 'Progres unggah {name}',
    uploading: 'Mengunggah…',
    waiting: 'Menunggu server…',
    done: 'Terunggah',
    badType: 'Tipe berkas tidak didukung.',
    tooBig: 'Ukuran melebihi batas ({max}).'
  };
  function textOf(root, key, vars) {
    var custom = root && root.getAttribute ? root.getAttribute('data-fdy-text-' + key) : null;
    var s = custom != null && custom !== '' ? custom : TEXT[key];
    if (vars) for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  function makeRow(file, zone) {
    var el = document.createElement('div');
    el.className = 'fdy-file';
    var icon = document.createElement('span');
    icon.className = 'fdy-file__icon';
    icon.innerHTML = FILE_ICON;
    var meta = document.createElement('div');
    meta.className = 'fdy-file__meta';
    var name = document.createElement('div');
    name.className = 'fdy-file__name';
    name.textContent = file.name;
    var sub = document.createElement('div');
    sub.className = 'fdy-file__sub';
    sub.textContent = fmtSize(file.size);
    meta.appendChild(name);
    meta.appendChild(sub);
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fdy-file__remove';
    remove.setAttribute('aria-label', textOf(zone, 'remove', { name: file.name }));
    remove.innerHTML = '&times;';
    remove.addEventListener('click', function () {
      /* Dispatched on the ZONE, not on the row — the same target as fdy-upload-add, so one listener
         on the dropzone gets both. The row lives in the file list, which the kit's own markup
         contract puts as a SIBLING of the dropzone, so a row event never bubbles through the zone:
         a consumer following the docs saw `add` arrive and `remove` never fire, with no error.
         Firing on both would look safer, but it makes the pair asymmetric — one `add` and, for
         anyone delegating on a common ancestor, two `remove`s — which is its own silent bug. It
         also fixes the listless case: a row that was never attached bubbles to nothing at all. */
      zone.dispatchEvent(new CustomEvent('fdy-upload-remove', { bubbles: true, detail: { file: file } }));
      el.remove();
    });
    el.appendChild(icon);
    el.appendChild(meta);
    el.appendChild(remove);

    var progressWrap = null, bar = null, progressEl = null;
    function ensureProgress() {
      if (progressWrap) return;
      progressWrap = document.createElement('div');
      progressWrap.className = 'fdy-file__progress';
      progressEl = document.createElement('div');
      progressEl.className = 'fdy-progress';
      progressEl.setAttribute('role', 'progressbar');
      progressEl.setAttribute('aria-valuemin', '0');
      progressEl.setAttribute('aria-valuemax', '100');
      progressEl.setAttribute('aria-label', textOf(zone, 'progress', { name: file.name }));
      bar = document.createElement('div');
      bar.className = 'fdy-progress__bar';
      bar.style.width = '0%';
      progressEl.appendChild(bar);
      progressWrap.appendChild(progressEl);
      meta.appendChild(progressWrap);
    }
    function dropProgress() {
      if (progressWrap) { progressWrap.remove(); progressWrap = null; bar = null; progressEl = null; }
    }
    /* Back to a measured bar. While the indeterminate modifier is on it owns the bar's width, so an
       explicit one has to be restored when it comes off: .fdy-progress__bar is a plain block div, and
       with no width at all it fills the track — a full bar, which is the opposite of what 0% means. */
    function determinate() {
      progressEl.classList.remove('fdy-progress--indeterminate');
      if (!bar.style.width) bar.style.width = '0%';
    }
    return {
      el: el,
      /* The state a row starts in: chosen, not yet sent. The size alone — it makes no claim about
         a transfer, and no progress bar is shown, because nothing is in flight. Without this the
         state machine had no start state: done() claims success, fail() claims an error, and
         uploading() is a lie until the consumer actually sends the file. */
      ready: function () {
        el.classList.remove('fdy-file--error', 'fdy-file--success');
        icon.innerHTML = FILE_ICON;
        sub.textContent = fmtSize(file.size);
        dropProgress();
      },
      uploading: function () {
        el.classList.remove('fdy-file--error', 'fdy-file--success');
        icon.innerHTML = FILE_ICON;
        sub.textContent = fmtSize(file.size) + ' · ' + textOf(zone, 'uploading');
        ensureProgress();
        determinate();
      },
      setProgress: function (pct) {
        ensureProgress();
        determinate();
        var v = Math.max(0, Math.min(100, pct));
        bar.style.width = v + '%';
        progressEl.setAttribute('aria-valuenow', String(Math.round(v)));
      },
      /* The bytes are gone and the server has not answered yet — extraction, scanning, transcoding.
         "Mengunggah…" turns false the moment the last byte leaves, and a determinate bar parked at
         100% is the most convincing "hung" signal a UI can produce, so this state reports no
         percentage: the bar goes indeterminate and the label belongs to the consumer, because only
         they know what the server is doing ("Membaca PDF…", "Memindai…"). done()/fail()/ready() need
         no counterpart here — they drop the progress element outright, modifier and all. */
      waiting: function (label) {
        el.classList.remove('fdy-file--error', 'fdy-file--success');
        icon.innerHTML = FILE_ICON;
        sub.textContent = fmtSize(file.size) + ' · ' + (label || textOf(zone, 'waiting'));
        ensureProgress();
        progressEl.classList.add('fdy-progress--indeterminate');
        /* The modifier styles .fdy-progress__bar, so it must sit on the CONTAINER, and the inline
           width setProgress wrote has to go — an inline style beats any rule the modifier brings.
           aria-valuenow goes with it: a progressbar with no value is precisely what ARIA calls
           indeterminate, which is the contract COMPONENTS.md already states for this component. */
        bar.style.width = '';
        progressEl.removeAttribute('aria-valuenow');
      },
      done: function () {
        el.classList.add('fdy-file--success');
        el.classList.remove('fdy-file--error');
        icon.innerHTML = OK_ICON;
        sub.textContent = fmtSize(file.size) + ' · ' + textOf(zone, 'done');
        dropProgress();
      },
      fail: function (msg) {
        el.classList.add('fdy-file--error');
        el.classList.remove('fdy-file--success');
        icon.innerHTML = ERR_ICON;
        sub.textContent = msg;
        dropProgress();
      }
    };
  }

  function simulateUpload(row) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { row.setProgress(100); row.done(); return; }
    var pct = 0;
    var id = setInterval(function () {
      pct += 12 + Math.random() * 18;
      if (pct >= 100) {
        row.setProgress(100);
        clearInterval(id);
        setTimeout(function () { row.done(); }, 200);
      } else {
        row.setProgress(pct);
      }
    }, 180);
  }

  function initDropzone(zone) {
    if (zone.dataset.fdyUploadReady === '1') return;
    zone.dataset.fdyUploadReady = '1';

    var input = zone.querySelector('input[type="file"]');
    var listSel = zone.getAttribute('data-filelist');
    var list = listSel ? document.querySelector(listSel)
      : (zone.parentNode ? zone.parentNode.querySelector('.fdy-filelist') : null);
    var maxSize = parseInt(zone.getAttribute('data-max-size'), 10) || 0;
    var simulate = zone.hasAttribute('data-fdy-upload-simulate');
    var acceptAttr = input ? input.getAttribute('accept') : '';

    function openDialog() { if (input) input.click(); }

    zone.addEventListener('click', function (e) { if (e.target !== input) openDialog(); });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDialog(); }
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('is-dragover'); });
    });
    ['dragleave', 'dragend'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { if (e.target === zone) zone.classList.remove('is-dragover'); });
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      handleFiles(e.dataTransfer ? e.dataTransfer.files : null);
    });
    if (input) input.addEventListener('change', function () { handleFiles(input.files); input.value = ''; });

    /* The list is optional: rendering a row and announcing the file are separate jobs. A consumer
       that wants its own markup simply provides no list — it still gets `fdy-upload-add`, and
       `detail.row` still works (its element is just never attached). Gating the EVENT on the list
       meant "bring your own row" silently cost you the notification that a file had arrived. */
    function handleFiles(fileList) {
      if (!fileList) return;
      Array.prototype.slice.call(fileList).forEach(function (file) {
        var reason = null;
        if (!accepts(file, acceptAttr)) reason = textOf(zone, 'badType');
        else if (maxSize && file.size > maxSize) reason = textOf(zone, 'tooBig', { max: fmtSize(maxSize) });
        var row = makeRow(file, zone);
        if (list) list.appendChild(row.el);
        if (reason) {
          row.fail(reason);
        } else if (simulate) {
          /* The kit is driving (demo path): keep showing a transfer, because there is one. */
          row.uploading();
          simulateUpload(row);
        } else {
          /* The CONSUMER owns the transfer. Rest until it says otherwise by calling row.uploading():
             a file that has only been chosen must not claim to be uploading. A progress bar that
             never moves reads as a hung upload, and gets reported as a bug against a transfer that
             was never started. */
          row.ready();
        }
        zone.dispatchEvent(new CustomEvent('fdy-upload-add', {
          bubbles: true, detail: { file: file, rejected: !!reason, reason: reason, row: row }
        }));
      });
    }
  }

  function initAll(context) {
    var root = context || document;
    /* root included: querySelectorAll never matches its own root, and a framework ref often sits ON the widget. */
    if (root.matches && root.matches('[data-fdy-dropzone]')) initDropzone(root);
    Array.prototype.forEach.call(root.querySelectorAll('[data-fdy-dropzone]'), initDropzone);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayUpload = { init: initDropzone, initAll: initAll };
})();
