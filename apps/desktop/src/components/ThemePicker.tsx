import { useState } from "react";
import { THEMES, useTheme } from "../state/theme";

function Swatch({ bg, fg, accent, border }: { bg: string; fg: string; accent: string; border: string }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", marginRight: "6px", verticalAlign: "middle" }}>
      {[bg, fg, accent, border].map((color, i) => (
        <span key={i} style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: color, border: "1px solid rgba(127,127,127,0.3)" }} />
      ))}
    </span>
  );
}

export default function ThemePicker() {
  const current = useTheme((s) => s.current);
  const setCurrent = useTheme((s) => s.setCurrent);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const previewName = hovered ?? current;
  const previewTheme = THEMES.find((t) => t.name === previewName) ?? THEMES[0];

  if (!open) {
    const ct = THEMES.find((t) => t.name === current) ?? THEMES[0];
    return (
      <div className="themepicker">
        <button onClick={() => setOpen(true)} aria-label="theme picker" style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
          <Swatch bg={ct.bg} fg={ct.fg} accent={ct.accent} border={ct.border} />
          {current}
        </button>
      </div>
    );
  }

  return (
    <div className="themepicker" style={{ position: "relative" }}>
      <button onClick={() => setOpen(false)} style={{ fontSize: "12px" }}>{current} ▲</button>
      <div style={{ position: "absolute", right: 0, top: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", padding: "4px 0", zIndex: 200, minWidth: "220px", maxHeight: "320px", overflowY: "auto" }}>
        <div style={{ padding: "4px 12px", fontSize: "10px", opacity: 0.5, borderBottom: "1px solid var(--border)", marginBottom: "2px" }}>
          Preview: <span style={{ color: previewTheme.accent }}>{previewName}</span>
          <span style={{ marginLeft: "8px" }}>
            <Swatch bg={previewTheme.bg} fg={previewTheme.fg} accent={previewTheme.accent} border={previewTheme.border} />
          </span>
        </div>
        {THEMES.map((t) => (
          <div
            key={t.name}
            style={{ display: "flex", alignItems: "center", padding: "4px 12px", cursor: "pointer", background: t.name === current ? "rgba(127,127,127,0.1)" : undefined, fontSize: "12px" }}
            onMouseEnter={() => setHovered(t.name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => { setCurrent(t.name); setOpen(false); }}
          >
            <Swatch bg={t.bg} fg={t.fg} accent={t.accent} border={t.border} />
            {t.name}
          </div>
        ))}
      </div>
    </div>
  );
}
