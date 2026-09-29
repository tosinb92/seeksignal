"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../login/auth.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const leadId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("lead") : null;
    if (leadId) window.localStorage.setItem("seeksignalPendingLeadId", leadId);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not create your account.");
      setLoading(false);
      return;
    }

    if (data.needsEmailConfirmation) {
      setSent(true);
      setLoading(false);
      return;
    }

    router.push(leadId ? `/onboarding?lead=${encodeURIComponent(leadId)}` : "/onboarding");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/"><span>S</span>SeekSignal</Link>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Create your workspace</div>
        <h1>Turn one scan into ongoing AI visibility intelligence.</h1>
        <p>Create your account, add your business and start building a visibility history you can act on.</p>

        {sent ? (
          <div className={styles.success}>Check your inbox to confirm your email. Once confirmed, sign in and we’ll finish your workspace setup.</div>
        ) : (
          <form onSubmit={submit}>
            <label><span>Your name</span><input autoComplete="name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required /></label>
            <label><span>Work email</span><input type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required /></label>
            <label><span>Password</span><input type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required /></label>
            {error && <div className={styles.error}>{error}</div>}
            <button disabled={loading}>{loading ? "Creating account…" : "Create account →"}</button>
          </form>
        )}

        <small>Already have an account? <Link href="/login">Sign in</Link></small>
      </section>
    </main>
  );
}
