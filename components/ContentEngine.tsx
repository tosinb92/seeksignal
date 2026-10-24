"use client";

import { useState } from "react";
import styles from "./ContentEngine.module.css";

export default function ContentEngine({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [article, setArticle] = useState<any>(null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate content.");
      setArticle(data.article);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate content.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="content-engine" className={styles.section} aria-labelledby="content-engine-title">
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Authority builder</span><h2 id="content-engine-title">Turn expertise into useful content</h2><p>Draft from your findings. Check every fact before publishing.</p></div>
        <button onClick={generate} disabled={loading} className={styles.primaryButton}>{loading ? "Preparing draft…" : article ? "Create another draft" : "Prepare a content draft"}</button>
      </header>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {article ? (
        <article className={styles.draft}>
          <div className={styles.draftMeta}><span>Draft · review before use</span><span>Suggested query: {article.targetQuery}</span></div>
          <h3>{article.title}</h3>
          <p>{article.whyThisOpportunity}</p>
          <details><summary>Read the full draft</summary><pre>{article.articleMarkdown}</pre></details>
        </article>
      ) : null}
    </section>
  );
}
