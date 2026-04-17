import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type ModelOption = "ggml-base.en" | "ggml-small.en" | "cloud (OpenAI)";

/**
 * Forge-voice: tray app that records audio on a global hotkey, pipes it
 * through the bundled whisper.cpp sidecar (or the cloud Whisper API as a
 * fallback), and injects the transcript at the OS caret position.
 */
export default function App() {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const [transcriptions, setTranscriptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState<ModelOption>("ggml-base.en");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  // Listen for Tauri backend events
  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    unlisteners.push(
      listen<string>("voice:recording", () => {
        setStatus("recording");
        setError(null);
      })
    );

    unlisteners.push(
      listen<string>("voice:transcribed", (e) => {
        setStatus("idle");
        setTranscriptions((prev) => [e.payload, ...prev].slice(0, 50));
        setError(null);
      })
    );

    // Legacy event name for backward compat
    unlisteners.push(
      listen<string>("forge-voice://transcript", (e) => {
        setStatus("idle");
        setTranscriptions((prev) => [e.payload, ...prev].slice(0, 50));
        setError(null);
      })
    );

    unlisteners.push(
      listen<string>("voice:error", (e) => {
        setStatus("idle");
        setError(e.payload);
      })
    );

    return () => {
      unlisteners.forEach((u) => void u.then((fn) => fn()));
    };
  }, []);

  // Waveform animation while recording
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (status !== "recording") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 20;
      const barW = canvas.width / bars - 2;
      for (let i = 0; i < bars; i++) {
        const amplitude = Math.abs(Math.sin((frame / 10 + i) * 0.8)) * 0.7 + 0.1;
        const h = amplitude * canvas.height;
        const x = i * (barW + 2);
        const y = (canvas.height - h) / 2;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x, y, barW, h);
      }
      frame++;
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [status]);

  async function toggle() {
    if (status === "idle") {
      setStatus("recording");
      setError(null);
      try {
        await invoke("start_recording");
      } catch (e) {
        setStatus("idle");
        setError(String(e));
      }
    } else if (status === "recording") {
      setStatus("transcribing");
      try {
        await invoke("stop_and_transcribe");
      } catch (e) {
        setStatus("idle");
        setError(String(e));
      }
    }
  }

  return (
    <div className="voice-tray" style={{ fontFamily: "sans-serif", padding: "12px", maxWidth: "360px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        {/* Recording indicator */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: status === "recording" ? "#ef4444" : "#6b7280",
            animation: status === "recording" ? "pulse 1s infinite" : "none",
          }}
        />
        <button
          onClick={toggle}
          style={{
            flex: 1,
            padding: "6px 12px",
            background: status === "recording" ? "#ef4444" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: status === "transcribing" ? "default" : "pointer",
            fontWeight: 600,
          }}
          disabled={status === "transcribing"}
        >
          {status === "recording" ? "■ Stop" : status === "transcribing" ? "Transcribing…" : "🎙 Record"}
        </button>
        <button
          onClick={() => setShowSettings((s) => !s)}
          style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 8px", cursor: "pointer" }}
          title="Settings"
        >
          ⚙
        </button>
      </div>

      {/* Waveform canvas */}
      <canvas
        ref={canvasRef}
        width={320}
        height={40}
        style={{
          display: "block",
          width: "100%",
          height: "40px",
          background: "#f9fafb",
          borderRadius: "4px",
          marginBottom: "8px",
        }}
      />

      {/* Settings panel */}
      {showSettings && (
        <div style={{ background: "#f3f4f6", borderRadius: "6px", padding: "10px", marginBottom: "8px" }}>
          <div style={{ marginBottom: "6px", fontWeight: 600, fontSize: "13px" }}>Settings</div>
          <div style={{ fontSize: "12px", marginBottom: "6px" }}>
            <span style={{ color: "#6b7280" }}>Hotkey:</span> <kbd>Alt+Space</kbd>
          </div>
          <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#6b7280" }}>Model:</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelOption)}
              style={{ flex: 1, fontSize: "12px", padding: "2px 4px", borderRadius: "4px", border: "1px solid #d1d5db" }}
            >
              <option value="ggml-base.en">ggml-base.en (fast)</option>
              <option value="ggml-small.en">ggml-small.en (accurate)</option>
              <option value="cloud (OpenAI)">cloud (OpenAI)</option>
            </select>
          </label>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "6px 8px", borderRadius: "4px", fontSize: "12px", marginBottom: "8px" }}>
          {error}
        </div>
      )}

      {/* Transcription history */}
      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
        {transcriptions.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: "12px", textAlign: "center", padding: "12px 0" }}>
            No transcriptions yet
          </div>
        ) : (
          transcriptions.map((t, i) => (
            <div
              key={i}
              style={{
                fontSize: "13px",
                padding: "4px 6px",
                borderBottom: "1px solid #f3f4f6",
                color: i === 0 ? "#111827" : "#6b7280",
              }}
            >
              {t}
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
