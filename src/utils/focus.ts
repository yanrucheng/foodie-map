/** Focus bookmarks survive responsive remounts without owning any domain state. */
export function focusBookmark() {
  const element = document.activeElement instanceof HTMLElement && document.activeElement !== document.body && document.activeElement !== document.documentElement ? document.activeElement : null;
  const key = element?.dataset.focusKey;
  return () => {
    const replacement = key ? Array.from(document.querySelectorAll<HTMLElement>("[data-focus-key]"))
      .find((node) => node.dataset.focusKey === key) : null;
    const target = element?.isConnected && !element.closest("[inert]") ? element : replacement;
    (target ?? document.querySelector<HTMLElement>('[data-focus-key="search"]')
      ?? document.querySelector<HTMLElement>(".seg-chip--interactive"))?.focus({ preventScroll: true });
  };
}
