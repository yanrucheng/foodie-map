import { useCallback } from "react";
import { SegmentPicker } from "@/components/SegmentPicker";
import { SegmentPickerMobile } from "@/components/SegmentPickerMobile";
import type { SegmentOption } from "@/hooks/useSelection";

interface DynamicTitleProps {
  /** Available year options. */
  years: SegmentOption[];
  /** Available city/location options (filtered by current year). */
  cityOptions: SegmentOption[];
  /** Available guide options (filtered by current year + city). */
  guideOptions: SegmentOption[];
  /** Current year value (as string). */
  year: number;
  /** Current city id. */
  cityId: string;
  /** Current guide id. */
  guideId: string;
  /** Callback when year changes. */
  onYearChange: (year: number) => void;
  /** Callback when city changes. */
  onCityChange: (cityId: string) => void;
  /** Callback when guide changes. */
  onGuideChange: (guideId: string) => void;
  /** Render in compact mobile mode. */
  compact?: boolean;
}

/**
 * Composes the dynamic title from three segment pickers + static text.
 * Template: {year} {location} · {guideName}餐厅地图
 *
 * - Desktop (compact=false): renders inline pill chips with dropdowns.
 * - Mobile (compact=true): renders compact tappable chips with bottom-sheet pickers.
 */
export function DynamicTitle({
  years,
  cityOptions,
  guideOptions,
  year,
  cityId,
  guideId,
  onYearChange,
  onCityChange,
  onGuideChange,
  compact = false,
}: DynamicTitleProps) {
  /** Wrap year change to convert string back to number. */
  const handleYearChange = useCallback(
    (value: string) => onYearChange(Number(value)),
    [onYearChange],
  );

  const Picker = compact ? SegmentPickerMobile : SegmentPicker;

  return (
    <h1 className={`dynamic-title ${compact ? "dynamic-title--compact" : ""}`}>
      <Picker options={years} value={String(year)} onChange={handleYearChange} />
      <Picker options={cityOptions} value={cityId} onChange={onCityChange} />
      <span className="dynamic-title-sep">·</span>
      <Picker options={guideOptions} value={guideId} onChange={onGuideChange} />
      <span className="dynamic-title-suffix">餐厅地图</span>
    </h1>
  );
}
