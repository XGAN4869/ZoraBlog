import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { IconAction } from "@/components/IconAction";
import { ShapeGrid } from "@/components/ShapeGrid";
import "./Login.css";

type FormErrors = { username?: string; email?: string; password?: string; confirm?: string; server?: string };

function destination(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/blog";
  const target = new URL(value, window.location.origin);
  if (target.origin !== window.location.origin || ["/login", "/register"].includes(target.pathname)) return "/blog";
  return target.pathname + target.search + target.hash;
}

export function Login({ mode = "login" }: { mode?: "login" | "register" }) {
  const registering = mode === "register";
  const { resolvedTheme } = useTheme();
  const { user, ready, login, register } = useAuth();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const nextErrors: FormErrors = {};
    if (!username.trim()) nextErrors.username = registering ? "请输入用户名" : "请输入用户名或邮箱";
    else if (registering && !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) nextErrors.username = "用户名需为 3–20 位字母、数字或下划线";
    if (registering && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254)) nextErrors.email = "请输入有效的邮箱地址";
    if (!password) nextErrors.password = "请输入密码";
    else if (registering && Array.from(password).length < 8) nextErrors.password = "密码至少需要 8 个字符";
    else if (new TextEncoder().encode(password).length > 72) nextErrors.password = "密码过长，请使用更短的密码";
    if (registering && password !== confirm) nextErrors.confirm = "两次输入的密码不一致";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    pending.current = true;
    setBusy(true);
    try {
      const input = { username: username.trim(), password, remember };
      if (registering) await register({ ...input, email: email.trim() });
      else await login(input);
      setPassword(""); setConfirm("");
      toast.success(registering ? "注册成功，欢迎加入！" : "登录成功，欢迎回来！");
    } catch (error) {
      setErrors({ server: error instanceof Error ? error.message : "暂时无法登录，请稍后重试。" });
    } finally { pending.current = false; setBusy(false); }
  }

  if (ready && user) return <Navigate replace to={destination(params.get("redirect"))} />;

  return (
    <main className="login-page">
      <ShapeGrid light={resolvedTheme === "light"} />
      <div className="grid-shade" />
      <div className="login-layout shell">
        <div className="login-intro">
          <h1>每一次记录，<br />都是新的<span>开始。</span></h1>
        </div>
        <motion.div className="login-form-area" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Link to="/" className="back-link"><ArrowLeft />返回首页</Link>
          <div className="login-heading">
            <h2>{registering ? "欢迎加入" : "欢迎回来"}<span className="blue-period">.</span></h2>
          </div>
          <form onSubmit={submit} noValidate aria-busy={busy}>
            {errors.server && <p className="auth-form-error" role="alert">{errors.server}</p>}
            <div className="form-field">
              <Label htmlFor="username">{registering ? "用户名" : "用户名或邮箱"}</Label>
              <Input id="username" autoComplete="username" placeholder={registering ? "你的用户名" : "用户名 / you@example.com"} value={username} onChange={(event) => setUsername(event.target.value)} maxLength={registering ? 20 : 254} aria-invalid={!!errors.username} aria-describedby={errors.username ? "username-error" : undefined} disabled={busy} />
              {errors.username && <p className="field-error" id="username-error">{errors.username}</p>}
            </div>
            {registering && <div className="form-field">
              <Label htmlFor="email">邮箱地址</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} disabled={busy} />
              {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
            </div>}
            <div className="form-field">
              <Label htmlFor="password">密码</Label>
              <div className="password-field">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} placeholder={registering ? "至少 8 个字符" : "请输入密码"} value={password} onChange={(event) => setPassword(event.target.value)} maxLength={72} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} disabled={busy} />
                <IconAction label={showPassword ? "隐藏密码" : "显示密码"} disabled={busy} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</IconAction>
              </div>
              {errors.password && <p className="field-error" id="password-error">{errors.password}</p>}
            </div>
            {registering && <div className="form-field">
              <Label htmlFor="confirm-password">确认密码</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" placeholder="再输入一次密码" value={confirm} onChange={(event) => setConfirm(event.target.value)} maxLength={72} aria-invalid={!!errors.confirm} aria-describedby={errors.confirm ? "confirm-error" : undefined} disabled={busy} />
              {errors.confirm && <p className="field-error" id="confirm-error">{errors.confirm}</p>}
            </div>}
            <div className="remember-row">
              <Checkbox id="remember" checked={remember} onCheckedChange={(value) => setRemember(value === true)} disabled={busy} />
              <Label htmlFor="remember">保持登录 30 天</Label>
            </div>
            <Button type="submit" className="submit-login" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />{registering ? "正在注册" : "正在登录"}</> : <>{registering ? "注册并登录" : "登录"}<ArrowRight /></>}</Button>
            <p className="auth-switch">{registering ? "已经有账号？" : "还没有账号？"} <Link to={registering ? "/login" : "/register"} onClick={(event) => { if (busy) event.preventDefault(); }}>{registering ? "去登录" : "注册账号"}</Link></p>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
