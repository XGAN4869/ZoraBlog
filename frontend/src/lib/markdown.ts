import { remark } from "remark";
import remarkGfm from "remark-gfm";
import type { Heading, Nodes, Root } from "mdast";

const parser = remark().use(remarkGfm);

function textOf(node: Nodes): string {
  if (node.type === "image") return node.alt ?? "";
  if (node.type === "code" && node.lang === "drawio") return "";
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(textOf).join(node.type === "root" ? "\n" : "");
  return "";
}

function visitHeadings(node: Nodes, visit: (heading: Heading) => void) {
  if (node.type === "heading" && textOf(node).trim()) visit(node);
  if ("children" in node) node.children.forEach((child) => visitHeadings(child, visit));
}

function removeDocumentTitle(tree: Root, title?: string) {
  const first = tree.children[0];
  if (title && first?.type === "heading" && first.depth === 1 && textOf(first).trim() === title) {
    tree.children.shift();
  }
}

export function markdownDocument(markdown: string, title?: string) {
  const tree = parser.parse(markdown);
  removeDocumentTitle(tree, title);
  const outline: { heading: string; level: number }[] = [];
  visitHeadings(tree, (node) => outline.push({ heading: textOf(node).trim(), level: node.depth }));
  const text = textOf(tree);
  const chinese = text.match(/\p{Script=Han}/gu)?.length ?? 0;
  const words = text.match(/[a-zA-Z0-9]+/g)?.length ?? 0;
  return { outline, text, readTime: Math.max(1, Math.ceil(chinese / 400 + words / 200)) };
}

// The outline and renderer use the same AST traversal, including nested headings.
export function remarkArticleHeadings({ title }: { title?: string } = {}) {
  return (tree: Root) => {
    removeDocumentTitle(tree, title);
    let hasH1 = false;
    visitHeadings(tree, (node) => { if (node.depth === 1) hasH1 = true; });
    let index = 0;
    visitHeadings(tree, (node) => {
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: `section-${index++}` } };
      node.depth = Math.min(6, Math.max(2, node.depth + (hasH1 ? 1 : 0))) as Heading["depth"];
    });
  };
}
