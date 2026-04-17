"use client";
import { useEffect, useRef, useState } from "react";

interface Project {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  updatedAt: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonCard() {
  return (
    <div style={{ background: "#111", border: "1px solid var(--border)", borderRadius: 10, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ height: 18, width: "60%", background: "#1e1e1e", borderRadius: 4 }} />
      <div style={{ height: 14, width: "80%", background: "#1a1a1a", borderRadius: 4 }} />
      <div style={{ height: 12, width: "40%", background: "#161616", borderRadius: 4 }} />
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const res = await fetch(`${apiUrl}/v1/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setProjects(data.projects ?? data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dialogOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialogOpen]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const res = await fetch(`${apiUrl}/v1/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setDialogOpen(false);
      setForm({ name: "", description: "" });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        .projects-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
        .projects-header h1 { font-size: 1.6rem; font-weight: 800; }
        .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 20px; }
        .project-card { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 24px; display: flex; flex-direction: column; gap: 10px; }
        .project-name { font-weight: 700; font-size: 1rem; }
        .project-desc { color: #aaa; font-size: 0.85rem; line-height: 1.5; flex: 1; }
        .project-meta { font-size: 0.75rem; color: #555; display: flex; gap: 16px; }
        .empty-state { text-align: center; padding: 80px 0; color: #555; }
        .empty-state p { font-size: 1rem; margin-bottom: 20px; }
        .error-state { background: #1a0000; border: 1px solid #5c1a1a; border-radius: 8px; padding: 16px 20px; color: #f87171; margin-bottom: 24px; }
        dialog { background: #141414; border: 1px solid var(--border); border-radius: 12px; padding: 32px; color: var(--fg); min-width: 360px; }
        dialog::backdrop { background: rgba(0,0,0,0.7); }
        .dialog-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .form-field label { font-size: 0.85rem; color: #aaa; }
        .form-field input, .form-field textarea { background: #0a0a0a; border: 1px solid var(--border); border-radius: 6px; padding: 9px 12px; color: var(--fg); font-size: 0.9rem; font-family: inherit; outline: none; }
        .form-field input:focus, .form-field textarea:focus { border-color: var(--accent); }
        .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
      `}</style>
      <div style={{ padding: "32px 40px" }}>
        <div className="projects-header">
          <h1>Projects</h1>
          <button className="btn btn-primary" onClick={() => setDialogOpen(true)}>+ New Project</button>
        </div>

        {error && <div className="error-state">{error} <button onClick={load} style={{ marginLeft: 12, color: "inherit", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button></div>}

        {loading ? (
          <div className="project-grid">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : projects.length === 0 && !error ? (
          <div className="empty-state">
            <p>No projects yet</p>
            <button className="btn btn-primary" onClick={() => setDialogOpen(true)}>Create your first project</button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <a key={p.id} href={`/dashboard/projects/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="project-card">
                  <div className="project-name">{p.name}</div>
                  <div className="project-desc">{p.description || "No description"}</div>
                  <div className="project-meta">
                    <span>{p.taskCount} task{p.taskCount !== 1 ? "s" : ""}</span>
                    <span>Updated {relativeTime(p.updatedAt)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <dialog ref={dialogRef} onClose={() => setDialogOpen(false)}>
          <div className="dialog-title">New Project</div>
          <form onSubmit={createProject}>
            <div className="form-field">
              <label htmlFor="proj-name">Name</label>
              <input id="proj-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
            </div>
            <div className="form-field">
              <label htmlFor="proj-desc">Description</label>
              <textarea id="proj-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-outline" onClick={() => setDialogOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create"}</button>
            </div>
          </form>
        </dialog>
      </div>
    </>
  );
}
