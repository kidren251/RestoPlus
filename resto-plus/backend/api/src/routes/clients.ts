import type { FastifyInstance } from "fastify";
import { requirePermission } from "../permissions";
import { appartient, DEMO_RESTAURANT_ID, duRestaurant, restaurantDe } from "../tenant";

const MOCK_CLIENTS = [
  {
    id: "client-fontaine",
    nom: "M. Fontaine",
    telephone: "+33 6 00 00 00 01",
    preferences: "Table calme",
    allergies: [],
    notes: "Anniversaire signalé lors de la réservation",
    createdAt: "2025-04-12T10:00:00.000Z",
    lastVisitAt: "2026-09-09T19:42:00.000Z",
  },
  {
    id: "client-beaumont",
    nom: "Mme Beaumont",
    allergies: ["gluten", "lactose"],
    notes: "Vérifier les allergènes à chaque service",
    createdAt: "2025-07-20T10:00:00.000Z",
    lastVisitAt: "2026-09-09T20:08:00.000Z",
  },
];

const clients: ((typeof MOCK_CLIENTS)[number] & { restaurantId: string })[] = MOCK_CLIENTS.map((client) => ({ ...client, restaurantId: DEMO_RESTAURANT_ID }));

export async function clientsRoutes(app: FastifyInstance) {
  app.get("/clients", async (req) => duRestaurant(clients, req));

  app.get<{ Params: { id: string } }>("/clients/:id", async (req, reply) => {
    const client = clients.find((candidate) => candidate.id === req.params.id);
    if (!client || !appartient(client, req)) return reply.status(404).send({ error: "Client introuvable" });
    return client;
  });

  app.post<{ Body: (typeof MOCK_CLIENTS)[number] }>("/clients", { preHandler: requirePermission("client.editer") }, async (req, reply) => {
    // Le restaurant vient toujours de la session, jamais du corps de la requête.
    const client = { ...req.body, restaurantId: restaurantDe(req) };
    const existingIndex = clients.findIndex((candidate) => candidate.id === req.body.id);
    if (existingIndex >= 0) {
      if (!appartient(clients[existingIndex], req)) return reply.status(404).send({ error: "Client introuvable" });
      clients[existingIndex] = client;
    } else {
      clients.push(client);
    }
    return client;
  });
}
