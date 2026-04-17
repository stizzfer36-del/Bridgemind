//! Forge plugin host (U7).
//!
//! Skills are WebAssembly modules exposing a single `run(ptr, len)` export
//! that consumes a UTF-8 JSON input and returns a UTF-8 JSON output written
//! to guest memory. WASI is enabled with a restricted preopen set so the
//! skill can read/write only inside its scratch directory.

use anyhow::{anyhow, Context, Result};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use wasmtime::{Config, Engine, Linker, Module, Store, Trap};
use wasmtime_wasi::{WasiCtxBuilder, WasiP1Ctx};

/// Declared capabilities of a plugin.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub permissions: Vec<String>,
}

pub struct PluginHost {
    engine: Engine,
}

pub struct PluginOutcome {
    pub result: String,
    pub fuel_used: u64,
}

impl PluginHost {
    pub fn new() -> Result<Self> {
        let mut cfg = Config::new();
        cfg.consume_fuel(true);
        cfg.wasm_multi_memory(true);
        let engine = Engine::new(&cfg)?;
        Ok(Self { engine })
    }

    /// Run a skill with an optional manifest for permission enforcement.
    pub fn run_plugin(
        &self,
        wasm_path: &Path,
        input: &str,
        fuel: u64,
        scratch_dir: &Path,
        manifest: Option<PluginManifest>,
    ) -> Result<PluginOutcome> {
        let permissions: HashSet<String> = manifest
            .as_ref()
            .map(|m| m.permissions.iter().cloned().collect())
            .unwrap_or_default();

        std::fs::create_dir_all(scratch_dir)?;

        let mut wasi_builder = WasiCtxBuilder::new();

        // Only expose scratch dir if fs:read or fs:write is permitted
        if permissions.contains("fs:read") || permissions.contains("fs:write") {
            wasi_builder = wasi_builder
                .preopened_dir(
                    scratch_dir,
                    "/scratch",
                    wasmtime_wasi::DirPerms::all(),
                    wasmtime_wasi::FilePerms::all(),
                )
                .context("preopening scratch dir")?;
        }

        let wasi: WasiP1Ctx = wasi_builder.build_p1();

        let mut store = Store::new(&self.engine, wasi);
        store
            .set_fuel(fuel)
            .context("engine does not have fuel enabled — ensure consume_fuel(true) in Config")?;

        let mut linker: Linker<WasiP1Ctx> = Linker::new(&self.engine);
        wasmtime_wasi::preview1::add_to_linker_sync(&mut linker, |cx| cx)?;

        let module = Module::from_file(&self.engine, wasm_path)
            .with_context(|| format!("loading {}", wasm_path.display()))?;
        let instance = linker.instantiate(&mut store, &module)?;

        let memory = instance
            .get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow!("no memory export"))?;

        // allocate input buffer inside the guest via `alloc(len) -> ptr`
        let alloc = instance.get_typed_func::<u32, u32>(&mut store, "alloc")?;
        let run = instance.get_typed_func::<(u32, u32), u64>(&mut store, "run")?;

        let input_bytes = input.as_bytes();
        let ptr = alloc.call(&mut store, input_bytes.len() as u32)?;
        memory.write(&mut store, ptr as usize, input_bytes)?;

        let packed = run.call(&mut store, (ptr, input_bytes.len() as u32))
            .map_err(|e| {
                // Provide a clear error message on fuel exhaustion
                if let Some(trap) = e.downcast_ref::<Trap>() {
                    if *trap == Trap::OutOfFuel {
                        return anyhow!("plugin exceeded compute budget");
                    }
                }
                e
            })?;

        // convention: high 32 = ptr, low 32 = len
        let out_ptr = (packed >> 32) as usize;
        let out_len = (packed & 0xffff_ffff) as usize;
        let mut buf = vec![0u8; out_len];
        memory.read(&store, out_ptr, &mut buf)?;

        let remaining = store.get_fuel().unwrap_or(0);
        Ok(PluginOutcome {
            result: String::from_utf8(buf)?,
            fuel_used: fuel.saturating_sub(remaining),
        })
    }

    /// Convenience wrapper that keeps the original `run_skill` signature.
    pub fn run_skill(
        &self,
        wasm_path: &Path,
        input: &str,
        fuel: u64,
        scratch_dir: &Path,
    ) -> Result<PluginOutcome> {
        // Default manifest grants fs:read so behaviour is backward-compatible.
        let manifest = Some(PluginManifest {
            name: String::new(),
            version: String::new(),
            permissions: vec!["fs:read".into(), "fs:write".into()],
        });
        self.run_plugin(wasm_path, input, fuel, scratch_dir, manifest)
    }
}

pub fn default_scratch(plugin_id: &str) -> PathBuf {
    let mut p = std::env::temp_dir();
    p.push("forge");
    p.push("plugins");
    p.push(plugin_id);
    p
}
