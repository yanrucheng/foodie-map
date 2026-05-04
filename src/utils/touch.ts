/** Direction of a swipe gesture. */
export type SwipeDirection = "up" | "down" | "left" | "right";

/** Result of a completed swipe gesture that met the distance threshold. */
export interface SwipeResult {
  direction: SwipeDirection;
  deltaX: number;
  deltaY: number;
  /** Pixels per millisecond. */
  velocity: number;
  /** Duration in milliseconds. */
  duration: number;
}

/** Snapshot of a pointer position at a given time. */
export interface PointerSnapshot {
  x: number;
  y: number;
  t: number;
}

/** Minimum distance (px) to qualify as a swipe. */
const MIN_DISTANCE = 20;

/** Determines swipe direction from delta values. */
function resolveDirection(dx: number, dy: number): SwipeDirection {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "down" : "up";
}

/**
 * Analyzes start/end pointer snapshots and returns a SwipeResult if the
 * gesture met the minimum distance threshold, or null otherwise.
 */
export function detectSwipe(
  start: PointerSnapshot,
  end: PointerSnapshot,
): SwipeResult | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const duration = Math.max(end.t - start.t, 1);

  if (distance < MIN_DISTANCE) return null;

  return {
    direction: resolveDirection(dx, dy),
    deltaX: dx,
    deltaY: dy,
    velocity: distance / duration,
    duration,
  };
}

/** Creates a pointer snapshot from a Touch object. */
export function snapshotFromTouch(touch: Touch): PointerSnapshot {
  return { x: touch.clientX, y: touch.clientY, t: Date.now() };
}

/** Creates a pointer snapshot from a PointerEvent. */
export function snapshotFromPointer(e: PointerEvent): PointerSnapshot {
  return { x: e.clientX, y: e.clientY, t: Date.now() };
}

/** Returns a passive event listener options object. */
export function passiveOption(): AddEventListenerOptions {
  return { passive: true };
}

/** Returns a non-passive event listener options object (for preventDefault). */
export function activeOption(): AddEventListenerOptions {
  return { passive: false };
}
