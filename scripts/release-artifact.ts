import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import assert from "node:assert/strict";

export const sha256 = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export async function fileManifest(directory: string, excluded: (path: string) => boolean = () => false): Promise<Record<string, string>> {
  async function walk(parent: string): Promise<string[]> {
    const entries = await readdir(parent, { withFileTypes: true });
    return (await Promise.all(entries.map(async (entry) => {
      const path = join(parent, entry.name);
      if (excluded(relative(directory, path))) return [];
      if (entry.isSymbolicLink()) throw new Error(`Snapshot cannot silently follow symlink: ${path}`);
      return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : [];
    }))).flat();
  }
  const entries = await Promise.all((await walk(directory)).sort().map(async (file) => [relative(directory, file), sha256(await readFile(file))]));
  return Object.fromEntries(entries);
}

/** Build identity covers every executable/configuration input, independently of Git cleanliness. */
export async function sourceIdentity(root: string) {
  const directories = new Set(["src", "public", "scripts", "tests", ".github", "readme"]);
  const files = ["package.json", "package-lock.json", "VERSION", "index.html", "vite.config.ts", "vitest.config.ts", "tsconfig.json", "tsconfig.node.json", "eslint.config.mjs", "Makefile", ".nvmrc", ".npmrc", ".puppeteerrc.cjs", "skills/cuisine-boarding/board.py", "skills/cuisine-boarding/pyproject.toml", "skills/cuisine-boarding/uv.lock"];
  const manifest = await fileManifest(root, (path) => path.split("/").includes(".DS_Store") || (!directories.has(path.split("/")[0]!) && !files.some((file) => file === path || file.startsWith(`${path}/`))));
  // Catalog-referenced local evidence is a gate input even when it lives outside public/.
  const catalogFile = join(root, "public/data/catalog.json");
  if (existsSync(catalogFile)) {
    let catalog: unknown;
    try { catalog = JSON.parse(await readFile(catalogFile, "utf8")); } catch { /* validator reports malformed catalog */ }
    const visited = new Set<string>();
    const visit = async (value: unknown): Promise<void> => {
      if (typeof value === "string" && (/^repo:[a-zA-Z0-9_./-]+$/u.test(value) || /^\/data\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.json$/u.test(value)) && !value.includes("..")) {
        const ref = value.startsWith("repo:") ? value.slice(5) : `public${value}`;
        if (visited.has(ref)) return;
        visited.add(ref);
        if (!existsSync(join(root, ref))) { manifest[ref] = sha256("MISSING_REFERENCE"); return; }
        const body = await readFile(join(root, ref));
        manifest[ref] = sha256(body);
        if (ref.endsWith(".json")) {
          let nested: unknown;
          try { nested = JSON.parse(body.toString()); } catch { /* validator reports malformed referenced JSON */ }
          await visit(nested);
        }
      } else if (value && typeof value === "object") for (const child of Object.values(value)) await visit(child);
    };
    await visit(catalog);
  }
  return { sha256: sha256(JSON.stringify(manifest)), files: manifest, lockSha256: manifest["package-lock.json"], gitHead: existsSync(join(root, ".git")) ? "recorded by release gate" : "source snapshot" };
}

export async function artifactIdentity(directory: string) {
  const files = await fileManifest(directory);
  return { sha256: sha256(JSON.stringify(files)), files };
}

export const releaseGates = ["check", "test", "check:coverage", "build", "test:e2e", "test:performance"];

export interface ReleaseReceipt {
  passed: boolean;
  head: string | null;
  source: { sha256: string; lockSha256: string };
  artifact: { sha256: string; files: Record<string, string> };
  steps: { script: string; exitCode: number }[];
}

/** A retained release is checked against its original receipt, without rebuilding it. */
export async function verifyReleaseArtifact(directory: string, receipt: ReleaseReceipt, expectedHead?: string) {
  assert.equal(receipt.passed, true, "A failed/incomplete check cannot authorize deployment");
  assert.deepEqual(receipt.steps.map((step) => step.script), releaseGates, "Every required gate ran in order");
  assert.ok(receipt.steps.every((step) => step.exitCode === 0), "All gates succeeded");
  if (expectedHead) assert.equal(receipt.head, expectedHead, "Receipt must belong to the selected GitHub run");
  assert.deepEqual(await artifactIdentity(directory), receipt.artifact, "Artifact differs from the one that browsers checked");
  const release = JSON.parse(await readFile(join(directory, "release.json"), "utf8"));
  assert.equal(release.sourceSha256, receipt.source.sha256, "Build and checked source match");
  assert.equal(release.lockSha256, receipt.source.lockSha256, "Build and checked lockfile match");
  return release;
}
