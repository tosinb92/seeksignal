"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../login/auth.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    setAccessToken(hash.get("access_token") || query.get("access_token") || "");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Could not reset password.");
      }

      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/"><span>S</span>SeekSignal</Link>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Secure recovery</div>
        <h1>Choose a new password.</h1>
        <p>Your new password must be at least 8 characters.</p>
        <form onSubmit={submit}>
          <label><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} required /></label>
          <label><span>Confirm password</span><input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e)=>setConfirm(e.target.value)} required /></label>
          {error && <div className={styles.error}>{error}</div>}
          <button disabled={loading || !accessToken}>{loading ? "Updating…" : accessToken ? "Update password →" : "Recovery link required"}</button>
        </form>
        <small><Link href="/login">Back to sign in</Link></small>
      </section>
    </main>
  );
}
