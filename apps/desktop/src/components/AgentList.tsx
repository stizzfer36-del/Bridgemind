import { useAgents } from "../state/agents";

export default function AgentList() {
  const agents = useAgents((s) => s.agents);
  const selected = useAgents((s) => s.selectedAgentId);
  const select = useAgents((s) => s.selectAgent);

  return (
    <div className="agentlist">
      {agents.map((a) => (
        <button
          key={a.id}
          className={`agent${a.id === selected ? " selected" : ""}`}
          onClick={() => select(a.id)}
        >
          <div className="agent-avatar">{a.name.slice(0, 2).toUpperCase()}</div>
          <div className="agent-name">{a.name}</div>
        </button>
      ))}
    </div>
  );
}
