import type { Nodes, Root } from "mdast";

type Resolve = (target: string, image: boolean) => string | undefined;

function wikiText(value: string, resolve: Resolve): Nodes[] {
  const result: Nodes[] = [];
  let offset = 0;
  for (const match of value.matchAll(/(!?)\[\[([^\]\n]+)\]\]/g)) {
    const [target, alias] = match[2].split("|", 2);
    const image = !!match[1] && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(target);
    const url = resolve(target.trim(), image);
    if (!url) continue;
    if (match.index > offset) result.push({ type: "text", value: value.slice(offset, match.index) });
    if (image) {
      const width = /^\d+$/.test(alias ?? "") ? Math.min(2000, Number(alias)) : undefined;
      result.push({ type: "image", url, alt: width ? target : alias ?? target,
        ...(width ? { data: { hProperties: { width } } } : {}) });
    } else {
      result.push({ type: "link", url, children: [{ type: "text", value: alias ?? target.split("/").at(-1)!.replace(/\.md$/i, "") }] });
    }
    offset = match.index + match[0].length;
  }
  if (offset < value.length) result.push({ type: "text", value: value.slice(offset) });
  return result;
}

// Transform text nodes only: JavaScript arrays, inline code and fences stay intact.
export function remarkObsidian({ resolve }: { resolve: Resolve }) {
  function transform(node: Nodes) {
    if (!("children" in node) || node.type === "link") return;
    const children = node.children as Nodes[];
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (child.type !== "text") { transform(child); continue; }
      const replacements = wikiText(child.value, resolve);
      children.splice(index, 1, ...replacements);
      index += replacements.length - 1;
    }
  }
  return (tree: Root) => transform(tree);
}
