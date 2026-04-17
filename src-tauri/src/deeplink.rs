use tauri::{AppHandle, Emitter};
use tauri_plugin_deep_link::DeepLinkExt;

#[tauri::command]
pub fn register_deeplink_listener(app: AppHandle) -> Result<(), String> {
    let handle = app.clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            let _ = handle.emit("deeplink://auth", url.to_string());
        }
    });
    Ok(())
}
