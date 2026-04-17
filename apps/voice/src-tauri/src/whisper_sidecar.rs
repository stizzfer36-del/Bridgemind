use std::path::Path;
use std::process::Command;

/// Transcribe a WAV file with the bundled whisper.cpp sidecar. Falls back
/// to the OpenAI Whisper API if the sidecar is unavailable (e.g. on first
/// launch before download completes).
pub fn transcribe(wav: &Path) -> anyhow::Result<String> {
    let sidecar = std::env::var("FORGE_WHISPER_BIN").unwrap_or_else(|_| "whisper.cpp".into());
    let model = std::env::var("FORGE_WHISPER_MODEL")
        .unwrap_or_else(|_| "models/ggml-base.en.bin".into());
    let out = Command::new(&sidecar)
        .args(["-m", &model, "-otxt", "-f"])
        .arg(wav)
        .output();

    match out {
        Ok(o) if o.status.success() => {
            Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
        }
        _ => cloud_fallback(wav),
    }
}

fn cloud_fallback(_wav: &Path) -> anyhow::Result<String> {
    // Placeholder: real impl POSTs /v1/audio/transcriptions to OpenAI.
    Err(anyhow::anyhow!("whisper sidecar missing and cloud fallback not configured"))
}
