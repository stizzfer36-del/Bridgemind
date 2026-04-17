"use client";
import { useEffect, useRef, useState } from "react";

type Status = "todo" | "in-progress" | "in-review" | "complete" | "cancelled";

interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  projectId: string;
  createdAt: string;
}

const COLUMNS: { key: Status; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "in-progress", label: "In Progress" },
  { key: "in-review", label: "In Review" },
  { key: "complete", label: "Complete" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_ORDER: Status[] = ["todo", "in-progress", "in-review", "complete", "cancelled"];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<Status | null>(null);
  const [newForm, setNewForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const detailRef = useRef<HTMLDialogElement>(null);
  const newRef = useRef<HTMLDialogElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  function getProjectId() {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("project") ?? "";
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const pid = getProjectId();
      const url = pid ? `${apiUrl}/v1/tasks?project=${pid}` : `${apiUrl}/v1/tasks`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setTasks(data.tasks ?? data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selected) detailRef.current?.showModal(); else detailRef.current?.close();
  }, [selected]);

  useEffect(() => {
    if (newTaskStatus) newRef.current?.showModal(); else newRef.current?.close();
  }, [newTaskStatus]);

  async function moveTask(task: Task, direction: 1 | -1) {
    const idx = STATUS_ORDER.indexOf(task.status);
    const next = STATUS_ORDER[idx + direction];
    if (!next) return;
    const token = localStorage.getItem("forge:token") ?? "";
    await fetch(`${apiUrl}/v1/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next }),
    });
    setTasks((ts) => ts.map((t) => t.id === task.id ? { ...t, status: next } : t));
    if (selected?.id === task.id) setSelected((s) => s ? { ...s, status: next } : null);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const pid = getProjectId();
      const res = await fetch(`${apiUrl}/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newForm, status: newTaskStatus, projectId: pid }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setNewTaskStatus(null); setNewForm({ title: "", description: "" });
      await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const byStatus = (s: Status) => tasks.filter((t) => t.status === s);

  return (
    <>
      <style>{`
        .kanban-header { padding: 24px 32px 16px; font-size: 1.4rem; font-weight: 800; }
        .kanban-board { display: flex; gap: 16px; overflow-x: auto; padding: 0 32px 32px; min-height: calc(100vh - 120px); }
        .kanban-col { flex: 0 0 240px; display: flex; flex-direction: column; gap: 0; }
        .col-header { font-size: 0.8rem; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: .08em; padding: 8px 0 10px; display: flex; justify-content: space-between; align-items: center; }
        .col-body { flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .task-card { background: #111; border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; cursor: pointer; }
        .task-card:hover { border-color: var(--accent); }
        .task-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 6px; }
        .task-meta { font-size: 0.75rem; color: #555; }
        .add-task-btn { font-size: 0.8rem; color: #555; background: none; border: none; cursor: pointer; padding: 2px 0; }
        .add-task-btn:hover { color: var(--accent); }
        .error-banner { margin: 16px 32px; background: #1a0000; border: 1px solid #5c1a1a; border-radius: 8px; padding: 12px 16px; color: #f87171; }
        dialog { background: #141414; border: 1px solid var(--border); border-radius: 12px; padding: 32px; color: var(--fg); min-width: 380px; max-width: 560px; }
        dialog::backdrop { background: rgba(0,0,0,0.7); }
        .dialog-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; }
        .detail-field { margin-bottom: 14px; }
        .detail-label { font-size: 0.75rem; color: #666; margin-bottom: 4px; }
        .detail-value { font-size: 0.9rem; color: #ccc; line-height: 1.55; }
        .move-row { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
        .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .form-field label { font-size: 0.85rem; color: #aaa; }
        .form-field input, .form-field textarea { background: #0a0a0a; border: 1px solid var(--border); border-radius: 6px; padding: 9px 12px; color: var(--fg); font-size: 0.9rem; font-family: inherit; outline: none; }
        .form-field input:focus, .form-field textarea:focus { border-color: var(--accent); }
        .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
      `}</style>
      <div className="kanban-header">Tasks</div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? (
        <div style={{ padding: "40px 32px", color: "#555" }}>Loading tasks…</div>
      ) : (
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <div key={col.key} className="kanban-col">
              <div className="col-header">
                <span>{col.label} <span style={{ color: "#555", fontWeight: 400 }}>({byStatus(col.key).length})</span></span>
                <button className="add-task-btn" onClick={() => { setNewTaskStatus(col.key); setNewForm({ title: "", description: "" }); }}>+ New</button>
              </div>
              <div className="col-body">
                {byStatus(col.key).map((task) => (
                  <div key={task.id} className="task-card" onClick={() => setSelected(task)}>
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">{relativeTime(task.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <dialog ref={detailRef} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="dialog-title">{selected.title}</div>
            <div className="detail-field">
              <div className="detail-label">Status</div>
              <div className="detail-value" style={{ textTransform: "capitalize" }}>{selected.status.replace("-", " ")}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Description</div>
              <div className="detail-value">{selected.description || "No description"}</div>
            </div>
            <div className="detail-field">
              <div className="detail-label">Created</div>
              <div className="detail-value">{relativeTime(selected.createdAt)}</div>
            </div>
            <div className="move-row">
              {STATUS_ORDER.indexOf(selected.status) > 0 && (
                <button className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={() => moveTask(selected, -1)}>← Move back</button>
              )}
              {STATUS_ORDER.indexOf(selected.status) < STATUS_ORDER.length - 1 && (
                <button className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={() => moveTask(selected, 1)}>Move to → {COLUMNS[STATUS_ORDER.indexOf(selected.status) + 1]?.label}</button>
              )}
              <button className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "6px 12px", marginLeft: "auto" }} onClick={() => setSelected(null)}>Close</button>
            </div>
          </>
        )}
      </dialog>

      <dialog ref={newRef} onClose={() => setNewTaskStatus(null)}>
        <div className="dialog-title">New Task — {COLUMNS.find((c) => c.key === newTaskStatus)?.label}</div>
        <form onSubmit={createTask}>
          <div className="form-field">
            <label htmlFor="task-title">Title</label>
            <input id="task-title" required autoFocus value={newForm.title} onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="task-desc">Description</label>
            <textarea id="task-desc" rows={3} value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setNewTaskStatus(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
