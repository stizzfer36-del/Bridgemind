TASKS = [
    {"id": f"speed-{i:03d}", "prompt": f"Optimize hot-path #{i} without changing behavior."}
    for i in range(1, 11)
]
