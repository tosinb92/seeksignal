"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "../lib/analytics/client";
import styles from "./WorkspaceControls.module.css";

type Competitor = { id: string; name: string; domain: string | null };

export default function WorkspaceControls({
  projectId,
  initialCompetitors,
  initialProject
}: {
  projectId: string;
  initialCompetitors: Competitor[];
  initialProject: { name: string; domain: string; market?: string | null; category?: string | null };
}) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [competitorForm, setCompetitorForm] = useState({ name: "", domain: "" });
  const [project, setProject] = useState({
    name: initialProject.name || "",
    domain: initialProject.domain || "",
    market: initialProject.market || "",
    category: initialProject.category || ""
  });
  const [competitorMessage, setCompetitorMessage] = useState("");
  const [competitorError, setCompetitorError] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState(false);
  const [busy, setBusy] = useState("");

  async function addCompetitor(e: FormEvent) {
    e.preventDefault();
    setBusy("competitor");
    setCompetitorMessage("");
    setCompetitorError(false);
    try {
      if (competitors.some((item) => item.name.trim().toLowerCase() === competitorForm.name.trim().toLowerCase())) {
        throw new Error("That competitor is already being tracked.");
      }
      const response = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...competitorForm })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not add competitor.");

      setCompetitors((items) => [...items, data.competitor]);
      setCompetitorForm({ name: "", domain: "" });
      setCompetitorMessage("Competitor added.");
      void trackEvent("competitor_added", { projectId, metadata: { name: data.competitor?.name || competitorForm.name } });
      router.refresh();
    } catch (err) {
      setCompetitorError(true);
      setCompetitorMessage(err instanceof Error ? err.message : "Could not add competitor.");
    } finally {
      setBusy("");
    }
  }

  async function removeCompetitor(id: string) {
    setBusy(id);
    setCompetitorMessage("");
    setCompetitorError(false);
    try {
      const response = await fetch("/api/competitors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not remove competitor.");

      setCompetitors((items) => items.filter((item) => item.id !== id));
      setCompetitorMessage("Competitor removed.");
      void trackEvent("competitor_removed", { projectId });
      router.refresh();
    } catch (err) {
      setCompetitorError(true);
      setCompetitorMessage(err instanceof Error ? err.message : "Could not remove competitor.");
    } finally {
      setBusy("");
    }
  }

  async function saveProject(e: FormEvent) {
    e.preventDefault();
    setBusy("settings");
    setSettingsMessage("");
    setSettingsError(false);
    try {
      const response = await fetch("/api/projects/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...project })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save settings.");
      setSettingsMessage("Business details saved.");
      router.refresh();
    } catch (err) {
      setSettingsError(true);
      setSettingsMessage(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    setSettingsMessage("");
    setSettingsError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out cleanly.");
      window.location.href = "/login";
    } catch (err) {
      setSettingsError(true);
      setSettingsMessage(err instanceof Error ? err.message : "Could not sign out.");
      setBusy("");
    }
  }

  function websiteHref(domain: string) {
    return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  }

  return (
    <>
      <section id="competitors" className={styles.section} aria-labelledby="competitors-title">
        <header className={styles.sectionHeader}>
          <div><span className={styles.eyebrow}>Competitors</span><h2 id="competitors-title">Businesses buyers compare</h2></div>
          <span className={styles.count}>{competitors.length} tracked</span>
        </header>
        <form onSubmit={addCompetitor} className={styles.competitorForm}>
          <label><span>Business name</span><input value={competitorForm.name} onChange={(e) => setCompetitorForm({ ...competitorForm, name: e.target.value })} placeholder="e.g. Example Services" required /></label>
          <label><span>Website</span><input value={competitorForm.domain} onChange={(e) => setCompetitorForm({ ...competitorForm, domain: e.target.value })} placeholder="example.com" /></label>
          <button className={styles.primaryButton} disabled={busy === "competitor"}>{busy === "competitor" ? "Adding…" : "Add competitor"}</button>
        </form>
        {competitorMessage ? <p className={competitorError ? styles.errorMessage : styles.successMessage} role={competitorError ? "alert" : "status"}>{competitorMessage}</p> : null}
        {competitors.length ? (
          <ul className={styles.competitorList}>
            {competitors.map((item) => (
              <li key={item.id} className={styles.competitorRow}>
                <span className={styles.competitorMark} aria-hidden="true">{item.name.trim().charAt(0).toUpperCase()}</span>
                <strong>{item.name}</strong>
                {item.domain ? <a href={websiteHref(item.domain)} target="_blank" rel="noopener noreferrer">{item.domain}<span aria-hidden="true"> ↗</span></a> : <span className={styles.noDomain}>Website not added</span>}
                <button className={styles.removeButton} onClick={() => void removeCompetitor(item.id)} disabled={busy === item.id}>{busy === item.id ? "Removing…" : "Remove"}</button>
              </li>
            ))}
          </ul>
        ) : <div className={styles.emptyState}><strong>No competitors yet</strong><span>Add the businesses customers usually compare with you.</span></div>}
      </section>

      <section id="settings" className={styles.section} aria-labelledby="settings-title">
        <header className={styles.sectionHeader}>
          <div><span className={styles.eyebrow}>Project settings</span><h2 id="settings-title">Business details</h2><p>Used to tailor search opportunities and visibility tests.</p></div>
        </header>
        <form onSubmit={saveProject} className={styles.settingsForm}>
          <label><span>Business name</span><input value={project.name} onChange={(e) => setProject({ ...project, name: e.target.value })} required /></label>
          <label><span>Website</span><input value={project.domain} onChange={(e) => setProject({ ...project, domain: e.target.value })} required /></label>
          <label><span>Market or service area</span><input value={project.market} onChange={(e) => setProject({ ...project, market: e.target.value })} placeholder="e.g. United Kingdom" /></label>
          <label><span>Industry</span><input value={project.category} onChange={(e) => setProject({ ...project, category: e.target.value })} placeholder="e.g. Fire safety services" /></label>
          <footer className={styles.settingsFooter}>
            <span className={settingsError ? styles.errorMessage : styles.successMessage} role={settingsError ? "alert" : "status"}>{settingsMessage}</span>
            <div><button type="button" className={styles.secondaryButton} onClick={() => void logout()} disabled={busy === "logout"}>{busy === "logout" ? "Signing out…" : "Sign out"}</button><button className={styles.primaryButton} disabled={busy === "settings"}>{busy === "settings" ? "Saving…" : "Save details"}</button></div>
          </footer>
        </form>
      </section>
    </>
  );
}
