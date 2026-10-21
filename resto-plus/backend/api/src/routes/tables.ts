import type { FastifyInstance } from "fastify";
import type { DishServiceStatus, ServiceCourse, StatutTable } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { restaurantDe } from "../tenant";
import { journaliser } from "../audit";
import { repositories } from "../repositories";
import { journalAdditions } from "./tableState";

export async function tablesRoutes(app: FastifyInstance) {
  // Toutes les routes /tables/:id de ce module : la table doit appartenir au restaurant.
  app.addHook("preHandler", async (req, reply) => {
    const { id } = req.params as { id?: string };
    if (id && !(await repositories.salles.tableExiste(restaurantDe(req), id))) {
      return reply.status(404).send({ error: "Table introuvable" });
    }
  });

  // PUT /tables/:id/statut
  app.put<{
    Params: { id: string };
    Body: { statut: StatutTable };
  }>("/tables/:id/statut", { preHandler: requirePermission("service.suivre") }, async (req, reply) => {
    const { id } = req.params;
    const { statut } = req.body;

    const STATUTS_VALIDES: StatutTable[] = ["libre", "occupee", "reservee", "a_nettoyer"];
    if (!STATUTS_VALIDES.includes(statut)) {
      return reply.status(400).send({ error: "Statut invalide" });
    }

    await repositories.salles.changerStatut(restaurantDe(req), id, statut);
    return { id, statut, updatedAt: new Date().toISOString() };
  });

  // PUT /tables/:id/position
  app.put<{
    Params: { id: string };
    Body: { x: number; y: number };
  }>("/tables/:id/position", { preHandler: requirePermission("salle.configurer") }, async (req, reply) => {
    const { id } = req.params;
    const { x, y } = req.body;

    if (typeof x !== "number" || typeof y !== "number") {
      return reply.status(400).send({ error: "x et y doivent être des nombres" });
    }

    await repositories.salles.deplacer(restaurantDe(req), id, x, y);
    return { id, x, y, updatedAt: new Date().toISOString() };
  });

  // PUT /tables/:id/info
  app.put<{
    Params: { id: string };
    Body: { nom?: string; capacite?: number };
  }>("/tables/:id/info", { preHandler: requirePermission("salle.configurer") }, async (req, reply) => {
    const { nom, capacite } = req.body;
    if (nom !== undefined && (typeof nom !== "string" || !nom.trim())) {
      return reply.status(400).send({ error: "Le nom doit être un texte non vide" });
    }
    if (capacite !== undefined && (!Number.isInteger(capacite) || capacite < 1)) {
      return reply.status(400).send({ error: "La capacité doit être un entier positif" });
    }

    const infos = await repositories.salles.modifierInfos(restaurantDe(req), req.params.id, {
      ...(nom === undefined ? {} : { nom: nom.trim() }),
      ...(capacite === undefined ? {} : { capacite }),
    });
    return { id: req.params.id, ...infos, updatedAt: new Date().toISOString() };
  });

  // PUT /tables/:id/service
  app.put<{
    Params: { id: string };
    Body: { tableId: string; reservationId?: string; clientId?: string; clientName?: string; course: ServiceCourse; dishStatus: DishServiceStatus; seatedAt?: string; lastEventAt?: string; allergenes?: string[]; allergenesSignalesAt?: string };
  }>("/tables/:id/service", { preHandler: requirePermission("service.suivre") }, async (req, reply) => {
    const { course, dishStatus } = req.body;
    const ETAPES: ServiceCourse[] = ["aucun", "entree", "plat", "dessert"];
    const ETATS_PLAT: DishServiceStatus[] = ["aucun", "a_reclamer", "servi"];
    if (!ETAPES.includes(course)) {
      return reply.status(400).send({ error: "Étape de repas invalide" });
    }
    if (!ETATS_PLAT.includes(dishStatus)) {
      return reply.status(400).send({ error: "État de plat invalide" });
    }
    // Allergies = donnée de santé : seulement si le client les a signalées (docs/rgpd.md).
    if (req.body.allergenes?.length && !req.body.allergenesSignalesAt) {
      return reply.status(400).send({ error: "Allergies non signalées par le client" });
    }
    return repositories.salles.ecrireService(restaurantDe(req), {
      ...req.body,
      tableId: req.params.id,
      lastEventAt: new Date().toISOString(),
    });
  });

  app.put<{ Params: { id: string }; Body: { tableId: string; occurredAt: string } }>("/tables/:id/open", { preHandler: requirePermission("service.suivre") }, async (req) => {
    await repositories.salles.changerStatut(restaurantDe(req), req.params.id, "occupee");
    return { tableId: req.params.id, status: "occupee", openedAt: req.body.occurredAt };
  });

  app.put<{ Params: { id: string }; Body: { tableId: string; occurredAt: string } }>("/tables/:id/bill", { preHandler: requirePermission("service.addition") }, async (req) => {
    // Repas terminé : table à nettoyer, les allergies ne sont plus conservées.
    await repositories.salles.terminerRepas(restaurantDe(req), req.params.id);
    journalAdditions.push({ tableId: req.params.id, restaurantId: restaurantDe(req), at: new Date().toISOString() });
    journaliser(req, "service.addition", { cible: { type: "table", id: req.params.id } });
    return { tableId: req.params.id, status: "a_nettoyer", billedAt: req.body.occurredAt };
  });

  app.put<{ Params: { id: string }; Body: { tableId: string; menuItemId: string; quantite: number; orderedAt: string } }>("/tables/:id/dish-order", { preHandler: requirePermission("service.commander") }, async (req) => ({
    tableId: req.params.id,
    menuItemId: req.body.menuItemId,
    quantite: req.body.quantite,
    status: "en_attente",
    orderedAt: req.body.orderedAt,
  }));

  app.put<{ Params: { id: string }; Body: { tableId: string; lineId: string; reclameAt: string } }>("/tables/:id/dish-request", { preHandler: requirePermission("service.commander") }, async (req) => ({
    tableId: req.params.id,
    lineId: req.body.lineId,
    status: "a_reclamer",
    reclameAt: req.body.reclameAt,
  }));

  app.put<{ Params: { id: string }; Body: { tableId: string; lineId: string; readyAt: string } }>("/tables/:id/dish-ready", { preHandler: requirePermission("cuisine.plat_pret") }, async (req) => ({
    tableId: req.params.id,
    lineId: req.body.lineId,
    status: "pret",
    readyAt: req.body.readyAt,
  }));
}
