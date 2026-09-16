import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { setTimeout } from "node:timers/promises";
import { sha256, verifyReleaseArtifact, type ReleaseReceipt } from "./release-artifact.ts";
import { pagesHostname } from "./release-pages.ts";

/** Verify the public delivery boundary against the exact artifact tested by browsers. */
export async function checkPublishedRelease(origin: string, files: Record<string, string>, request: typeof fetch = fetch) {
  const site = new URL(origin);
  assert.equal(site.protocol, "https:", "Production verification requires HTTPS");
  assert.equal(site.pathname, "/", "This application is hosted at the custom domain root");
  assert.ok(!site.username && !site.password && !site.search && !site.hash);
  const get = (url: URL) => request(url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(15_000) });
  const http = new URL(site); http.protocol = "http:";
  const redirect = await get(http);
  // Do not wait for cancellation of a tee'd response body to finish.
  void redirect.body?.cancel().catch(() => {});
  assert.ok([301, 302, 307, 308].includes(redirect.status), "HTTP must redirect to HTTPS; enable Enforce HTTPS in Pages settings");
  assert.equal(new URL(redirect.headers.get("location") ?? "", http).href, site.href, "HTTP must redirect to the canonical HTTPS site");
  assert.ok(files["index.html"] && files["release.json"] && files["sw.js"], "A complete release manifest is required");
  // CNAME is hosting configuration; Pages does not promise to serve it as content.
  const pending = Object.entries(files).filter(([path]) => path !== "CNAME");
  pending.push(["", files["index.html"]!]);
  let checked = 0;
  const results = await Promise.allSettled(Array.from({ length: Math.min(6, pending.length) }, async () => {
    while (pending.length) {
      const [path, expected] = pending.shift()!;
      assert.ok(!path.startsWith("/") && !path.split("/").includes("..") && !/[\\?#]/u.test(path), "Artifact paths must stay within the site");
      const response = await get(new URL(path, site));
      assert.equal(response.status, 200, `${path || "/"}: expected HTTP 200`);
      assert.equal(sha256(new Uint8Array(await response.arrayBuffer())), expected, `${path || "/"}: deployed bytes differ from the checked artifact`);
      checked++;
    }
  }));
  for (const result of results) if (result.status === "rejected") throw result.reason;
  return { url: site.href, checkedFiles: checked };
}

async function main() {
  const { values } = parseArgs({ options: {
    dist: { type: "string", default: "dist" }, receipt: { type: "string", default: "test-results/release/verified.json" },
    output: { type: "string", default: "test-results/deployment/result.json" },
  } });
  const dist = resolve(values.dist);
  const receipt = JSON.parse(await readFile(values.receipt, "utf8")) as ReleaseReceipt;
  const release = await verifyReleaseArtifact(dist, receipt);
  const url = `https://${pagesHostname(await readFile(`${dist}/CNAME`, "utf8"))}/`;
  const report = { passed: false, url, buildId: release.buildId, artifactSha256: receipt.artifact.sha256, startedAt: new Date().toISOString(), attempts: [] as { at: string; error?: string; checkedFiles?: number }[] };
  const deadline = Date.now() + 600_000;
  try {
    // A bounded propagation window handles Pages/CDN replacement, never a new build.
    for (let attempt = 1; ; attempt++) {
      const at = new Date().toISOString();
      try {
        const result = await checkPublishedRelease(url, receipt.artifact.files);
        report.attempts.push({ at, checkedFiles: result.checkedFiles });
        report.passed = true;
        console.log(`Verified ${result.checkedFiles} public files, HTTPS redirect and build ${release.buildId} at ${url}`);
        return;
      } catch (error) {
        report.attempts.push({ at, error: String(error) });
        console.error(`Online verification attempt ${attempt}: ${String(error)}`);
        if (Date.now() >= deadline) throw error;
        await setTimeout(Math.min(15_000, deadline - Date.now()));
      }
    }
  } finally {
    await mkdir(dirname(resolve(values.output)), { recursive: true });
    await writeFile(values.output, JSON.stringify({ ...report, finishedAt: new Date().toISOString() }, null, 2) + "\n");
  }
}

if (import.meta.main) main().catch((error) => { console.error(error); process.exitCode = 1; });
