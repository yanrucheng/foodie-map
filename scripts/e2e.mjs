import { spawn } from "node:child_process";
import { readdir, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const prebuilt = process.argv.slice(2).includes("--prebuilt");
if (process.argv.slice(2).some((argument) => argument !== "--prebuilt")) throw new Error("Only --prebuilt is supported; individual tests can be run with node --test.");
async function run(command, args) {
  const child = spawn(command, args, { stdio: "inherit", env: process.env });
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => signal ? reject(new Error(`Terminated by ${signal}`)) : resolve(code)); });
  if (code !== 0) { process.exitCode = code; return false; }
  return true;
}
process.env.E2E_ARTIFACT_DIR ??= resolve("test-results/e2e");
await mkdir(process.env.E2E_ARTIFACT_DIR, { recursive: true });
if (prebuilt || await run("npm", ["run", "build"])) {
  const tests = (await readdir("tests/e2e")).filter((file) => file.endsWith(".test.mjs")).sort().map((file) => `tests/e2e/${file}`);
  if (!tests.length) throw new Error("No browser tests found");
  await run(process.execPath, ["--test", "--test-concurrency=1", ...tests]);
}
