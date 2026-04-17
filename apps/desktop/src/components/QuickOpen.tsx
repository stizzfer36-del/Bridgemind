import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspace } from "../state/workspace";

type FileEntry = { name: string; path: string; rel: string };

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

async function indexDir(root: string): Promise<FileEntry[]> {
  try {
    const { readDir } = await import("@tauri-apps/plugin-fs");
    const entries: FileEntry[] = [];
    async function recurse(dir: string, prefix: string) {
      const items = await readDir(dir);
      for (const item of items) {
        const fullPath = `${dir}/${item.name}`;
        const rel = prefix ? `${prefix}/${item.name}` : (item.name ?? "");
        if (item.isDirectory) {
          await recurse(fullPath, rel);
        } else {
          entries.push({ name: item.name ?? "", path: fullPath, rel });
        }
      }
    }
    await recurse(root, "");
    return entries;
  } catch {
    return [];
  }
}

export default function QuickOpen() {
  const visible = useWorkspace((s) => s.quickOpenVisible);
  const toggle = useWorkspace((s) => s.toggleQuickOpen);
  const setPane = useWorkspace((s) => s.setPane);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tabs = useWorkspace((s) => s.tabs);
  const projectPaths = useWorkspace((s) => s.projectPaths);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (visible) {
      setQ("");
      setDebouncedQ("");
      setSelectedIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
      const paths = Object.values(projectPaths);
      const root = paths[0];
      if (root) {
        void indexDir(root).then(setEntries);
      }
    }
  }, [visible, projectPaths]);

  function handleQChange(value: string) {
    setQ(value);
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQ(value);
      setSelectedIdx(0);
    }, 100);
  }

  const results = useMemo(() => {
    if (!debouncedQ) return entries.slice(0, 50);
    return entries
      .map((e) => ({ e, score: fuzzyMatch(debouncedQ, e.rel) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((x) => x.e);
  }, [debouncedQ, entries]);

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
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Go to file…"
          onKeyDown={(e) => {
            if (e.key === "Escape") { toggle(); return; }
            if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter" && results[selectedIdx]) openPath(results[selectedIdx].path);
          }}
        />
        <ul>
          {results.map((r, idx) => (
            <li
              key={r.path}
              onClick={() => openPath(r.path)}
              style={idx === selectedIdx ? { background: "rgba(127,127,127,0.15)" } : undefined}
            >
              <span className="name">{r.name}</span>
              <span className="path">{r.rel}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
