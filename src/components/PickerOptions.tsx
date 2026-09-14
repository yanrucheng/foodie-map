import { useEffect, useRef, useState } from "react";
import type { SegmentOption } from "@/hooks/useSelection";

/** One single-select listbox pattern for both picker layouts. Focus is not selection. */
export function PickerOptions({ options, value, label, id, mobile = false, onSelect, onDismiss }: {
  options: SegmentOption[]; value: string; label: string; id: string; mobile?: boolean;
  onSelect: (value: string) => void; onDismiss: (tab?: boolean) => void;
}) {
  const [active, setActive] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const option = ref.current?.children[active] as HTMLElement | undefined;
    option?.focus();
    option?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return <ul ref={ref} id={id} role="listbox" aria-label={label} className={mobile ? "seg-sheet-list" : "seg-dropdown-list"}
    onKeyDown={(event) => {
      let next: number;
      if (event.key === "ArrowDown") next = Math.min(options.length - 1, active + 1);
      else if (event.key === "ArrowUp") next = Math.max(0, active - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = options.length - 1;
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); const option = options[active]; if (option) onSelect(option.value); return;
      } else if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); onDismiss(); return;
      } else if (event.key === "Tab" && !mobile) { onDismiss(true); return; }
      else return;
      event.preventDefault(); setActive(next);
    }}>
    {options.map((option, index) => <li key={option.value} role="option" aria-selected={option.value === value}
      tabIndex={active === index ? 0 : -1} onFocus={() => setActive(index)}
      className={`${mobile ? "seg-sheet-item" : "seg-dropdown-item"}${option.value === value ? mobile ? " seg-sheet-item--selected" : " seg-dropdown-item--selected" : ""}`}
      onClick={() => onSelect(option.value)}>
      <span className="seg-sheet-item-label">{option.label}</span>
      {option.value === value && <span aria-hidden="true">✓</span>}
    </li>)}
  </ul>;
}
