import type { FastifyInstance } from "fastify";

// Données mockées — Phase 1
const MOCK_RESERVATIONS = [
  {
    id: "r1",
    tableId: "t2",
    clientId: "client-fontaine",
    nomClient: "M. Fontaine",
    couverts: 2,
    heure: "19:30",
    allergenes: [],
    notes: "Anniversaire — prévoir bougie",
    source: "telephone",
    status: "installee",
    serviceEvents: [
      { id: "e1", reservationId: "r1", tableId: "t2", type: "arrivee", label: "Arrivée des clients", occurredAt: "2026-09-09T19:42:00.000Z" },
      { id: "e2", reservationId: "r1", tableId: "t2", type: "plat_servi", label: "Plats servis", occurredAt: "2026-09-09T20:22:00.000Z" },
    ],
  },
  {
    id: "r2",
    tableId: "t3",
    clientId: "client-beaumont",
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

const reservations = [...MOCK_RESERVATIONS];

export async function reservationsRoutes(app: FastifyInstance) {
  // GET /reservations — réservations du soir courant
  app.get("/reservations", async () => {
    return reservations;
  });

  // POST /reservations — créer une réservation en mémoire pour le prototype
  app.post<{ Body: Omit<(typeof MOCK_RESERVATIONS)[number], "id"> }>("/reservations", async (req, reply) => {
    const { nomClient, tableId, couverts, heure, allergenes, notes } = req.body;
    if (!nomClient?.trim() || !tableId?.trim() || !Number.isInteger(couverts) || couverts < 1 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) {
      return reply.status(400).send({ error: "Données de réservation invalides" });
    }
    const reservation = { id: `r-${Date.now()}`, nomClient: nomClient.trim(), tableId: tableId.trim(), couverts, heure, allergenes: allergenes ?? [], notes: notes?.trim() ?? "" };
    reservations.push(reservation);
    return reply.status(201).send(reservation);
  });

  app.delete<{ Params: { id: string } }>("/reservations/:id", async (req, reply) => {
    const index = reservations.findIndex((reservation) => reservation.id === req.params.id);
    if (index === -1) return reply.status(404).send({ error: "Réservation introuvable" });
    reservations.splice(index, 1);
    return { id: req.params.id, deleted: true };
  });
}
