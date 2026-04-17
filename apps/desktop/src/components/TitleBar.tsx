import { useWorkspace } from "../state/workspace";
import ThemePicker from "./ThemePicker";

export default function TitleBar() {
  const tabs = useWorkspace((s) => s.tabs);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const selectTab = useWorkspace((s) => s.selectTab);
  const closeTab = useWorkspace((s) => s.closeTab);
  const newTab = useWorkspace((s) => s.newTab);

  return (
    <div className="titlebar">
      <div className="brand">BridgeSpace</div>
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
            <button
              aria-label="close tab"
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(t.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button className="tab-new" onClick={() => newTab()} aria-label="new tab">
          +
        </button>
      </div>
      <ThemePicker />
    </div>
  );
}
