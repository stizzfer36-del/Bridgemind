mod deeplink;
mod ipc_proto;
mod osc133;
mod pty;
mod shell_detect;
mod updater;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
            let _ = app.emit("forge://second-instance", argv);
        }))
        .manage(pty::PtyManager::default())
        .manage(deeplink::DeepLinkState::default())
        .invoke_handler(tauri::generate_handler![
            pty::spawn_pane,
            pty::pty_write,
            pty::pty_resize,
            pty::kill_pane,
            shell_detect::detect_shell,
            updater::check_for_update,
            updater::install_update,
            deeplink::set_pkce_state,
            fs_ops::open_file,
            fs_ops::save_file,
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            updater::schedule_check(handle.clone());
            deeplink::register_deeplink_listener(handle.clone())
                .expect("failed to register deeplink listener");

            // Load and apply saved window position/size from store
            let store_path = "window-state.json";
            if let Ok(store) = tauri_plugin_store::StoreBuilder::new(app, store_path).build() {
                if let (Some(x), Some(y)) = (
                    store.get("x").and_then(|v| v.as_f64()),
                    store.get("y").and_then(|v| v.as_f64()),
                ) {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.set_position(tauri::LogicalPosition::new(x, y));
                    }
                }
                if let (Some(w), Some(h)) = (
                    store.get("width").and_then(|v| v.as_f64()),
                    store.get("height").and_then(|v| v.as_f64()),
                ) {
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.set_size(tauri::LogicalSize::new(w, h));
                    }
                }
            }

            // Save window position/size on move and resize
            let handle2 = app.handle().clone();
            app.listen("tauri://window-event", move |event| {
                if let Ok(store) =
                    tauri_plugin_store::StoreBuilder::new(&handle2, "window-state.json").build()
                {
                    if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
                        let kind = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
                        if kind == "moved" {
                            if let (Some(x), Some(y)) = (
                                payload.pointer("/payload/x").and_then(|v| v.as_f64()),
                                payload.pointer("/payload/y").and_then(|v| v.as_f64()),
                            ) {
                                let _ = store.set("x", x);
                                let _ = store.set("y", y);
                                let _ = store.save();
                            }
                        } else if kind == "resized" {
                            if let (Some(w), Some(h)) = (
                                payload.pointer("/payload/width").and_then(|v| v.as_f64()),
                                payload.pointer("/payload/height").and_then(|v| v.as_f64()),
                            ) {
                                let _ = store.set("width", w);
                                let _ = store.set("height", h);
                                let _ = store.save();
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .on_exit(|app| {
            app.state::<pty::PtyManager>().shutdown_all();
        })
        .run(tauri::generate_context!())
        .expect("error while running Forge");
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
