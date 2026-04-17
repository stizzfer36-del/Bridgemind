import React, { useEffect, useState } from "react";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import Grid from "./components/Grid";
import QuickOpen from "./components/QuickOpen";
import { useWorkspace } from "./state/workspace";
import { useTheme } from "./state/theme";
import { useAuth } from "./lib/auth";
import { installKeybindings } from "./lib/keybindings";

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: "16px",
            background: "var(--bg)",
            color: "var(--fg)",
          }}
        >
          <div
            style={{
              border: "1px solid var(--err, #ff4d4f)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "480px",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "var(--err, #ff4d4f)", margin: "0 0 12px" }}>
              Something went wrong
            </h2>
            <p style={{ opacity: 0.8, margin: "0 0 16px", wordBreak: "break-word" }}>
              {this.state.error.message}
            </p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const hydrate = useWorkspace((s) => s.hydrate);
  const hydrateTheme = useTheme((s) => s.hydrate);
  const applyTheme = useTheme((s) => s.apply);
  const currentTheme = useTheme((s) => s.current);
  const initAuth = useAuth((s) => s.init);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void Promise.all([hydrate(), hydrateTheme(), initAuth()]).then(() => {
      setHydrated(true);
    });
    const off = installKeybindings();
    return off;
  }, [hydrate, hydrateTheme, initAuth]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme, applyTheme]);

  if (!hydrated) {
    return (
      <div className="splash">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Forge logo">
          <rect width="48" height="48" rx="10" fill="var(--accent, #7aa2f7)" opacity="0.15" />
          <path d="M12 36 L24 12 L36 36" stroke="var(--accent, #7aa2f7)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M16 28 L32 28" stroke="var(--accent, #7aa2f7)" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="spinner" style={{ marginTop: "16px" }} />
      </div>
    );
  }

  return (
    <AppErrorBoundary>
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
    </AppErrorBoundary>
  );
}
