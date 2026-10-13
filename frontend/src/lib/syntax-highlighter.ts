import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { HighlighterCore, ThemedTokenWithVariants } from "shiki/types";

const languages = {
  javascript: () => import("shiki/langs/javascript.mjs").then((module) => module.default),
  typescript: () => import("shiki/langs/typescript.mjs").then((module) => module.default),
  tsx: () => import("shiki/langs/tsx.mjs").then((module) => module.default),
  vue: () => import("shiki/langs/vue.mjs").then((module) => module.default),
  go: () => import("shiki/langs/go.mjs").then((module) => module.default),
  css: () => import("shiki/langs/css.mjs").then((module) => module.default),
  html: () => import("shiki/langs/html.mjs").then((module) => module.default),
  json: () => import("shiki/langs/json.mjs").then((module) => module.default),
  bash: () => import("shiki/langs/bash.mjs").then((module) => module.default),
  dotenv: () => import("shiki/langs/dotenv.mjs").then((module) => module.default),
  markdown: () => import("shiki/langs/markdown.mjs").then((module) => module.default),
  mermaid: () => import("shiki/langs/mermaid.mjs").then((module) => module.default),
  xml: () => import("shiki/langs/xml.mjs").then((module) => module.default),
};
const aliases: Record<string, string> = { js: "javascript", jsx: "tsx", ts: "typescript", sh: "bash", shell: "bash", shellscript: "bash", md: "markdown", env: "dotenv", drawio: "xml" };
let instance: Promise<HighlighterCore> | undefined;
const loading = new Map<string, Promise<void>>();
const cache = new Map<string, ThemedTokenWithVariants[][]>();

function highlighter() {
  instance ??= createHighlighterCore({
    themes: [
      import("shiki/themes/github-light-default.mjs").then((module) => module.default),
      import("shiki/themes/github-dark-default.mjs").then((module) => module.default),
    ],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return instance;
}

export async function highlightCode(code: string, language: string) {
  const input = language.toLowerCase();
  const lang = aliases[input] ?? input;
  if (!Object.hasOwn(languages, lang)) return;
  const key = `${lang}\0${code}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const engine = await highlighter();
  if (!loading.has(lang)) loading.set(lang, engine.loadLanguage(languages[lang as keyof typeof languages]()));
  await loading.get(lang);
  const tokens = engine.codeToTokensWithThemes(code, { lang, themes: { light: "github-light-default", dark: "github-dark-default" } });
  // Keep recent snippets while reusing one grammar/theme engine for all articles.
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(key, tokens);
  return tokens;
}
