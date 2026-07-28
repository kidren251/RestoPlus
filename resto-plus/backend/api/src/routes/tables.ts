import type { FastifyInstance } from "fastify";

// Statuts et positions mutables en mémoire
const tableStatuts: Record<string, string> = {};
const tablePositions: Record<string, { x: number; y: number }> = {};

export async function tablesRoutes(app: FastifyInstance) {
  // PUT /tables/:id/statut
  app.put<{
    Params: { id: string };
    Body: { statut: string };
  }>("/tables/:id/statut", async (req, reply) => {
    const { id } = req.params;
    const { statut } = req.body;

    const STATUTS_VALIDES = ["libre", "occupee", "reservee", "a_nettoyer"];
    if (!STATUTS_VALIDES.includes(statut)) {
      return reply.status(400).send({ error: "Statut invalide" });
    }

    tableStatuts[id] = statut;
    return { id, statut, updatedAt: new Date().toISOString() };
  });

  // PUT /tables/:id/position
  app.put<{
    Params: { id: string };
    Body: { x: number; y: number };
  }>("/tables/:id/position", async (req, reply) => {
    const { id } = req.params;
    const { x, y } = req.body;

    if (typeof x !== "number" || typeof y !== "number") {
      return reply.status(400).send({ error: "x et y doivent être des nombres" });
    }

    tablePositions[id] = { x, y };
    return { id, x, y, updatedAt: new Date().toISOString() };
  });
}
