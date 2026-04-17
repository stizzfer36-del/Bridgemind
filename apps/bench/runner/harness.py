"""Forge benchmark harness.

Runs N tasks from a category against a model, each inside a Docker
sandbox. Posts scores to the Forge backend for the leaderboard web UI.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Callable

import httpx

CATEGORIES = ["ui", "algo", "debug", "refactor", "reason", "sec", "speed"]
API_URL = os.environ.get("FORGE_API_URL", "http://localhost:4000")
API_KEY = os.environ.get("FORGE_API_KEY", "")
SANDBOX_IMAGE = "forge-bench-sandbox"
TASK_TIMEOUT = 60


def load_category(name: str) -> list[dict]:
    path = Path(__file__).parent / "categories" / f"{name}.py"
    if not path.exists():
        raise SystemExit(f"unknown category: {name}")
    ns: dict = {}
    exec(path.read_text(), ns)
    return ns["TASKS"]


def ensure_sandbox_image() -> None:
    result = subprocess.run(
        ["docker", "image", "inspect", SANDBOX_IMAGE],
        capture_output=True,
    )
    if result.returncode != 0:
        root = Path(__file__).parent.parent.parent.parent
        subprocess.run(
            [
                "docker", "build", "-t", SANDBOX_IMAGE,
                "-f", str(root / "apps/bench/runner/docker/sandbox.Dockerfile"),
                str(root),
            ],
            check=True,
        )


def run_task(task: dict, model_fn: Callable[[str], str]) -> dict:
    """Run one task in a Docker sandbox. Returns {taskId, score, durationMs, output}."""
    ensure_sandbox_image()
    with tempfile.TemporaryDirectory() as scratch:
        # Write task fixture
        task_file = os.path.join(scratch, "task.json")
        with open(task_file, "w") as f:
            json.dump(task, f)

        # Get LLM response
        start = time.monotonic()
        try:
            response = model_fn(task["prompt"])
        except Exception as e:
            return {
                "taskId": task["id"],
                "score": 0.0,
                "durationMs": int((time.monotonic() - start) * 1000),
                "error": str(e),
            }

        # Write response to scratch
        resp_file = os.path.join(scratch, "response.txt")
        with open(resp_file, "w") as f:
            f.write(response)

        # Run evaluator in sandbox
        eval_script = task.get("eval_script", "print(0.0)")
        try:
            result = subprocess.run(
                [
                    "docker", "run", "--rm", "--network=none",
                    "--memory=512m", "--cpus=1",
                    f"-v{scratch}:/workspace",
                    SANDBOX_IMAGE,
                    "python3", "-c", eval_script,
                ],
                capture_output=True,
                text=True,
                timeout=TASK_TIMEOUT,
            )
            raw = result.stdout.strip()
            score = float(raw) if raw else 0.0
            score = max(0.0, min(1.0, score))
        except subprocess.TimeoutExpired:
            score = 0.0
        except Exception:
            score = 0.0

        duration = int((time.monotonic() - start) * 1000)
        return {
            "taskId": task["id"],
            "score": score,
            "durationMs": duration,
            "output": response[:500],
        }


def aggregate_results(results: list[dict]) -> dict:
    """Compute mean, p50, p95 of scores and durations."""
    if not results:
        return {"count": 0, "mean_score": 0.0, "p50_score": 0.0, "p95_score": 0.0,
                "mean_ms": 0.0, "p50_ms": 0.0, "p95_ms": 0.0}

    scores = sorted(r.get("score", 0.0) for r in results)
    durations = sorted(r.get("durationMs", 0) for r in results)
    n = len(scores)

    def percentile(data: list, p: float) -> float:
        if not data:
            return 0.0
        idx = (p / 100) * (len(data) - 1)
        lo = int(idx)
        hi = min(lo + 1, len(data) - 1)
        frac = idx - lo
        return data[lo] * (1 - frac) + data[hi] * frac

    return {
        "count": n,
        "mean_score": sum(scores) / n,
        "p50_score": percentile(scores, 50),
        "p95_score": percentile(scores, 95),
        "mean_ms": sum(durations) / n,
        "p50_ms": percentile(durations, 50),
        "p95_ms": percentile(durations, 95),
    }


def post_results(category: str, model: str, results: list[dict]) -> None:
    if not API_KEY:
        print(json.dumps({"category": category, "model": model, "results": results}))
        return
    r = httpx.post(
        f"{API_URL}/v1/bench/results",
        headers={"authorization": f"Bearer {API_KEY}"},
        json={"category": category, "model": model, "results": results},
        timeout=30,
    )
    r.raise_for_status()


def _stub_model_fn(model_name: str) -> Callable[[str], str]:
    """Return a simple model function that calls the Forge API."""
    def call(prompt: str) -> str:
        if not API_KEY:
            return f"[stub] no API key set for model={model_name}"
        r = httpx.post(
            f"{API_URL}/v1/completions",
            headers={"authorization": f"Bearer {API_KEY}"},
            json={"model": model_name, "prompt": prompt},
            timeout=60,
        )
        r.raise_for_status()
        return r.json().get("text", "")
    return call


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--category", required=True, choices=CATEGORIES)
    ap.add_argument("--model", required=True)
    args = ap.parse_args()

    tasks = load_category(args.category)
    model_fn = _stub_model_fn(args.model)
    results = [run_task(t, model_fn) for t in tasks]
    agg = aggregate_results(results)
    post_results(args.category, args.model, results)
    print(
        f"done: {len(results)} tasks | mean={agg['mean_score']:.3f} "
        f"p50={agg['p50_score']:.3f} p95={agg['p95_score']:.3f}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
