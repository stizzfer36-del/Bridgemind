import { useState } from "react";

const BUILTIN_PROMPTS = [
  { id: "fix-tests", label: "Fix failing tests", body: "Run the test suite, identify failures, and fix them without changing intent." },
  { id: "refactor", label: "Refactor module", body: "Refactor for clarity and reuse without changing behavior. Preserve tests." },
  { id: "review", label: "Code review", body: "Review the staged diff and surface risks, bugs, and style issues." },
  { id: "docs", label: "Write docs", body: "Document public APIs with examples. Keep it concise." },
  { id: "migrate", label: "Migrate dependency", body: "Upgrade the target dependency and fix breaking changes." },
];

export default function PromptLibrary() {
  const [q, setQ] = useState("");
  const filtered = BUILTIN_PROMPTS.filter((p) =>
    p.label.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="prompts">
      <input
        placeholder="Search prompts"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul>
        {filtered.map((p) => (
          <li key={p.id} className="prompt">
            <div className="prompt-label">{p.label}</div>
            <div className="prompt-body">{p.body}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
