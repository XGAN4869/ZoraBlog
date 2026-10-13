export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

export type AuthUser = { id: number; username: string; email: string };
export type LoginInput = { username: string; password: string; remember: boolean };
export type RegisterInput = LoginInput & { email: string };

function userResult(data: { user: AuthUser }) {
  const user = data?.user;
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0 || typeof user.username !== "string" || !user.username || typeof user.email !== "string") {
    throw new ApiError("登录状态异常，请重新尝试。");
  }
  return { user };
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = window.setTimeout(cancel, 12000);
  try {
    const response = await fetch(`/api${path}`, {
      ...init, credentials: "same-origin", cache: "no-store", signal: controller.signal,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
    });
    const body = await response.json().catch(() => null);
    if (!body || typeof body.code !== "number") throw new ApiError("暂时无法连接服务，请稍后重试。", response.status);
    if (!response.ok || body.code !== 0) throw new ApiError(typeof body.message === "string" ? body.message : "请求失败，请稍后重试。", response.status);
    return body.data as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError("暂时无法连接服务，请稍后重试。");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export const authApi = {
  session: (signal?: AbortSignal) => request<{ user: AuthUser | null }>("/session", {}, signal),
  login: (input: LoginInput) => request<{ user: AuthUser }>("/login", { method: "POST", body: JSON.stringify(input) }).then(userResult),
  register: (input: RegisterInput) => request<{ user: AuthUser }>("/register", { method: "POST", body: JSON.stringify(input) }).then(userResult),
  logout: () => request<null>("/logout", { method: "POST" }),
};
