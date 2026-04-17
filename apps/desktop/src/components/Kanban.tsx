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
  const [filterQ, setFilterQ] = useState("");
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!projectId) return;
    void refresh();
    startPolling();
    return () => stopPolling();
  }, [projectId, refresh, startPolling, stopPolling]);

  const filteredTasks = filterQ
    ? tasks.filter((t) =>
        t.instructions.toLowerCase().includes(filterQ.toLowerCase())
      )
    : tasks;

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
        <input
          placeholder="Filter tasks…"
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
          style={{ flex: 1, marginRight: "8px" }}
        />
        <button onClick={() => setShowNew(true)}>+ New Task</button>
      </div>
      <div className="kanban-cols">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            status={c.status}
            label={c.label}
            tasks={filteredTasks.filter((t) => t.status === c.status)}
            onMove={moveTask}
            onDetail={setDetailTask}
          />
        ))}
      </div>
      {showNew && <NewTask onClose={() => setShowNew(false)} />}
      {detailTask && (
        <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}

function Column(props: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onMove: (taskId: string, s: TaskStatus) => void;
  onDetail: (task: Task) => void;
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
        <Card key={t.id} task={t} onDetail={props.onDetail} />
      ))}
    </div>
  );
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <strong>Task Detail</strong>
          <button onClick={onClose}>×</button>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "11px", opacity: 0.6, marginBottom: "4px" }}>Instructions</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px" }}>{task.instructions}</pre>
        </div>
        {task.taskKnowledge && (
          <div>
            <div style={{ fontSize: "11px", opacity: 0.6, marginBottom: "4px" }}>Task Knowledge</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: "12px" }}>{task.taskKnowledge}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ task, onDetail }: { task: Task; onDetail: (task: Task) => void }) {
  const selectedAgentId = useAgents((s) => s.selectedAgentId);
  const agents = useAgents((s) => s.agents);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tabs = useWorkspace((s) => s.tabs);
  const projectPaths = useWorkspace((s) => s.projectPaths);
  const setProjectPath = useWorkspace((s) => s.setProjectPath);
  const moveTask = useKanban((s) => s.moveTask);
  const [confirmRun, setConfirmRun] = useState(false);

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
    setConfirmRun(false);
    const path = await resolveProjectPath();
    if (!path) return;
    const agent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
    if (!agent) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    const pane = tab.panes[0];
    if (!pane) return;
    await spawnPane({ workspaceId: tab.id, paneId: pane.id, cwd: path });
    await moveTask(task.id, "in-progress");
    await launchAgentInPane(pane.id, { task, agent, projectAbsolutePath: path });
  }

  const agent = agents.find((a) => a.id === selectedAgentId) ?? agents[0];
  const title = (task.instructions || "").slice(0, 60);

  return (
    <div
      className="card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task-id", task.id)}
      onClick={() => onDetail(task)}
    >
      <div className="card-title">{title}</div>
      <div className="card-meta">
        <span className={`pill status-${task.status}`}>{task.status}</span>
        <button
          className="run"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmRun(true);
          }}
        >
          Run Task
        </button>
      </div>
      {confirmRun && (
        <div className="card-confirm" onClick={(e) => e.stopPropagation()} style={{ marginTop: "6px", fontSize: "11px" }}>
          Run with {agent?.name ?? "agent"}?{" "}
          <button onClick={() => void runTask()} style={{ marginRight: "4px" }}>Yes</button>
          <button onClick={() => setConfirmRun(false)}>Cancel</button>
        </div>
      )}
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
          <button onClick={() => void submit()}>Create</button>
        </div>
      </div>
    </div>
  );
}
