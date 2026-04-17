fn main() {
    // Compile binary IPC proto to Rust (U6).
    prost_build::Config::new()
        .compile_protos(&["proto/ipc.proto"], &["proto/"])
        .expect("failed to compile proto");
    tauri_build::build();
}
