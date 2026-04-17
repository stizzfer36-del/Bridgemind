"""Forge benchmark harness.

Runs N tasks from a category against a model, each inside a Docker
sandbox. Posts scores to the Forge backend for the leaderboard web UI.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import httpx

CATEGORIES = ["ui", "algo", "debug", "refactor", "reason", "sec", "speed"]
API_URL = os.environ.get("FORGE_API_URL", "http://localhost:4000")
API_KEY = os.environ.get("FORGE_API_KEY", "")


def load_category(name: str) -> list[dict]:
    path = Path(__file__).parent / "categories" / f"{name}.py"
    if not path.exists():
        raise SystemExit(f"unknown category: {name}")
    ns: dict = {}
    exec(path.read_text(), ns)
    return ns["TASKS"]


def run_task(task: dict, model: str) -> dict:
    """Run one task in a Docker sandbox. Returns {score, durationMs, output}."""
    started = time.time()
    # Real impl: docker run --rm --network=none -v $scratch:/work image model-cli "<task.prompt>"
    output = f"[stub] {task['id']} / {model}"
    return {
        "taskId": task["id"],
        "score": 1.0,
        "durationMs": int((time.time() - started) * 1000),
        "output": output,
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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--category", required=True, choices=CATEGORIES)
    ap.add_argument("--model", required=True)
    args = ap.parse_args()

    tasks = load_category(args.category)
    results = [run_task(t, args.model) for t in tasks]
    post_results(args.category, args.model, results)
    print(f"done: {len(results)} tasks", file=sys.stderr)


if __name__ == "__main__":
    main()
