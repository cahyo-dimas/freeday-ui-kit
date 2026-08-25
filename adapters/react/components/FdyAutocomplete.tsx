import type { JSX } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePopover } from '../usePopover';

// A controlled React port of freeday's autocomplete (src/freeday-autocomplete.js +
// autocomplete.css): a WAI-ARIA APG *editable* combobox, a text input filters a listbox of
// options as you type; picking one fills the input. `value` + `onChange` in place of the
// enhancer's DOM mutation, so React owns the input. Filtering mirrors the enhancer exactly
// (case-insensitive substring on the trimmed query); pass server-filtered `options` and it
// stays a no-op re-filter. `onSelect` fires only on commit (the enhancer's select event).

export interface FdyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<string>;
  /** Fired only when an option is committed (click / Enter), not on every keystroke. */
  onSelect?: (value: string) => void;
  emptyText?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  disabled?: boolean;
  /** Locked/view mode: the input is not editable and the list won't open, but it stays focusable and shows its value. Unlike `disabled`, it keeps tab order and isn't greyed. */
  readonly?: boolean;
  invalid?: boolean;
  describedby?: string;
}

export function FdyAutocomplete(props: FdyAutocompleteProps): JSX.Element {
  const baseId: string = useId();
  const inputId: string = props.id ?? `${baseId}-input`;
  const listboxId: string = `${baseId}-listbox`;
  const optionId = (index: number): string => `${baseId}-opt-${index}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<boolean>(false);
  const [active, setActive] = useState<number>(-1);

  usePopover(listboxRef, inputRef, open);
  // Popover attr for React 18/19 JSX typing: set once on mount (same as FdyCombo).
  useEffect((): void => {
    listboxRef.current?.setAttribute('popover', 'manual');
  }, []);

  const isDisabled: boolean = props.disabled === true;
  const isReadonly: boolean = props.readonly === true;
  const isInvalid: boolean = props.invalid === true;

  const filtered: string[] = useMemo((): string[] => {
    const q: string = props.value.trim().toLowerCase();
    return q === '' ? props.options.slice() : props.options.filter((o: string): boolean => o.toLowerCase().includes(q));
  }, [props.options, props.value]);

  const activeDescendant: string | undefined =
    open && active >= 0 && active < filtered.length ? optionId(active) : undefined;

  const openList = (): void => { if (!isDisabled && !isReadonly) setOpen(true); };
  const closeList = (): void => { setOpen(false); setActive(-1); };

  const choose = (label: string): void => {
    props.onChange(label);
    if (props.onSelect !== undefined) props.onSelect(label);
    closeList();
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (isDisabled || isReadonly) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { openList(); setActive(filtered.length > 0 ? 0 : -1); }
        else setActive(active + 1 < filtered.length ? active + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) { openList(); setActive(filtered.length - 1); }
        else setActive(active - 1 >= 0 ? active - 1 : filtered.length - 1);
        break;
      case 'Enter':
        if (open && active >= 0 && active < filtered.length) { e.preventDefault(); choose(filtered[active]); }
        break;
      case 'Escape':
        if (open) { e.preventDefault(); closeList(); }
        break;
      case 'Tab':
        if (open) closeList();
        break;
      default: break;
    }
  };

  // Close when a pointer lands outside the whole component.
  useEffect((): void | (() => void) => {
    if (!open) return;
    const onDocPointerDown = (e: MouseEvent): void => {
      const t: EventTarget | null = e.target;
      if (rootRef.current !== null && t instanceof Node && !rootRef.current.contains(t)) closeList();
    };
    document.addEventListener('mousedown', onDocPointerDown);
    return (): void => document.removeEventListener('mousedown', onDocPointerDown);
  }, [open]);

  // Keep the highlighted option in view (indexed, so React's useId colons never hit a selector).
  useEffect((): void => {
    if (!open || active < 0) return;
    const items: NodeListOf<Element> | undefined = listboxRef.current?.querySelectorAll('[role="option"]');
    const el: Element | undefined = items?.[active];
    if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  return (
    <div ref={rootRef} className="fdy-autocomplete" onKeyDown={onKeyDown}>
      <input
        ref={inputRef}
        id={inputId}
        className={isInvalid ? 'fdy-input fdy-input--error' : 'fdy-input'}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-label={props.ariaLabel}
        aria-labelledby={props.ariaLabelledby}
        aria-invalid={isInvalid ? 'true' : undefined}
        aria-describedby={props.describedby}
        autoComplete="off"
        placeholder={props.placeholder}
        disabled={isDisabled}
        readOnly={isReadonly}
        value={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => { props.onChange(e.target.value); setActive(-1); openList(); }}
        onFocus={openList}
      />
      <ul
        ref={listboxRef}
        id={listboxId}
        className="fdy-autocomplete__listbox"
        role="listbox"
        aria-label={props.ariaLabel}
        hidden={!open}
      >
        {filtered.map((opt: string, i: number): JSX.Element => (
          <li
            key={opt}
            id={optionId(i)}
            className={i === active ? 'fdy-autocomplete__option is-highlighted' : 'fdy-autocomplete__option'}
            role="option"
            aria-selected={opt === props.value}
            onMouseDown={(e: React.MouseEvent<HTMLLIElement>): void => e.preventDefault()}
            onMouseMove={(): void => setActive(i)}
            onClick={(): void => choose(opt)}
          >{opt}</li>
        ))}
        {filtered.length === 0 ? <li className="fdy-autocomplete__empty">{props.emptyText ?? 'No results'}</li> : null}
      </ul>
    </div>
  );
}
