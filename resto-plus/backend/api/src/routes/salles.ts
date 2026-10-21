import type { FastifyInstance } from "fastify";
import { requirePermission } from "../permissions";
import { restaurantDe } from "../tenant";
import { repositories } from "../repositories";

export async function sallesRoutes(app: FastifyInstance) {
  // GET /salles — salles du restaurant (sans le détail des tables)
  app.get("/salles", async (req) => {
    return repositories.salles.lister(restaurantDe(req));
  });

  // GET /salles/:id — une salle avec ses tables, le repas en cours et le décor
  app.get<{ Params: { id: string } }>("/salles/:id", async (req, reply) => {
    const salle = await repositories.salles.lire(restaurantDe(req), req.params.id);
    if (!salle) return reply.status(404).send({ error: "Salle introuvable" });
    return salle;
  });

  // POST /salles — créer une salle (stub Phase 2)
  app.post("/salles", { preHandler: requirePermission("salle.configurer") }, async (_req, reply) => {
    return reply.status(501).send({ error: "Non implémenté — Phase 2" });
  });
}
