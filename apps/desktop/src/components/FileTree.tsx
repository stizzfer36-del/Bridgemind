import { useEffect, useState, useRef } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useWorkspace } from "../state/workspace";

type FsNode = { name: string; path: string; isDir: boolean; children?: FsNode[] };
type ContextMenu = { x: number; y: number; node: FsNode } | null;

function fileIcon(name: string, isDir: boolean): string {
  if (isDir) return "📁";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "rs") return "🦀";
  if (ext === "ts" || ext === "tsx") return "🟦";
  if (ext === "py") return "🐍";
  if (ext === "md") return "📝";
  return "📄";
}

async function buildTree(dirPath: string, depth = 0): Promise<FsNode[]> {
  if (depth > 3) return [];
  const entries = await readDir(dirPath);
  const nodes: FsNode[] = [];
  for (const e of entries) {
    const nodePath = `${dirPath}/${e.name}`;
    const node: FsNode = { name: e.name ?? "", path: nodePath, isDir: !!e.isDirectory };
    if (e.isDirectory && depth < 2) {
      try { node.children = await buildTree(nodePath, depth + 1); }
      catch { node.children = []; }
    }
    nodes.push(node);
  }
  return nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({ node, onOpen, onContextMenu }: { node: FsNode; onOpen: (p: string) => void; onContextMenu: (e: React.MouseEvent, n: FsNode) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div className="filetree-node" onClick={() => { if (node.isDir) setExpanded((v) => !v); else onOpen(node.path); }} onContextMenu={(e) => onContextMenu(e, node)}>
        <span>{node.isDir ? (expanded ? "▾" : "▸") : " "}</span>
        <span>{fileIcon(node.name, node.isDir)}</span>
        <span style={{ marginLeft: "4px" }}>{node.name}</span>
      </div>
      {node.isDir && expanded && node.children && (
        <div className="filetree-children">
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} onOpen={onOpen} onContextMenu={onContextMenu} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree() {
  const [root, setRoot] = useState<string | null>(null);
  const [tree, setTree] = useState<FsNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const setPane = useWorkspace((s) => s.setPane);
  const activeTabId = useWorkspace((s) => s.activeTabId);
  const tabs = useWorkspace((s) => s.tabs);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!root) return;
    setLoading(true);
    void buildTree(root).then(setTree).finally(() => setLoading(false));
  }, [root]);

  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    document.addEventListener("click", dismiss);
    return () => document.removeEventListener("click", dismiss);
  }, []);

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setRoot(selected);
  }

  function openInEditor(path: string) {
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab) return;
    setPane(tab.id, 0, { id: tab.panes[0]?.id ?? `p-${Date.now()}`, kind: "editor", filePath: path });
  }

  async function handleNewFile() {
    if (!contextMenu) return;
    const dir = contextMenu.node.isDir ? contextMenu.node.path : contextMenu.node.path.replace(/\/[^/]+$/, "");
    const filePath = await save({ defaultPath: `${dir}/new-file.txt` });
    if (filePath) {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(filePath, "");
      if (root) void buildTree(root).then(setTree);
    }
    setContextMenu(null);
  }

  async function handleDelete() {
    if (!contextMenu) return;
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(contextMenu.node.path, { recursive: contextMenu.node.isDir });
    if (root) void buildTree(root).then(setTree);
    setContextMenu(null);
  }

  async function handleRename() {
    if (!contextMenu) return;
    const newName = window.prompt("Rename to:", contextMenu.node.name);
    if (!newName) { setContextMenu(null); return; }
    const dir = contextMenu.node.path.replace(/\/[^/]+$/, "");
    const { rename } = await import("@tauri-apps/plugin-fs");
    await rename(contextMenu.node.path, `${dir}/${newName}`);
    if (root) void buildTree(root).then(setTree);
    setContextMenu(null);
  }

  if (!root) {
    return (
      <div className="filetree empty">
        <button onClick={() => void pickFolder()}>Open folder…</button>
      </div>
    );
  }

  return (
    <div className="filetree" style={{ position: "relative" }}>
      <div className="filetree-root">{root}</div>
      {loading && <div style={{ fontSize: "11px", opacity: 0.6, padding: "4px" }}>Loading…</div>}
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} onOpen={openInEditor} onContextMenu={(e, n) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, node: n }); }} />
      ))}
      {contextMenu && (
        <ul ref={menuRef} style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "4px", listStyle: "none", padding: "4px 0", margin: 0, zIndex: 300, minWidth: "140px" }} onClick={(e) => e.stopPropagation()}>
          <li style={{ padding: "4px 12px", cursor: "pointer" }} onClick={() => void handleNewFile()}>New File</li>
          <li style={{ padding: "4px 12px", cursor: "pointer" }} onClick={() => void handleRename()}>Rename</li>
          <li style={{ padding: "4px 12px", cursor: "pointer", color: "var(--err)" }} onClick={() => void handleDelete()}>Delete</li>
        </ul>
      )}
    </div>
  );
}
