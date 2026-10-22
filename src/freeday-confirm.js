/* Freeday, confirm API (optional, zero-dependency). Note #060.
 * Freeday.confirm({ title, message, details, acceptText, rejectText, tone }) opens a .fdy-modal
 * and resolves a Promise<boolean>: true on accept; false on reject, Escape or a backdrop click.
 *   details:  string[] shown as a list under the message, for a confirm that has to NAME its
 *             findings ("these three fields will be refused") instead of folding them into one
 *             long sentence
 *   tone:     'primary' (default) | 'danger', the accept button's variant
 *
 * One dialog, one answer: every way out resolves the same Promise, and a Promise settles once, so
 * a caller never hears "no" after "yes" (a framework dialog that reports reject and then hide, or
 * hide after accept, does exactly that). Text is set with textContent, never parsed as HTML.
 * Focus starts on the reject button: Enter on a dialog that just opened must not delete anything.
 * The dialog is removed when it closes; the native <dialog> returns focus to where it was.
 * Buttons carry data-fdy-confirm-accept / data-fdy-confirm-reject, stable hooks for tests, because
 * an accept labelled "Delete" collides by accessible name with every row's own Delete button.
 */
(function () {
  'use strict';

  /* User-facing strings, English by default. Per call, acceptText / rejectText override them; a
   * label that names the action ("Delete order") is better than either default. */
  var TEXT = {
    accept: 'Confirm',
    reject: 'Cancel'
  };

  var seq = 0;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      seq += 1;
      var titleId = 'fdy-confirm-title-' + seq;
      var dialog = el('dialog', 'fdy-modal fdy-modal--sm');
      dialog.setAttribute('aria-labelledby', titleId);
      dialog.setAttribute('data-fdy-confirm', '');

      var header = el('header', 'fdy-modal__header');
      var title = el('h2', 'fdy-modal__title', opts.title || '');
      title.id = titleId;
      header.appendChild(title);

      var body = el('div', 'fdy-modal__body');
      if (opts.message) {
        var message = el('p', null, opts.message);
        message.id = titleId + '-desc';
        dialog.setAttribute('aria-describedby', message.id);
        body.appendChild(message);
      }
      var details = Array.isArray(opts.details) ? opts.details : [];
      if (details.length > 0) {
        var list = el('ul');
        details.forEach(function (line) { list.appendChild(el('li', null, line)); });
        body.appendChild(list);
      }

      var footer = el('footer', 'fdy-modal__footer');
      var reject = el('button', 'fdy-btn fdy-btn--ghost', opts.rejectText || TEXT.reject);
      reject.type = 'button';
      reject.setAttribute('data-fdy-confirm-reject', '');
      var accept = el('button', opts.tone === 'danger' ? 'fdy-btn fdy-btn--danger' : 'fdy-btn', opts.acceptText || TEXT.accept);
      accept.type = 'button';
      accept.setAttribute('data-fdy-confirm-accept', '');
      footer.appendChild(reject);
      footer.appendChild(accept);

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(footer);

      function settle(answer) {
        resolve(answer);
        if (dialog.open) dialog.close();
      }

      accept.addEventListener('click', function () { settle(true); });
      reject.addEventListener('click', function () { settle(false); });
      // Escape fires `cancel` then `close`; a backdrop click lands on the <dialog> itself, since its
      // children fill the box edge to edge. Both mean "no".
      dialog.addEventListener('close', function () {
        settle(false);
        if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
      });
      dialog.addEventListener('click', function (e) { if (e.target === dialog) settle(false); });

      document.body.appendChild(dialog);
      dialog.showModal();
      reject.focus();
    });
  }

  window.Freeday = window.Freeday || {};
  window.Freeday.confirm = confirm;
})();
