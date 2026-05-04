import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

/** Snap point positions as percentage of the sheet's own height (85vh). */
type SnapPoint = "full" | "half" | "collapsed";

/** translateY percentage values per snap point. */
const SNAP_Y: Record<SnapPoint, number> = {
  full: 0,        // 85vh visible
  half: 50,       // ~42.5vh visible
  collapsed: 100, // hidden
};

/** Velocity threshold (px/ms) to trigger directional snap. */
const VELOCITY_THRESHOLD = 0.3;

interface BottomSheetProps {
  /** Sheet content. */
  children: ReactNode;
  /** Whether the sheet is open. */
  isOpen: boolean;
  /** Called when the sheet should close (dragged to collapsed or backdrop tapped). */
  onClose: () => void;
  /** Optional title shown below the drag handle bar. */
  title?: string;
  /** Initial snap point when opened. Defaults to "half". */
  initialSnap?: SnapPoint;
}

/**
 * Slide-up bottom sheet with pointer drag gestures and three snap points.
 * Uses CSS transform + transition for smooth 60fps animation.
 * Height is fixed at 85vh; snap points control translateY offset.
 */
export function BottomSheet({
  children,
  isOpen,
  onClose,
  title,
  initialSnap = "half",
}: BottomSheetProps) {
  const [snap, setSnap] = useState<SnapPoint>(isOpen ? initialSnap : "collapsed");
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startTime: number } | null>(null);

  // Sync snap state with open/close transitions
  useEffect(() => {
    setSnap(isOpen ? initialSnap : "collapsed");
    setDragDelta(0);
  }, [isOpen, initialSnap]);

  // Sheet height in pixels (85% of viewport)
  const sheetHeightPx = (85 / 100) * (typeof window !== "undefined" ? window.innerHeight : 800);

  // Live translate during drag (clamped to valid range)
  const baseY = SNAP_Y[snap];
  const dragPercent = isDragging ? (dragDelta / sheetHeightPx) * 100 : 0;
  const translateY = Math.max(0, Math.min(100, baseY + dragPercent));

  /** Resolves the target snap point from drag delta and velocity. */
  const resolveSnap = useCallback(
    (delta: number, velocity: number, direction: "up" | "down"): SnapPoint => {
      const effectiveY = Math.max(0, Math.min(100, baseY + (delta / sheetHeightPx) * 100));

      if (velocity > VELOCITY_THRESHOLD) {
        return direction === "down"
          ? effectiveY > 40 ? "collapsed" : "half"
          : effectiveY < 60 ? "full" : "half";
      }

      // Snap to nearest by distance
      return (["full", "half", "collapsed"] as SnapPoint[]).reduce((best, s) =>
        Math.abs(effectiveY - SNAP_Y[s]) < Math.abs(effectiveY - SNAP_Y[best]) ? s : best
      );
    },
    [baseY, sheetHeightPx]
  );

  /** Starts drag, captures pointer to track movement outside element bounds. */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { startY: e.clientY, startTime: Date.now() };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }, []);

  /** Tracks drag position in real time. */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragRef.current) return;
      setDragDelta(e.clientY - dragRef.current.startY);
      e.stopPropagation();
    },
    [isDragging]
  );

  /** Resolves snap point and finalizes drag on pointer release or cancel. */
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragRef.current) return;

      const delta = e.clientY - dragRef.current.startY;
      const duration = Math.max(Date.now() - dragRef.current.startTime, 1);
      const velocity = Math.abs(delta) / duration;
      const direction = delta > 0 ? "down" : "up";

      const newSnap = resolveSnap(delta, velocity, direction);

      setIsDragging(false);
      setDragDelta(0);
      dragRef.current = null;
      setSnap(newSnap);

      if (newSnap === "collapsed") onClose();
    },
    [isDragging, resolveSnap, onClose]
  );

  // Lock body scroll while sheet is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-container">
      {/* Dim backdrop */}
      <div className="bottom-sheet-backdrop" onClick={onClose} />

      {/* Sheet panel */}
      <div
        className="bottom-sheet"
        style={{
          transform: `translateY(${translateY}%)`,
          transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* Draggable handle zone */}
        <div
          className="bottom-sheet-handle"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="bottom-sheet-handle-bar" />
          {title && <div className="bottom-sheet-title">{title}</div>}
        </div>

        {/* Scrollable content */}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </div>
  );
}
