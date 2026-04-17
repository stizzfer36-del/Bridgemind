#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod inject;
mod whisper_sidecar;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

// ── Recording state ───────────────────────────────────────────────────────────

struct RecordState {
    recording: bool,
    wav_path: Option<PathBuf>,
}

impl Default for RecordState {
    fn default() -> Self {
        Self {
            recording: false,
            wav_path: None,
        }
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn start_recording(state: State<'_, Mutex<RecordState>>) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    if s.recording {
        return Err("already recording".into());
    }
    let path = std::env::temp_dir().join("forge_voice_capture.wav");
    s.wav_path = Some(path);
    s.recording = true;
    Ok(())
}

#[tauri::command]
fn stop_and_transcribe(state: State<'_, Mutex<RecordState>>) -> Result<String, String> {
    let (recording, path) = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        let p = s.wav_path.take();
        s.recording = false;
        (s.recording, p)
    };
    let _ = recording;
    let wav = path.ok_or("no active recording")?;
    whisper_sidecar::transcribe(&wav).map_err(|e| e.to_string())
}

#[tauri::command]
fn inject_text_cmd(text: String) -> Result<(), String> {
    inject::inject_text(&text).map_err(|e| e.to_string())
}

#[tauri::command]
fn is_recording(state: State<'_, Mutex<RecordState>>) -> bool {
    state.lock().map(|s| s.recording).unwrap_or(false)
}

// ── Push-to-talk shortcut ─────────────────────────────────────────────────────

fn register_ptt_shortcut(app: &AppHandle) {
    let handle = app.clone();
    let _ = app
        .global_shortcut()
        .on_shortcut("Alt+Space", move |_, _, event| {
            let state: State<'_, Mutex<RecordState>> = handle.state();
            match event.state() {
                ShortcutState::Pressed => {
                    let _ = start_recording(state);
                    let _ = handle.emit("voice:recording", true);
                }
                ShortcutState::Released => {
                    match stop_and_transcribe(state) {
                        Ok(text) => {
                            let _ = inject::inject_text(&text);
                            let _ = handle.emit("voice:transcribed", text);
                        }
                        Err(e) => {
                            let _ = handle.emit("voice:error", e);
                        }
                    }
                    let _ = handle.emit("voice:recording", false);
                }
            }
        });
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Mutex::new(RecordState::default()))
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_and_transcribe,
            inject_text_cmd,
            is_recording,
        ])
        .setup(|app| {
            register_ptt_shortcut(app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running forge-voice");
}
