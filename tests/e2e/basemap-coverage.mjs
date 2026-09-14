/** Online release handoff check. HTTP success/uniformity is evidence, not ground accuracy. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { basemaps } from "../../src/config/basemaps.ts";
import { wgs84ToGcj02 } from "../../src/utils/gcj02.ts";

const output = process.env.P05_COVERAGE_DIR;
if (!output) throw new Error("Set P05_COVERAGE_DIR; this is an online provider coverage probe.");
await mkdir(output, { recursive: true });
const catalog = JSON.parse(await readFile("public/data/catalog.json", "utf8"));
const anchors = JSON.parse(await readFile(process.env.P05_ANCHORS_FILE ?? "tests/fixtures/map-anchors.json", "utf8"));
const browser = await puppeteer.launch({ headless: "shell" });
const rows = [];
try {
  const page = await browser.newPage();
  for (const anchor of anchors.filter((a) => !process.env.P05_CITY || a.city === process.env.P05_CITY)) {
    const id = catalog.cities.find((c) => c.id === anchor.city)?.basemap ?? "amap";
    const provider = basemaps[id];
    const [lat, lon] = provider.coordinates === "GCJ02" ? wgs84ToGcj02(...anchor.input_lat_lon) : anchor.input_lat_lon;
    for (const z of [...new Set([provider.minZoom, 12, 15, 18])]) {
      const x = Math.floor((lon + 180) / 360 * 2 ** z), y = Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
      const url = provider.url.replace("{s}", "1").replace("{x}", x).replace("{y}", y).replace("{z}", z);
      const body = execFileSync("curl", ["--fail", "-L", "--max-time", "20", "-sS", url]);
      const sha256 = createHash("sha256").update(body).digest("hex");
      const file = `${anchor.id}-${z}.png`; await writeFile(join(output, file), body);
      const pixels = await page.evaluate(async (data) => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0); const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
        const colors = new Set(); for (let i = 0; i < rgba.length; i += 4) colors.add(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]},${rgba[i + 3]}`);
        return { width: c.width, height: c.height, distinctColors: colors.size, uniform: colors.size === 1 };
      }, body.toString("base64"));
      rows.push({ anchor: anchor.id, provider: id, z, x, y, url, file, bytes: body.length, sha256, ...pixels });
    }
  }
} finally {
  await writeFile(join(output, "coverage.json"), JSON.stringify({ capturedAt: new Date().toISOString(), rows,
    result: "Requires visual landmark review; nonuniform tile is not proof of correct ground position", }, null, 2));
  await browser.close();
}
console.log(`${rows.length} provider tiles captured; ${rows.filter((r) => r.uniform).length} uniform`);
