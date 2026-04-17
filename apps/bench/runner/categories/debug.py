TASKS = [
    {
        "id": f"debug-{i:03d}",
        "prompt": f"Fix bug scenario #{i}: failing assertion in regex tokenizer.",
        "fixture": "fixtures/debug/scenario_{:03d}".format(i),
    }
    for i in range(1, 21)
]
