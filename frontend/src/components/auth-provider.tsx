import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext } from "@/lib/auth";
import { authApi, type AuthUser, type LoginInput, type RegisterInput } from "@/lib/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const revision = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const initialRevision = revision.current;
    authApi.session(controller.signal).then((data) => {
      if (!controller.signal.aborted && revision.current === initialRevision) setUser(data.user);
    }).catch(() => {
      // A temporary outage doesn't turn a failed request into an authenticated session.
    }).finally(() => { if (!controller.signal.aborted) setReady(true); });
    return () => controller.abort();
  }, []);

  async function login(input: LoginInput) {
    revision.current++;
    const data = await authApi.login(input);
    setUser(data.user);
    setReady(true);
  }
  async function register(input: RegisterInput) {
    revision.current++;
    const data = await authApi.register(input);
    setUser(data.user);
    setReady(true);
  }
  async function logout() {
    revision.current++;
    await authApi.logout();
    setUser(null);
    setReady(true);
  }

  return <AuthContext.Provider value={{ user, ready, login, register, logout }}>{children}</AuthContext.Provider>;
}
