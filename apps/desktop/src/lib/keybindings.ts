import { useWorkspace } from "../state/workspace";
import { useTheme } from "../state/theme";

export function installKeybindings(): () => void {
  const handler = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const ws = useWorkspace.getState();

    if (e.shiftKey) {
      const k = e.key.toLowerCase();
      if (k === "m") {
        e.preventDefault();
        ws.setSidebarView("mailbox");
        return;
      }
      if (k === "a") {
        e.preventDefault();
        ws.setSidebarView("agents");
        return;
      }
    }

    switch (e.key.toLowerCase()) {
      case "t":
        e.preventDefault();
        ws.newTab();
        break;
      case "w":
        e.preventDefault();
        if (ws.activeTabId) ws.closeTab(ws.activeTabId);
        break;
      case "p":
        e.preventDefault();
        ws.toggleQuickOpen();
        break;
      case "f":
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("forge:search"));
        break;
      case "d":
        e.preventDefault();
        ws.setTemplate(ws.activeTabId, "split");
        break;
      case "k":
        e.preventDefault();
        useTheme.getState().cycle();
        break;
      case "r":
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("forge:run-focused"));
        break;
      default: {
        if (/^[1-5]$/.test(e.key)) {
          e.preventDefault();
          const sb = ["files", "kanban", "agents", "prompts", "mailbox"] as const;
          ws.setSidebarView(sb[Number(e.key) - 1]);
        } else if (/^[6-9]$/.test(e.key)) {
          e.preventDefault();
          const idx = Number(e.key) - 6;
          const tab = ws.tabs[idx];
          if (tab) ws.selectTab(tab.id);
        }
      }
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
