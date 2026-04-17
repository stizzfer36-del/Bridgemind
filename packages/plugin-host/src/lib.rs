//! Forge plugin host (U7).
//!
//! Skills are WebAssembly modules exposing a single `run(ptr, len)` export
//! that consumes a UTF-8 JSON input and returns a UTF-8 JSON output written
//! to guest memory. WASI is enabled with a restricted preopen set so the
//! skill can read/write only inside its scratch directory.

use anyhow::{anyhow, Context, Result};
use std::path::{Path, PathBuf};
use wasmtime::{Config, Engine, Linker, Module, Store};
use wasmtime_wasi::{WasiCtxBuilder, WasiP1Ctx};

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

    pub fn run_skill(
        &self,
        wasm_path: &Path,
        input: &str,
        fuel: u64,
        scratch_dir: &Path,
    ) -> Result<PluginOutcome> {
        std::fs::create_dir_all(scratch_dir)?;
        let wasi: WasiP1Ctx = WasiCtxBuilder::new()
            .preopened_dir(scratch_dir, "/scratch", wasmtime_wasi::DirPerms::all(), wasmtime_wasi::FilePerms::all())?
            .build_p1();

        let mut store = Store::new(&self.engine, wasi);
        store.set_fuel(fuel)?;

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

        let packed = run.call(&mut store, (ptr, input_bytes.len() as u32))?;
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
}

pub fn default_scratch(plugin_id: &str) -> PathBuf {
    let mut p = std::env::temp_dir();
    p.push("forge");
    p.push("plugins");
    p.push(plugin_id);
    p
}
