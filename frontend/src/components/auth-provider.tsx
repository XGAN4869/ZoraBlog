import { useEffect, useRef, useState, type ReactNode } from "react";
import { AuthContext } from "@/lib/auth";
import { authApi, type AuthUser } from "@/lib/api";

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

  async function logout() {
    revision.current++;
    await authApi.logout();
    setUser(null);
    setReady(true);
  }

  return <AuthContext.Provider value={{ user, ready, logout }}>{children}</AuthContext.Provider>;
}
