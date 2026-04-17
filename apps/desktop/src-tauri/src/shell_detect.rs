use std::env;
use std::process::Command;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ShellInfo {
    pub path: String,
    pub version: Option<String>,
}

/// Run `<shell> --version` (or `-Version` for PowerShell) and return the first
/// non-empty line of stdout.
pub fn shell_version(shell: &str) -> Option<String> {
    let is_ps = shell.to_lowercase().contains("powershell") || shell.to_lowercase().contains("pwsh");
    let flag = if is_ps { "-Version" } else { "--version" };
    let out = Command::new(shell).arg(flag).output().ok()?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    stdout.lines().find(|l| !l.trim().is_empty()).map(|l| l.trim().to_owned())
}

/// Detect the user's login shell path.
pub fn detect_user_shell() -> Option<String> {
    if let Ok(s) = env::var("SHELL") {
        if !s.is_empty() {
            return Some(s);
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(shell) = detect_shell_via_dscl() {
            return Some(shell);
        }
    }

    if cfg!(target_os = "windows") {
        // Prefer PowerShell 7 (pwsh.exe) over the built-in powershell.exe
        let pwsh_paths = [
            r"C:\Program Files\PowerShell\7\pwsh.exe",
            r"C:\Program Files\PowerShell\7-preview\pwsh.exe",
        ];
        for p in &pwsh_paths {
            if std::path::Path::new(p).exists() {
                return Some((*p).to_owned());
            }
        }
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

#[cfg(target_os = "macos")]
fn detect_shell_via_dscl() -> Option<String> {
    let user = env::var("USER").unwrap_or_default();
    if user.is_empty() {
        return None;
    }
    let out = Command::new("dscl")
        .args([".", "-read", &format!("/Users/{}", user), "UserShell"])
        .output()
        .ok()?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    // Output looks like: "UserShell: /bin/zsh"
    for line in stdout.lines() {
        if let Some(rest) = line.strip_prefix("UserShell:") {
            let shell = rest.trim().to_owned();
            if !shell.is_empty() {
                return Some(shell);
            }
        }
    }
    None
}

/// Detect shell path and version together.
pub fn detect_shell_info() -> ShellInfo {
    let path = detect_user_shell().unwrap_or_else(|| "/bin/sh".to_owned());
    let version = shell_version(&path);
    ShellInfo { path, version }
}

#[tauri::command]
pub fn detect_shell() -> Option<String> {
    detect_user_shell()
}
