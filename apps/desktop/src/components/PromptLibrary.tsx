import { useState } from "react";
import { useKanban } from "../state/kanban";

type Prompt = { id: string; label: string; body: string; custom?: boolean };

const BUILTIN_PROMPTS: Prompt[] = [
  { id: "fix-tests", label: "Fix failing tests", body: "Run the test suite, identify failures, and fix them without changing intent." },
  { id: "refactor", label: "Refactor module", body: "Refactor for clarity and reuse without changing behavior. Preserve tests." },
  { id: "review", label: "Code review", body: "Review the staged diff and surface risks, bugs, and style issues." },
  { id: "docs", label: "Write docs", body: "Document public APIs with examples. Keep it concise." },
  { id: "migrate", label: "Migrate dependency", body: "Upgrade the target dependency and fix breaking changes." },
];

function loadCustom(): Prompt[] {
  try {
    const raw = localStorage.getItem("forge:custom-prompts");
    if (!raw) return [];
    return JSON.parse(raw) as Prompt[];
  } catch {
    return [];
  }
}

function saveCustom(prompts: Prompt[]) {
  localStorage.setItem("forge:custom-prompts", JSON.stringify(prompts));
}

export default function PromptLibrary() {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState<Prompt[]>(() => loadCustom());
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newBody, setNewBody] = useState("");
  const projectId = useKanban((s) => s.projectId);
  const createTask = useKanban((s) => s.createTask);

  const all = [...BUILTIN_PROMPTS, ...custom];
  const filtered = all.filter(
    (p) =>
      p.label.toLowerCase().includes(q.toLowerCase()) ||
      p.body.toLowerCase().includes(q.toLowerCase())
  );

  function handleUse(prompt: Prompt) {
    if (!projectId) return;
    void createTask({ instructions: prompt.body });
  }

  function handleAdd() {
    if (!newLabel.trim() || !newBody.trim()) return;
    const p: Prompt = { id: `custom-${Date.now()}`, label: newLabel.trim(), body: newBody.trim(), custom: true };
    const updated = [...custom, p];
    setCustom(updated);
    saveCustom(updated);
    setNewLabel("");
    setNewBody("");
    setShowAdd(false);
  }

  function handleDelete(id: string) {
    const updated = custom.filter((p) => p.id !== id);
    setCustom(updated);
    saveCustom(updated);
  }

  return (
    <div className="prompts">
      <input placeholder="Search prompts" value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={() => setShowAdd((v) => !v)} style={{ marginTop: "6px", width: "100%" }}>
        + Add custom prompt
      </button>
      {showAdd && (
        <div style={{ border: "1px solid var(--border)", borderRadius: "4px", padding: "8px", marginTop: "6px" }}>
          <input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={{ width: "100%", marginBottom: "4px" }} />
          <textarea placeholder="Body" value={newBody} onChange={(e) => setNewBody(e.target.value)} rows={3} style={{ width: "100%", marginBottom: "4px" }} />
          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            <button onClick={() => setShowAdd(false)}>Cancel</button>
            <button onClick={handleAdd}>Save</button>
          </div>
        </div>
      )}
      <ul>
        {filtered.map((p) => (
          <li key={p.id} className="prompt">
            <div className="prompt-label">
              {p.label}
              {p.custom && <span style={{ opacity: 0.5, fontSize: "10px", marginLeft: "4px" }}>(custom)</span>}
            </div>
            <div className="prompt-body">{p.body}</div>
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <button style={{ fontSize: "10px", padding: "1px 6px" }} onClick={() => handleUse(p)} disabled={!projectId} title={!projectId ? "Select a project first" : "Create task from prompt"}>
                Use
              </button>
              {p.custom && (
                <button style={{ fontSize: "10px", padding: "1px 6px" }} onClick={() => handleDelete(p.id)}>
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
