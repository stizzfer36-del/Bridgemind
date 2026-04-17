import { useEffect, useState } from "react";
import { fetchLeaderboard, type Row } from "./api";

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard().then(setRows).catch((e) => setErr(String(e)));
  }, []);

  return (
    <div className="leaderboard">
      <h1>Forge Bench</h1>
      {err && <div className="banner error">{err}</div>}
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Category</th>
            <th>Score</th>
            <th>Avg ms</th>
            <th>Tasks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.model}-${r.category}`}>
              <td>{r.model}</td>
              <td>{r.category}</td>
              <td>{(r.score * 100).toFixed(1)}%</td>
              <td>{r.avgMs}</td>
              <td>{r.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
