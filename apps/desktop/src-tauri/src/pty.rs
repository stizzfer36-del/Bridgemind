use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;

use base64::engine::general_purpose;
use base64::Engine;
use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::osc133::Osc133Parser;

pub struct Pane {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
}

#[derive(Default)]
pub struct PtyManager {
    panes: Mutex<HashMap<String, Pane>>,
}

impl PtyManager {
    /// Drop all panes, which closes their PTY masters and writers.
    pub fn shutdown_all(&self) {
        self.panes.lock().clear();
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnPaneArgs {
    pub workspace_id: String,
    pub pane_id: String,
    pub cwd: Option<String>,
    pub shell: Option<String>,
    pub env: Option<HashMap<String, String>>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyDataEvent {
    pane_id: String,
    bytes: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyExitEvent {
    pane_id: String,
    code: i32,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PtyErrorEvent {
    pane_id: String,
    error: String,
}

#[tauri::command]
pub fn spawn_pane(
    app: AppHandle,
    state: State<'_, PtyManager>,
    args: SpawnPaneArgs,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let cols = args.cols.unwrap_or(120);
    let rows = args.rows.unwrap_or(32);

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell = args
        .shell
        .or_else(|| crate::shell_detect::detect_user_shell())
        .unwrap_or_else(|| "/bin/sh".to_string());

    let mut cmd = CommandBuilder::new(&shell);
    // interactive login shell so profile files are sourced
    if shell.ends_with("bash") || shell.ends_with("zsh") || shell.ends_with("sh") {
        cmd.arg("-l");
    }
    if let Some(cwd) = &args.cwd {
        cmd.cwd(cwd);
    }
    if let Some(env) = &args.env {
        for (k, v) in env {
            cmd.env(k, v);
        }
    }
    // Ensure TERM is set for xterm compatibility
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("FORGE_PANE_ID", &args.pane_id);
    cmd.env("FORGE_WORKSPACE_ID", &args.workspace_id);

    let child_result = pair.slave.spawn_command(cmd);
    let pane_id = args.pane_id.clone();

    let mut child = match child_result {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit(
                &format!("pty_error::{}", pane_id),
                PtyErrorEvent {
                    pane_id: pane_id.clone(),
                    error: e.to_string(),
                },
            );
            return Ok(());
        }
    };
    drop(pair.slave);

    let reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    state.panes.lock().insert(
        pane_id.clone(),
        Pane {
            writer: Arc::new(Mutex::new(writer)),
            master: Arc::new(Mutex::new(pair.master)),
        },
    );

    // reader thread: pipe bytes out → emit pty_data + parse OSC 133 + emit binary frame
    let app_clone = app.clone();
    let pane_id_clone = pane_id.clone();
    thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 8192];
        let mut parser = Osc133Parser::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = &buf[..n];
                    let chrono_ts = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as i64;

                    for event in parser.feed(chunk) {
                        let _ = app_clone.emit(
                            &format!("block_event::{}", pane_id_clone),
                            event,
                        );
                    }
                    // UTF-8 text event (existing channel)
                    let payload = PtyDataEvent {
                        pane_id: pane_id_clone.clone(),
                        bytes: String::from_utf8_lossy(chunk).into_owned(),
                    };
                    let _ = app_clone.emit(&format!("pty_data::{}", pane_id_clone), payload);

                    // Binary length-prefixed frame event
                    let frame = crate::ipc_proto::encode_frame(
                        &crate::ipc_proto::pb::PtyFrame {
                            pane_id: pane_id_clone.clone(),
                            data: chunk.to_vec(),
                            ts_ms: chrono_ts,
                            seq: 0,
                        }
                    );
                    let encoded = general_purpose::STANDARD.encode(frame.as_ref());
                    let _ = app_clone.emit(&format!("pty_data_binary::{}", pane_id_clone), encoded);
                }
                Err(_) => break,
            }
        }
    });

    // wait thread: emit exit
    let app_clone = app.clone();
    let pane_id_clone = pane_id.clone();
    thread::spawn(move || {
        let status = child.wait();
        let code = status.map(|s| s.exit_code() as i32).unwrap_or(-1);
        let _ = app_clone.emit(
            &format!("pty_exit::{}", pane_id_clone),
            PtyExitEvent {
                pane_id: pane_id_clone.clone(),
                code,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(
    state: State<'_, PtyManager>,
    pane_id: String,
    data: String,
) -> Result<(), String> {
    let panes = state.panes.lock();
    let pane = panes
        .get(&pane_id)
        .ok_or_else(|| format!("unknown pane {}", pane_id))?;
    let mut w = pane.writer.lock();
    w.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    w.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyManager>,
    pane_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let panes = state.panes.lock();
    let pane = panes
        .get(&pane_id)
        .ok_or_else(|| format!("unknown pane {}", pane_id))?;
    pane.master
        .lock()
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn kill_pane(state: State<'_, PtyManager>, pane_id: String) -> Result<(), String> {
    let mut panes = state.panes.lock();
    panes.remove(&pane_id);
    Ok(())
}
