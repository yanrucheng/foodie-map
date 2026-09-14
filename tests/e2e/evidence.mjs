import { test as nodeTest } from "node:test";
import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const active = new AsyncLocalStorage();
const artifactRoot = () => resolve(process.env.E2E_ARTIFACT_DIR ?? "test-results/e2e");

/** Every test keeps its first failure, including pages closed by a finally block. No retries. */
export function test(name, ...arguments_) {
  const run = arguments_.pop();
  const options = arguments_.shift() ?? {};
  return nodeTest(name, { timeout: 120_000, ...options }, async (context) => {
    const directory = await mkdtemp(join(tmpdir(), "foodie-e2e-evidence-"));
    const state = { name, directory, sessions: 0 };
    try {
      return await active.run(state, () => run(context));
    } catch (error) {
      await writeFile(join(directory, "failure.json"), JSON.stringify({ scenario: name, error: String(error.stack ?? error), node: process.version, capturedAt: new Date().toISOString(), sessions: state.sessions }, null, 2) + "\n");
      const target = join(artifactRoot(), "failures", `${new Date().toISOString().replace(/[:.]/gu, "-")}-${name.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 100)}`);
      await mkdir(resolve(target, ".."), { recursive: true });
      await rename(directory, target);
      console.error(`First failure evidence: ${target}`);
      throw error;
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

export function observedSession({ page, close, errors = [], consoleErrors = [], requests = [], browser, outDir, buildMetadata }) {
  const state = active.getStore();
  const index = state ? ++state.sessions : 0;
  let closed = false;
  return async () => {
    if (closed) return;
    closed = true;
    try {
      if (state) {
        if (page.isClosed()) page = page.context?.().pages().at(-1) ?? page;
        const observation = await page.evaluate(() => ({ url: location.href, title: document.title,
          dataset: document.querySelector(".dataset-status")?.dataset, status: document.querySelector(".dataset-status")?.textContent,
          detail: document.querySelector(".mobile-popup-card, .leaflet-popup-content")?.textContent,
          viewport: { width: innerWidth, height: innerHeight }, online: navigator.onLine,
        })).catch((error) => ({ unavailable: String(error) }));
        const build = outDir ? await readFile(join(outDir, "release.json"), "utf8").then(JSON.parse).catch(() => buildMetadata) : browser?.p07BuildMetadata ?? buildMetadata ?? null;
        let version;
        try { version = await browser?.version(); } catch { version = buildMetadata?.browserVersion ?? browser?.p07BuildMetadata?.browserVersion ?? "browser disconnected"; }
        await writeFile(join(state.directory, `session-${index}.json`), JSON.stringify({ scenario: state.name, browser: version, observation, errors, consoleErrors, requests, build }, null, 2) + "\n");
        await page.screenshot({ path: join(state.directory, `session-${index}.png`) }).catch(async (error) => writeFile(join(state.directory, `session-${index}-screenshot-error.txt`), String(error)));
      }
    } finally { await close(); }
  };
}
