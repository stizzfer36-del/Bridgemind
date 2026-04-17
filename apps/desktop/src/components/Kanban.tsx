import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useKanban } from "../state/kanban";
import { useAgents } from "../state/agents";
import { useWorkspace } from "../state/workspace";
import type { Task, TaskStatus } from "../lib/api";
import { spawnPane } from "../lib/ipc";
import { launchAgentInPane } from "../lib/agentLaunch";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "Todo" },
  { status: "in-progress", label: "In Progress" },
  { status: "in-review", label: "In Review" },
  { status: "complete", label: "Complete" },
];

export default function Kanban() {
  const projectId = useKanban((s) => s.projectId);
  const tasks = useKanban((s) => s.tasks);
  const offline = useKanban((s) => s.offline);
  const error = useKanban((s) => s.error);
  const refresh = useKanban((s) => s.refresh);
  const startPolling = useKanban((s) => s.startPolling);
  const stopPolling = useKanban((s) => s.stopPolling);
  const moveTask = useKanban((s) => s.moveTask);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    void refresh();
    startPolling();
    return () => stopPolling();
  }, [projectId, refresh, startPolling, stopPolling]);

  if (!projectId) {
    return (
      <div className="kanban empty">
        <p>No project selected.</p>
      </div>
    );
  }

  return (
    <div className="kanban">
      {offline && <div className="banner offline">API unreachable — Kanban cached</div>}
      {error && !offline && <div className="banner error">{error}</div>}
      <div className="kanban-toolbar">
        <button onClick={() => setShowNew(true)}>+ New Task</button>
      </div>
      <div className="kanban-cols">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            status={c.status}
            label={c.label}
            tasks={tasks.filter((t) => t.status === c.status)}
            onMove={moveTask}
          />
        ))}
      </div>
      {showNew && <NewTask onClose={() => setShowNew(false)} />}
    </div>
  );
}

function Column(props: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onMove: (taskId: string, s: TaskStatus) => void;
}) {
  return (
    <div
      className="kanban-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/task-id");
        if (id) props.onMove(id, props.status);
      }}
    >
      <h4>{props.label}</h4>
      {props.tasks.map((t) => (
        <Card key={t.id} task={t} />
      ))}
    </div>
  );
}

function Card({ task }: { task: Task }) {
  const selectedAgentId = useAgents((s) => s.selectedAgentId);
  const agents = useAgents((s) => s.agents);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tabs = useWorkspace((s) => s.tabs);
  const projectPaths = useWorkspace((s) => s.projectPaths);
  const setProjectPath = useWorkspace((s) => s.setProjectPath);
  const moveTask = useKanban((s) => s.moveTask);

  async function resolveProjectPath(): Promise<string | null> {
    const stored = projectPaths[task.projectId];
    if (stored) return stored;
    const picked = await openDialog({ directory: true, multiple: false });
    if (typeof picked === "string") {
      setProjectPath(task.projectId, picked);
      return picked;
    }
    return null;
  }

  async function runTask() {
    const path = await resolveProjectPath();
    if (!path) return;
    const agent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
    if (!agent) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    const pane = tab.panes[0];
    if (!pane) return;
    await spawnPane({
      workspaceId: tab.id,
      paneId: pane.id,
      cwd: path,
    });
    await moveTask(task.id, "in-progress");
    await launchAgentInPane(pane.id, {
      task,
      agent,
      projectAbsolutePath: path,
    });
  }

  const title = (task.instructions || "").slice(0, 60);

  return (
    <div
      className="card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
    >
      <div className="card-title">{title}</div>
      <div className="card-meta">
        <span className={`pill status-${task.status}`}>{task.status}</span>
        <button className="run" onClick={runTask}>
          Run Task
        </button>
      </div>
    </div>
  );
}

function NewTask({ onClose }: { onClose: () => void }) {
  const createTask = useKanban((s) => s.createTask);
  const [instructions, setInstructions] = useState("");
  const [knowledge, setKnowledge] = useState("");

  async function submit() {
    await createTask({ instructions, taskKnowledge: knowledge });
    onClose();
  }

  return (
    <div className="modal" role="dialog">
      <div className="modal-body">
        <h3>New task</h3>
        <textarea
          placeholder="Instructions (max 5000 chars)"
          maxLength={5000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
        <textarea
          placeholder="Task knowledge (max 50000 chars)"
          maxLength={50000}
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
        />
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={submit}>Create</button>
        </div>
      </div>
    </div>
  );
}
