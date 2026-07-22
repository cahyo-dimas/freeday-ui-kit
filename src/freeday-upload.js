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
 * Emits bubbling CustomEvents on the dropzone: "fdy-upload-add" {file, rejected, reason, row}
 * (row exposes .uploading()/.setProgress(pct)/.done()/.fail(msg)) and "fdy-upload-remove" {file}.
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

  function makeRow(file) {
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
    remove.setAttribute('aria-label', 'Hapus ' + file.name);
    remove.innerHTML = '&times;';
    remove.addEventListener('click', function () {
      el.dispatchEvent(new CustomEvent('fdy-upload-remove', { bubbles: true, detail: { file: file } }));
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
      progressEl.setAttribute('aria-label', 'Progres unggah ' + file.name);
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
    return {
      el: el,
      uploading: function () {
        el.classList.remove('fdy-file--error', 'fdy-file--success');
        icon.innerHTML = FILE_ICON;
        sub.textContent = fmtSize(file.size) + ' · Mengunggah…';
        ensureProgress();
      },
      setProgress: function (pct) {
        ensureProgress();
        var v = Math.max(0, Math.min(100, pct));
        bar.style.width = v + '%';
        progressEl.setAttribute('aria-valuenow', String(Math.round(v)));
      },
      done: function () {
        el.classList.add('fdy-file--success');
        el.classList.remove('fdy-file--error');
        icon.innerHTML = OK_ICON;
        sub.textContent = fmtSize(file.size) + ' · Terunggah';
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

    function handleFiles(fileList) {
      if (!list || !fileList) return;
      Array.prototype.slice.call(fileList).forEach(function (file) {
        var reason = null;
        if (!accepts(file, acceptAttr)) reason = 'Tipe berkas tidak didukung.';
        else if (maxSize && file.size > maxSize) reason = 'Ukuran melebihi batas (' + fmtSize(maxSize) + ').';
        var row = makeRow(file);
        list.appendChild(row.el);
        if (reason) {
          row.fail(reason);
        } else {
          row.uploading();
          if (simulate) simulateUpload(row);
        }
        zone.dispatchEvent(new CustomEvent('fdy-upload-add', {
          bubbles: true, detail: { file: file, rejected: !!reason, reason: reason, row: row }
        }));
      });
    }
  }

  function initAll(context) {
    Array.prototype.forEach.call((context || document).querySelectorAll('[data-fdy-dropzone]'), initDropzone);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  window.FreedayUpload = { init: initDropzone, initAll: initAll };
})();
