import { useEffect, useState, useMemo } from "react";
import { fetchLeaderboard, type Row } from "./api";

type LeaderboardRow = Row;
type SortKey = keyof LeaderboardRow;
type SortDir = "asc" | "desc";

function scoreClass(score: number): string {
  if (score >= 0.8) return "score-green";
  if (score >= 0.5) return "score-yellow";
  return "score-red";
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i}>
          <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "16px", width: "80%" }} />
        </td>
      ))}
    </tr>
  );
}

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const refresh = () => {
    setLoading(true);
    fetchLeaderboard()
      .then((data) => {
        setRows(data);
        setErr(null);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(rows.map((r) => r.category)));
    return ["All", ...cats.sort()];
  }, [rows]);

  const sorted = useMemo(() => {
    let filtered = categoryFilter === "All" ? rows : rows.filter((r) => r.category === categoryFilter);
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, categoryFilter]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const colArrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="leaderboard" style={{ fontFamily: "sans-serif", padding: "16px" }}>
      <h1 style={{ marginBottom: "12px" }}>Forge Bench</h1>

      {err && (
        <div className="banner error" style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: "6px", marginBottom: "12px" }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "center" }}>
        <label style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
          Category:
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          onClick={refresh}
          style={{ padding: "4px 10px", borderRadius: "4px", border: "1px solid #d1d5db", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {/* Bar chart: one row per model */}
      {!loading && sorted.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          {sorted.map((r) => (
            <div key={`bar-${r.model}-${r.category}`} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ width: "160px", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.model}
              </span>
              <div style={{ flex: 1, background: "#f3f4f6", borderRadius: "4px", height: "16px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${r.score * 100}%`,
                    height: "100%",
                    background: r.score >= 0.8 ? "#22c55e" : r.score >= 0.5 ? "#f59e0b" : "#ef4444",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span style={{ width: "44px", fontSize: "12px", textAlign: "right" }}>
                {(r.score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
            {(["model", "category", "score", "avgMs", "n"] as SortKey[]).map((key) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                style={{ padding: "8px", textAlign: "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
              >
                {key === "avgMs" ? "Avg ms" : key.charAt(0).toUpperCase() + key.slice(1)}
                {colArrow(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            : sorted.length === 0
            ? (
              <tr>
                <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
                  No results found
                </td>
              </tr>
            )
            : sorted.map((r) => (
              <tr key={`${r.model}-${r.category}`} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "6px 8px" }}>{r.model}</td>
                <td style={{ padding: "6px 8px" }}>{r.category}</td>
                <td style={{ padding: "6px 8px" }}>
                  <span className={scoreClass(r.score)} style={{
                    color: r.score >= 0.8 ? "#16a34a" : r.score >= 0.5 ? "#d97706" : "#dc2626",
                    fontWeight: 600,
                  }}>
                    {(r.score * 100).toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: "6px 8px" }}>{r.avgMs}</td>
                <td style={{ padding: "6px 8px" }}>{r.n}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
