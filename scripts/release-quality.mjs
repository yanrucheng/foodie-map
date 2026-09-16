import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { appendFile, readFile, writeFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import { sha256, sourceIdentity, artifactIdentity, verifyReleaseArtifact } from "./release-artifact.ts";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { output: { type: "string" }, receipt: { type: "string" }, dist: { type: "string", default: "dist" }, "artifact-only": { type: "boolean" }, "expected-head": { type: "string" } } });
const mode = positionals[0] ?? "check";
const evidence = resolve(values.output ?? "test-results/release");
const receiptPath = resolve(values.receipt ?? join(evidence, "verified.json"));
const dist = resolve(values.dist);
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });

async function verify() {
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  if (!values["artifact-only"]) assert.equal((await sourceIdentity(process.cwd())).sha256, receipt.source.sha256, "Source changed after checking");
  const release = await verifyReleaseArtifact(dist, receipt, values["expected-head"]);
  console.log(`Verified unchanged artifact ${receipt.artifact.sha256} (build ${release.buildId})`);
}

async function check() {
  await mkdir(evidence, { recursive: true });
  // An earlier successful receipt must not survive a new, failed run.
  await rm(receiptPath, { force: true });
  const source = await sourceIdentity(process.cwd());
  const head = git("rev-parse", "HEAD");
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  const report = { startedAt: new Date().toISOString(), node: process.version, head: head.status === 0 ? head.stdout.trim() : null,
    gitStatus: git("status", "--short").stdout, source, steps: [], passed: false };
  try {
    for (const [script, args] of [["check", []], ["test", []], ["check:coverage", []], ["build", []], ["test:e2e", ["--", "--prebuilt"]], ["test:performance", ["--", "--dist", dist, "--output", join(evidence, "performance.json")]]]) {
      const startedAt = new Date().toISOString();
      if (!manifest.scripts[script]) {
        const message = `UPSTREAM_GATE_MISSING: npm run ${script}. Restore the required command from the complete candidate; absence is not a pass.`;
        report.steps.push({ script, command: `npm run ${script}`, exitCode: 78, startedAt, error: message });
        throw new Error(message);
      }
      let output = "";
      const commandArgs = ["run", script, ...args];
      const child = spawn("npm", commandArgs, { env: { ...process.env, E2E_ARTIFACT_DIR: join(evidence, "browser"), E2E_DIST: dist }, stdio: ["ignore", "pipe", "pipe"] });
      for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { output += chunk; process.stdout.write(chunk); });
      const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve(signal ? 128 : code)); });
      const log = join(evidence, `${script.replace(/:/gu, "-")}.log`);
      await writeFile(log, output);
      report.steps.push({ script, command: ["npm", ...commandArgs].join(" "), startedAt, finishedAt: new Date().toISOString(), exitCode, log: relative(evidence, log) });
      if (exitCode !== 0) {
        if (process.env.GITHUB_ACTIONS === "true") {
          const detail = output.slice(-12_000).replace(/%/gu, "%25").replace(/\r/gu, "%0D").replace(/\n/gu, "%0A");
          console.log(`::error title=Release gate ${script} failed::${detail}`);
        }
        throw new Error(`Required gate failed: ${script} (exit ${exitCode}); no release artifact is authorized.`);
      }
      if (script === "build") report.artifact = await artifactIdentity(dist);
    }
    assert.equal((await sourceIdentity(process.cwd())).sha256, source.sha256, "Source changed during release checks");
    assert.deepEqual(await artifactIdentity(dist), report.artifact, "Tests must not rebuild or alter the deployment artifact");
    report.passed = true;
    report.finishedAt = new Date().toISOString();
    await writeFile(receiptPath, JSON.stringify(report, null, 2) + "\n");
    await verify();
  } catch (error) {
    report.passed = false; report.error = String(error.stack ?? error); process.exitCode = report.steps.at(-1)?.exitCode || 1;
    await rm(receiptPath, { force: true });
    console.error(report.error);
  } finally {
    report.finishedAt = new Date().toISOString();
    await writeFile(join(evidence, "result.json"), JSON.stringify(report, null, 2) + "\n");
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, [
        `Release checks: **${report.passed ? "passed" : "failed"}**`, "",
        "| Gate | Exit code |", "| --- | --- |",
        ...report.steps.map((step) => `| ${step.script} | ${step.exitCode} |`), "",
        "Full logs, browser evidence and performance measurements are in the release-evidence artifact.", "",
      ].join("\n"));
    }
  }
}

async function snapshot() {
  await mkdir(evidence, { recursive: true });
  const listing = git("ls-files", "--cached", "--others", "--exclude-standard", "-z");
  if (listing.status !== 0) throw new Error("Create the source snapshot in the working repository, then replay the archive without Git.");
  const archive = join(evidence, "candidate-source.tar.gz");
  const record = join(evidence, "candidate-source.json");
  const excluded = new Set([relative(process.cwd(), archive), relative(process.cwd(), record)]);
  const files = {};
  const temporary = await mkdtemp(join(tmpdir(), "foodie-source-snapshot-"));
  try {
    const staged = join(temporary, "source");
    await mkdir(staged);
    for (const path of [...new Set(listing.stdout.split("\0").filter(Boolean))].sort()) {
      // Source archives are disposable outputs and must never nest in a successor.
      if (excluded.has(path) || path.endsWith("/candidate-source.tar.gz")) continue;
      let body;
      try { body = await readFile(path); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
      files[path] = sha256(body);
      await mkdir(resolve(staged, path, ".."), { recursive: true });
      await writeFile(join(staged, path), body, { mode: (await stat(path)).mode });
    }
    const source = await sourceIdentity(staged);
    assert.equal(source.sha256, (await sourceIdentity(process.cwd())).sha256, "Build inputs changed during snapshot capture; capture again after the changes finish");
    const list = join(temporary, "files");
    await writeFile(list, Object.keys(files).join("\0") + "\0");
    const result = spawnSync("tar", ["-czf", archive, "-C", staged, "--null", "-T", list], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    const descriptor = { capturedAt: new Date().toISOString(), head: git("rev-parse", "HEAD").stdout.trim(), source,
      archive: relative(process.cwd(), archive), archiveSha256: sha256(await readFile(archive)), filesSha256: sha256(JSON.stringify(files)), files,
      exclusions: ["Git metadata", "ignored dependencies/build/test-results", "this snapshot archive and its descriptor", "other candidate-source.tar.gz archives"], note: "Temporary snapshot of current tracked and untracked source; discard after the current verification." };
    await writeFile(record, JSON.stringify(descriptor, null, 2) + "\n");
    console.log(JSON.stringify({ archive, archiveSha256: descriptor.archiveSha256, sourceSha256: descriptor.source.sha256, files: Object.keys(files).length }));
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

try {
  if (mode === "check") await check();
  else if (mode === "verify") await verify();
  else if (mode === "snapshot") await snapshot();
  else throw new Error(`Unknown release operation: ${mode}`);
} catch (error) { console.error(error); process.exitCode = 1; }
