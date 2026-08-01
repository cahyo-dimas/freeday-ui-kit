import type { JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';

// A controlled React port of freeday's cascade select (src/freeday-cascade.js + cascade.css):
// a hierarchical drill-down picker showing one level at a time — branches drill in, a back
// control ascends, a leaf selects and the value is the leaf's value (the display is the full
// path). The enhancer's data model is a hidden nested <ul>; here it is a typed tree, which is
// what a framework app actually has. `value` + `onChange` in place of the DOM mutation.

export interface CascadeNode {
  label: string;
  value: string;
  /** Present = branch (drills in); absent = leaf (selectable). */
  children?: ReadonlyArray<CascadeNode>;
}

export interface FdyCascadeProps {
  /** The selected LEAF value ('' = nothing selected). */
  value: string;
  /** Fired when a leaf is picked; `labels` is the full path (root → leaf). */
  onChange: (value: string, labels: string[]) => void;
  options: ReadonlyArray<CascadeNode>;
  /** Path separator in the display, default " / " (matches the enhancer). */
  separator?: string;
  placeholder?: string;
  /** Accessible name for the trigger + listbox (the enhancer's data-label). */
  label?: string;
  id?: string;
  ariaLabelledby?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its value, but can't be opened or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
}

// Depth-first search for the stack of nodes leading to a leaf value.
function pathTo(nodes: ReadonlyArray<CascadeNode>, value: string, trail: CascadeNode[]): CascadeNode[] | null {
  for (const node of nodes) {
    const here: CascadeNode[] = trail.concat([node]);
    if (node.children === undefined && node.value === value) return here;
    if (node.children !== undefined) {
      const found: CascadeNode[] | null = pathTo(node.children, value, here);
      if (found !== null) return found;
    }
  }
  return null;
}

export function FdyCascade(props: FdyCascadeProps): JSX.Element {
  const baseId: string = useId();
  const triggerId: string = props.id ?? `${baseId}-trigger`;
  const listId: string = `${baseId}-list`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;
  const sep: string = props.separator ?? ' / ';
  const name: string = props.label ?? 'Pilih';

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState<boolean>(false);
  const [stack, setStack] = useState<CascadeNode[]>([]);
  const [active, setActive] = useState<number>(-1);

  usePopover(panelRef, triggerRef, open);
  // Popover attr for React 18/19 JSX typing: set once on mount (same as FdyCombo).
  useEffect((): void => {
    panelRef.current?.setAttribute('popover', 'manual');
  }, []);

  const isDisabled: boolean = props.disabled === true;
  const isReadonly: boolean = props.readonly === true;
  const isInvalid: boolean = props.invalid === true;

  const current: ReadonlyArray<CascadeNode> =
    stack.length === 0 ? props.options : (stack[stack.length - 1].children ?? []);

  const selectedTrail: CascadeNode[] | null = useMemo(
    (): CascadeNode[] | null => (props.value === '' ? null : pathTo(props.options, props.value, [])),
    [props.options, props.value],
  );
  const isPlaceholder: boolean = selectedTrail === null;
  const displayValue: string = selectedTrail !== null
    ? selectedTrail.map((n: CascadeNode): string => n.label).join(sep)
    : (props.placeholder ?? 'Pilih…');
  const crumb: string = stack.length > 0 ? stack.map((n: CascadeNode): string => n.label).join(sep) : name;

  const openPanel = (): void => {
    if (isDisabled || isReadonly) return;
    // Re-open at the selected leaf's level for quick re-selection (matches the enhancer).
    setStack(selectedTrail !== null && selectedTrail.length > 1 ? selectedTrail.slice(0, -1) : []);
    setActive(0);
    setOpen(true);
  };
  const closePanel = (returnFocus: boolean): void => {
    setOpen(false);
    setActive(-1);
    if (returnFocus) triggerRef.current?.focus();
  };
  const drill = (index: number): void => {
    const node: CascadeNode | undefined = current[index];
    if (node === undefined || node.children === undefined) return;
    setStack(stack.concat([node]));
    setActive(0);
  };
  const ascend = (): void => {
    if (stack.length === 0) return;
    setStack(stack.slice(0, -1));
    setActive(0);
  };
  const activate = (index: number): void => {
    const node: CascadeNode | undefined = current[index];
    if (node === undefined) return;
    if (node.children !== undefined) { drill(index); return; }
    const labels: string[] = stack.map((n: CascadeNode): string => n.label).concat([node.label]);
    props.onChange(node.value, labels);
    closePanel(true);
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>): void => {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(Math.min(current.length - 1, active + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive(Math.max(0, active - 1)); break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(current.length - 1); break;
      case 'ArrowRight':
      case 'Enter':
      case ' ': e.preventDefault(); if (active >= 0) activate(active); break;
      case 'ArrowLeft':
      case 'Backspace': e.preventDefault(); ascend(); break;
      case 'Escape': e.preventDefault(); closePanel(true); break;
      case 'Tab': closePanel(false); break;
      default: break;
    }
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(); }
  };

  // Move focus into the list when the panel opens (the enhancer does list.focus()).
  useEffect((): void => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Close when a pointer lands outside the whole component.
  useEffect((): void | (() => void) => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent): void => {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) closePanel(false);
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return (): void => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  // Keep the active option in view (indexed, so React's useId colons never hit a selector).
  useEffect((): void => {
    if (!open || active < 0) return;
    const items: NodeListOf<Element> | undefined = listRef.current?.querySelectorAll('[role="option"]');
    const el: Element | undefined = items?.[active];
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' });
  }, [active, open, stack]);

  return (
    <div ref={rootRef} className={isInvalid ? 'fdy-cascade fdy-cascade--error' : 'fdy-cascade'}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={open ? 'fdy-cascade__trigger is-open' : 'fdy-cascade__trigger'}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={props.ariaLabelledby === undefined ? name : undefined}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-readonly={isReadonly ? 'true' : undefined}
        aria-describedby={props.describedby}
        disabled={isDisabled}
        onClick={(): void => { if (open) closePanel(true); else openPanel(); }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={isPlaceholder ? 'fdy-cascade__value fdy-cascade__value--placeholder' : 'fdy-cascade__value'}>{displayValue}</span>
      </button>

      <div ref={panelRef} className="fdy-cascade__panel" hidden={!open}>
        <div className="fdy-cascade__head">
          <button
            type="button"
            className="fdy-cascade__back"
            aria-label="Kembali satu tingkat"
            hidden={stack.length === 0}
            onClick={(): void => { ascend(); listRef.current?.focus(); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span className="fdy-cascade__crumb" aria-live="polite">{crumb}</span>
        </div>
        <ul
          ref={listRef}
          id={listId}
          className="fdy-cascade__list"
          role="listbox"
          aria-label={name}
          tabIndex={-1}
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          onKeyDown={onListKeyDown}
        >
          {current.map((node: CascadeNode, i: number): JSX.Element => {
            const isBranch: boolean = node.children !== undefined;
            return (
              <li
                key={node.value}
                id={optionId(i)}
                role="option"
                className={i === active ? 'fdy-cascade__opt is-active' : 'fdy-cascade__opt'}
                aria-selected={!isBranch && node.value === props.value}
                aria-label={isBranch ? `${node.label}, submenu` : undefined}
                onMouseMove={(): void => setActive(i)}
                onClick={(): void => activate(i)}
              >
                <span className="fdy-cascade__opt-label">{node.label}</span>
                {isBranch ? <span className="fdy-cascade__opt-arrow" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
