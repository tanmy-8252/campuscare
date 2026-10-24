"use client";
import { useEffect, useState } from "react";
import { Check, Copy, ShieldCheck, X } from "lucide-react";
type Member = { userId: string; name: string; role: string; status: string; specialty: string | null };
export default function MembershipPanel({ onUpdated }: { onUpdated: () => void }) {
  const [data, setData] = useState<{ joinCode: string; members: Member[] } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState(false);
  async function load() {
    const response = await fetch("/api/account/members", { cache: "no-store" });
    const body = await response.json() as { error?: string; joinCode: string; members: Member[] };
    if (!response.ok) throw new Error(body.error || "Requests could not be loaded.");
    setData(body);
  }
  useEffect(() => {
    let live = true;
    fetch("/api/account/members", { cache: "no-store" }).then(async response => {
      const body = await response.json() as { error?: string; joinCode: string; members: Member[] };
      if (!response.ok) throw new Error(body.error || "Requests could not be loaded.");
      if (live) setData(body);
    }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);
  async function review(userId: string, approve: boolean) {
    setBusy(userId); setError("");
    try {
      const response = await fetch("/api/account/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, approve }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Review failed.");
      await load(); onUpdated();
    } catch (e) { setError(e instanceof Error ? e.message : "Please retry."); }
    finally { setBusy(""); }
  }
  const pending = data?.members.filter(m => m.status === "pending" && m.role === "worker") ?? [];
  return <section className="panel membership-panel"><div className="panel-heading"><div><h2><ShieldCheck size={19} /> Organisation access</h2><p>Share your code with members and review worker requests.</p></div></div>
    {error && <p role="alert" className="account-alert">{error}</p>}
    {data && <><label className="field">Organisation join code<div className="membership-code"><input aria-label="Organisation join code" readOnly value={data.joinCode} /><button type="button" className="secondary" onClick={async () => { try { await navigator.clipboard.writeText(data.joinCode); setCopied(true); } catch { setError("Select and copy the code from the field."); } }}><Copy size={16} />{copied ? "Copied" : "Copy"}</button></div></label>
      <h3>Worker requests <span>{pending.length}</span></h3>
      {pending.length === 0 && <p className="muted">No workers are waiting for approval.</p>}
      {pending.map(m => <div className="membership-request" key={m.userId}><div><strong>{m.name}</strong><p>{m.specialty} · Awaiting approval</p></div><div><button className="secondary" disabled={!!busy} onClick={() => void review(m.userId, false)}><X size={16} />Reject</button><button className="primary" disabled={!!busy} onClick={() => void review(m.userId, true)}><Check size={16} />{busy === m.userId ? "Saving…" : "Approve"}</button></div></div>)}
      <p className="account-hint">{data.members.filter(m => m.role === "resident" && m.status === "active").length} students / staff have joined this organisation.</p>
    </>}
  </section>;
}
