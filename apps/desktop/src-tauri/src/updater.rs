use serde_json::json;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;
use tokio::time::{sleep, Duration};

#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<Option<String>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(update.version.clone())),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Periodically check for updates with exponential backoff.
/// On success, emits `forge://update-available` — the frontend is responsible
/// for prompting the user and calling `install_update` when approved.
pub fn schedule_check(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        // Start at 1 hour; double on failure up to 24 hours maximum.
        const ONE_HOUR: u64 = 60 * 60;
        const MAX_INTERVAL: u64 = 24 * ONE_HOUR;
        let mut interval_secs: u64 = ONE_HOUR;

        loop {
            sleep(Duration::from_secs(interval_secs)).await;

            match app.updater() {
                Err(_) => {
                    interval_secs = (interval_secs * 2).min(MAX_INTERVAL);
                }
                Ok(updater) => match updater.check().await {
                    Ok(Some(update)) => {
                        let changelog_url = format!(
                            "https://github.com/forge-sh/forge/releases/tag/v{}",
                            update.version
                        );
                        let _ = app.emit(
                            "forge://update-available",
                            json!({
                                "version": update.version,
                                "changelogUrl": changelog_url,
                            }),
                        );
                        // After notifying, wait 24h before next check
                        interval_secs = MAX_INTERVAL;
                    }
                    Ok(None) => {
                        // No update — reset to normal 1-hour cadence
                        interval_secs = ONE_HOUR;
                    }
                    Err(_) => {
                        interval_secs = (interval_secs * 2).min(MAX_INTERVAL);
                    }
                },
            }
        }
    });
}

/// Called by the frontend when the user approves the pending update.
/// Downloads and installs the update, then relaunches.
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no update available".to_owned())?;

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| e.to_string())
}
