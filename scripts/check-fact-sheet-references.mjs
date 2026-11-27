import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";

const directory = new URL("../src/data/factSheets/", import.meta.url);
const manifest = new URL("../dist/verified-fact-sheet-references.json", import.meta.url);
await rm(manifest, { force: true });
const checked = new Set();
let failed = false;

for (const name of (await readdir(directory, { recursive: true })).filter((file) => file.endsWith(".json"))) {
  const sheet = JSON.parse(await readFile(new URL(name.replaceAll("\\", "/"), directory), "utf8"));
  if (sheet.references === undefined) continue;
  if (!Array.isArray(sheet.references)) throw new Error(`${name}: references must be an array`);
  for (const reference of sheet.references) {
    try {
      const url = new URL(reference.url);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("Expected a public HTTPS URL");
      if (checked.has(url.href)) continue;
      const response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      checked.add(url.href);
      console.log(`Checked ${url.href}`);
    } catch (error) {
      failed = true;
      console.error(`${name}: ${reference?.url ?? "(missing URL)"}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  // A standalone check can run before Vite creates dist.
  await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
  await writeFile(manifest, JSON.stringify([...checked]));
}
