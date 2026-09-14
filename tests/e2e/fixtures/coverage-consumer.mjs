/** Test double for the missing P03 command contract. Never wired into production package.json. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { fixture: { type: "string" }, document: { type: "string" }, write: { type: "boolean" } } });
assert.ok(values.fixture && values.document, "The isolated consumer requires explicit fixture and document paths");
const fixture = JSON.parse(await readFile(values.fixture, "utf8"));
const expected = "Fixture only; not a formal P03 coverage document.\n\n" + fixture.cities.flatMap((city) => city.guides.map((guide) => `${city.id}/${guide.year}/${guide.id}: ${fixture.datasets[guide.dataPath].length}`)).join("\n") + "\n";
if (values.write) await writeFile(values.document, expected);
else assert.equal(await readFile(values.document, "utf8"), expected, "STALE_COVERAGE: isolated P03 command consumer detected a stale derived table");
console.log("PASS isolated coverage consumer; formal P03 catalog/coverage validation remains pending");
