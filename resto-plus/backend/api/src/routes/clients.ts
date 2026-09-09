import type { FastifyInstance } from "fastify";

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

const clients = [...MOCK_CLIENTS];

export async function clientsRoutes(app: FastifyInstance) {
  app.get("/clients", async () => clients);

  app.get<{ Params: { id: string } }>("/clients/:id", async (req, reply) => {
    const client = clients.find((candidate) => candidate.id === req.params.id);
    if (!client) return reply.status(404).send({ error: "Client introuvable" });
    return client;
  });

  app.post<{ Body: (typeof MOCK_CLIENTS)[number] }>("/clients", async (req) => {
    const existingIndex = clients.findIndex((client) => client.id === req.body.id);
    if (existingIndex >= 0) clients[existingIndex] = req.body;
    else clients.push(req.body);
    return req.body;
  });
}
