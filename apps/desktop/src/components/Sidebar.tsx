import { useWorkspace } from "../state/workspace";
import FileTree from "./FileTree";
import Kanban from "./Kanban";
import AgentList from "./AgentList";
import PromptLibrary from "./PromptLibrary";
import Mailbox from "./Mailbox";

const VIEWS = [
  { key: "files", label: "Files", chord: "⌘1" },
  { key: "kanban", label: "Kanban", chord: "⌘2" },
  { key: "agents", label: "Agents", chord: "⌘3" },
  { key: "prompts", label: "Prompts", chord: "⌘4" },
  { key: "mailbox", label: "Mailbox", chord: "⌘5" },
] as const;

export default function Sidebar() {
  const view = useWorkspace((s) => s.sidebarView);
  const setView = useWorkspace((s) => s.setSidebarView);

  return (
    <aside className="sidebar" style={{ width: 240 }}>
      <nav className="sidebar-tabs">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            className={view === v.key ? "active" : ""}
            title={v.chord}
            onClick={() => setView(v.key)}
          >
            {v.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-body">
        {view === "files" && <FileTree />}
        {view === "kanban" && <Kanban />}
        {view === "agents" && <AgentList />}
        {view === "prompts" && <PromptLibrary />}
        {view === "mailbox" && <Mailbox />}
      </div>
    </aside>
  );
}
