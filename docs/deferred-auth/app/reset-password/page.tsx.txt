"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, LoaderCircle, Leaf, AlertCircle, CheckCircle2, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const token = searchParams.get("token");

  const hasToken = Boolean(token);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(hasToken ? "" : "Invalid or missing reset token. Please request a new password reset link.");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validToken, setValidToken] = useState<null | boolean>(hasToken ? null : false);
  const [checkingToken, setCheckingToken] = useState(!hasToken);

  const passwordRequirements = [
    { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
    { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
    { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
    { test: (p: string) => /[0-9]/.test(p), label: "One number" },
    { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
  ];

  const checkRequirement = (req: { test: (p: string) => boolean; label: string }) => {
    if (!password) return false;
    return req.test(password);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (password.length > 128) {
      errors.password = "Password must be less than 128 characters";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid reset token. Please request a new password reset link.");
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "INVALID_TOKEN" || data.code === "EXPIRED_TOKEN") {
          setError("This reset link has expired or is invalid. Please request a new one.");
        } else {
          setError(data.message || "Failed to reset password. Please try again.");
        }
        return;
      }

      setSuccess("Your password has been reset successfully. Redirecting to sign in…");
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(redirectTo)}&reset=true`);
        router.refresh();
      }, 1500);
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="auth-shell">
        <div className="auth-form-side">
          <main className="auth-form-container">
            <div className="auth-loading">
              <LoaderCircle className="auth-spinner" size={28} />
              <p>Verifying reset link…</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="auth-shell">
        <div className="auth-form-side">
          <main className="auth-form-container">
            <div className="auth-error-state">
              <AlertCircle size={48} className="auth-error-icon" />
              <h3>Invalid reset link</h3>
              <p>{error || "This password reset link is invalid or has expired."}</p>
              <Link href={`/forgot-password?redirect=${encodeURIComponent(redirectTo)}`} className="auth-submit">
                Request a new link
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
            <h1 className="auth-headline">Set a new password</h1>
            <p className="auth-subtext">Your reset link is valid. Choose a strong password you haven&apos;t used before.</p>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <main className="auth-form-container">
          <div className="auth-form-header">
            <h2>Create new password</h2>
            <p>Enter your new password below.</p>
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

          <form onSubmit={handleSubmit} noValidate className="auth-reset-form">
            <div className="auth-field">
              <label htmlFor="password" className="auth-label">
                New password
              </label>
              <div className="auth-password-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`auth-input ${fieldErrors.password ? "auth-input-error" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  maxLength={128}
                  aria-invalid={fieldErrors.password ? "true" : "false"}
                  aria-describedby={fieldErrors.password ? "password-error" : "password-requirements"}
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
              <div id="password-requirements" className="auth-requirements" aria-live="polite">
                <p className="auth-requirements-label">Password requirements:</p>
                <ul className="auth-requirements-list">
                  {passwordRequirements.map((req, i) => (
                    <li key={i} className={`auth-requirement ${checkRequirement(req) ? "met" : ""}`}>
                      <Lock size={13} />
                      <span>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">
                Confirm new password
              </label>
              <div className="auth-password-wrapper">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className={`auth-input ${fieldErrors.confirmPassword ? "auth-input-error" : ""}`}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  placeholder="••••••••"
                  disabled={loading}
                  maxLength={128}
                  aria-invalid={fieldErrors.confirmPassword ? "true" : "false"}
                  aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p id="confirmPassword-error" className="auth-field-error" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <span>
                  <LoaderCircle className="auth-spinner" size={18} />
                  Resetting password…
                </span>
              ) : (
                "Reset password"
              )}
            </button>
          </form>

          <p className="auth-footer">
            Remember your password?{" "}
            <a href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="auth-link auth-link-primary">
              Sign in
            </a>
          </p>
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