import type { FastifyInstance } from "fastify";

// Données mockées — Phase 1
const MOCK_RESERVATIONS = [
  {
    id: "r1",
    tableId: "t2",
    nomClient: "M. Fontaine",
    couverts: 2,
    heure: "19:30",
    allergenes: [],
    notes: "Anniversaire — prévoir bougie",
  },
  {
    id: "r2",
    tableId: "t3",
    nomClient: "Mme Beaumont",
    couverts: 4,
    heure: "20:00",
    allergenes: ["gluten", "lactose"],
    notes: "",
  },
  {
    id: "r3",
    tableId: "t4",
    nomClient: "M. Renard",
    couverts: 6,
    heure: "20:30",
    allergenes: ["arachides"],
    notes: "Client régulier — table habituelle",
  },
  {
    id: "r4",
    tableId: "t6",
    nomClient: "Famille Moreau",
    couverts: 4,
    heure: "19:00",
    allergenes: [],
    notes: "",
  },
  {
    id: "r5",
    tableId: "t1",
    nomClient: "Mme Leclerc",
    couverts: 2,
    heure: "21:00",
    allergenes: ["fruits de mer"],
    notes: "VIP — compte fidélité",
  },
];

export async function reservationsRoutes(app: FastifyInstance) {
  // GET /reservations — réservations du soir courant
  app.get("/reservations", async () => {
    return MOCK_RESERVATIONS;
  });

  // POST /reservations — créer une réservation (stub Phase 2)
  app.post("/reservations", async (_req, reply) => {
    return reply.status(501).send({ error: "Non implémenté — Phase 2" });
  });
}
