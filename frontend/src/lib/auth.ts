import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/api";

// 开发环境默认启用；静态线上版本需接入后端后再显式开启。
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_AUTH_ENABLED !== "false");

export type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}
