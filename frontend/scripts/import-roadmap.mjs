import { readFile, readdir, mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

const sourceRoot = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Usage: node scripts/import-roadmap.mjs <notes-directory> [vault-directory]");
const vaultRoot = path.resolve(process.argv[3] ?? path.dirname(sourceRoot));
const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const contentRoot = path.join(frontendRoot, "src/content/articles/roadmap");
const assetRoot = path.join(frontendRoot, "public/note-assets/roadmap");
const parser = remark().use(remarkGfm);
const publicationDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date()).replaceAll("-", ".");
const collator = new Intl.Collator("zh-CN", { numeric: true });
const slash = (value) => value.split(path.sep).join("/");

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(file));
    else if (entry.isFile()) result.push(file);
  }
  return result.sort((a, b) => collator.compare(slash(a), slash(b)));
}

function text(node) {
  if (node.type === "image") return "";
  if ("value" in node) return node.value;
  return node.children?.map(text).join("") ?? "";
}

function category(relative) {
  if (relative.startsWith("TypeScript/")) return "TypeScript";
  if (relative.startsWith("浏览器/")) return "浏览器";
  if (relative.startsWith("Node/")) return "Node.js";
  if (relative.includes("/css/") || relative.endsWith("css 调性提示词.md")) return "CSS";
  if (relative.includes("单元测试/") || relative.startsWith("项目搭建必备/")) return "工程实践";
  if (/更加具体的响应式|生命周期|composables|路由|服务端SSR/.test(relative)) return "Vue";
  return "JavaScript";
}

function wikiImages(node, names) {
  if (node.type === "text") {
    for (const match of node.value.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) {
      if (/\.(png|jpe?g|gif|webp|svg|avif)$/i.test(match[1])) names.add(match[1]);
    }
  }
  node.children?.forEach((child) => wikiImages(child, names));
}

async function copy(file, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(file, destination);
}

const files = await walk(sourceRoot);
const notes = [];
const empty = [];
const assets = [];
const imageReferences = new Set();

for (const file of files) {
  const relative = slash(path.relative(sourceRoot, file));
  if (path.extname(file).toLowerCase() !== ".md") {
    await copy(file, path.join(assetRoot, relative));
    assets.push({ source: `roadmap/${relative}`, url: `/note-assets/roadmap/${relative.split("/").map(encodeURIComponent).join("/")}` });
    continue;
  }
  await copy(file, path.join(contentRoot, relative));
  const markdown = await readFile(file, "utf8");
  if (!markdown.trim()) { empty.push(relative); continue; }
  const tree = parser.parse(markdown);
  wikiImages(tree, imageReferences);
  const firstHeading = tree.children.find((node) => node.type === "heading" && node.depth === 1);
  const title = (firstHeading ? text(firstHeading).trim() : "") || path.basename(file, ".md");
  const paragraph = tree.children.find((node) => node.type === "paragraph" && text(node).trim() && !text(node).includes("![["));
  const summary = paragraph ? text(paragraph).trim().replace(/\s+/g, " ").slice(0, 150) : "";
  notes.push({
    file: `roadmap/${relative}`,
    source: `roadmap/${relative}`,
    slug: `roadmap-${createHash("sha256").update(relative).digest("hex").slice(0, 12)}`,
    title,
    summary,
    category: category(relative),
    date: publicationDate,
  });
}

// Read only image attachments referenced by this directory, not other vault notes.
const vaultFiles = await walk(vaultRoot);
const missingAssets = [];
for (const reference of imageReferences) {
  const candidates = vaultFiles.filter((file) => path.basename(file) === path.basename(reference));
  const preferred = path.resolve(vaultRoot, reference);
  const source = candidates.includes(preferred) ? preferred : candidates.length === 1 ? candidates[0] : undefined;
  if (!source) { missingAssets.push(reference); continue; }
  const relative = `_attachments/${path.basename(source)}`;
  await copy(source, path.join(assetRoot, relative));
  assets.push({ source: `roadmap/${relative}`, url: `/note-assets/roadmap/${relative.split("/").map(encodeURIComponent).join("/")}` });
}

const manifest = { notes, empty, assets, missingAssets };
await writeFile(path.join(frontendRoot, "src/content/roadmap.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ imported: notes.length, empty: empty.length, assets: assets.length, missingAssets }, null, 2));
