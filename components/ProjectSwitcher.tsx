"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Project = { id:string; name:string; domain:string|null };

export default function ProjectSwitcher({ currentProjectId, projects }:{
  currentProjectId:string;
  projects:Project[];
}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [showCreate,setShowCreate]=useState(false);
  const [name,setName]=useState("");
  const [domain,setDomain]=useState("");
  const [market,setMarket]=useState("");
  const [category,setCategory]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  const current=projects.find(p=>p.id===currentProjectId);

  async function createProject(e:React.FormEvent){
    e.preventDefault();
    if(busy) return;
    setBusy(true); setError("");
    try{
      const res=await fetch("/api/projects",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,domain,market,category})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||"Could not create website.");
      setOpen(false); setShowCreate(false);
      router.push("/app?project="+encodeURIComponent(data.project.id));
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:"Could not create website.");}
    finally{setBusy(false);}
  }

  return <div className="projectSwitcher">
    <button type="button" className="projectSwitcherButton" onClick={()=>setOpen(v=>!v)}>
      <span><small>Project</small><strong>{current?.name||"Select website"}</strong></span><b>⌄</b>
    </button>
    {open?<div className="projectMenu">
      <div className="projectMenuHeader"><span>Your websites</span><button type="button" onClick={()=>setShowCreate(v=>!v)}>+ New website</button></div>
      <div className="projectList">
        {projects.map(p=><button type="button" key={p.id} className={p.id===currentProjectId?"projectItem active":"projectItem"} onClick={()=>{setOpen(false);router.push("/app?project="+encodeURIComponent(p.id));router.refresh();}}>
          <strong>{p.name}</strong><small>{p.domain}</small>
        </button>)}
      </div>
      {showCreate?<form onSubmit={createProject} className="projectCreate">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Business / website name" required />
        <input value={domain} onChange={e=>setDomain(e.target.value)} placeholder="example.com" required />
        <div><input value={market} onChange={e=>setMarket(e.target.value)} placeholder="Market" /><input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category" /></div>
        {error?<small className="projectError">{error}</small>:null}
        <button type="submit" disabled={busy}>{busy?"Creating…":"Create website"}</button>
      </form>:null}
    </div>:null}
  </div>
}