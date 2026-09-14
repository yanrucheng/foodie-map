import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// jsdom has no native top layer. Unit tests only exercise lifecycle/markup;
// real background isolation and Tab behavior are verified in browser tests.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.show = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  HTMLElement.prototype.scrollIntoView = function () {};
}
