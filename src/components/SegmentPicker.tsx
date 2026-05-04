import { useState, useRef, useCallback, useEffect } from "react";
import type { SegmentOption } from "@/hooks/useSelection";

interface SegmentPickerProps {
  /** Available options for this segment. */
  options: SegmentOption[];
  /** Currently selected value. */
  value: string;
  /** Called when user selects a new option. */
  onChange: (value: string) => void;
}

/**
 * Desktop segment picker: renders as an inline pill/chip.
 * - Single option: renders as static text (no caret, not interactive).
 * - Multiple options: renders as a clickable chip with caret that opens a dropdown.
 * - Supports Escape to close and click-outside dismiss.
 */
export function SegmentPicker({ options, value, onChange }: SegmentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  const isInteractive = options.length > 1;

  /** Toggle dropdown visibility. */
  const handleChipClick = useCallback(() => {
    if (!isInteractive) return;
    setIsOpen((prev) => !prev);
  }, [isInteractive]);

  /** Select an option and close the dropdown. */
  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange],
  );

  /** Close on Escape key. */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  /** Close on click outside. */
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [isOpen]);

  return (
    <div className="seg-picker" ref={containerRef}>
      <button
        className={`seg-chip ${isInteractive ? "seg-chip--interactive" : ""} ${isOpen ? "seg-chip--active" : ""}`}
        onClick={handleChipClick}
        aria-expanded={isInteractive ? isOpen : undefined}
        aria-haspopup={isInteractive ? "listbox" : undefined}
        type="button"
        tabIndex={isInteractive ? 0 : -1}
      >
        <span className="seg-chip-label">{selectedLabel}</span>
        {isInteractive && <span className="seg-chip-caret" aria-hidden="true" />}
      </button>

      {isOpen && (
        <ul className="seg-dropdown" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`seg-dropdown-item ${opt.value === value ? "seg-dropdown-item--selected" : ""}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
