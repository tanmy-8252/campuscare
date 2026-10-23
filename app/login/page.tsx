"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, LoaderCircle, Leaf, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    if (!password) {
      errors.password = "Password is required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "INVALID_CREDENTIALS") {
          setError("Invalid email or password. Please try again.");
        } else if (data.code === "EMAIL_NOT_VERIFIED") {
          setError("Please verify your email address before signing in. Check your inbox for the verification link.");
        } else {
          setError(data.message || "Sign in failed. Please try again.");
        }
        return;
      }

      setSuccess("Welcome back! Redirecting…");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 800);
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-branded">
        <div className="auth-branded-content">
          <Link href="/" className="auth-brand" aria-label="CampusCare home">
            <span className="auth-brand-icon">
              <Building2 size={28} />
            </span>
            Campus<span>Care</span>
          </Link>
          <div className="auth-illustration">
            <div className="auth-art">
              <div className="auth-art-circle" />
              <div className="auth-art-path" />
              <div className="auth-art-tree auth-art-tree-one" />
              <div className="auth-art-tree auth-art-tree-two" />
              <div className="auth-art-tree auth-art-tree-three" />
              <div className="auth-art-building auth-art-building-back">
                <i /><i /><i /><i /><i /><i />
              </div>
              <div className="auth-art-building auth-art-building-front">
                <div className="auth-art-building-roof" />
                <i /><i /><i /><i /><i /><i />
                <span className="auth-art-building-door" />
              </div>
              <div className="auth-art-check">
                <CheckCircle2 size={24} />
              </div>
              <div className="auth-art-mini">
                <Leaf size={16} />
                <span>Making campus better, together</span>
              </div>
            </div>
            <h1 className="auth-headline">Welcome back.</h1>
            <p className="auth-subtext">Sign in to keep your campus running smoothly.</p>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <main className="auth-form-container">
          <div className="auth-form-header">
            <h2>Sign in to your account</h2>
            <p>Enter your credentials to access your workspace.</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert auth-alert-success" role="status">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`auth-input ${fieldErrors.email ? "auth-input-error" : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="you@campus.edu"
                disabled={loading}
                aria-invalid={fieldErrors.email ? "true" : "false"}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="auth-field-error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">
                Password
              </label>
              <div className="auth-password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`auth-input ${fieldErrors.password ? "auth-input-error" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  aria-invalid={fieldErrors.password ? "true" : "false"}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="auth-field-error" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="auth-options">
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span className="auth-checkbox-mark" />
                Remember me
              </label>
              <a href={`/forgot-password${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="auth-link">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span>
                  <LoaderCircle className="auth-spinner" size={18} />
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="auth-footer">
            Don&apos;t have an account?{" "}
            <a href={`/register${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="auth-link auth-link-primary">
              Create one
            </a>
          </p>

          <hr className="auth-divider" />
          <p className="auth-divider-text">Or continue with</p>

          <a
            href={`/signin-with-chatgpt?return_to=${encodeURIComponent(redirectTo)}`}
            className="auth-social"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-6.627-5.373-12-12-12zm5.521 17.34c-.72.216-1.512.324-2.34.324-2.305 0-4.257-.955-5.643-2.557.359.054.733.081 1.107.081 2.222 0 4.024-.868 5.407-2.233-1.869-.041-3.407-1.493-3.873-3.375 0-.707.19-1.37.513-1.899 1.676.817 3.476 1.321 5.408 1.126-.193-1.321-.611-2.572-1.271-3.678.838.277 1.691.416 2.558.416 1.219 0 2.353-.155 3.402-.448-.758 1.683-2.03 3.121-3.762 4.101zm-2.083-5.487c-.72.216-1.512.324-2.34.324-2.305 0-4.257-.955-5.643-2.557.359.054.733.081 1.107.081 2.222 0 4.024-.868 5.407-2.233-1.869-.041-3.407-1.493-3.873-3.375 0-.707.19-1.37.513-1.899 1.676.817 3.476 1.321 5.408 1.126-.193-1.321-.611-2.572-1.271-3.678.838.277 1.691.416 2.558.416 1.219 0 2.353-.155 3.402-.448-.758 1.683-2.03 3.121-3.762 4.101z"/>
            </svg>
            <span>Continue with ChatGPT</span>
          </a>
        </main>

        <footer className="auth-page-footer">
          <p>
            <Leaf size={13} />
            A better campus, together.
          </p>
          <p>Built for Hacktober HackDays 2026 · CampusCare</p>
        </footer>
      </div>
    </div>
  );
}