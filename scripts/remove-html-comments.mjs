import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
let count = 0;

async function clean(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await clean(path);
    } else if (entry.name.endsWith(".html")) {
      const html = await readFile(path, "utf8");
      const output = html.replace(/<!--[\s\S]*?-->/g, "");
      if (output !== html) {
        await writeFile(path, output);
        count++;
      }
    }
  }
}

await clean(dist);
console.log(`Comentarios HTML eliminados en ${count} archivos de producción.`);
