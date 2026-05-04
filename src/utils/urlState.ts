/** Shape of selection-related URL search parameters. */
export interface UrlSelectionParams {
  year?: string;
  city?: string;
  guide?: string;
}

/** Reads selection params from the current URL search string. */
export function readSelectionParams(): UrlSelectionParams {
  const params = new URLSearchParams(window.location.search);
  return {
    year: params.get("year") ?? undefined,
    city: params.get("city") ?? undefined,
    guide: params.get("guide") ?? undefined,
  };
}

/** Writes selection params to the URL without triggering a page reload. */
export function writeSelectionParams(
  year: number,
  cityId: string,
  guideId: string
): void {
  const params = new URLSearchParams(window.location.search);
  params.set("year", String(year));
  params.set("city", cityId);
  params.set("guide", guideId);
  const url = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, "", url);
}
