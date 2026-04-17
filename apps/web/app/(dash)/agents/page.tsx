"use client";
import { useEffect, useRef, useState } from "react";

const KNOWN_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "llama-3.3-70b-versatile",
  "mistral-large-latest",
  "deepseek-chat",
];

interface Agent {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
  cliBinary: string;
  projectId: string;
}

const EMPTY_FORM = { name: "", model: KNOWN_MODELS[0], systemPrompt: "", cliBinary: "forge" };

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const getProject = () => typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("project") ?? "" : "";

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const pid = getProject();
      const url = pid ? `${apiUrl}/v1/agents?project=${pid}` : `${apiUrl}/v1/agents`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setAgents(data.agents ?? data);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load agents"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (dialogOpen) dialogRef.current?.showModal(); else dialogRef.current?.close(); }, [dialogOpen]);
  useEffect(() => { if (confirmDelete) confirmRef.current?.showModal(); else confirmRef.current?.close(); }, [confirmDelete]);

  function openCreate() { setForm({ ...EMPTY_FORM }); setEditId(null); setDialogOpen(true); }
  function openEdit(a: Agent) { setForm({ name: a.name, model: a.model, systemPrompt: a.systemPrompt, cliBinary: a.cliBinary }); setEditId(a.id); setDialogOpen(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const pid = getProject();
      const url = editId ? `${apiUrl}/v1/agents/${editId}` : `${apiUrl}/v1/agents`;
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editId ? form : { ...form, projectId: pid }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setDialogOpen(false); await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function deleteAgent(agent: Agent) {
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const res = await fetch(`${apiUrl}/v1/agents/${agent.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setConfirmDelete(null); await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed to delete"); }
  }

  return (
    <>
      <style>{`
        .agents-header { display: flex; justify-content: space-between; align-items: center; padding: 28px 40px 20px; }
        .agents-header h1 { font-size: 1.5rem; font-weight: 800; }
        .agents-list { padding: 0 40px 40px; display: flex; flex-direction: column; gap: 14px; }
        .agent-card { background: #111; border: 1px solid var(--border); border-radius: 10px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .agent-info { flex: 1; }
        .agent-name { font-weight: 700; margin-bottom: 4px; }
        .agent-model { font-size: 0.8rem; color: var(--accent); font-family: monospace; margin-bottom: 6px; }
        .agent-prompt { font-size: 0.8rem; color: #666; white-space: pre-wrap; max-height: 60px; overflow: hidden; }
        .agent-actions { display: flex; gap: 8px; }
        .error-banner { margin: 0 40px 16px; background: #1a0000; border: 1px solid #5c1a1a; border-radius: 8px; padding: 12px 16px; color: #f87171; }
        .empty-state { padding: 60px 40px; text-align: center; color: #555; }
        dialog { background: #141414; border: 1px solid var(--border); border-radius: 12px; padding: 32px; color: var(--fg); min-width: 400px; max-width: 560px; }
        dialog::backdrop { background: rgba(0,0,0,0.7); }
        .dialog-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .form-field label { font-size: 0.85rem; color: #aaa; }
        .form-field input, .form-field select, .form-field textarea { background: #0a0a0a; border: 1px solid var(--border); border-radius: 6px; padding: 9px 12px; color: var(--fg); font-size: 0.9rem; font-family: inherit; outline: none; }
        .form-field input:focus, .form-field select:focus, .form-field textarea:focus { border-color: var(--accent); }
        .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
        .confirm-msg { color: #aaa; font-size: 0.9rem; margin-bottom: 20px; }
        .btn-danger { background: #7f1d1d; color: #fca5a5; border: none; }
        .btn-danger:hover { background: #991b1b; }
      `}</style>
      <div className="agents-header">
        <h1>Agents</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ New Agent</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div style={{ padding: "20px 40px", color: "#555" }}>Loading agents…</div>
      ) : agents.length === 0 && !error ? (
        <div className="empty-state"><p style={{ marginBottom: 16 }}>No agents yet</p><button className="btn btn-primary" onClick={openCreate}>Create your first agent</button></div>
      ) : (
        <div className="agents-list">
          {agents.map((a) => (
            <div key={a.id} className="agent-card">
              <div className="agent-info">
                <div className="agent-name">{a.name}</div>
                <div className="agent-model">{a.model} · {a.cliBinary}</div>
                {a.systemPrompt && <div className="agent-prompt">{a.systemPrompt}</div>}
              </div>
              <div className="agent-actions">
                <button className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={() => openEdit(a)}>Edit</button>
                <button className="btn btn-danger" style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: 6, cursor: "pointer" }} onClick={() => setConfirmDelete(a)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <dialog ref={dialogRef} onClose={() => setDialogOpen(false)}>
        <div className="dialog-title">{editId ? "Edit Agent" : "New Agent"}</div>
        <form onSubmit={submit}>
          <div className="form-field"><label>Name</label><input required autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="form-field"><label>Model</label>
            <select value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}>
              {KNOWN_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-field"><label>CLI Binary</label><input value={form.cliBinary} onChange={(e) => setForm((f) => ({ ...f, cliBinary: e.target.value }))} placeholder="forge" /></div>
          <div className="form-field"><label>System Prompt</label><textarea rows={5} value={form.systemPrompt} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))} /></div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setDialogOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editId ? "Save" : "Create"}</button>
          </div>
        </form>
      </dialog>

      <dialog ref={confirmRef} onClose={() => setConfirmDelete(null)}>
        <div className="dialog-title">Delete agent?</div>
        <p className="confirm-msg">Are you sure you want to delete <strong>{confirmDelete?.name}</strong>? This cannot be undone.</p>
        <div className="dialog-actions">
          <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn btn-danger" style={{ borderRadius: 6, cursor: "pointer", padding: "10px 20px", fontWeight: 600 }} onClick={() => confirmDelete && deleteAgent(confirmDelete)}>Delete</button>
        </div>
      </dialog>
    </>
  );
}
