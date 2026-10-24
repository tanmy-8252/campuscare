"use client";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Building2, GraduationCap, HardHat, Leaf, ShieldCheck } from "lucide-react";
import { categories, type Role } from "./domain";
import { roleLabels, type Organisation } from "./account-types";
import { useRouter } from "next/navigation";

export function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="account-shell">
    <aside className="account-story">
      <a className="account-brand" href="/login"><Building2 size={28} />Campus<span>Care</span></a>
      <div className="account-story-body"><span className="account-leaf"><Leaf size={64} strokeWidth={1.4} /></span>
        <p className="account-eyebrow">A LITTLE CARE GOES A LONG WAY</p>
        <h1>A better campus.<br />Built together.</h1>
        <p>Report what needs attention. Connect the right people. Follow every fix, from the first photo to the final check.</p>
        <div className="account-steps"><span>01 <b>Report</b></span><span>02 <b>Resolve</b></span><span>03 <b>Confirm</b></span></div>
      </div>
      <p className="account-story-footer">One organisation. Everyone connected.</p>
    </aside>
    <section className="account-main"><div className="account-card">{children}</div><p className="account-footer">CampusCare · A better campus, together.</p></section>
  </main>;
}

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <><button className="text-button" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Sign out failed. Please retry.");
      router.replace("/login"); router.refresh();
    } catch { setError("Sign out failed. Please retry."); setBusy(false); }
  }}>{busy ? "Signing out…" : "Sign out"}</button>{error && <span role="alert">{error}</span>}</>;
}

type Mode = "login" | "register" | "onboarding" | "forgot" | "reset";
export default function AuthForm({ mode, configured, initialRole = "resident", initialNotice = "" }: { mode: Mode; configured: boolean; initialRole?: Role; initialNotice?: string }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialNotice);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(mode === "onboarding");
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!configured || mode === "forgot" || mode === "reset") return;
    let live = true;
    fetch("/api/account", { cache: "no-store" }).then(async response => {
      const body = await response.json() as { error?: string; organisations: Organisation[] };
      if (!response.ok) throw new Error(body.error || "Organisation list could not be loaded.");
      if (live) { setOrganisations(body.organisations); setDirectoryLoaded(true); }
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : "Unable to load organisations."); });
    return () => { live = false; };
  }, [configured, mode]);

  async function post(path: string, payload: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json() as { error?: string; next?: string; verifyEmail?: boolean; message?: string; url?: string };
    if (!response.ok) throw new Error(body.error || "The request could not be completed.");
    return body;
  }
  async function signInWithGoogle() {
    setBusy(true); setGoogleBusy(true); setError(""); setMessage("");
    try {
      const body = await post("/api/auth/google", { role, organisationId: organisationId || undefined });
      if (!body.url) throw new Error("Google sign-in could not be started.");
      window.location.assign(body.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Please retry."); }
    finally { setBusy(false); setGoogleBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "login") {
        const body = await post("/api/auth/login", { email: form.get("email"), password: form.get("password"), role, organisationId: organisationId || undefined });
        router.replace(body.next || "/"); router.refresh(); return;
      }
      if (mode === "forgot") {
        const body = await post("/api/auth/forgot", { email: form.get("email") }); setMessage(body.message || "Check your email for a reset link."); return;
      }
      if (mode === "reset") {
        if (form.get("password") !== form.get("confirmPassword")) throw new Error("The passwords do not match.");
        const body = await post("/api/auth/reset", { password: form.get("password") }); router.replace(body.next || "/login"); router.refresh(); return;
      }
      if (!accountCreated) {
        const result = await post("/api/auth/register", { name: form.get("name"), email: form.get("email"), password: form.get("password"), role });
        if (result.verifyEmail) { setVerified(true); setMessage("Check your email to verify your account. Open the link in this browser, then finish your organisation setup."); return; }
        setAccountCreated(true);
      }
      const payload = role === "admin"
        ? { action: "create", name: form.get("organisationName"), kind: form.get("kind"), location: form.get("location") }
        : { action: "join", organisationId, code: form.get("code"), role, specialty: role === "worker" ? form.get("specialty") : undefined };
      const body = await post("/api/account", payload); router.replace(body.next || "/"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Please retry."); }
    finally { setBusy(false); }
  }

  const title = mode === "login" ? "Welcome back." : mode === "register" ? "Find your place on campus." : mode === "onboarding" ? "Connect your organisation." : mode === "forgot" ? "Reset your password." : "Choose a new password.";
  const roles = mode === "login" || mode === "register" || mode === "onboarding";
  const joining = mode === "register" || mode === "onboarding";
  return <AuthFrame>
    <p className="account-eyebrow">{mode === "login" ? "YOUR CAMPUS WORKSPACE" : joining ? "LET’S GET YOU CONNECTED" : "ACCOUNT ACCESS"}</p>
    <h2>{title}</h2>
    <p className="account-intro">{mode === "login" ? "Choose your role and organisation to sign in." : joining ? "Create an organisation as an admin, or join the place where you study or work." : "Use the email address associated with your account."}</p>
    {!configured && <p className="account-alert" role="status">Account setup is being connected. Please try again later.</p>}
    {roles && <fieldset className="account-role-fieldset"><legend>{mode === "login" ? "Sign in as" : "Your role"}</legend><div className="account-role-options">
      {(["admin", "resident", "worker"] as Role[]).map(value => { const Icon = value === "admin" ? ShieldCheck : value === "worker" ? HardHat : GraduationCap;
        return <button key={value} type="button" aria-pressed={role === value} className={role === value ? "chosen" : ""} onClick={() => { setRole(value); setError(""); }}><Icon size={21} /><span>{roleLabels[value]}</span></button>;
      })}</div></fieldset>}
    <form className="account-form" onSubmit={submit}>
      {mode === "login" && <label className="field">Organisation<select aria-label="Organisation" value={organisationId} onChange={e => setOrganisationId(e.target.value)}>
        <option value="">Choose organisation / finish setup</option>
        {organisations.map(o => <option key={o.id} value={o.id}>{o.name} · {o.location}</option>)}
      </select>{directoryLoaded && organisations.length === 0 && <small>An admin must register the organisation before members can join.</small>}</label>}
      {(mode === "login" || mode === "register") && !accountCreated && !verified && <>
        <button type="button" className="account-google" disabled={busy || !configured} onClick={() => void signInWithGoogle()}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-7.95Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.8l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.54H2.15v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.83 13.96A6.61 6.61 0 0 1 5.48 12c0-.68.12-1.34.35-1.96V7.2H2.15A11 11 0 0 0 1 12c0 1.78.43 3.47 1.15 4.8l3.68-2.84Z"/><path fill="#EA4335" d="M12 5.5c1.62 0 3.07.56 4.21 1.64l3.16-3.16A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.85 6.2l3.68 2.84C6.7 7.44 9.13 5.5 12 5.5Z"/></svg>
          {googleBusy ? "Opening Google…" : "Continue with Google"}
        </button>
        {mode === "register" && <p className="account-hint">Continue with Google, then finish your organisation setup.</p>}
        <div className="account-auth-divider">or use email</div>
      </>}
      {mode === "register" && !accountCreated && !verified && <label className="field">Full name<input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your full name" /></label>}
      {mode !== "onboarding" && mode !== "reset" && !accountCreated && !verified && <label className="field">Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>}
      {mode !== "onboarding" && mode !== "forgot" && !accountCreated && !verified && <label className="field">{mode === "reset" ? "New password" : "Password"}<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} maxLength={128} placeholder="At least 10 characters" /></label>}
      {mode === "reset" && <label className="field">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} /></label>}
      {!verified && joining && role !== "admin" && <label className="field">Organisation<select aria-label="Organisation" value={organisationId} onChange={e => setOrganisationId(e.target.value)} required={joining}>
        <option value="">Choose your organisation</option>
        {organisations.map(o => <option key={o.id} value={o.id}>{o.name} · {o.location}</option>)}
      </select>{directoryLoaded && organisations.length === 0 && <small>An admin must register the organisation before members can join.</small>}</label>}
      {joining && !verified && role === "admin" && <div className="account-org-fields"><h3>Register your organisation</h3>
        <label className="field">Organisation name<input name="organisationName" required minLength={2} maxLength={120} placeholder="College or workplace name" /></label>
        <label className="field">Organisation type<select name="kind"><option>College</option><option>Workplace</option></select></label>
        <label className="field">City / campus location<input name="location" required minLength={2} maxLength={160} placeholder="For example, Noida" /></label>
        <p className="account-hint">You will manage this organisation. Share its join code with your students, staff, and maintenance team.</p>
      </div>}
      {joining && !verified && role !== "admin" && <><label className="field">Organisation code<input name="code" required maxLength={64} autoComplete="off" placeholder="Code shared by your administrator" /></label>
        {role === "worker" && <label className="field">Your specialty<select name="specialty">{categories.map(c => <option key={c}>{c}</option>)}</select></label>}
        <p className="account-hint">{role === "worker" ? "Your organisation’s admin must approve your worker account before you can access jobs." : "Use your organisation’s code to join. Students and staff do not need admin approval."}</p>
      </>}
      {error && <p className="account-alert" role="alert">{error}</p>}
      {message && <p className="account-success" role="status">{message}</p>}
      {!verified && <button className="primary account-submit" disabled={busy || !configured}>{busy ? "Please wait…" : mode === "login" ? `Sign in as ${roleLabels[role]}` : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : role === "admin" ? "Create organisation" : role === "worker" ? "Request worker access" : "Join organisation"}<ArrowRight size={18} /></button>}
    </form>
    <div className="account-links">{mode === "login" ? <><a href="/forgot-password">Forgot password?</a><p>New to CampusCare? <a href="/register">Create an account</a></p></> : <a href="/login">Back to sign in</a>}</div>
    {mode === "onboarding" && <SignOutButton />}
  </AuthFrame>;
}
