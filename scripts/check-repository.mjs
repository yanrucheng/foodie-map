import { execFileSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { staged: { type: "boolean" }, base: { type: "string" } } });
const limit = 1_000_000;
const failures = new Set();
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const runtimeOutput = /^(?:test-results\/|eval\/sessions\/[^/]+\/outputs\/|openspec\/changes\/[^/]+\/evidence\/)/u;
const checkPath = (path) => { if (runtimeOutput.test(path)) failures.add(`${path}: generated output belongs outside Git`); };
const objects = new Map();

// Read indexed bytes as well as working files: replacing a large staged file
// with a small working copy must not hide the large blob about to be committed.
for (const entry of git("ls-files", "--stage", "-z").split("\0").filter(Boolean)) {
  const [metadata, ...name] = entry.split("\t");
  const path = name.join("\t");
  if (values.staged) checkPath(path);
  objects.set(metadata.split(" ")[1], path);
}

if (!values.staged) {
  for (const path of git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean)) {
    let file;
    try { file = lstatSync(path); } catch (error) { if (error.code === "ENOENT") continue; throw error; }
    checkPath(path);
    if (file.isFile() && file.size > limit) failures.add(`${path}: ${file.size} bytes exceeds ${limit}`);
  }
}

// CI checks every new blob, including files added and deleted within a PR.
const base = values.base ?? process.env.REPOSITORY_BASE;
if (base && !/^0+$/u.test(base)) {
  if (!/^[a-f0-9]{40,64}$/iu.test(base)) throw new Error("Repository base must be a full Git object ID");
  for (const oid of git("rev-list", "--objects", "--no-object-names", `${base}..HEAD`, "--").trim().split("\n").filter(Boolean)) {
    if (!objects.has(oid)) objects.set(oid, `history object ${oid}`);
  }
}

if (objects.size) {
  const sizes = execFileSync("git", ["cat-file", "--batch-check"], { input: [...objects.keys()].join("\n") + "\n", encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  for (const line of sizes.trim().split("\n")) {
    const [oid, type, size] = line.split(" ");
    if (type === "blob" && Number(size) > limit) failures.add(`${objects.get(oid)}: ${size} bytes exceeds ${limit}`);
  }
}

if (failures.size) {
  console.error([...failures].join("\n"));
  process.exitCode = 1;
} else console.log(`Repository size and output policy passed (${limit}-byte limit).`);
