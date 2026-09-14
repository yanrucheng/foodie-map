import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { focusBookmark } from "@/utils/focus";

let lockCount = 0;
let originalOverflow = "";

/** View-only lifecycle shared by sheets and details. Native top layer isolates all portals. */
export function DialogSurface({ children, label, className, onClose, modal = true, id }: {
  children: ReactNode;
  label: string;
  className: string;
  onClose: () => void;
  modal?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const restore = focusBookmark();
    if (modal) {
      if (lockCount++ === 0) {
        originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      dialog.showModal();
    } else dialog.show();
    const initial = dialog.querySelector<HTMLElement>('[data-dialog-initial], [aria-selected="true"], button, a[href]');
    initial?.focus();
    return () => {
      dialog.close();
      if (modal && --lockCount === 0) document.body.style.overflow = originalOverflow;
      // Native close can restore focus immediately. Only repair a lost focus;
      // never overwrite an intervening user navigation with a delayed bookmark.
      const repair = () => {
        if (document.activeElement === document.body && !document.querySelector("dialog[open]")) restore();
      };
      queueMicrotask(repair);
      requestAnimationFrame(repair);
    };
  }, [modal]);

  return createPortal(<dialog ref={ref} id={id ?? generatedId} className={className}
    aria-label={label} aria-modal={modal ? true : undefined}
    onCancel={(event) => { event.preventDefault(); closeRef.current(); }}
    onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (modal && event.key === "Tab") {
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        )).filter((node) => node.getClientRects().length > 0);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !items.includes(document.activeElement as HTMLElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    {children}
  </dialog>, document.body);
}
