import { useState } from "react";
import { useAgents } from "../state/agents";
import type { Agent } from "../lib/api";

type AgentFormValues = {
  name: string;
  systemPrompt: string;
  model: string;
  cliBinary: string;
};

const DEFAULTS: AgentFormValues = {
  name: "",
  systemPrompt: "",
  model: "claude-opus-4-7",
  cliBinary: "claude",
};

function AgentCard({
  agent,
  selected,
  onSelect,
  onDelete,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const isBuiltin = agent.id.startsWith("builtin:");
  return (
    <div className={`agent-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <div className="agent-card-header">
        <div className="agent-avatar">{agent.name.slice(0, 2).toUpperCase()}</div>
        <div className="agent-info">
          <div className="agent-name">{agent.name}</div>
          <div className="agent-model">{agent.model ?? agent.cliBinary}</div>
        </div>
        {!isBuiltin && (
          <button
            className="agent-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="delete agent"
          >
            ×
          </button>
        )}
      </div>
      {agent.systemPrompt && (
        <div className="agent-prompt-preview">
          {agent.systemPrompt.slice(0, 100)}
          {agent.systemPrompt.length > 100 ? "…" : ""}
        </div>
      )}
    </div>
  );
}

function CreateAgentForm({ onClose }: { onClose: () => void }) {
  const createAgent = useAgents((s) => s.createAgent);
  const [values, setValues] = useState<AgentFormValues>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await createAgent(values);
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
      <label>
        Name
        <input
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          maxLength={255}
          required
        />
      </label>
      <label>
        Model
        <input
          value={values.model}
          onChange={(e) => setValues({ ...values, model: e.target.value })}
        />
      </label>
      <label>
        CLI Binary
        <input
          value={values.cliBinary}
          onChange={(e) => setValues({ ...values, cliBinary: e.target.value })}
        />
      </label>
      <label>
        System Prompt
        <textarea
          value={values.systemPrompt}
          onChange={(e) => setValues({ ...values, systemPrompt: e.target.value })}
          maxLength={100000}
          rows={6}
        />
      </label>
      {error && <div className="agent-form-error">{error}</div>}
      <div className="agent-form-actions">
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}

export default function Agents() {
  const agents = useAgents((s) => s.agents);
  const selected = useAgents((s) => s.selectedAgentId);
  const selectAgent = useAgents((s) => s.selectAgent);
  const deleteAgent = useAgents((s) => s.deleteAgent);
  const loading = useAgents((s) => s.loading);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="agents-panel">
      <div className="agents-toolbar">
        <span className="agents-title">Agents</span>
        <button className="btn-add" onClick={() => setShowCreate(true)}>
          + New
        </button>
      </div>

      {loading && <div className="agents-loading">Loading…</div>}

      {showCreate && (
        <CreateAgentForm onClose={() => setShowCreate(false)} />
      )}

      <div className="agent-list">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            selected={agent.id === selected}
            onSelect={() => selectAgent(agent.id)}
            onDelete={() => void deleteAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}
