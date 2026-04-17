import { useState } from "react";
import { useAgents } from "../state/agents";
import type { Agent } from "../lib/api";

const KNOWN_MODELS = [
  "claude-opus-4-7", "claude-sonnet-4-6", "gpt-4o", "gpt-4o-mini",
  "gemini-2.0-flash", "gemini-1.5-pro", "llama-3.3-70b", "custom",
];

type AgentFormValues = {
  name: string;
  systemPrompt: string;
  model: string;
  cliBinary: string;
};

const DEFAULTS: AgentFormValues = { name: "", systemPrompt: "", model: "claude-opus-4-7", cliBinary: "claude" };

function AgentCard({ agent, selected, onSelect, onDelete, onClone }: {
  agent: Agent; selected: boolean; onSelect: () => void; onDelete: () => void; onClone: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editPrompt, setEditPrompt] = useState(agent.systemPrompt);
  const updateAgent = useAgents((s) => s.updateAgent);
  const isBuiltin = agent.id.startsWith("builtin:");

  function handleSavePrompt() {
    void updateAgent(agent.id, { systemPrompt: editPrompt });
    setExpanded(false);
  }

  return (
    <div className={`agent-card${selected ? " selected" : ""}`}>
      <div className="agent-card-header" onClick={onSelect}>
        <div className="agent-avatar">{agent.name.slice(0, 2).toUpperCase()}</div>
        <div className="agent-info">
          <div className="agent-name">{agent.name}</div>
          <div className="agent-model">{agent.model ?? agent.cliBinary}</div>
        </div>
        <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
          <button className="agent-expand" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} aria-label="expand agent" title="View/edit system prompt">
            {expanded ? "▲" : "▼"}
          </button>
          <button className="agent-clone" onClick={(e) => { e.stopPropagation(); onClone(); }} aria-label="clone agent" title="Clone agent">⧉</button>
          {!isBuiltin && (
            <button className="agent-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="delete agent">×</button>
          )}
        </div>
      </div>
      {!expanded && agent.systemPrompt && (
        <div className="agent-prompt-preview">
          {agent.systemPrompt.slice(0, 100)}{agent.systemPrompt.length > 100 ? "…" : ""}
        </div>
      )}
      {expanded && (
        <div className="agent-detail-overlay" onClick={() => setExpanded(false)}>
          <div className="agent-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <strong>{agent.name}</strong>
              <button onClick={() => setExpanded(false)}>×</button>
            </div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px" }}>System Prompt</label>
            <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} rows={10} style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: "12px" }} readOnly={isBuiltin} />
            {!isBuiltin && (
              <div style={{ marginTop: "8px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => setExpanded(false)}>Cancel</button>
                <button onClick={handleSavePrompt}>Save</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAgentForm({ onClose }: { onClose: () => void }) {
  const createAgent = useAgents((s) => s.createAgent);
  const [values, setValues] = useState<AgentFormValues>(DEFAULTS);
  const [customModel, setCustomModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveModel = values.model === "custom" ? customModel : values.model;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createAgent({ ...values, model: effectiveModel });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="agent-form" onSubmit={(e) => void handleSubmit(e)}>
      <h3>New Agent</h3>
      <label>Name
        <input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} maxLength={255} required />
      </label>
      <label>Model
        <select value={values.model} onChange={(e) => setValues({ ...values, model: e.target.value })}>
          {KNOWN_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </label>
      {values.model === "custom" && (
        <label>Custom model name
          <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="e.g. mistral-7b" required />
        </label>
      )}
      <label>CLI Binary
        <input value={values.cliBinary} onChange={(e) => setValues({ ...values, cliBinary: e.target.value })} />
      </label>
      <label>System Prompt
        <textarea value={values.systemPrompt} onChange={(e) => setValues({ ...values, systemPrompt: e.target.value })} maxLength={100000} rows={6} />
      </label>
      {error && <div className="agent-form-error">{error}</div>}
      <div className="agent-form-actions">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
      </div>
    </form>
  );
}

export default function Agents() {
  const agents = useAgents((s) => s.agents);
  const selected = useAgents((s) => s.selectedAgentId);
  const selectAgent = useAgents((s) => s.selectAgent);
  const deleteAgent = useAgents((s) => s.deleteAgent);
  const createAgent = useAgents((s) => s.createAgent);
  const loading = useAgents((s) => s.loading);
  const [showCreate, setShowCreate] = useState(false);

  function cloneAgent(agent: Agent) {
    void createAgent({
      name: `${agent.name} (copy)`,
      systemPrompt: agent.systemPrompt,
      model: agent.model ?? "claude-opus-4-7",
      cliBinary: agent.cliBinary ?? "claude",
      cliArgs: agent.cliArgs ?? [],
    });
  }

  return (
    <div className="agents-panel">
      <div className="agents-toolbar">
        <span className="agents-title">Agents</span>
        <button className="btn-add" onClick={() => setShowCreate(true)}>+ New</button>
      </div>
      {loading && <div className="agents-loading">Loading…</div>}
      {showCreate && <CreateAgentForm onClose={() => setShowCreate(false)} />}
      <div className="agent-list">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            selected={agent.id === selected}
            onSelect={() => selectAgent(agent.id)}
            onDelete={() => void deleteAgent(agent.id)}
            onClone={() => cloneAgent(agent)}
          />
        ))}
      </div>
    </div>
  );
}
