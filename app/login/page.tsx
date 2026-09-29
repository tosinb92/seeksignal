"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not sign in.");
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/"><span>S</span>SeekSignal</Link>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Welcome back</div>
        <h1>Sign in to your intelligence workspace.</h1>
        <p>Monitor visibility, competitors and the opportunities that matter next.</p>
        <form onSubmit={submit}>
          <label><span>Work email</span><input type="email" autoComplete="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} required /></label>
          <label><span>Password</span><input type="password" autoComplete="current-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} required /></label>
          {error && <div className={styles.error}>{error}</div>}
          <button disabled={loading}>{loading ? "Signing in…" : "Sign in →"}</button>
        </form>
        <small>New to SeekSignal? <Link href="/signup">Create an account</Link></small>
      </section>
    </main>
  );
}
