import { useEffect, useState } from "react";
import { readDir, type DirEntry } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspace } from "../state/workspace";

type Node = DirEntry & { path: string; children?: Node[]; expanded?: boolean };

export default function FileTree() {
  const [root, setRoot] = useState<string | null>(null);
  const [tree, setTree] = useState<Node[]>([]);
  const setPane = useWorkspace((s) => s.setPane);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tabs = useWorkspace((s) => s.tabs);

  useEffect(() => {
    if (!root) return;
    void readDir(root)
      .then((entries) =>
        entries.map((e) => ({ ...e, path: `${root}/${e.name}` }) as Node)
      )
      .then(setTree);
  }, [root]);

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setRoot(selected);
  }

  function openInEditor(path: string) {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    setPane(tab.id, 0, {
      id: tab.panes[0]?.id ?? `p-${Date.now()}`,
      kind: "editor",
      filePath: path,
    });
  }

  if (!root) {
    return (
      <div className="filetree empty">
        <button onClick={pickFolder}>Open folder…</button>
      </div>
    );
  }

  return (
    <div className="filetree">
      <div className="filetree-root">{root}</div>
      <ul>
        {tree.map((n) => (
          <li key={n.path}>
            <span
              className={n.isDirectory ? "dir" : "file"}
              onClick={() => !n.isDirectory && openInEditor(n.path)}
            >
              {n.isDirectory ? "▸" : "·"} {n.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
