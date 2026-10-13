import { Copy } from "lucide-react";
import { toast } from "sonner";
import { IconAction } from "@/components/IconAction";

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const block = (
    <div className="code-block">
      <div>
        {language && <span className="code-language">{language}</span>}
        <IconAction label="复制代码" onClick={async () => {
          try { await navigator.clipboard.writeText(code); toast.success("代码已复制"); }
          catch { toast.error("复制失败，请手动选择代码"); }
        }}><Copy /></IconAction>
      </div>
      <pre><code className={language ? `language-${language}` : undefined}>{code}</code></pre>
    </div>
  );
  return language === "drawio" ? <details className="diagram-source"><summary>Draw.io 图源</summary>{block}</details> : block;
}
