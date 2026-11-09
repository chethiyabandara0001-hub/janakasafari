import { copyFile, cp, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const pages = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name);

if (!pages.includes("index.html")) {
  throw new Error("index.html must be in the project root.");
}

const staging = await mkdtemp(join(root, ".safari-build-"));
try {
  for (const page of pages) {
    await copyFile(join(root, page), join(staging, page));
  }
  await cp(join(root, "assets"), join(staging, "assets"), { recursive: true });

  await rm(output, { recursive: true, force: true });
  await rename(staging, output);
  console.log(`Copied ${pages.length} pages and assets to dist/.`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
