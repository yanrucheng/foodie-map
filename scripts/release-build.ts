import { readFile, readdir, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { Plugin } from "vite";
import { catalogCities } from "../src/data/catalog.ts";
import { validateCatalogRoot } from "./catalog.ts";
import { guideTypeSchema } from "../src/data/contract.ts";
import { taxonomyBundleSchema } from "../src/data/taxonomy.ts";
import { validateDataset } from "../src/data/validation.ts";
import type { ReleaseManifest, ReleaseResource } from "../src/data/release.ts";
import { fileManifest, sha256, sourceIdentity } from "./release-artifact.ts";

/** P03 consumer boundary. The release layer derives bytes/identities; it owns no city registry. */
export interface ReleaseDiscovery {
  /** Isolated rehearsals point to real catalog/files, using the production parser and validator. */
  dataRoot?: string;
}

export function releaseBuild(discovery?: ReleaseDiscovery): Plugin {
  let root = process.cwd();
  let release: ReleaseManifest;
  let source: Awaited<ReturnType<typeof sourceIdentity>>;
  let disabled = false;
  const bytes = new Map<string, Buffer>();
  const resources: Record<string, ReleaseResource> = {};
  return {
    name: "foodie-release", enforce: "post", apply: "build",
    async config(config) {
      // The existing UI suites isolate the discovery/HTTP boundary. Full release tests never set this.
      disabled = config.define?.__FOODIE_RELEASE__ === "null";
      if (disabled) return;
      root = resolve(config.root ?? process.cwd());
      const dataRoot = discovery?.dataRoot ?? join(root, "public/data");
      const validation = validateCatalogRoot(dataRoot);
      if (!validation.valid || !validation.catalog) throw new Error(JSON.stringify(validation.diagnostics, null, 2));
      const input = { cities: catalogCities(validation.catalog), provider: "/data/catalog.json", catalogPath: "/data/catalog.json" };
      source = await sourceIdentity(root);
      const read = async (path: string) => {
        if (!path.startsWith("/data/") || path.includes("..") || path.includes("?") || path.includes("#")) throw new Error(`Invalid discovery resource path: ${path}`);
        return readFile(join(dataRoot, path.replace(/^\/data\//u, "")));
      };
      const add = (path: string, body: Buffer, kind: ReleaseResource["kind"], identity?: string) => {
        const hash = sha256(body);
        if (resources[path] && (resources[path].sha256 !== hash || resources[path].identity !== identity)) throw new Error(`Discovery reuses ${path} for different dataset identities`);
        const url = `/_foodie/data/${hash}${path}`;
        resources[path] = { url, sha256: hash, kind, ...(identity ? { identity } : {}) };
        bytes.set(url, body);
      };
      for (const city of input.cities) {
        const { taxonomyPath, mappingsPath } = city;
        const taxonomyBytes = await read(taxonomyPath), mappingsBytes = await read(mappingsPath);
        const bundle = taxonomyBundleSchema.parse({ taxonomy: JSON.parse(taxonomyBytes.toString()), mappings: JSON.parse(mappingsBytes.toString()) });
        if (bundle.taxonomy.city !== city.id) throw new Error(`Discovery/taxonomy city mismatch: ${city.id}`);
        add(taxonomyPath, taxonomyBytes, "taxonomy");
        add(mappingsPath, mappingsBytes, "mappings");
        for (const guide of city.guides) {
          const body = await read(guide.dataPath);
          const validation = validateDataset(JSON.parse(body.toString()), { city: city.id, guide_type: guideTypeSchema.parse(guide.id), edition_year: guide.year, spatial: city.spatialContext, ...bundle }, guide.dataPath);
          const errors = validation.diagnostics.filter((item) => item.severity === "error");
          if (errors.length) throw new Error(JSON.stringify(errors, null, 2));
          add(guide.dataPath, body, "restaurants", `${city.id}/${guide.year}/${guide.id}`);
        }
      }
      if (input.catalogPath) {
        const catalog = await read(input.catalogPath);
        JSON.parse(catalog.toString()); // P03 owns catalog semantics; malformed JSON is never a valid release resource.
        add(input.catalogPath, catalog, "catalog");
      }
      const discoverySha256 = sha256(JSON.stringify(input.cities));
      const dataRevision = sha256(JSON.stringify({ discoverySha256, resources }));
      const version = (await readFile(join(root, "VERSION"), "utf8")).trim();
      release = { version, buildId: sha256(JSON.stringify({ source: source.sha256, dataRevision, version })), sourceSha256: source.sha256, lockSha256: source.lockSha256!, dataRevision, discovery: { provider: input.provider, sha256: discoverySha256 }, resources };
      return { define: { __FOODIE_RELEASE__: JSON.stringify(release) } };
    },
    generateBundle() {
      if (disabled) return;
      for (const [url, body] of bytes) this.emitFile({ type: "asset", fileName: url.slice(1), source: body });
    },
    async writeBundle(options, bundle) {
      if (disabled) return;
      const outDir = resolve(root, options.dir ?? "dist");
      // Vite copies Finder metadata from public/. It is not an input or a deployable asset.
      for (const path of Object.keys(await fileManifest(outDir))) {
        if (path.split("/").includes(".DS_Store")) await rm(join(outDir, path));
      }
      const shell: Record<string, string> = {};
      for (const name of Object.keys(bundle)) {
        if (name.startsWith("_foodie/data/")) continue;
        // Vite's import-analysis plugin finalizes lazy preload URLs after generateBundle hooks.
        shell[`/${name}`] = sha256(await readFile(join(outDir, name)));
      }
      for (const entry of await readdir(join(root, "public/icons"))) {
        if (entry === ".DS_Store") continue;
        shell[`/icons/${entry}`] = sha256(await readFile(join(root, "public/icons", entry)));
      }
      shell["/manifest.json"] = sha256(await readFile(join(root, "public/manifest.json")));
      // The release descriptor is generated provenance, never a second hand-maintained catalog.
      const descriptor = JSON.stringify({ ...release, sourceFiles: source.files, shell }, null, 2) + "\n";
      shell["/release.json"] = sha256(descriptor);
      await writeFile(join(outDir, "release.json"), descriptor);
      const worker = await readFile(join(root, "public/sw.js"), "utf8");
      await writeFile(join(outDir, "sw.js"), worker.replace("/* __FOODIE_WORKER_RELEASE__ */ null", JSON.stringify({ ...release, shell })));
    },
  };
}
