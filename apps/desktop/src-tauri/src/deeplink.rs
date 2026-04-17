use parking_lot::Mutex;
use serde_json::json;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_deep_link::DeepLinkExt;

/// Managed state for PKCE OAuth flow.
#[derive(Default)]
pub struct DeepLinkState {
    pub pkce_state: Mutex<Option<String>>,
}

/// Store a PKCE verifier state so the deeplink handler can validate the
/// `state` query parameter returned by the OAuth provider.
#[tauri::command]
pub fn set_pkce_state(state: State<'_, DeepLinkState>, pkce_state: String) {
    *state.pkce_state.lock() = Some(pkce_state);
}

/// Register the deep-link URL handler.  Call this once during app setup.
pub fn register_deeplink_listener(app: AppHandle) -> Result<(), String> {
    let handle = app.clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            handle_url(&handle, url.as_str());
        }
    });
    Ok(())
}

fn handle_url(app: &AppHandle, url_string: &str) {
    let url = match url::Url::parse(url_string) {
        Ok(u) => u,
        Err(_) => return,
    };

    if url.scheme() != "forge" {
        return;
    }

    match url.host_str() {
        Some("auth") => {
            let token = query_param(&url, "token").unwrap_or_default();
            let state_param = query_param(&url, "state").unwrap_or_default();

            let state_valid = app
                .try_state::<DeepLinkState>()
                .map(|s| {
                    s.pkce_state
                        .lock()
                        .as_deref()
                        .map(|stored| stored == state_param)
                        .unwrap_or(false)
                })
                .unwrap_or(false);

            let _ = app.emit("deeplink://auth", json!({ "token": token, "stateValid": state_valid }));
        }
        Some("open") => {
            let path = query_param(&url, "path").unwrap_or_default();
            let _ = app.emit("deeplink://open", json!({ "path": path }));
        }
        _ => {}
    }
}

fn query_param(url: &url::Url, key: &str) -> Option<String> {
    url.query_pairs()
        .find(|(k, _)| k == key)
        .map(|(_, v)| v.into_owned())
}
