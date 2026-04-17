import { useWorkspace } from "../state/workspace";
import FileTree from "./FileTree";
import Kanban from "./Kanban";
import AgentList from "./AgentList";
import PromptLibrary from "./PromptLibrary";

export default function Sidebar() {
  const view = useWorkspace((s) => s.sidebarView);
  const setView = useWorkspace((s) => s.setSidebarView);

  return (
    <aside className="sidebar" style={{ width: 240 }}>
      <nav className="sidebar-tabs">
        <button
          className={view === "files" ? "active" : ""}
          onClick={() => setView("files")}
        >
          Files
        </button>
        <button
          className={view === "kanban" ? "active" : ""}
          onClick={() => setView("kanban")}
        >
          Kanban
        </button>
        <button
          className={view === "agents" ? "active" : ""}
          onClick={() => setView("agents")}
        >
          Agents
        </button>
        <button
          className={view === "prompts" ? "active" : ""}
          onClick={() => setView("prompts")}
        >
          Prompts
        </button>
      </nav>
      <div className="sidebar-body">
        {view === "files" && <FileTree />}
        {view === "kanban" && <Kanban />}
        {view === "agents" && <AgentList />}
        {view === "prompts" && <PromptLibrary />}
      </div>
    </aside>
  );
}
