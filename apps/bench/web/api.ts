const API_URL = process.env.NEXT_PUBLIC_FORGE_API_URL ?? "https://api.forge.sh";

export type Row = {
  model: string;
  category: string;
  score: number;
  avgMs: number;
  n: number;
};

export async function fetchLeaderboard(): Promise<Row[]> {
  const res = await fetch(`${API_URL}/v1/bench/leaderboard`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as Row[];
}
