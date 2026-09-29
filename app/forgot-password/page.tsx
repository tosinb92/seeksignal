"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "../login/auth.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Could not send recovery email.");
      setMessage(data.message || "Check your email for a recovery link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send recovery email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/"><span>S</span>SeekSignal</Link>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Account recovery</div>
        <h1>Reset your password.</h1>
        <p>Enter the email used for your SeekSignal account and we’ll send a secure recovery link.</p>
        <form onSubmit={submit}>
          <label><span>Work email</span><input type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></label>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}
          <button disabled={loading}>{loading ? "Sending…" : "Send recovery link →"}</button>
        </form>
        <small><Link href="/login">← Back to sign in</Link></small>
      </section>
    </main>
  );
}
