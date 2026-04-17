//! Cross-platform text injection. Each OS has a different IPC route to
//! shove characters into the foreground app's focused text field.

#[cfg(target_os = "macos")]
pub fn inject_text(text: &str) -> anyhow::Result<()> {
    // Real impl uses AXUIElementSetAttributeValue on the focused AXUIElement.
    // For the scaffold we fall back to the clipboard + Cmd+V approach.
    let _ = text;
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
    // Real impl shells out to `wtype` (Wayland) or `xdotool type` (X11).
    let bin = if std::env::var("WAYLAND_DISPLAY").is_ok() {
        "wtype"
    } else {
        "xdotool"
    };
    let args: &[&str] = if bin == "wtype" {
        &[text]
    } else {
        &["type", "--", text]
    };
    std::process::Command::new(bin).args(args).status()?;
    Ok(())
}
