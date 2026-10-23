"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, LoaderCircle, Leaf, AlertCircle, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
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
      const response = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password?redirect=${encodeURIComponent(redirectTo)}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // For security, we don't reveal if the email exists
        // But we still show a generic success message
        setSuccess("If an account with that email exists, a password reset link has been sent.");
        setSubmitted(true);
        return;
      }

      setSuccess("If an account with that email exists, a password reset link has been sent.");
      setSubmitted(true);
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
            <h1 className="auth-headline">Forgot your password?</h1>
            <p className="auth-subtext">No worries. Enter your email and we&apos;ll send you a link to reset it.</p>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <main className="auth-form-container">
          <div className="auth-form-header">
            <h2>Reset your password</h2>
            <p className="auth-description">
              Enter your email address and we&apos;ll send a reset link to <strong>{email || "your inbox"}</strong>.
            </p>
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

          {!submitted ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="email" className="auth-label">
                  Email address
                </label>
                <div className="auth-input-with-icon">
                  <Mail size={18} className="auth-input-icon" aria-hidden="true" />
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
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="auth-field-error" role="alert">
                    {fieldErrors.email}
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
                    Sending link…
                  </span>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          ) : (
            <div className="auth-success-state">
              <div className="auth-success-icon">
                <CheckCircle2 size={48} />
              </div>
              <h3>Check your email</h3>
              <p>If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.</p>
              <p className="auth-success-note">The link will expire in 1 hour for security.</p>
              <div className="auth-success-actions">
                <a href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="auth-submit auth-submit-secondary">
                  Back to sign in
                </a>
                <button
                  type="button"
                  className="auth-submit auth-submit-secondary"
                  onClick={() => {
                    setSubmitted(false);
                    setSuccess("");
                    setEmail("");
                  }}
                >
                  Different email
                </button>
              </div>
            </div>
          )}

          <p className="auth-footer">
            Remember your password?{" "}
            <a href={`/login${redirectTo !== "/" ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`} className="auth-link auth-link-primary">
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