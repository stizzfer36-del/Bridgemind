import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from harness import load_category


def test_load_category_algo_returns_tasks():
    tasks = load_category("algo")
    assert isinstance(tasks, list)
    assert len(tasks) > 0


def test_load_category_task_has_required_fields():
    tasks = load_category("algo")
    task = tasks[0]
    assert "id" in task
    assert "prompt" in task


def test_load_category_unknown_raises():
    try:
        load_category("nonexistent_category_xyz")
        assert False, "expected SystemExit"
    except SystemExit:
        pass
