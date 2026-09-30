"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../login/auth.module.css";

export default function ConfirmedPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email…");
  const [error, setError] = useState("");

  useEffect(() => {
    async function complete() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const accessToken = hash.get("access_token") || query.get("access_token") || "";
      const refreshToken = hash.get("refresh_token") || query.get("refresh_token") || "";
      const errorDescription = hash.get("error_description") || query.get("error_description");

      if (errorDescription) {
        setError(errorDescription);
        setMessage("");
        return;
      }

      if (!accessToken) {
        setError("The confirmation link did not contain a valid session. Please sign in with the account you created.");
        setMessage("");
        return;
      }

      try {
        const response = await fetch("/api/auth/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, refreshToken })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(data.error || "Could not complete email confirmation.");

        setMessage("Email confirmed. Opening your workspace setup…");
        window.history.replaceState({}, "", "/auth/confirmed");
        router.replace("/onboarding");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not complete email confirmation.");
        setMessage("");
      }
    }

    void complete();
  }, [router]);

  return (
    <main className={styles.page}>
      <Link className={styles.brand} href="/"><span>S</span>SeekSignal</Link>
      <section className={styles.card}>
        <div className={styles.eyebrow}>Email confirmation</div>
        <h1>{error ? "We couldn't finish verification." : "Confirming your account."}</h1>
        {message ? <div className={styles.success}>{message}</div> : null}
        {error ? <div className={styles.error}>{error}</div> : null}
        {error ? <small><Link href="/login">Continue to sign in →</Link></small> : null}
      </section>
    </main>
  );
}
