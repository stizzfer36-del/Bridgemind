"use client";
import { useEffect, useRef, useState } from "react";

interface ApiKey {
  id: string;
  prefix: string;
  label: string;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Keys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const createDialogRef = useRef<HTMLDialogElement>(null);
  const revokeDialogRef = useRef<HTMLDialogElement>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const res = await fetch(`${apiUrl}/v1/keys`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setKeys(data.keys ?? data);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load keys"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (createOpen) createDialogRef.current?.showModal(); else createDialogRef.current?.close(); }, [createOpen]);
  useEffect(() => { if (revokeTarget) revokeDialogRef.current?.showModal(); else revokeDialogRef.current?.close(); }, [revokeTarget]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const res = await fetch(`${apiUrl}/v1/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setNewKey(data.key ?? data.secret ?? "");
      setCopied(false); setConfirmed(false);
      setCreateOpen(false); setLabel("");
      await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed to create key"); }
    finally { setSaving(false); }
  }

  async function revokeKey(key: ApiKey) {
    try {
      const token = localStorage.getItem("forge:token") ?? "";
      const res = await fetch(`${apiUrl}/v1/keys/${key.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setRevokeTarget(null); await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed to revoke key"); }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
  }

  return (
    <>
      <style>{`
        .keys-header { display: flex; justify-content: space-between; align-items: center; padding: 28px 40px 20px; }
        .keys-header h1 { font-size: 1.5rem; font-weight: 800; }
        .new-key-banner { margin: 0 40px 24px; background: #052e16; border: 1px solid #166534; border-radius: 10px; padding: 20px 24px; }
        .new-key-banner h3 { color: #22c55e; font-size: 0.9rem; font-weight: 700; margin-bottom: 10px; }
        .key-display { font-family: monospace; font-size: 0.85rem; background: #0a1a0d; border: 1px solid #166534; border-radius: 6px; padding: 10px 14px; color: #86efac; word-break: break-all; margin-bottom: 12px; }
        .banner-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .copy-indicator { font-size: 0.8rem; color: #22c55e; }
        .keys-table { width: 100%; border-collapse: collapse; margin: 0 0 32px; }
        .keys-section { padding: 0 40px 40px; }
        .keys-table th { text-align: left; padding: 10px 14px; font-size: 0.75rem; color: #666; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid var(--border); }
        .keys-table td { padding: 14px 14px; font-size: 0.875rem; border-bottom: 1px solid #181818; }
        .key-prefix { font-family: monospace; color: #aaa; }
        .error-banner { margin: 0 40px 16px; background: #1a0000; border: 1px solid #5c1a1a; border-radius: 8px; padding: 12px 16px; color: #f87171; }
        .empty-state { padding: 60px 40px; text-align: center; color: #555; }
        dialog { background: #141414; border: 1px solid var(--border); border-radius: 12px; padding: 32px; color: var(--fg); min-width: 380px; }
        dialog::backdrop { background: rgba(0,0,0,0.7); }
        .dialog-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; }
        .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .form-field label { font-size: 0.85rem; color: #aaa; }
        .form-field input { background: #0a0a0a; border: 1px solid var(--border); border-radius: 6px; padding: 9px 12px; color: var(--fg); font-size: 0.9rem; outline: none; }
        .form-field input:focus { border-color: var(--accent); }
        .dialog-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .confirm-msg { color: #aaa; font-size: 0.9rem; margin-bottom: 20px; }
        .btn-danger { background: #7f1d1d; color: #fca5a5; border: none; border-radius: 6px; padding: 10px 20px; font-weight: 600; cursor: pointer; }
      `}</style>
      <div className="keys-header">
        <h1>API Keys</h1>
        <button className="btn btn-primary" onClick={() => { setLabel(""); setCreateOpen(true); }}>+ New Key</button>
      </div>

      {newKey && !confirmed && (
        <div className="new-key-banner">
          <h3>Save your key — it will only be shown once</h3>
          <div className="key-display">{newKey}</div>
          <div className="banner-actions">
            <button className="btn btn-primary" style={{ fontSize: "0.85rem" }} onClick={copyKey}>{copied ? "Copied!" : "Copy key"}</button>
            {copied && <span className="copy-indicator">Copied to clipboard</span>}
            <button className="btn btn-outline" style={{ fontSize: "0.85rem" }} onClick={() => setConfirmed(true)}>I&apos;ve copied this</button>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="keys-section">
        {loading ? (
          <div style={{ color: "#555" }}>Loading keys…</div>
        ) : keys.length === 0 && !error ? (
          <div className="empty-state"><p style={{ marginBottom: 16 }}>No API keys yet</p><button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Create your first key</button></div>
        ) : (
          <table className="keys-table">
            <thead>
              <tr><th>Key</th><th>Label</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td><span className="key-prefix">{k.prefix}…</span></td>
                  <td>{k.label || <span style={{ color: "#555" }}>—</span>}</td>
                  <td style={{ color: "#666" }}>{formatDate(k.createdAt)}</td>
                  <td><button className="btn btn-outline" style={{ fontSize: "0.8rem", padding: "5px 10px", color: "#f87171", borderColor: "#5c1a1a" }} onClick={() => setRevokeTarget(k)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <dialog ref={createDialogRef} onClose={() => setCreateOpen(false)}>
        <div className="dialog-title">Create API Key</div>
        <form onSubmit={createKey}>
          <div className="form-field">
            <label htmlFor="key-label">Label (optional)</label>
            <input id="key-label" placeholder="e.g. CI pipeline" autoFocus value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-outline" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </dialog>

      <dialog ref={revokeDialogRef} onClose={() => setRevokeTarget(null)}>
        <div className="dialog-title">Revoke key?</div>
        <p className="confirm-msg">Revoking <code style={{ color: "#aaa" }}>{revokeTarget?.prefix}…</code> will immediately invalidate it. This cannot be undone.</p>
        <div className="dialog-actions">
          <button className="btn btn-outline" onClick={() => setRevokeTarget(null)}>Cancel</button>
          <button className="btn-danger" onClick={() => revokeTarget && revokeKey(revokeTarget)}>Revoke</button>
        </div>
      </dialog>
    </>
  );
}
