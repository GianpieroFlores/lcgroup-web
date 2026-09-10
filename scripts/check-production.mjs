import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';

const root = resolve('dist');
const errors = [];
const files = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(root);
const htmlFiles = files.filter(path => path.endsWith('.html'));
let images = 0;
for (const path of htmlFiles) {
  const html = await readFile(path, 'utf8');
  const label = path.slice(root.length);
  for (const tag of ['title', 'h1']) {
    if ((html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length !== 1) errors.push(`${label}: expected one ${tag}`);
  }
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(match[1]); } catch { errors.push(`${label}: invalid JSON-LD`); }
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    images++;
    if (!/\balt\s*=/.test(match[0])) errors.push(`${label}: image without alt`);
  }
  for (const match of html.matchAll(/\b(?:src|href)="([^"#]+)"/gi)) {
    const value = match[1].split(/[?#]/)[0];
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    const target = join(root, decodeURIComponent(value));
    try {
      const info = await stat(target);
      if (info.isDirectory()) await stat(join(target, 'index.html'));
    } catch { errors.push(`${label}: missing local resource ${value}`); }
  }
}
for (const path of files.filter(path => extname(path) === '.css')) {
  const css = await readFile(path, 'utf8');
  for (const match of css.matchAll(/url\(["']?(\/assets\/[^)'"?#]+)/g)) {
    try { await stat(join(root, decodeURIComponent(match[1]))); }
    catch { errors.push(`Missing CSS asset: ${match[1]}`); }
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join('\n'));
  process.exitCode = 1;
} else console.log(`Production audit OK: ${htmlFiles.length} HTML files, ${images} image elements, local links/assets and JSON-LD validated.`);
