/** Local-only release gate rehearsal. All corruptions live in disposable source copies. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs } from "node:util";
import { artifactIdentity, sha256, sourceIdentity } from "../../scripts/release-artifact.ts";

const { values } = parseArgs({ options: { output: { type: "string" }, positive: { type: "boolean" } } });
const evidence = resolve(values.output ?? "test-results/fault-injection");
const repository = process.cwd();
const before = await sourceIdentity(repository);
const temporary = await mkdtemp(join(tmpdir(), "foodie-release-faults-"));
const results = { startedAt: new Date().toISOString(), source: before, cases: [], productionDeployment: "never invoked", coverage: "formal catalog and read-only production checker" };
await mkdir(evidence, { recursive: true });
// The release input manifest includes transitive catalog evidence and tested tooling.
// Reuse it so an extracted candidate needs neither Git metadata nor a second file registry.
const files = Object.keys(before.files);
async function copy(name) {
  const root = join(temporary, name);
  await mkdir(root, { recursive: true });
  for (const file of files) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await copyFile(join(repository, file), join(root, file));
  }
  await symlink(join(repository, "node_modules"), join(root, "node_modules"), "dir");
  return root;
}
async function run(root, command, args, log, env = {}) {
  let output = "";
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (bytes) => { output += bytes; });
  const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => resolve(signal ? 128 : code)); });
  await writeFile(log, output);
  return { command: [command, ...args].join(" "), cwd: root, exitCode, log, outputSha256: sha256(output) };
}
try {
  const cases = [
    { name: "bad-data", file: "public/data/hong-kong/2026/michelin-starred.json", mutate: (body) => { const data = JSON.parse(body); data[0].edition_year = 1900; return JSON.stringify(data); }, diagnostic: "DATASET_MISMATCH" },
    { name: "stale-coverage", file: "readme/data-onboarding-guide.md", mutate: (body) => body.replace("catalog-and-inputs-sha256:", "stale-inputs-sha256:"), diagnostic: "STALE_COVERAGE" },
    { name: "type-error", file: "src/p07-type-fault.ts", mutate: () => 'export const broken: number = "bad type";\n', diagnostic: "TS2322" },
    { name: "behavior-assertion", file: "tests/unit/urlState.test.ts", mutate: (body) => body.replace('year: "2024",', 'year: "2099",'), diagnostic: "2099" },
  ];
  for (const item of cases) {
    const root = await copy(item.name), output = join(evidence, item.name);
    await mkdir(output, { recursive: true });
    const path = join(root, item.file), previous = await readFile(path, "utf8").catch(() => "");
    const changed = item.mutate(previous); assert.notEqual(changed, previous);
    await writeFile(path, changed);
    await writeFile(join(output, "injection.json"), JSON.stringify({ file: item.file, beforeSha256: sha256(previous), afterSha256: sha256(changed), before: previous, after: changed }, null, 2));
    await writeFile(join(output, "verified.json"), '{"passed":true,"staleReceipt":true}');
    const command = await run(root, "npm", ["run", "release:check", "--", "--output", output], join(output, "pipeline.log"));
    const report = JSON.parse(await readFile(join(output, "result.json"), "utf8"));
    assert.notEqual(command.exitCode, 0, item.name); assert.equal(report.passed, false);
    assert.equal(await readFile(join(output, "verified.json")).then(() => true).catch(() => false), false, "failed run removes prior authorization");
    assert.equal(report.steps.some((step) => step.script === "build"), false, "deployment artifact was never built");
    assert.match(await readFile(command.log, "utf8"), new RegExp(item.diagnostic));
    results.cases.push({ name: item.name, ...command, failedGate: report.steps.at(-1).script, deploymentReachable: false, verifiedReceiptExists: false });
    console.log(`${item.name}: gate exit ${command.exitCode}, deployment blocked`);
  }
  const root = await copy("browser-first-failure"), browserOutput = join(evidence, "browser-first-failure");
  await mkdir(browserOutput, { recursive: true });
  const file = join(root, "tests/e2e/title-filter.test.mjs");
  await writeFile(file, (await readFile(file, "utf8")).replace('"michelin-starred");', '"intentional-behavior-regression");'));
  const browserResult = await run(root, process.execPath, ["--test", "tests/e2e/title-filter.test.mjs"], join(browserOutput, "browser.log"), { E2E_ARTIFACT_DIR: browserOutput });
  assert.notEqual(browserResult.exitCode, 0);
  const failures = await readdir(join(browserOutput, "failures")); assert.ok(failures.length);
  const saved = await readdir(join(browserOutput, "failures", failures[0]));
  assert.ok(saved.includes("failure.json") && saved.includes("session-1.json") && saved.includes("session-1.png"));
  const capture = JSON.parse(await readFile(join(browserOutput, "failures", failures[0], "session-1.json"), "utf8"));
  assert.ok(capture.browser && capture.observation.dataset && capture.build.artifact.sha256);
  results.cases.push({ name: "browser-first-failure", ...browserResult, retained: saved });

  if (values.positive) {
    const root = await copy("healthy-consumer"), output = join(evidence, "healthy-consumer");
    await mkdir(output, { recursive: true });
    const command = await run(root, "npm", ["run", "release:check", "--", "--output", output], join(output, "pipeline.log"));
    assert.equal(command.exitCode, 0, `See ${command.log}`);
    const artifact = await artifactIdentity(join(root, "dist"));
    const js = Object.keys(artifact.files).find((file) => file.endsWith(".js") && file.startsWith("assets/"));
    const path = join(root, "dist", js), bytes = await readFile(path);
    await writeFile(path, Buffer.concat([bytes, Buffer.from("\n// substituted artifact\n")]));
    const tampered = await run(root, "npm", ["run", "release:verify", "--", "--output", output], join(output, "tampered-artifact.log"));
    assert.notEqual(tampered.exitCode, 0);
    await writeFile(path, bytes);
    const restored = await run(root, "npm", ["run", "release:verify", "--", "--output", output], join(output, "restored-artifact.log"));
    assert.equal(restored.exitCode, 0);
    results.cases.push({ name: "healthy-formal-catalog-and-artifact-tamper", ...command, artifact, tampered, restored, discovery: "/data/catalog.json", coverage: "production check:coverage", independentAcceptance: false });
  }
  assert.equal((await sourceIdentity(repository)).sha256, before.sha256, "Original source was unchanged by fault injection");
  results.passed = true;
} catch (error) { results.passed = false; results.error = String(error.stack ?? error); process.exitCode = 1; console.error(error); }
finally { results.finishedAt = new Date().toISOString(); await writeFile(join(evidence, "summary.json"), JSON.stringify(results, null, 2) + "\n"); await rm(temporary, { recursive: true, force: true }); }
