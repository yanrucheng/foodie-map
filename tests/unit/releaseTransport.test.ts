// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";

const path = "/data/fixture/2026/michelin-starred.json";
const body = JSON.stringify([{ id: 1, name: "Revision B", city: "fixture", guide_type: "michelin-starred", edition_year: 2026, cuisine_group: "OTHER" }]);
const sha256 = createHash("sha256").update(body).digest("hex");
const url = `/_foodie/data/${sha256}${path}`;
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("__FOODIE_RELEASE__", { resources: { [path]: { url, sha256, kind: "restaurants", identity: "fixture/2026/michelin-starred" } } });
});
afterEach(() => vi.unstubAllGlobals());

it("uses the immutable address and accepts the matching content revision", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetcher);
  const { readReleaseJson } = await import("@/data/release");
  const signal = new AbortController().signal;
  expect(await readReleaseJson(path, signal)).toEqual({ payload: JSON.parse(body), delivery: "network", offline: false });
  expect(fetcher).toHaveBeenCalledWith(url, { signal, cache: "no-store" });
});
it("rejects a valid older same-year payload even before the current worker controls the page", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body.replace("Revision B", "Revision A"), { headers: { "content-type": "application/json" } })));
  const { readReleaseJson } = await import("@/data/release");
  await expect(readReleaseJson(path, new AbortController().signal)).rejects.toThrow("修订与当前应用不一致");
});
it.each([404, 500])("rejects HTTP %s without parsing or committing it", async (status) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status, headers: { "content-type": "application/json" } })));
  const { readReleaseJson } = await import("@/data/release");
  await expect(readReleaseJson(path, new AbortController().signal)).rejects.toThrow(`HTTP ${status}`);
});
it("rejects an HTML response despite valid JSON-looking bytes", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "text/html" } })));
  const { readReleaseJson } = await import("@/data/release");
  await expect(readReleaseJson(path, new AbortController().signal)).rejects.toThrow("响应格式");
});
it("reports the worker's verified offline cache even when the OS reports online", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-type": "application/json", "x-foodie-cache": "hit", "x-foodie-network": "unavailable" } })));
  const { readReleaseJson } = await import("@/data/release");
  expect(await readReleaseJson(path, new AbortController().signal)).toMatchObject({ delivery: "cache", offline: true });
});
it("distinguishes an uncached offline dataset from an invalid online response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503, headers: { "x-foodie-network": "unavailable" } })));
  const { readReleaseJson } = await import("@/data/release");
  await expect(readReleaseJson(path, new AbortController().signal)).rejects.toMatchObject({ offline: true });
});
it("does not issue requests for paths outside this release's discovery", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const { readReleaseJson } = await import("@/data/release");
  await expect(readReleaseJson("/data/other.json", new AbortController().signal)).rejects.toThrow("未包含");
  expect(fetcher).not.toHaveBeenCalled();
});
