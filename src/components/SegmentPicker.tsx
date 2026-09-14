import { useState, useRef, useId, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { SegmentOption } from "@/hooks/useSelection";
import { PickerOptions } from "./PickerOptions";
import { focusBookmark } from "@/utils/focus";

export interface SegmentPickerProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

/** Nonmodal listbox: focus enters options; Escape/selection returns to the trigger. */
export function SegmentPicker({ options, value, onChange, label }: SegmentPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 300 });
  const chip = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  useLayoutEffect(() => {
    if (!isOpen) return;
    const restore = focusBookmark();
    const place = () => {
      const rect = chip.current?.getBoundingClientRect();
      if (!rect) return;
      const height = Math.min(320, window.innerHeight - 24);
      const below = window.innerHeight - rect.bottom - 12;
      const top = below >= Math.min(180, height) ? rect.bottom + 6 : Math.max(8, rect.top - height - 6);
      setPosition({ top, left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)), maxHeight: Math.max(80, window.innerHeight - top - 12) });
    };
    const outside = (event: Event) => {
      if (!chip.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setIsOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    const node = popup.current;
    const trigger = chip.current;
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      const ownedFocus = node?.contains(document.activeElement) || document.activeElement === trigger || document.activeElement === document.body;
      queueMicrotask(() => { if (ownedFocus && (!trigger?.isConnected || document.activeElement === document.body)) restore(); });
    };
  }, [isOpen]);
  const close = () => { chip.current?.focus(); setIsOpen(false); };
  if (options.length <= 1) return <span className="seg-chip"><span className="sr-only">{label}：</span><span className="seg-chip-label">{selectedLabel || "暂无选项"}</span></span>;
  return <div className="seg-picker">
    <button ref={chip} type="button" data-focus-key={`picker-${label}`} aria-label={`${label}：${selectedLabel}`}
      className={`seg-chip seg-chip--interactive ${isOpen ? "seg-chip--active" : ""}`}
      aria-haspopup="listbox" aria-controls={isOpen ? id : undefined} aria-expanded={isOpen}
      onClick={(event) => { event.currentTarget.focus(); setIsOpen(!isOpen); }} onKeyDown={(event) => {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setIsOpen(true); }
      }}><span className="seg-chip-label">{selectedLabel}</span><span className="seg-chip-caret" aria-hidden="true" /></button>
    {isOpen && createPortal(<div ref={popup} role="region" aria-label={`${label}选项`} className="seg-dropdown" style={position}>
      <PickerOptions id={id} label={label} options={options} value={value}
        onSelect={(next) => { close(); onChange(next); }} onDismiss={close} />
    </div>, document.body)}
  </div>;
}
