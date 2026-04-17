mod deeplink;
mod osc133;
mod pty;
mod shell_detect;
mod updater;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .manage(pty::PtyManager::default())
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pane,
            pty::pty_write,
            pty::pty_resize,
            pty::kill_pane,
            shell_detect::detect_shell,
            updater::check_for_update,
            deeplink::register_deeplink_listener,
            fs_ops::open_file,
            fs_ops::save_file,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            updater::schedule_check(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running BridgeSpace");
}

mod fs_ops {
    use std::fs;

    #[tauri::command]
    pub fn open_file(path: String) -> Result<String, String> {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn save_file(path: String, content: String) -> Result<(), String> {
        fs::write(&path, content).map_err(|e| e.to_string())
    }
}
