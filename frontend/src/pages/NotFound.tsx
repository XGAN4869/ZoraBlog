import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <main className="not-found shell">
      <span className="section-kicker">404 / PAGE NOT FOUND</span>
      <h1>这页还没写下。</h1>
      <p>回到首页，继续探索已经记录的内容。</p>
      <Button asChild>
        <Link to="/">
          返回首页
          <ArrowRight />
        </Link>
      </Button>
    </main>
  );
}
