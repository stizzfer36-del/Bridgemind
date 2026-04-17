//! Cross-platform text injection. Each OS has a different IPC route to
//! shove characters into the foreground app's focused text field.

#[cfg(target_os = "macos")]
pub fn inject_text(text: &str) -> anyhow::Result<()> {
    use std::process::Command;
    let escaped = text.replace('\\', "\\\\").replace('"', "\\\"");
    Command::new("osascript")
        .args([
            "-e",
            &format!(
                "set the clipboard to \"{escaped}\"\n\
                 tell application \"System Events\" to keystroke \"v\" using command down"
            ),
        ])
        .status()?;
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn inject_text(text: &str) -> anyhow::Result<()> {
    // Real impl uses SendInput with INPUT_KEYBOARD events per UTF-16 unit.
    let _ = text;
    Ok(())
}

#[cfg(target_os = "linux")]
pub fn inject_text(text: &str) -> anyhow::Result<()> {
    let (bin, args): (&str, Vec<&str>) = if std::env::var("WAYLAND_DISPLAY").is_ok() {
        ("wtype", vec![text])
    } else {
        ("xdotool", vec!["type", "--", text])
    };
    let status = std::process::Command::new(bin)
        .args(&args)
        .status()
        .map_err(|e| {
            anyhow::anyhow!(
                "failed to launch '{}' for text injection: {}. \
                 Install {} to enable text injection on Linux.",
                bin,
                e,
                if std::env::var("WAYLAND_DISPLAY").is_ok() {
                    "wtype (https://github.com/atx/wtype)"
                } else {
                    "xdotool (apt install xdotool)"
                }
            )
        })?;
    if !status.success() {
        anyhow::bail!(
            "text injection via '{}' exited with status {}",
            bin,
            status
        );
    }
    Ok(())
}
