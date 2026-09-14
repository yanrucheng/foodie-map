import { useId, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { PickerOptions } from "./PickerOptions";
import type { SegmentPickerProps } from "./SegmentPicker";

export function SegmentPickerMobile({ options, value, onChange, label }: SegmentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  if (options.length <= 1) return <span className="seg-chip seg-chip--mobile"><span className="sr-only">{label}：</span><span className="seg-chip-label">{selectedLabel || "暂无选项"}</span></span>;
  return <>
    <button type="button" data-focus-key={`picker-${label}`} aria-label={`${label}：${selectedLabel}`}
      aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined}
      className={`seg-chip seg-chip--mobile seg-chip--interactive ${isOpen ? "seg-chip--active" : ""}`}
      onClick={(event) => { event.currentTarget.focus(); setIsOpen(true); }} onKeyDown={(event) => {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setIsOpen(true); }
      }}><span className="seg-chip-label">{selectedLabel}</span><span className="seg-chip-caret" aria-hidden="true" /></button>
    <BottomSheet id={id} isOpen={isOpen} title={`选择${label}`} onClose={() => setIsOpen(false)}>
      <PickerOptions id={`${id}-options`} label={label} options={options} value={value} mobile
        onSelect={(next) => { setIsOpen(false); onChange(next); }} onDismiss={() => setIsOpen(false)} />
    </BottomSheet>
  </>;
}
