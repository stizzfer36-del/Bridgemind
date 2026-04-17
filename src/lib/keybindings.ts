import { useWorkspace } from "../state/workspace";
import { useTheme } from "../state/theme";

export function installKeybindings(): () => void {
  const handler = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const ws = useWorkspace.getState();
    switch (e.key.toLowerCase()) {
      case "t":
        e.preventDefault();
        ws.newTab();
        break;
      case "w": {
        e.preventDefault();
        if (ws.activeTabId) ws.closeTab(ws.activeTabId);
        break;
      }
      case "p":
        e.preventDefault();
        ws.toggleQuickOpen();
        break;
      case "f":
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("bs:search"));
        break;
      case "d":
        e.preventDefault();
        ws.setTemplate(ws.activeTabId, "split");
        break;
      case "k":
        e.preventDefault();
        useTheme.getState().cycle();
        break;
      default: {
        if (/^[1-9]$/.test(e.key)) {
          e.preventDefault();
          const idx = Number(e.key) - 1;
          const tab = ws.tabs[idx];
          if (tab) ws.selectTab(tab.id);
        }
      }
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
