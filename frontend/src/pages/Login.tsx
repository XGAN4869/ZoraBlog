import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { IconAction } from "@/components/IconAction";
import { ShapeGrid } from "@/components/ShapeGrid";

export function Login() {
  const { resolvedTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? undefined
        : "请输入有效的邮箱地址",
      password: password.length >= 8 ? undefined : "密码至少需要 8 个字符",
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    // UI preview only: no authentication or credential storage occurs.
    setBusy(false);
    setPassword("");
    setSuccess(true);
  }
  return (
    <main className="login-page">
      <ShapeGrid light={resolvedTheme === "light"} />
      <div className="grid-shade" />
      <div className="login-layout shell">
        <div className="login-intro">
          <div className="section-kicker">A SPACE FOR CURIOUS MINDS</div>
          <h1>
            每一次记录，
            <br />
            都是新的<span>开始。</span>
          </h1>
          <p>
            让思考有迹可循。
            <br />
            在这里，继续你的探索。
          </p>
          <div className="login-signature">
            <span className="brand-mark">
              z<span>.</span>
            </span>
            <span>
              Hi Zora Journal
              <br />
              <small>BUILD. LEARN. SHARE.</small>
            </span>
          </div>
        </div>
        <motion.div
          className="login-form-area"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Link to="/" className="back-link">
            <ArrowLeft />
            返回首页
          </Link>
          <div className="login-heading">
            <span className="section-kicker">WELCOME BACK /</span>
            <h2>
              欢迎回来<span className="blue-period">.</span>
            </h2>
            <p>登录你的个人空间，继续记录与分享。</p>
          </div>
          {success ? (
            <div className="login-success" role="status">
              <div className="success-check">
                <Check />
              </div>
              <h3>前端预览成功</h3>
              <p>
                表单交互已完成。真实登录会在 Go
                接口接入后启用，本次未创建账户或登录会话。
              </p>
              <Button asChild>
                <Link to="/">
                  回到首页
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => setSuccess(false)}>
                返回表单
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="form-field">
                <Label htmlFor="email">邮箱地址</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={busy}
                />
                {errors.email && (
                  <p className="field-error" id="email-error">
                    {errors.email}
                  </p>
                )}
              </div>
              <div className="form-field">
                <Label htmlFor="password">密码</Label>
                <div className="password-field">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="至少 8 个字符"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    disabled={busy}
                  />
                  <IconAction
                    label={showPassword ? "隐藏密码" : "显示密码"}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </IconAction>
                </div>
                {errors.password && (
                  <p className="field-error" id="password-error">
                    {errors.password}
                  </p>
                )}
              </div>
              <div className="remember-row">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(value) => setRemember(value === true)}
                  disabled={busy}
                />
                <Label htmlFor="remember">保持登录</Label>
                <span>接口接入后生效</span>
              </div>
              <Button type="submit" className="submit-login" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" />
                    正在校验
                  </>
                ) : (
                  <>
                    预览登录
                    <ArrowRight />
                  </>
                )}
              </Button>
              <div className="login-preview-note">
                <span className="status-dot" />
                <p>当前为前端预览。真实账户验证将在 Go 接口接入后启用。</p>
              </div>
            </form>
          )}
        </motion.div>
      </div>
      <div className="login-bottom shell">
        <span>YOUR IDEAS DESERVE A PLACE.</span>
        <span>HI ZORA / JOURNAL</span>
      </div>
    </main>
  );
}
