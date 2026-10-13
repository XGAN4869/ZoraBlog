import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Site } from "@/layouts/Site";
import { Home } from "@/pages/Home";
import { Blog } from "@/pages/Blog";
import { ArticlePage } from "@/pages/ArticlePage";
import { NotFound } from "@/pages/NotFound";
import "./App.css";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={250}>
          <BrowserRouter>
            <Site>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/login" element={<Navigate replace to="/" />} />
                <Route path="/register" element={<Navigate replace to="/" />} />
                <Route path="/articles/:slug" element={<ArticlePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Site>
          </BrowserRouter>
        </TooltipProvider>
      </MotionConfig>
      </AuthProvider>
    </ThemeProvider>
  );
}
