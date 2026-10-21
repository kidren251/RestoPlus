import type { FastifyInstance } from "fastify";
import type { Client } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { restaurantDe } from "../tenant";
import { repositories } from "../repositories";

export async function clientsRoutes(app: FastifyInstance) {
  app.get("/clients", async (req) => repositories.clients.lister(restaurantDe(req)));

  app.get<{ Params: { id: string } }>("/clients/:id", async (req, reply) => {
    const client = await repositories.clients.lire(restaurantDe(req), req.params.id);
    if (!client) return reply.status(404).send({ error: "Client introuvable" });
    return client;
  });

  app.post<{ Body: Client }>("/clients", { preHandler: requirePermission("client.editer") }, async (req, reply) => {
    if (!req.body.id || !req.body.nom?.trim()) return reply.status(400).send({ error: "Fiche client invalide" });
    // Pas d'allergies sur la fiche (donnée de santé) : seulement sur le repas.
    const { allergies: _allergies, ...fiche } = req.body as Client & { allergies?: unknown };
    // Le restaurant vient toujours de la session, jamais du corps de la requête.
    const client = await repositories.clients.enregistrer(restaurantDe(req), { ...fiche, nom: fiche.nom.trim() });
    if (!client) return reply.status(404).send({ error: "Client introuvable" });
    return client;
  });
}
