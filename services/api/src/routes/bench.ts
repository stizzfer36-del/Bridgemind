import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index.js";

const ResultItem = z.object({
  taskId: z.string(),
  score: z.number().min(0).max(1),
  durationMs: z.number().int().nonnegative(),
  output: z.string().optional(),
});

const BenchResultsSchema = z.object({
  category: z.string().min(1),
  model: z.string().min(1),
  results: z.array(ResultItem).min(1),
});

export async function benchRoutes(app: FastifyInstance) {
  app.post("/v1/bench/results", async (req, reply) => {
    const parsed = BenchResultsSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.message, code: "VALIDATION_ERROR" });
    const { category, model, results } = parsed.data;
    await prisma.benchResult.createMany({
      data: results.map(r => ({ category, model, ...r })),
    });
    return reply.code(201).send({ ok: true, count: results.length });
  });

  app.get("/v1/bench/leaderboard", async () => {
    const rows = await prisma.benchResult.groupBy({
      by: ["model", "category"],
      _avg: { score: true },
      _count: { id: true },
      _min: { durationMs: true },
      orderBy: { _avg: { score: "desc" } },
    });
    return rows.map((r) => ({
      model: r.model,
      category: r.category,
      avgScore: r._avg.score ?? 0,
      count: r._count.id,
      minDurationMs: r._min.durationMs,
    }));
  });
}
