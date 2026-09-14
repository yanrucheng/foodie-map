import { expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifactIdentity, sourceIdentity } from "../../scripts/release-artifact";

it("reproduces source identity without local Finder files while still checking every artifact byte", async () => {
  const root = await mkdtemp(join(tmpdir(), "foodie-source-identity-"));
  try {
    await mkdir(join(root, "src"));
    await mkdir(join(root, "public"));
    await writeFile(join(root, "src/main.ts"), 'export const version = "A";\n');
    const source = await sourceIdentity(root);
    const artifact = await artifactIdentity(root);
    await writeFile(join(root, "public/.DS_Store"), "local Finder state");
    expect(await sourceIdentity(root)).toEqual(source);
    expect(await artifactIdentity(root)).not.toEqual(artifact);
    await writeFile(join(root, "src/main.ts"), 'export const version = "B";\n');
    expect((await sourceIdentity(root)).sha256).not.toEqual(source.sha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("binds transitive catalog evidence to the checked source identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "foodie-source-evidence-"));
  try {
    await mkdir(join(root, "public/data"), { recursive: true });
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "public/data/catalog.json"), JSON.stringify({ ref: "/data/reconciliation.json" }));
    await writeFile(join(root, "public/data/reconciliation.json"), JSON.stringify({ sources: ["repo:docs/annual.md"] }));
    await writeFile(join(root, "docs/annual.md"), "Annual evidence A");
    const before = await sourceIdentity(root);
    await writeFile(join(root, "docs/annual.md"), "Annual evidence B");
    expect((await sourceIdentity(root)).sha256).not.toBe(before.sha256);
  } finally { await rm(root, { recursive: true, force: true }); }
});

it("includes the boarding tool executed by the quick suite without depending on a local Python environment", async () => {
  const root = await mkdtemp(join(tmpdir(), "foodie-source-boarding-"));
  try {
    await mkdir(join(root, "skills/cuisine-boarding/.venv"), { recursive: true });
    await writeFile(join(root, "skills/cuisine-boarding/board.py"), "print('validated A')\n");
    const before = await sourceIdentity(root);
    await writeFile(join(root, "skills/cuisine-boarding/.venv/local-state"), "machine specific");
    expect(await sourceIdentity(root)).toEqual(before);
    await writeFile(join(root, "skills/cuisine-boarding/board.py"), "print('validated B')\n");
    expect((await sourceIdentity(root)).sha256).not.toBe(before.sha256);
  } finally { await rm(root, { recursive: true, force: true }); }
});
