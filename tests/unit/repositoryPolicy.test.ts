import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const script = resolve("scripts/check-repository.mjs");
const roots: string[] = [];
function repository() {
  const root = mkdtempSync(join(tmpdir(), "foodie-repository-policy-"));
  roots.push(root);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "-q");
  const check = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8", env: { ...process.env, REPOSITORY_BASE: "" } });
  return { root, git, check };
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

it("allows the exact byte limit and ignored raw output, but rejects oversized source files", () => {
  const { root, git, check } = repository();
  writeFileSync(join(root, ".gitignore"), "/test-results/\n");
  mkdirSync(join(root, "test-results"));
  writeFileSync(join(root, "test-results/raw.json"), Buffer.alloc(1_000_001));
  writeFileSync(join(root, "data.json"), Buffer.alloc(1_000_000));
  git("add", ".");
  expect(check().status).toBe(0);
  writeFileSync(join(root, "data.json"), Buffer.alloc(1_000_001));
  expect(check().status).toBe(1);
});

it("rejects large indexed bytes even after the working copy is replaced", () => {
  const { root, git, check } = repository();
  writeFileSync(join(root, "data.json"), Buffer.alloc(1_000_001));
  git("add", ".");
  writeFileSync(join(root, "data.json"), "{}");
  expect(check("--staged").status).toBe(1);
});

it("rejects forced additions to retired evidence and runtime output directories", () => {
  const { root, git, check } = repository();
  for (const directory of ["openspec/changes/example/evidence", "eval/sessions/example/outputs", "test-results"]) {
    mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(join(root, directory, "result.json"), "{}");
  }
  git("add", ".");
  const result = check("--staged");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("generated output belongs outside Git");
});

it("checks newly introduced history even if a later commit deletes the large file", () => {
  const { root, git, check } = repository();
  const commit = (message: string) => git("-c", "user.name=Policy Test", "-c", "user.email=policy@example.invalid", "-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "commit", "-qm", message);
  writeFileSync(join(root, "source.txt"), "current source");
  git("add", "."); commit("baseline");
  const base = git("rev-parse", "HEAD");
  writeFileSync(join(root, "large.json"), Buffer.alloc(1_000_001));
  git("add", "."); commit("large file");
  git("rm", "large.json"); commit("remove file");
  expect(check().status).toBe(0);
  expect(check("--base", base).status).toBe(1);
});
