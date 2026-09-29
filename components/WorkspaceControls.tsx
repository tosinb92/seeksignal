"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function addCompetitor(e: FormEvent) {
    e.preventDefault();
    setBusy("competitor");
    setMessage("");
    const response = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...competitorForm })
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "Could not add competitor.");
    else {
      setCompetitors((items) => [...items, data.competitor]);
      setCompetitorForm({ name: "", domain: "" });
      setMessage("Competitor added.");
      router.refresh();
    }
    setBusy("");
  }

  async function removeCompetitor(id: string) {
    setBusy(id);
    setMessage("");
    const response = await fetch("/api/competitors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const data = await response.json();
    if (!response.ok) setMessage(data.error || "Could not remove competitor.");
    else {
      setCompetitors((items) => items.filter((item) => item.id !== id));
      setMessage("Competitor removed.");
      router.refresh();
    }
    setBusy("");
  }

  async function saveProject(e: FormEvent) {
    e.preventDefault();
    setBusy("settings");
    setMessage("");
    const response = await fetch("/api/projects/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...project })
    });
    const data = await response.json();
    setMessage(response.ok ? "Project settings saved." : data.error || "Could not save settings.");
    if (response.ok) router.refresh();
    setBusy("");
  }

  async function logout() {
    setBusy("logout");
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <section id="competitors" style={{marginTop:24,padding:24,border:"1px solid rgba(255,255,255,.075)",borderRadius:17,background:"#0d1111"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"end"}}>
          <div>
            <span style={{color:"#68716b",fontSize:8,textTransform:"uppercase",letterSpacing:1}}>Competitors</span>
            <h2 style={{margin:"8px 0 0",fontSize:25}}>Track the brands you compete with.</h2>
          </div>
        </div>
        <form onSubmit={addCompetitor} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginTop:20}}>
          <input value={competitorForm.name} onChange={(e)=>setCompetitorForm({...competitorForm,name:e.target.value})} placeholder="Competitor name" required style={{height:42,padding:"0 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"#101414",color:"#fff"}} />
          <input value={competitorForm.domain} onChange={(e)=>setCompetitorForm({...competitorForm,domain:e.target.value})} placeholder="competitor.com" style={{height:42,padding:"0 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"#101414",color:"#fff"}} />
          <button disabled={busy==="competitor"} style={{border:0,borderRadius:9,padding:"0 15px",background:"#c4f873",fontWeight:800}}>{busy==="competitor"?"Adding…":"Add competitor"}</button>
        </form>
        <div style={{display:"grid",marginTop:18}}>
          {competitors.length ? competitors.map((item)=>(
            <div key={item.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"center",padding:"12px 0",borderTop:"1px solid rgba(255,255,255,.055)"}}>
              <strong>{item.name}</strong><span style={{color:"#737d76",fontSize:11}}>{item.domain || "No domain set"}</span>
              <button onClick={()=>removeCompetitor(item.id)} disabled={busy===item.id} style={{border:0,background:"transparent",color:"#ff9c9c",cursor:"pointer"}}>{busy===item.id?"Removing…":"Remove"}</button>
            </div>
          )):<p style={{color:"#737d76",fontSize:11}}>No competitors added yet.</p>}
        </div>
      </section>

      <section id="settings" style={{marginTop:24,padding:24,border:"1px solid rgba(255,255,255,.075)",borderRadius:17,background:"#0d1111"}}>
        <span style={{color:"#68716b",fontSize:8,textTransform:"uppercase",letterSpacing:1}}>Project settings</span>
        <h2 style={{margin:"8px 0 0",fontSize:25}}>Keep the monitored business details accurate.</h2>
        <form onSubmit={saveProject} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:20}}>
          <input value={project.name} onChange={(e)=>setProject({...project,name:e.target.value})} placeholder="Business name" required style={{height:42,padding:"0 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"#101414",color:"#fff"}} />
          <input value={project.domain} onChange={(e)=>setProject({...project,domain:e.target.value})} placeholder="Website" required style={{height:42,padding:"0 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"#101414",color:"#fff"}} />
          <input value={project.market} onChange={(e)=>setProject({...project,market:e.target.value})} placeholder="Market" style={{height:42,padding:"0 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"#101414",color:"#fff"}} />
          <input value={project.category} onChange={(e)=>setProject({...project,category:e.target.value})} placeholder="Category" style={{height:42,padding:"0 12px",borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"#101414",color:"#fff"}} />
          <div style={{gridColumn:"1/-1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#8c968f",fontSize:10}}>{message}</span>
            <div style={{display:"flex",gap:8}}>
              <button type="button" onClick={logout} disabled={busy==="logout"} style={{height:40,padding:"0 15px",borderRadius:9,border:"1px solid rgba(255,255,255,.09)",background:"#101414",color:"#fff"}}>{busy==="logout"?"Signing out…":"Sign out"}</button>
              <button disabled={busy==="settings"} style={{height:40,padding:"0 15px",border:0,borderRadius:9,background:"#c4f873",fontWeight:800}}>{busy==="settings"?"Saving…":"Save settings"}</button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}
