import { useRef, useState } from "react";

export default function WebPreview({
  paneId: _paneId,
  url: initialUrl,
}: {
  paneId: string;
  url?: string;
}) {
  const [history, setHistory] = useState<string[]>([initialUrl ?? "http://localhost:3000"]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [draft, setDraft] = useState(history[0]);
  const [iframeKey, setIframeKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const url = history[historyIdx];

  function navigate(newUrl: string) {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const next = history.slice(0, historyIdx + 1);
    next.push(trimmed);
    setHistory(next);
    setHistoryIdx(next.length - 1);
    setDraft(trimmed);
    setLoadError(false);
    setIframeKey((k) => k + 1);
  }

  function goBack() {
    if (historyIdx <= 0) return;
    const idx = historyIdx - 1;
    setHistoryIdx(idx);
    setDraft(history[idx]);
    setLoadError(false);
    setIframeKey((k) => k + 1);
  }

  function goForward() {
    if (historyIdx >= history.length - 1) return;
    const idx = historyIdx + 1;
    setHistoryIdx(idx);
    setDraft(history[idx]);
    setLoadError(false);
    setIframeKey((k) => k + 1);
  }

  function handleRefresh() {
    setLoadError(false);
    setIframeKey((k) => k + 1);
  }

  return (
    <div className="webpreview" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <form
        className="webpreview-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          navigate(draft);
        }}
        style={{ display: "flex", gap: "4px", padding: "4px", borderBottom: "1px solid var(--border)" }}
      >
        <button type="button" onClick={goBack} disabled={historyIdx <= 0} title="Back" style={{ padding: "2px 8px" }}>←</button>
        <button type="button" onClick={goForward} disabled={historyIdx >= history.length - 1} title="Forward" style={{ padding: "2px 8px" }}>→</button>
        <button type="button" onClick={handleRefresh} title="Refresh" style={{ padding: "2px 8px" }}>↻</button>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
        <button type="submit">Go</button>
      </form>
      <div style={{ flex: 1, position: "relative" }}>
        {loadError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", color: "var(--err, #ff4d4f)", fontSize: "14px", zIndex: 1 }}>
            Failed to load: {url}
          </div>
        )}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          title={`webpreview-${_paneId}`}
          src={url}
          sandbox="allow-forms allow-scripts allow-same-origin"
          style={{ width: "100%", height: "100%", border: "none" }}
          onError={() => setLoadError(true)}
        />
      </div>
    </div>
  );
}
