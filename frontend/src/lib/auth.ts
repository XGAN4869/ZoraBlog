import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/api";

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
