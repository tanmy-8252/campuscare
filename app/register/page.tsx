"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Eye, EyeOff, LoaderCircle, Leaf, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const passwordRequirements = [
    { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
    { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
    { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
    { test: (p: string) => /[0-9]/.test(p), label: "One number" },
    { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
  ];

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      errors.fullName = "Name must be at least 2 characters";
    } else if (fullName.trim().length > 80) {
      errors.fullName = "Name must be less than 80 characters";
    }

    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

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

    if (!termsAccepted) {
      errors.terms = "You must accept the terms and privacy policy";
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
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: fullName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === "EMAIL_ALREADY_EXISTS") {
          setError("An account with this email already exists. Please sign in instead.");
          setFieldErrors((prev) => ({ ...prev, email: "This email is already registered" }));
        } else if (data.code === "WEAK_PASSWORD") {
          setError("Password does not meet requirements. Please check the requirements below.");
        } else {
          setError(data.message || "Registration failed. Please try again.");
        }
        return;
      }

      setSuccess("Account created! Please check your email to verify your address, then sign in.");
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(redirectTo)}&verified=true`);
        router.refresh();
      }, 2000);
    } catch {
      setError("Unable to connect. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkRequirement = (req: { test: (p: string) => boolean; label: string }) => {
    if (!password) return false;
    return req.test(password);
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
            <h1 className="auth-headline">Join CampusCare.</h1>
            <p className="auth-subtext">Create your account to report issues, track fixes, and make a difference on campus.</p>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <main className="auth-form-container">
          <div className="auth-form-header">
            <h2>Create your account</h2>
            <p>Enter your details to get started.</p>
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
              <label htmlFor="fullName" className="auth-label">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                className={`auth-input ${fieldErrors.fullName ? "auth-input-error" : ""}`}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                placeholder="Alex Morgan"
                disabled={loading}
                maxLength={80}
                aria-invalid={fieldErrors.fullName ? "true" : "false"}
                aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
              />
              {fieldErrors.fullName && (
                <p id="fullName-error" className="auth-field-error" role="alert">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

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
                      <ShieldCheck size={13} />
                      <span>{req.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">
                Confirm password
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

            <div className="auth-field auth-field-checkbox">
              <label className="auth-checkbox auth-checkbox-terms">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  disabled={loading}
                />
                <span className="auth-checkbox-mark" />
                <span>
                  I agree to the <a href="/terms" className="auth-link">Terms of Service</a> and <a href="/privacy" className="auth-link">Privacy Policy</a>
                </span>
              </label>
              {fieldErrors.terms && (
                <p className="auth-field-error" role="alert">
                  {fieldErrors.terms}
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
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <a href={`/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="auth-link auth-link-primary">
              Sign in
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