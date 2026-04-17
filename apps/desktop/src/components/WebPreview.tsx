import { useState } from "react";

export default function WebPreview({
  paneId: _paneId,
  url: initialUrl,
}: {
  paneId: string;
  url?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "http://localhost:3000");
  const [draft, setDraft] = useState(url);

  return (
    <div className="webpreview">
      <form
        className="webpreview-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setUrl(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://…"
        />
        <button type="submit">Go</button>
      </form>
      <iframe
        title={`webpreview-${_paneId}`}
        src={url}
        sandbox="allow-forms allow-scripts allow-same-origin"
      />
    </div>
  );
}
