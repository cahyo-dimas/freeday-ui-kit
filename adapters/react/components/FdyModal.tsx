import type { JSX, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

// A controlled React wrapper over freeday's `.fdy-modal` native <dialog> (src/components/modal.css).
// React port of adapters/vue/components/FdyModal.vue: reconciles the reactive `open` boolean with a
// DOM element whose open/close is a method call, showModal()/close() guarded against the
// already-open/closed cases (showModal() on an open dialog throws), onCancel + preventDefault so Esc
// routes through app state instead of closing the DOM behind its back, and backdrop-click detection
// via `event.target === dialogEl`. Native <dialog> already gives the focus trap, focus restore,
// top-layer stacking and inert background. `dismissible` (default true) gates Esc + backdrop.

export interface FdyModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  dismissible?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
}

export function FdyModal(props: FdyModalProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId: string = `${useId()}-title`;
  const dismissible: boolean = props.dismissible !== false;
  const modalClass: string = props.size !== undefined ? `fdy-modal fdy-modal--${props.size}` : 'fdy-modal';

  // Reconcile `open` with the dialog's method-driven state (runs on mount and whenever open changes).
  // showModal() on an already-open dialog throws, so guard both directions.
  useEffect((): void => {
    const el: HTMLDialogElement | null = dialogRef.current;
    if (el === null) return;
    if (props.open && !el.open) el.showModal();
    else if (!props.open && el.open) el.close();
  }, [props.open]);

  return (
    <dialog
      ref={dialogRef}
      className={modalClass}
      aria-labelledby={titleId}
      onCancel={(e): void => {
        e.preventDefault(); // stop the native close; app state stays the single source of truth
        if (dismissible) props.onClose();
      }}
      onClick={(e): void => {
        // The ::backdrop is not a separate element, target === the dialog box means a backdrop click.
        if (dismissible && e.target === dialogRef.current) props.onClose();
      }}
    >
      <div className="fdy-modal__header">
        <h3 id={titleId} className="fdy-modal__title">{props.title}</h3>
        {dismissible && (
          <button className="fdy-modal__close" type="button" aria-label="Close" onClick={props.onClose}>&times;</button>
        )}
      </div>

      <div className="fdy-modal__body">{props.children}</div>

      {props.footer !== undefined && <div className="fdy-modal__footer">{props.footer}</div>}
    </dialog>
  );
}
