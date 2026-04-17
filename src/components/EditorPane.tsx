import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { openFile, saveFile } from "../lib/ipc";
import { useTheme } from "../state/theme";

const LANG_BY_EXT: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  rs: "rust",
  py: "python",
  go: "go",
  html: "html",
  css: "css",
  toml: "ini",
  yml: "yaml",
  yaml: "yaml",
};

function detectLanguage(path?: string): string {
  if (!path) return "plaintext";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANG_BY_EXT[ext] ?? "plaintext";
}

export default function EditorPane({
  paneId: _paneId,
  filePath,
}: {
  paneId: string;
  filePath?: string;
}) {
  const [content, setContent] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const theme = useTheme((s) => s.current);

  useEffect(() => {
    if (!filePath) return;
    void openFile(filePath).then(setContent).catch(() => setContent(""));
  }, [filePath]);

  async function onSave() {
    if (!filePath) return;
    await saveFile(filePath, content);
    setDirty(false);
  }

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <span className="editor-path">{filePath ?? "(no file)"}</span>
        {dirty && <span className="dirty">●</span>}
        <button onClick={onSave} disabled={!filePath}>
          Save
        </button>
      </div>
      <Editor
        height="100%"
        theme={theme.toLowerCase().includes("paper") || theme.toLowerCase().includes("ivory") || theme.toLowerCase().includes("chalk") || theme.toLowerCase().includes("solar") ? "vs" : "vs-dark"}
        language={detectLanguage(filePath)}
        value={content}
        onChange={(v) => {
          setContent(v ?? "");
          setDirty(true);
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
