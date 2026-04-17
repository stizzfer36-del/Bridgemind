from .algo import TASKS as ALGO_TASKS
from .debug import TASKS as DEBUG_TASKS
from .refactor import TASKS as REFACTOR_TASKS
from .reason import TASKS as REASON_TASKS
from .sec import TASKS as SEC_TASKS
from .ui import TASKS as UI_TASKS

ALL_CATEGORIES = {
    "algo": ALGO_TASKS,
    "debug": DEBUG_TASKS,
    "refactor": REFACTOR_TASKS,
    "reason": REASON_TASKS,
    "sec": SEC_TASKS,
    "ui": UI_TASKS,
}

__all__ = [
    "ALL_CATEGORIES",
    "ALGO_TASKS",
    "DEBUG_TASKS",
    "REFACTOR_TASKS",
    "REASON_TASKS",
    "SEC_TASKS",
    "UI_TASKS",
]
