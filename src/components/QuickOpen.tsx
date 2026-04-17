import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../state/workspace";

type FileEntry = { name: string; path: string };

function fuzzyMatch(q: string, s: string): number {
  q = q.toLowerCase();
  s = s.toLowerCase();
  let si = 0;
  let score = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    const idx = s.indexOf(c, si);
    if (idx === -1) return -1;
    score += idx === si ? 2 : 1;
    si = idx + 1;
  }
  return score;
}

export default function QuickOpen() {
  const visible = useWorkspace((s) => s.quickOpenVisible);
  const toggle = useWorkspace((s) => s.toggleQuickOpen);
  const setPane = useWorkspace((s) => s.setPane);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tabs = useWorkspace((s) => s.tabs);

  const [q, setQ] = useState("");
  const [entries] = useState<FileEntry[]>([
    // Seeded — a real impl would index the active folder via fs:readDir.
    { name: "App.tsx", path: "src/App.tsx" },
    { name: "main.tsx", path: "src/main.tsx" },
    { name: "package.json", path: "package.json" },
    { name: "README.md", path: "README.md" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setQ("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [visible]);

  const results = useMemo(() => {
    if (!q) return entries;
    return entries
      .map((e) => ({ e, score: fuzzyMatch(q, e.name) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.e);
  }, [q, entries]);

  function openPath(path: string) {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    setPane(tab.id, 0, {
      id: tab.panes[0]?.id ?? `p-${Date.now()}`,
      kind: "editor",
      filePath: path,
    });
    toggle();
  }

  if (!visible) return null;

  return (
    <div className="quickopen-overlay" onClick={toggle}>
      <div className="quickopen" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Go to file…"
          onKeyDown={(e) => {
            if (e.key === "Escape") toggle();
            if (e.key === "Enter" && results[0]) openPath(results[0].path);
          }}
        />
        <ul>
          {results.map((r) => (
            <li key={r.path} onClick={() => openPath(r.path)}>
              <span className="name">{r.name}</span>
              <span className="path">{r.path}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
