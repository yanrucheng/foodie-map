import { useRef, useState, type ReactNode } from "react";
import { DialogSurface } from "./DialogSurface";

type SnapPoint = "full" | "half";
interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialSnap?: SnapPoint;
  id?: string;
}

/** Each open owns one native modal. Snap height is the actual scroll viewport. */
export function BottomSheet(props: BottomSheetProps) {
  return props.isOpen ? <OpenSheet {...props} /> : null;
}
function OpenSheet({ children, onClose, title = "面板", initialSnap = "half", id }: BottomSheetProps) {
  const [snap, setSnap] = useState(initialSnap);
  const [delta, setDelta] = useState(0);
  const drag = useRef<{ y: number; time: number } | null>(null);
  return <DialogSurface id={id} label={title} className="bottom-sheet-container" onClose={onClose}>
    <div className="bottom-sheet-backdrop" aria-hidden="true" onClick={onClose} />
    <section className={`bottom-sheet bottom-sheet--${snap}`} style={{ transform: `translateY(${Math.max(0, delta)}px)` }}>
      <div className="bottom-sheet-handle" aria-hidden="true"
        onPointerDown={(event) => { drag.current = { y: event.clientY, time: Date.now() }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => { if (drag.current) setDelta(event.clientY - drag.current.y); }}
        onPointerCancel={() => { drag.current = null; setDelta(0); }}
        onPointerUp={(event) => {
          const start = drag.current; drag.current = null; setDelta(0);
          if (!start) return;
          const distance = event.clientY - start.y;
          const fast = Math.abs(distance) / Math.max(Date.now() - start.time, 1) > 0.3;
          if (distance > 80 || (distance > 24 && fast)) {
            if (snap === "half" || distance > 180) onClose(); else setSnap("half");
          } else if (distance < -30) setSnap("full");
        }}><div className="bottom-sheet-handle-bar" /></div>
      <div className="bottom-sheet-toolbar">
        <h2 className="bottom-sheet-title">{title}</h2>
        <button type="button" aria-expanded={snap === "full"} onClick={() => setSnap(snap === "half" ? "full" : "half")}>{snap === "half" ? "展开面板" : "收起面板"}</button>
        <button type="button" aria-label={`关闭${title}`} onClick={onClose}>关闭</button>
      </div>
      <div className="bottom-sheet-content">{children}</div>
    </section>
  </DialogSurface>;
}
