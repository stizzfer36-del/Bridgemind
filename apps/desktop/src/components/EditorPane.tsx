import { useEffect, useRef, useState } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import { openFile, saveFile } from "../lib/ipc";

function langFor(path?: string): Extension[] {
  if (!path) return [];
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":
      return [javascript({ jsx: true, typescript: true })];
    case "js":
    case "jsx":
      return [javascript({ jsx: true })];
    case "json":
      return [json()];
    case "md":
      return [markdown()];
    case "py":
      return [python()];
    case "rs":
      return [rust()];
    case "css":
      return [css()];
    case "html":
      return [html()];
    case "yaml":
    case "yml":
      return []; // @codemirror/lang-yaml not installed; no highlighting
    case "sh":
    case "bash":
    case "zsh":
      return []; // no shell lang package, fall through to no highlighting
    default:
      return [];
  }
}

export default function EditorPane({
  paneId: _paneId,
  filePath,
}: {
  paneId: string;
  filePath?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [dirty, setDirty] = useState(false);
  const contentRef = useRef<string>("");

  useEffect(() => {
    if (!hostRef.current) return;
    let cancelled = false;
    const run = async () => {
      let content = "";
      if (filePath) {
        try {
          content = (await openFile(filePath)) ?? "";
        } catch {
          content = "";
        }
      }
      if (cancelled) return;
      contentRef.current = content;
      const state = EditorState.create({
        doc: content,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          oneDark,
          ...langFor(filePath),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              contentRef.current = u.state.doc.toString();
              setDirty(true);
            }
          }),
        ],
      });
      viewRef.current = new EditorView({
        state,
        parent: hostRef.current!,
      });
    };
    void run();
    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [filePath]);

  async function onSave() {
    if (!filePath) return;
    await saveFile(filePath, contentRef.current);
    setDirty(false);
  }

  useEffect(() => {
    const handler = () => {
      void onSave();
    };
    document.addEventListener("forge:save-editor", handler);
    return () => document.removeEventListener("forge:save-editor", handler);
  });

  const ext = filePath?.split(".").pop()?.toLowerCase() ?? "";
  const langLabel: Record<string, string> = {
    ts: "TypeScript", tsx: "TypeScript (JSX)", js: "JavaScript", jsx: "JavaScript (JSX)",
    json: "JSON", md: "Markdown", py: "Python", rs: "Rust", css: "CSS",
    html: "HTML", yaml: "YAML", yml: "YAML", sh: "Shell", bash: "Shell", zsh: "Shell",
  };

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <span className="editor-path">
          {filePath ?? "(no file)"}
          {dirty && <span className="dirty" title="Unsaved changes"> ●</span>}
        </span>
        {ext && langLabel[ext] && (
          <span style={{ opacity: 0.5, fontSize: "10px" }}>{langLabel[ext]}</span>
        )}
        <button onClick={() => void onSave()} disabled={!filePath}>
          Save
        </button>
      </div>
      <div ref={hostRef} className="cm-host" />
    </div>
  );
}
