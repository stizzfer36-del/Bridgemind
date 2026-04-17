use std::path::Path;
use std::process::Command;

/// Download the default whisper model if it's not already present.
pub fn download_model_if_missing() {
    let model_path = std::env::var("FORGE_WHISPER_MODEL")
        .unwrap_or_else(|_| "models/ggml-base.en.bin".into());
    if std::path::Path::new(&model_path).exists() {
        return;
    }
    eprintln!("[whisper] model not found at {model_path}, downloading from HuggingFace...");
    if let Some(parent) = std::path::Path::new(&model_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
    let _ = std::process::Command::new("curl")
        .args(["-L", "-o", &model_path, url])
        .status();
}

/// Transcribe a WAV file with the bundled whisper.cpp sidecar. Falls back
/// to the OpenAI Whisper API if the sidecar is unavailable (e.g. on first
/// launch before download completes).
pub fn transcribe(wav: &Path) -> anyhow::Result<String> {
    let sidecar = std::env::var("FORGE_WHISPER_BIN").unwrap_or_else(|_| "whisper.cpp".into());
    let model =
        std::env::var("FORGE_WHISPER_MODEL").unwrap_or_else(|_| "models/ggml-base.en.bin".into());
    let out = Command::new(&sidecar)
        .args(["-m", &model, "-otxt", "-f"])
        .arg(wav)
        .output();

    match out {
        Ok(o) if o.status.success() => Ok(String::from_utf8_lossy(&o.stdout).trim().to_string()),
        _ => cloud_fallback(wav),
    }
}

fn cloud_fallback(wav: &Path) -> anyhow::Result<String> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY not set for cloud fallback"))?;
    let bytes = std::fs::read(wav)?;
    let boundary = "----FormBoundary7MA4YWxkTrZu0gW";
    let mut body = Vec::new();
    body.extend_from_slice(
        format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; \
             filename=\"audio.wav\"\r\nContent-Type: audio/wav\r\n\r\n"
        )
        .as_bytes(),
    );
    body.extend_from_slice(&bytes);
    body.extend_from_slice(
        format!(
            "\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\n\
             whisper-1\r\n--{boundary}--\r\n"
        )
        .as_bytes(),
    );

    let mut child = std::process::Command::new("curl")
        .args([
            "-s",
            "-X",
            "POST",
            "https://api.openai.com/v1/audio/transcriptions",
            "-H",
            &format!("Authorization: Bearer {api_key}"),
            "-H",
            &format!("Content-Type: multipart/form-data; boundary={boundary}"),
            "--data-binary",
            "@-",
        ])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()?;

    use std::io::Write;
    child.stdin.as_mut().unwrap().write_all(&body)?;
    let out = child.wait_with_output()?;

    let json: serde_json::Value = serde_json::from_slice(&out.stdout)?;
    json["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| anyhow::anyhow!("no text in response: {}", json))
}
