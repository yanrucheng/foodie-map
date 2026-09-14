/** Replaced by the build with hashes of P02-validated bytes and the complete application shell. */
const RELEASE = /* __FOODIE_WORKER_RELEASE__ */ null;
const PREFIX = "foodie-map:v3:";
const SHELL = `${PREFIX}shell:${RELEASE?.buildId}`;
const DATA = `${PREFIX}data:${RELEASE?.buildId}`;
const HISTORY = `${PREFIX}history`;
const HISTORY_URL = "/_foodie/installed";
const owned = (name) => /^foodie-map:v3:(?:shell|data):[a-f0-9]{64}$/u.test(name);
const resourceByUrl = new Map(Object.values(RELEASE?.resources ?? {}).map((resource) => [resource.url, resource]));
const NETWORK_TIMEOUT_MS = 4000;

async function valid(response, hash, json = false) {
  if (!response?.ok || response.type === "opaque") return false;
  if (json && !/^application\/(?:[a-z.+-]*\+)?json(?:;|$)/iu.test(response.headers.get("content-type") ?? "")) return false;
  const body = await response.clone().arrayBuffer();
  const actual = [...new Uint8Array(await crypto.subtle.digest("SHA-256", body))].map((value) => value.toString(16).padStart(2, "0")).join("");
  if (actual !== hash) return false;
  if (json) { try { JSON.parse(new TextDecoder().decode(body)); } catch { return false; } }
  return true;
}
async function verifiedNetwork(request, hash, json = false) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(request, { cache: "no-store", signal: controller.signal });
        if (!response.ok || response.type === "opaque") return null;
        // Include body completion in the deadline, not just response headers.
        const complete = new Response(await response.arrayBuffer(), { status: response.status, statusText: response.statusText, headers: response.headers });
        return await valid(complete, hash, json) ? complete : null;
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("Release network deadline exceeded")); }, NETWORK_TIMEOUT_MS); }),
    ]);
  } finally { clearTimeout(timer); }
}
function delivered(response, state, offline = false) {
  const headers = new Headers(response.headers);
  headers.set("x-foodie-build", RELEASE.buildId);
  headers.set("x-foodie-cache", state);
  headers.set("x-foodie-network", offline ? "unavailable" : "available");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
const unavailable = (offline = false) => new Response(JSON.stringify({ error: "Matching release resource unavailable; connect and retry." }), { status: 503, headers: { "content-type": "application/json", "cache-control": "no-store", "x-foodie-network": offline ? "unavailable" : "available" } });

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    if (!RELEASE) throw new Error("Use the generated production worker, not public/sw.js directly");
    // Verify the whole candidate before modifying any existing cache for this build.
    const responses = await Promise.all(Object.entries(RELEASE.shell).map(async ([path, hash]) => {
      const response = await verifiedNetwork(path, hash);
      if (!response) throw new Error(`Incomplete or mixed release shell: ${path}`);
      return [path, response];
    }));
    const cache = await caches.open(SHELL);
    await Promise.all(responses.map(([path, response]) => cache.put(path, response)));
  })());
  // Keep existing pages on their own build. Activation waits until they have all closed.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const history = await caches.open(HISTORY);
    const previous = await history.match(HISTORY_URL);
    const builds = previous ? await previous.json() : [];
    const retained = [RELEASE.buildId, ...builds.filter((id) => id !== RELEASE.buildId)].slice(0, 2);
    await history.put(HISTORY_URL, new Response(JSON.stringify(retained), { headers: { "content-type": "application/json" } }));
    await Promise.all((await caches.keys()).filter((name) => name === "foodie-map-shell-v2" || (owned(name) && !retained.some((id) => name.endsWith(`:${id}`)))).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function dataset(request, resource) {
  const cache = await caches.open(DATA);
  let offline = false;
  try {
    const response = await verifiedNetwork(request, resource.sha256, true);
    // The hash was generated only after shared P02 contract + dataset identity validation.
    if (response) {
      await cache.put(resource.url, response.clone());
      return delivered(response, "network");
    }
  } catch { offline = true; }
  // Sharing unchanged bytes across the retained releases is safe only after digest validation.
  const names = [DATA, ...(await caches.keys()).filter((name) => name !== DATA && owned(name) && name.startsWith(`${PREFIX}data:`))];
  for (const name of names) {
    const response = await (await caches.open(name)).match(resource.url);
    if (await valid(response, resource.sha256, true)) {
      if (name !== DATA) await cache.put(resource.url, response.clone());
      return delivered(response, "hit", offline);
    }
  }
  return unavailable(offline);
}

async function shell(path) {
  const response = await (await caches.open(SHELL)).match(path);
  if (await valid(response, RELEASE.shell[path])) return delivered(response, "hit");
  // Never fall back from a missing JS/CSS resource to index.html.
  try {
    const fetched = await verifiedNetwork(path, RELEASE.shell[path]);
    if (fetched) {
      await (await caches.open(SHELL)).put(path, fetched.clone());
      return delivered(fetched, "network");
    }
  } catch { /* Keep a failed repair explicit. */ }
  return unavailable();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (!RELEASE || request.method !== "GET" || url.origin !== self.location.origin) return;
  let work;
  if (resourceByUrl.has(url.pathname)) work = dataset(request, resourceByUrl.get(url.pathname));
  else if (url.pathname in RELEASE.shell) work = shell(url.pathname);
  else if (url.pathname.startsWith("/_foodie/data/")) work = Promise.resolve(unavailable());
  else if (request.mode === "navigate" && !url.pathname.startsWith("/data/") && !/\.[^/]+$/u.test(url.pathname)) work = shell("/index.html");
  else return; // External tiles and arbitrary URLs have no place in the application caches.
  event.respondWith(work);
  // All writes, including fallback promotion, belong to the fetch event's lifetime.
  event.waitUntil(work.then(() => undefined));
});
