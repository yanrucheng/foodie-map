/** Explicit online Amap numerical reference capture. Never prints/persists credentials. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { wgs84ToGcj02 } from "../../src/utils/gcj02.ts";

const key = process.env.AMAP_WEB_SERVICE_KEY;
const output = process.env.P05_PROVIDER_REFERENCE_DIR;
if (!key || !output) throw new Error("Provide an authorized AMAP_WEB_SERVICE_KEY via environment and P05_PROVIDER_REFERENCE_DIR; no provider request was sent.");
const anchors = JSON.parse(await readFile("openspec/changes/p05-map-location-correctness/evidence/supplement-260914/anchors.json", "utf8"))
  .filter((a) => a.city !== "tokyo");
await mkdir(output, { recursive: true });
const results = [];
const radians = (x) => x * Math.PI / 180;
function distance(a, b) {
  const h = Math.sin(radians(b[0] - a[0]) / 2) ** 2 + Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(radians(b[1] - a[1]) / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
for (const anchor of anchors) {
  // Provider supports at most 6 decimals. Compare algorithm and provider at exactly this input.
  const input = anchor.input_lat_lon.map((value) => Number(value.toFixed(6)));
  const url = new URL("https://restapi.amap.com/v3/assistant/coordinate/convert");
  url.search = new URLSearchParams({ key, locations: `${input[1]},${input[0]}`, coordsys: "gps", output: "json" });
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(20_000) }); }
  catch { throw new Error("Provider request failed; credential-bearing URL intentionally omitted."); }
  const payload = await response.json();
  const item = { id: anchor.id, city: anchor.city, capturedAt: new Date().toISOString(), endpoint: "https://restapi.amap.com/v3/assistant/coordinate/convert",
    request: { input, coordsys: "gps", output: "json" }, status: response.status, provider: { status: payload.status, info: payload.info, infocode: payload.infocode, locations: payload.locations },
    referenceMeaning: "Provider numerical output for an exact input, not source physical-point accuracy", accepted: false };
  if (payload.status === "1" && typeof payload.locations === "string") {
    const [lon, lat] = payload.locations.split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Malformed provider coordinates");
    item.reference = [lat, lon]; item.actual = wgs84ToGcj02(...input);
    item.errorMeters = distance(item.reference, item.actual); item.accepted = item.errorMeters <= 10;
  }
  results.push(item);
  await writeFile(join(output, "amap-reference.json"), JSON.stringify(results, null, 2));
}
if (results.some((r) => !r.accepted)) process.exitCode = 1;
console.log(`${results.filter((r) => r.accepted).length}/${results.length} provider numerical comparisons <=10m; physical E2E not evaluated.`);
