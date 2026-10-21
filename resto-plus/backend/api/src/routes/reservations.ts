import type { FastifyInstance } from "fastify";
import type { Reservation } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { jourEffectif } from "../journeeStore";
import { restaurantDe } from "../tenant";
import { repositories } from "../repositories";
import { estUuid } from "../repositories/outils";

const SOURCES: NonNullable<Reservation["source"]>[] = ["telephone", "site", "email", "walk_in", "conciergerie"];

type CorpsReservation = {
  id?: string;
  date?: string;
  heure: string;
  nomClient: string;
  couverts: number;
  tableId?: string;
  clientId?: string;
  allergenes?: string[];
  allergenesSignalesAt?: string;
  notes?: string;
  source?: Reservation["source"];
};

export async function reservationsRoutes(app: FastifyInstance) {
  // GET /reservations?date=AAAA-MM-JJ — réservations d'une journée de service (par
  // défaut celle en cours), walk-ins compris (source « walk_in »), hors annulées.
  app.get<{ Querystring: { date?: string } }>("/reservations", async (req) => {
    const restaurantId = restaurantDe(req);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? "") ? req.query.date! : jourEffectif(restaurantId);
    return repositories.reservations.lister(restaurantId, date);
  });

  app.post<{ Body: CorpsReservation }>("/reservations", { preHandler: requirePermission("reservation.gerer") }, async (req, reply) => {
    const { nomClient, couverts, heure, tableId, clientId, notes } = req.body;
    const allergenes = (req.body.allergenes ?? []).map((a) => a.trim()).filter(Boolean);
    if (!nomClient?.trim() || !Number.isInteger(couverts) || couverts < 1 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(heure ?? "")) {
      return reply.status(400).send({ error: "Données de réservation invalides" });
    }
    // Identifiant généré par l'app (uuid) ; un ancien « local-… » est remplacé par le serveur.
    const id = req.body.id;
    if (id !== undefined && !estUuid(id) && !String(id).startsWith("local-")) {
      return reply.status(400).send({ error: "Identifiant de réservation invalide" });
    }
    // Allergies = donnée de santé : seulement si le client les a signalées (docs/rgpd.md).
    if (allergenes.length > 0 && !req.body.allergenesSignalesAt) {
      return reply.status(400).send({ error: "Allergies non signalées par le client" });
    }
    const restaurantId = restaurantDe(req);
    // Table et fiche client facultatives, mais forcément de ce restaurant.
    if (tableId && !(await repositories.salles.tableExiste(restaurantId, tableId))) {
      return reply.status(404).send({ error: "Table introuvable" });
    }
    if (clientId && !(await repositories.clients.lire(restaurantId, clientId))) {
      return reply.status(404).send({ error: "Client introuvable" });
    }

    const reservation = await repositories.reservations.creer(restaurantId, {
      id: req.body.id && estUuid(req.body.id) ? req.body.id : undefined,
      date: /^\d{4}-\d{2}-\d{2}$/.test(req.body.date ?? "") ? req.body.date! : jourEffectif(restaurantId),
      heure,
      nomClient: nomClient.trim(),
      couverts,
      tableId: tableId || undefined,
      clientId: clientId || undefined,
      allergenes,
      allergenesSignalesAt: allergenes.length > 0 ? req.body.allergenesSignalesAt : undefined,
      notes: notes?.trim() || undefined,
      source: req.body.source && SOURCES.includes(req.body.source) && req.body.source !== "walk_in" ? req.body.source : "telephone",
    });
    return reply.status(201).send(reservation);
  });

  // DELETE /reservations/:id — annulation : la réservation reste en base au statut
  // « annulée » (statistiques), ses allergies sont effacées.
  app.delete<{ Params: { id: string } }>("/reservations/:id", { preHandler: requirePermission("reservation.gerer") }, async (req, reply) => {
    const annulee = await repositories.reservations.annuler(restaurantDe(req), req.params.id);
    if (!annulee) return reply.status(404).send({ error: "Réservation introuvable" });
    return { id: req.params.id, status: "annulee" };
  });
}
