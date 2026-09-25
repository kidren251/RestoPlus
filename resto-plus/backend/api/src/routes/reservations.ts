import type { FastifyInstance } from "fastify";
import { jourDeService } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { jourEffectif } from "../journeeStore";
import { appartient, DEMO_RESTAURANT_ID, duRestaurant, restaurantDe } from "../tenant";

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

// Chaque réservation appartient à une journée de service (voir serviceDay.ts) : une
// table à 0h30 fait partie du service de la veille. Démo : le planning mock est celui du jour.
export const reservations: ((typeof MOCK_RESERVATIONS)[number] & { date: string; restaurantId: string })[] = MOCK_RESERVATIONS.map((reservation) => ({
  ...reservation,
  restaurantId: DEMO_RESTAURANT_ID,
  date: jourDeService(),
}));

export async function reservationsRoutes(app: FastifyInstance) {
  // GET /reservations — réservations du soir courant
  app.get("/reservations", async (req) => {
    return duRestaurant(reservations, req);
  });

  // POST /reservations — créer une réservation en mémoire pour le prototype
  app.post<{ Body: Omit<(typeof MOCK_RESERVATIONS)[number], "id"> & { date?: string } }>("/reservations", { preHandler: requirePermission("reservation.gerer") }, async (req, reply) => {
    const { nomClient, tableId, couverts, heure, allergenes, notes } = req.body;
    if (!nomClient?.trim() || !tableId?.trim() || !Number.isInteger(couverts) || couverts < 1 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure)) {
      return reply.status(400).send({ error: "Données de réservation invalides" });
    }
    const date = typeof req.body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : jourEffectif(restaurantDe(req));
    const reservation = { id: `r-${Date.now()}`, restaurantId: restaurantDe(req), date, nomClient: nomClient.trim(), tableId: tableId.trim(), couverts, heure, allergenes: allergenes ?? [], notes: notes?.trim() ?? "" };
    reservations.push(reservation as (typeof reservations)[number]);
    return reply.status(201).send(reservation);
  });

  app.delete<{ Params: { id: string } }>("/reservations/:id", { preHandler: requirePermission("reservation.gerer") }, async (req, reply) => {
    const index = reservations.findIndex((reservation) => reservation.id === req.params.id);
    if (index === -1 || !appartient(reservations[index], req)) return reply.status(404).send({ error: "Réservation introuvable" });
    reservations.splice(index, 1);
    return { id: req.params.id, deleted: true };
  });
}
