import { useEffect } from "react";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Grid from "./components/Grid";
import QuickOpen from "./components/QuickOpen";
import { useWorkspace } from "./state/workspace";
import { useTheme } from "./state/theme";
import { useAuth } from "./lib/auth";
import { installKeybindings } from "./lib/keybindings";

export default function App() {
  const hydrate = useWorkspace((s) => s.hydrate);
  const hydrateTheme = useTheme((s) => s.hydrate);
  const applyTheme = useTheme((s) => s.apply);
  const currentTheme = useTheme((s) => s.current);
  const initAuth = useAuth((s) => s.init);

  useEffect(() => {
    void hydrate();
    void hydrateTheme();
    void initAuth();
    const off = installKeybindings();
    return off;
  }, [hydrate, hydrateTheme, initAuth]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  return (
    <div className="app">
      <TitleBar />
      <div className="body">
        <Sidebar />
        <main className="main">
          <Grid />
        </main>
      </div>
      <QuickOpen />
    </div>
  );
}
