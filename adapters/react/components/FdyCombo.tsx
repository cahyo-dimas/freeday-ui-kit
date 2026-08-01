import type { JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';

export interface FdyComboOption<T extends string> {
  value: T;
  label: string;
}

export interface FdyComboProps<T extends string> {
  value: T;
  options: ReadonlyArray<FdyComboOption<T>>;
  onChange: (value: T) => void;
  id?: string;
  ariaLabelledby?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Locked/view mode: stays focusable and shows its value, but can't be opened or changed. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
}

export function FdyCombo<T extends string>(props: FdyComboProps<T>): JSX.Element {
  const baseId: string = useId();
  const buttonId: string = props.id ?? `${baseId}-btn`;
  const listboxId: string = `${baseId}-listbox`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [highlighted, setHighlighted] = useState<number>(-1);

  usePopover(listboxRef, buttonRef, open);

  // Popover attr for React 18 (JSX may not type it): set once on mount.
  useEffect((): void => {
    listboxRef.current?.setAttribute('popover', 'manual');
  }, []);

  const isDisabled: boolean = props.disabled === true;
  const isReadonly: boolean = props.readonly === true;
  const isInvalid: boolean = props.invalid === true;
  const selectedIndex: number = useMemo(
    (): number => props.options.findIndex((o: FdyComboOption<T>): boolean => o.value === props.value),
    [props.options, props.value],
  );
  const selectedLabel: string = selectedIndex >= 0 ? props.options[selectedIndex].label : (props.placeholder ?? '');
  const isPlaceholder: boolean = selectedIndex < 0;
  const activeDescendant: string | undefined = open && highlighted >= 0 ? optionId(highlighted) : undefined;

  const setHighlight = (index: number): void => {
    const len: number = props.options.length;
    setHighlighted(len === 0 ? -1 : ((index % len) + len) % len);
  };
  const openList = (): void => {
    if (isDisabled || isReadonly || open) return;
    setOpen(true);
    const start: number = selectedIndex >= 0 ? selectedIndex : 0;
    const len: number = props.options.length;
    setHighlighted(len === 0 ? -1 : ((start % len) + len) % len);
  };
  const closeList = (focusButton: boolean): void => {
    setOpen(false);
    setHighlighted(-1);
    if (focusButton) buttonRef.current?.focus();
  };
  const toggle = (): void => { if (open) closeList(false); else openList(); };
  const choose = (index: number): void => {
    const opt: FdyComboOption<T> | undefined = props.options[index];
    if (opt === undefined) return;
    if (opt.value !== props.value) props.onChange(opt.value);
    closeList(true);
  };

  // Type-to-select: buffer keystrokes for 500ms and jump to the first matching label.
  const typedRef = useRef<string>('');
  const typedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typeahead = (char: string): void => {
    typedRef.current += char.toLowerCase();
    if (typedTimer.current !== null) clearTimeout(typedTimer.current);
    typedTimer.current = setTimeout((): void => { typedRef.current = ''; }, 500);
    const match: number = props.options.findIndex((o: FdyComboOption<T>): boolean =>
      o.label.toLowerCase().startsWith(typedRef.current));
    if (match >= 0) { if (!open) setOpen(true); setHighlight(match); }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isDisabled || isReadonly) return;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); if (open) setHighlight(highlighted + 1); else openList(); break;
      case 'ArrowUp': e.preventDefault(); if (open) setHighlight(highlighted - 1); else openList(); break;
      case 'Home': if (open) { e.preventDefault(); setHighlight(0); } break;
      case 'End': if (open) { e.preventDefault(); setHighlight(props.options.length - 1); } break;
      case 'Enter':
      case ' ': e.preventDefault(); if (open && highlighted >= 0) choose(highlighted); else openList(); break;
      case 'Escape': if (open) { e.preventDefault(); closeList(true); } break;
      case 'Tab': if (open) closeList(false); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(e.key);
    }
  };

  const onFocusout = (e: React.FocusEvent<HTMLDivElement>): void => {
    const next: EventTarget | null = e.relatedTarget;
    if (rootRef.current !== null && !(next instanceof Node && rootRef.current.contains(next))) closeList(false);
  };

  // Close when a pointer lands outside the whole combo.
  useEffect((): void | (() => void) => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent): void => {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) closeList(false);
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return (): void => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  useEffect((): (() => void) => (): void => {
    if (typedTimer.current !== null) clearTimeout(typedTimer.current);
  }, []);

  return (
    <div
      ref={rootRef}
      className={isInvalid ? 'fdy-combo fdy-combo--error' : 'fdy-combo'}
      data-value={props.value}
      onKeyDown={onKeyDown}
      onBlur={onFocusout}
    >
      <button
        id={buttonId}
        ref={buttonRef}
        type="button"
        className={open ? 'fdy-combo__button is-open' : 'fdy-combo__button'}
        role="combobox"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={activeDescendant}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-readonly={isReadonly ? 'true' : undefined}
        aria-describedby={props.describedby}
        disabled={isDisabled}
        onClick={toggle}
      >
        <span className={isPlaceholder ? 'fdy-combo__value fdy-combo__value--placeholder' : 'fdy-combo__value'}>{selectedLabel}</span>
      </button>
      <ul id={listboxId} ref={listboxRef} className="fdy-combo__listbox" role="listbox" hidden={!open}>
        {props.options.map((opt: FdyComboOption<T>, i: number): JSX.Element => (
          // onMouseDown preventDefault keeps focus on the button: the option <li> isn't focusable, so a
          // plain mousedown moves focus out of the combo, fires onBlur (focusout), and closes the list
          // before the click lands. Same pattern as FdyDatepicker/FdyAutocomplete.
          <li
            id={optionId(i)}
            key={opt.value}
            className={i === highlighted ? 'fdy-combo__option is-highlighted' : 'fdy-combo__option'}
            role="option"
            aria-selected={opt.value === props.value}
            onMouseDown={(e: React.MouseEvent): void => e.preventDefault()}
            onClick={(): void => choose(i)}
            onMouseMove={(): void => setHighlight(i)}
          >
            <span className="fdy-combo__check">{opt.value === props.value ? '✓' : ''}</span>{opt.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
