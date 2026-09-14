export interface ReleaseResource {
  url: string;
  sha256: string;
  kind: "restaurants" | "taxonomy" | "mappings" | "catalog";
  identity?: string;
}
export interface ReleaseManifest {
  version: string;
  buildId: string;
  sourceSha256: string;
  lockSha256: string;
  dataRevision: string;
  discovery: { provider: string; sha256: string };
  resources: Record<string, ReleaseResource>;
}
export const release: ReleaseManifest | null = typeof __FOODIE_RELEASE__ === "undefined" ? null : __FOODIE_RELEASE__;
export class ReleaseUnavailableError extends Error {
  readonly offline: boolean;
  constructor(message: string, offline: boolean) { super(message); this.offline = offline; }
}

/** Verify on the page as well: a new page can initially be controlled by the legacy worker. */
export async function readReleaseJson(path: string, signal: AbortSignal) {
  const resource = release?.resources[path];
  if (release && !resource) throw new Error("该数据集未包含在当前版本中，请更新应用。");
  let response: Response;
  try { response = await fetch(`${import.meta.env.BASE_URL}${(resource?.url ?? path).replace(/^\//u, "")}`, { signal, cache: "no-store" }); }
  catch (error) { if (signal.aborted) throw error; throw new ReleaseUnavailableError("网络不可用，请联网后重试。", true); }
  const offline = response.headers?.get("x-foodie-network") === "unavailable";
  if (!response.ok) throw new ReleaseUnavailableError(response.status === 503 ? "该版次尚未缓存或当前不可用，请联网后重试。" : `HTTP ${response.status}`, offline);
  if (resource) {
    if (!/^application\/(?:[a-z.+-]*\+)?json(?:;|$)/iu.test(response.headers.get("content-type") ?? "")) throw new Error("数据响应格式不正确，请重试。");
    const body = await response.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", body))].map((value) => value.toString(16).padStart(2, "0")).join("");
    if (hash !== resource.sha256) throw new Error("数据修订与当前应用不一致，请联网后重试。");
    return { payload: JSON.parse(new TextDecoder().decode(body)) as unknown, delivery: response.headers.get("x-foodie-cache") === "hit" ? "cache" as const : "network" as const, offline };
  }
  return { payload: await response.json() as unknown, delivery: "network" as const, offline };
}
