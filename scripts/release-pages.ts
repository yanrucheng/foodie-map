import assert from "node:assert/strict";
import { appendFile, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

type Run = {
  id: number;
  run_attempt: number;
  path: string;
  head_branch: string;
  head_sha: string;
  conclusion: string;
  event: string;
  repository: { full_name: string };
  head_repository: { full_name: string };
};

type Artifact = { id: number; name: string; expired: boolean };

export function rollbackRelease(run: Run, jobs: { name: string; conclusion: string }[], artifacts: Artifact[], repository: string) {
  assert.equal(run.repository.full_name, repository, "Rollback must come from this repository");
  assert.equal(run.head_repository.full_name, repository, "Fork artifacts cannot be deployed");
  assert.equal(run.path, ".github/workflows/deploy.yml", "Rollback must come from the release workflow");
  assert.equal(run.head_branch, "main", "Only main releases can be restored");
  assert.ok(["push", "workflow_dispatch"].includes(run.event), "PR artifacts cannot be deployed");
  assert.equal(run.conclusion, "success", "Rollback requires a successful original run");
  assert.ok(jobs.some((job) => job.name === "Deploy GitHub Pages" && job.conclusion === "success"), "Select a release that passed deployment and online verification");
  assert.match(run.head_sha, /^[a-f0-9]{40}$/u);
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0 && Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0);
  // Re-running only failed jobs keeps the earlier successful quality job's artifact.
  const bundle = artifacts.filter((artifact) => /^release-[1-9][0-9]*$/u.test(artifact.name) && Number(artifact.name.slice(8)) <= run.run_attempt)
    .sort((a, b) => Number(b.name.slice(8)) - Number(a.name.slice(8)))[0];
  assert.ok(bundle && !bundle.expired, "Original release bundle is missing or expired; select a retained release");
  assert.ok(Number.isSafeInteger(bundle.id) && bundle.id > 0);
  return { "run-id": String(run.id), "artifact-id": String(bundle.id), "expected-head": run.head_sha };
}

export function pagesHostname(cname: string) {
  const hostname = cname.trim();
  assert.match(hostname, /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/u, "CNAME must contain one DNS hostname");
  return hostname;
}

export async function configurePages(hostname: string, api: (path: string) => Promise<unknown>) {
  type Pages = { cname: string; build_type: string; https_enforced: boolean };
  const current = await api("pages") as Pages;
  assert.equal(current.cname, hostname, "Pages custom domain must match the artifact CNAME");
  assert.equal(current.build_type, "workflow", "Pages source must be GitHub Actions");
  assert.equal(current.https_enforced, true, "Enable Enforce HTTPS once in Settings > Pages using a repository administrator; the deployment token cannot change repository settings");
  return `https://${hostname}/`;
}

async function main() {
  const { positionals } = parseArgs({ allowPositionals: true });
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  assert.match(repository, /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/u);
  assert.equal(process.env.GITHUB_REF, "refs/heads/main", "Publishing and rollback only run from main");
  const token = process.env.GH_TOKEN;
  assert.ok(token, "GH_TOKEN with actions:read and pages:write is required");
  const api = async (path: string) => {
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub ${path}: HTTP ${response.status}: ${await response.text()}`);
    return response.status === 204 ? null : response.json();
  };
  let outputs: Record<string, string>;
  if (positionals[0] === "prepare") {
    const current = await api("commits/main") as { sha: string };
    assert.equal(current.sha, process.env.GITHUB_SHA, "Run the current main workflow; an older run must not overwrite a newer release");
    if (process.env.RELEASE_ACTION === "rollback") {
      const id = process.env.ROLLBACK_RUN_ID ?? "";
      assert.match(id, /^[1-9][0-9]*$/u, "rollback-run-id must be a GitHub Actions run ID");
      const run = await api(`actions/runs/${id}`) as Run;
      const { jobs } = await api(`actions/runs/${id}/jobs?filter=latest&per_page=100`) as { jobs: { name: string; conclusion: string }[] };
      const { artifacts } = await api(`actions/runs/${id}/artifacts?per_page=100`) as { artifacts: Artifact[] };
      outputs = rollbackRelease(run, jobs, artifacts, repository);
    } else {
      assert.equal(process.env.RELEASE_ACTION, "deploy");
      const artifactId = process.env.RELEASE_ARTIFACT_ID ?? "";
      assert.match(artifactId, /^[1-9][0-9]*$/u, "The successful quality job must supply its immutable artifact ID");
      outputs = { "run-id": process.env.GITHUB_RUN_ID!, "artifact-id": artifactId, "expected-head": process.env.GITHUB_SHA! };
    }
  } else if (positionals[0] === "configure") {
    const hostname = pagesHostname(await readFile("release-bundle/dist/CNAME", "utf8"));
    outputs = { url: await configurePages(hostname, api) };
  } else throw new Error("Expected prepare or configure");
  assert.ok(process.env.GITHUB_OUTPUT, "Run this command in the deployment job");
  await appendFile(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(""));
  console.log(JSON.stringify(outputs));
}

if (import.meta.main) main().catch((error) => { console.error(error); process.exitCode = 1; });
