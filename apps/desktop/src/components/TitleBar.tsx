import { useWorkspace } from "../state/workspace";
import ThemePicker from "./ThemePicker";

async function toggleMaximize() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  } catch {
    // non-Tauri context
  }
}

export default function TitleBar() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const selectTab = useWorkspace((s) => s.selectTab);
  const closeTab = useWorkspace((s) => s.closeTab);
  const newTab = useWorkspace((s) => s.newTab);
  const projectName = useWorkspace((s) => s.activeProjectName ?? "Forge");

  return (
    <div className="titlebar" data-tauri-drag-region onDoubleClick={() => void toggleMaximize()}>
      <div className="brand">{projectName}</div>
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <div
            key={t.id}
            role="tab"
            aria-selected={t.id === activeTabId}
            className={`tab${t.id === activeTabId ? " active" : ""}`}
            onClick={() => selectTab(t.id)}
          >
            <span>{t.title}</span>
            <button aria-label="close tab" className="tab-close" onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>×</button>
          </div>
        ))}
        <button className="tab-new" onClick={() => newTab()} aria-label="new tab">+</button>
      </div>
      <ThemePicker />
    </div>
  );
}
