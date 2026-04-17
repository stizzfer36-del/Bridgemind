use std::env;

pub fn detect_user_shell() -> Option<String> {
    if let Ok(s) = env::var("SHELL") {
        if !s.is_empty() {
            return Some(s);
        }
    }
    if cfg!(target_os = "windows") {
        return env::var("COMSPEC").ok().or(Some("powershell.exe".into()));
    }
    // fallback — try common shells in order
    for cand in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
        if std::path::Path::new(cand).exists() {
            return Some(cand.into());
        }
    }
    None
}

#[tauri::command]
pub fn detect_shell() -> Option<String> {
    detect_user_shell()
}
