import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <main className="not-found shell">
      <h1>这页还没写下。</h1>
      <Button asChild>
        <Link to="/">
          返回首页
          <ArrowRight />
        </Link>
      </Button>
    </main>
  );
}
