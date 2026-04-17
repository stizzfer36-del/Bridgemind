import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/**
 * Forge-voice: tray app that records audio on a global hotkey, pipes it
 * through the bundled whisper.cpp sidecar (or the cloud Whisper API as a
 * fallback), and injects the transcript at the OS caret position.
 */
export default function App() {
  const [status, setStatus] = useState<"idle" | "recording" | "transcribing">("idle");
  const [last, setLast] = useState<string>("");

  useEffect(() => {
    const un = listen<string>("forge-voice://transcript", (e) => {
      setStatus("idle");
      setLast(e.payload);
    });
    return () => {
      void un.then((fn) => fn());
    };
  }, []);

  async function toggle() {
    if (status === "idle") {
      setStatus("recording");
      await invoke("start_recording");
    } else if (status === "recording") {
      setStatus("transcribing");
      await invoke("stop_and_transcribe");
    }
  }

  return (
    <div className="voice-tray">
      <button onClick={toggle}>
        {status === "recording" ? "● Stop" : status === "transcribing" ? "…" : "🎙 Record"}
      </button>
      <div className="last">{last}</div>
    </div>
  );
}
