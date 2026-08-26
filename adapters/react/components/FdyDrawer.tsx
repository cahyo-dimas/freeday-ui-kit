import type { JSX, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

// A controlled React wrapper over freeday's `.fdy-drawer` native <dialog> side panel
// (src/components/drawer.css). React port of adapters/vue/components/FdyDrawer.vue, the same
// controlled glue as FdyModal (guarded showModal()/close(), onCancel + preventDefault so Esc routes
// through app state, backdrop-click via `event.target === dialogEl`) applied to a drawer that anchors
// left (default) or right. Native <dialog> supplies the focus trap, focus restore, top-layer stacking
// and inert background; `dismissible` (default true) gates Esc + backdrop dismissal.

export interface FdyDrawerProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  side?: 'left' | 'right';
  dismissible?: boolean;
  /** aria-label for the × button. Default 'Close'. */
  closeLabel?: string;
  footer?: ReactNode;
  children?: ReactNode;
}

export function FdyDrawer(props: FdyDrawerProps): JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId: string = `${useId()}-title`;
  const dismissible: boolean = props.dismissible !== false;
  const drawerClass: string = props.side === 'right' ? 'fdy-drawer fdy-drawer--right' : 'fdy-drawer';

  useEffect((): void => {
    const el: HTMLDialogElement | null = dialogRef.current;
    if (el === null) return;
    if (props.open && !el.open) el.showModal();
    else if (!props.open && el.open) el.close();
  }, [props.open]);

  return (
    <dialog
      ref={dialogRef}
      className={drawerClass}
      aria-labelledby={titleId}
      onCancel={(e): void => {
        e.preventDefault();
        if (dismissible) props.onClose();
      }}
      onClick={(e): void => {
        if (dismissible && e.target === dialogRef.current) props.onClose();
      }}
    >
      <div className="fdy-drawer__header">
        <h3 id={titleId} className="fdy-drawer__title">{props.title}</h3>
        {dismissible && (
          <button className="fdy-drawer__close" type="button" aria-label={props.closeLabel ?? 'Close'} onClick={props.onClose}>&times;</button>
        )}
      </div>

      <div className="fdy-drawer__body">{props.children}</div>

      {props.footer !== undefined && <div className="fdy-drawer__footer">{props.footer}</div>}
    </dialog>
  );
}
