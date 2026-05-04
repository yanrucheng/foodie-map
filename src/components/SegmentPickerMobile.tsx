import { useState, useCallback } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import type { SegmentOption } from "@/hooks/useSelection";

interface SegmentPickerMobileProps {
  /** Available options for this segment. */
  options: SegmentOption[];
  /** Currently selected value. */
  value: string;
  /** Called when user selects a new option. */
  onChange: (value: string) => void;
}

/**
 * Mobile segment picker: renders as a tappable inline chip.
 * - Single option: renders as static text (not tappable).
 * - Multiple options: tapping opens a bottom-sheet with the option list.
 * - Same data contract as the desktop SegmentPicker.
 */
export function SegmentPickerMobile({ options, value, onChange }: SegmentPickerMobileProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  const isInteractive = options.length > 1;

  /** Open the picker sheet. */
  const handleTap = useCallback(() => {
    if (!isInteractive) return;
    setIsOpen(true);
  }, [isInteractive]);

  /** Select an option and close the sheet. */
  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange],
  );

  /** Close the sheet without selecting. */
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <>
      <button
        className={`seg-chip seg-chip--mobile ${isInteractive ? "seg-chip--interactive" : ""} ${isOpen ? "seg-chip--active" : ""}`}
        onClick={handleTap}
        type="button"
        tabIndex={isInteractive ? 0 : -1}
      >
        <span className="seg-chip-label">{selectedLabel}</span>
        {isInteractive && <span className="seg-chip-caret" aria-hidden="true" />}
      </button>

      <BottomSheet isOpen={isOpen} onClose={handleClose} initialSnap="half">
        <ul className="seg-sheet-list" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`seg-sheet-item ${opt.value === value ? "seg-sheet-item--selected" : ""}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt.value)}
            >
              <span className="seg-sheet-item-label">{opt.label}</span>
              {opt.value === value && <span className="seg-sheet-item-check" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
      </BottomSheet>
    </>
  );
}
