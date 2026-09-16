import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { artifactIdentity, releaseGates, sha256, verifyReleaseArtifact, type ReleaseReceipt } from "../../scripts/release-artifact.ts";
import { configurePages, pagesHostname, rollbackRelease } from "../../scripts/release-pages.ts";
import { checkPublishedRelease } from "../../scripts/release-smoke.ts";

const temporary: string[] = [];
afterEach(async () => { await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

async function bundle() {
  const directory = await mkdtemp(join(tmpdir(), "foodie-release-delivery-"));
  temporary.push(directory);
  const source = { sha256: sha256("source"), lockSha256: sha256("lock") };
  const release = { buildId: sha256("build"), sourceSha256: source.sha256, lockSha256: source.lockSha256 };
  await writeFile(join(directory, "release.json"), JSON.stringify(release));
  await writeFile(join(directory, "index.html"), "tested HTML");
  const receipt: ReleaseReceipt = {
    passed: true, head: "a".repeat(40), source, artifact: await artifactIdentity(directory),
    steps: releaseGates.map((script) => ({ script, exitCode: 0 })),
  };
  return { directory, receipt, release };
}

describe("retained release verification", () => {
  it("accepts the original artifact independently of the current checkout", async () => {
    const { directory, receipt, release } = await bundle();
    expect(await verifyReleaseArtifact(directory, receipt, receipt.head!)).toEqual(release);
  });

  it.each(["changed", "missing", "extra"])("rejects %s artifact files", async (change) => {
    const { directory, receipt } = await bundle();
    if (change === "missing") await rm(join(directory, "index.html"));
    else await writeFile(join(directory, change === "extra" ? "unexpected.txt" : "index.html"), "unverified");
    await expect(verifyReleaseArtifact(directory, receipt)).rejects.toThrow("Artifact differs");
  });

  it("rejects incomplete checks, a different source commit and a mismatched build", async () => {
    const { directory, receipt } = await bundle();
    await expect(verifyReleaseArtifact(directory, { ...receipt, passed: false })).rejects.toThrow("incomplete");
    await expect(verifyReleaseArtifact(directory, { ...receipt, steps: receipt.steps.slice(1) })).rejects.toThrow("Every required gate");
    await expect(verifyReleaseArtifact(directory, { ...receipt, steps: receipt.steps.map((step) => ({ ...step, exitCode: 1 })) })).rejects.toThrow("All gates");
    await expect(verifyReleaseArtifact(directory, receipt, "b".repeat(40))).rejects.toThrow("selected GitHub run");
    await expect(verifyReleaseArtifact(directory, { ...receipt, source: { ...receipt.source, sha256: sha256("other source") } })).rejects.toThrow("Build and checked source");
  });
});

const repository = "owner/foodie-map";
const run = { id: 123, run_attempt: 2, path: ".github/workflows/deploy.yml", head_branch: "main", head_sha: "a".repeat(40), conclusion: "success", event: "push", repository: { full_name: repository }, head_repository: { full_name: repository } };
const jobs = [{ name: "Deploy GitHub Pages", conclusion: "success" }];
const artifacts = [{ id: 12, name: "release-1", expired: false }];

describe("rollback source selection", () => {
  it("uses the retained quality artifact when a failed deployment was rerun", () => {
    expect(rollbackRelease(run, jobs, artifacts, repository)).toEqual({ "run-id": "123", "artifact-id": "12", "expected-head": run.head_sha });
    expect(rollbackRelease(run, jobs, [...artifacts, { id: 13, name: "release-2", expired: false }], repository)["artifact-id"]).toBe("13");
  });

  it.each([
    { event: "pull_request" }, { head_branch: "feature" }, { conclusion: "failure" },
    { path: ".github/workflows/untrusted.yml" }, { head_repository: { full_name: "fork/foodie-map" } },
    { repository: { full_name: "other/foodie-map" } },
  ])("rejects an untrusted or unsuccessful run %j", (override) => {
    expect(() => rollbackRelease({ ...run, ...override }, jobs, artifacts, repository)).toThrow();
  });

  it("rejects verify-only, failed smoke checks, and expired or missing bundles", () => {
    expect(() => rollbackRelease(run, [], artifacts, repository)).toThrow("passed deployment");
    expect(() => rollbackRelease(run, [{ ...jobs[0]!, conclusion: "failure" }], artifacts, repository)).toThrow("passed deployment");
    expect(() => rollbackRelease(run, jobs, [], repository)).toThrow("missing or expired");
    expect(() => rollbackRelease(run, jobs, [{ ...artifacts[0]!, expired: true }], repository)).toThrow("missing or expired");
  });
});

describe("Pages configuration", () => {
  it("accepts a matching domain with HTTPS enforced without changing settings", async () => {
    const api = vi.fn(async () => ({ cname: "foodie.example.com", build_type: "workflow", https_enforced: true }));
    expect(await configurePages("foodie.example.com", api)).toBe("https://foodie.example.com/");
    expect(api).toHaveBeenCalledExactlyOnceWith("pages");
    await expect(configurePages("foodie.example.com", async () => ({ cname: "foodie.example.com", build_type: "workflow", https_enforced: false }))).rejects.toThrow("Enable Enforce HTTPS once");
  });

  it("fails before changing a different domain or branch-based Pages site", async () => {
    const api = vi.fn(async () => ({ cname: "other.example.com", build_type: "legacy", https_enforced: false }));
    await expect(configurePages("foodie.example.com", api)).rejects.toThrow("custom domain");
    expect(api).toHaveBeenCalledTimes(1);
    await expect(configurePages("other.example.com", api)).rejects.toThrow("GitHub Actions");
    expect(pagesHostname("foodie.example.com\n")).toBe("foodie.example.com");
    expect(() => pagesHostname("https://foodie.example.com/path")).toThrow();
  });
});

describe("public deployment verification", () => {
  const content = { "index.html": "<html>tested release</html>", "release.json": '{"buildId":"expected"}', "sw.js": "worker", "assets/app.js": "application", "_foodie/data/hash/data/city.json": '[{"name":"restaurant"}]', CNAME: "foodie.example.com" };
  const hashes = Object.fromEntries(Object.entries(content).map(([path, body]) => [path, sha256(body)]));
  function delivery(overrides: Record<string, Response> = {}) {
    return vi.fn<typeof fetch>(async (input, init) => {
      expect(init?.redirect).toBe("manual");
      const url = new URL(String(input));
      if (overrides[url.href]) return overrides[url.href]!.clone();
      if (url.protocol === "http:") return new Response(null, { status: 301, headers: { location: "https://foodie.example.com/" } });
      const body = content[(url.pathname.slice(1) || "index.html") as keyof typeof content];
      return new Response(body ?? "missing", { status: body ? 200 : 404 });
    });
  }

  it("checks homepage, all assets, worker and data against tested bytes", async () => {
    const request = delivery();
    expect(await checkPublishedRelease("https://foodie.example.com/", hashes, request)).toEqual({ url: "https://foodie.example.com/", checkedFiles: 6 });
    expect(request.mock.calls.some(([url]) => String(url).endsWith("/CNAME"))).toBe(false);
  });

  it.each([
    ["http://foodie.example.com/", new Response("insecure"), "HTTP must redirect"],
    ["http://foodie.example.com/", new Response(null, { status: 301, headers: { location: "https://other.example.com/" } }), "canonical HTTPS"],
    ["https://foodie.example.com/release.json", new Response('{"buildId":"old"}'), "deployed bytes"],
    ["https://foodie.example.com/assets/app.js", new Response("missing", { status: 404 }), "expected HTTP 200"],
    ["https://foodie.example.com/", new Response("old cached HTML"), "deployed bytes"],
  ] as const)("rejects incorrect delivery from %s", async (url, response, message) => {
    await expect(checkPublishedRelease("https://foodie.example.com/", hashes, delivery({ [url]: response }))).rejects.toThrow(message);
  });
});
