import { Fragment, useEffect, useState, type CSSProperties } from "react";
import type { ThemedTokenWithVariants } from "shiki/types";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { IconAction } from "@/components/IconAction";

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [highlighted, setHighlighted] = useState<{ code: string; language: string; tokens: ThemedTokenWithVariants[][] } | null>(null);
  useEffect(() => {
    if (!language || /^(text|plaintext|plainttext|txt)$/i.test(language)) return;
    let current = true;
    import("@/lib/syntax-highlighter").then(({ highlightCode }) => highlightCode(code, language)).then((tokens) => {
      if (current && tokens) setHighlighted({ code, language, tokens });
    }).catch(() => { /* Plain code remains readable if a grammar cannot be loaded. */ });
    return () => { current = false; };
  }, [code, language]);
  const tokens = highlighted?.code === code && highlighted.language === language ? highlighted.tokens : undefined;
  const block = (
    <div className="code-block">
      <div>
        {language && <span className="code-language">{language}</span>}
        <IconAction label="复制代码" onClick={async () => {
          try { await navigator.clipboard.writeText(code); toast.success("代码已复制"); }
          catch { toast.error("复制失败，请手动选择代码"); }
        }}><Copy /></IconAction>
      </div>
      <pre><code className={language ? `language-${language}` : undefined} data-highlighted={!!tokens}>
        {tokens ? tokens.map((line, lineIndex) => <Fragment key={lineIndex}>
          {line.map((token, tokenIndex) => <span key={tokenIndex} className="syntax-token" style={{
            "--syntax-light": token.variants.light.color ?? "var(--foreground)",
            "--syntax-dark": token.variants.dark.color ?? "var(--foreground)",
          } as CSSProperties}>{token.content}</span>)}
          {lineIndex < tokens.length - 1 ? "\n" : null}
        </Fragment>) : code}
      </code></pre>
    </div>
  );
  return language === "drawio" ? <details className="diagram-source"><summary>Draw.io 图源</summary>{block}</details> : block;
}
