import type { FastifyInstance } from "fastify";
import { tableInfos, tablePositions, tableServices, tableStatuts } from "./tableState";

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

  // PUT /tables/:id/info
  app.put<{
    Params: { id: string };
    Body: { nom?: string; capacite?: number };
  }>("/tables/:id/info", async (req, reply) => {
    const { nom, capacite } = req.body;
    if (nom !== undefined && (typeof nom !== "string" || !nom.trim())) {
      return reply.status(400).send({ error: "Le nom doit être un texte non vide" });
    }
    if (capacite !== undefined && (!Number.isInteger(capacite) || capacite < 1)) {
      return reply.status(400).send({ error: "La capacité doit être un entier positif" });
    }

    tableInfos[req.params.id] = {
      ...(tableInfos[req.params.id] ?? {}),
      ...(nom === undefined ? {} : { nom: nom.trim() }),
      ...(capacite === undefined ? {} : { capacite }),
    };
    return { id: req.params.id, ...tableInfos[req.params.id], updatedAt: new Date().toISOString() };
  });

  // PUT /tables/:id/service
  app.put<{
    Params: { id: string };
    Body: { tableId: string; reservationId?: string; clientId?: string; clientName?: string; course: string; dishStatus: string; seatedAt?: string; lastEventAt?: string };
  }>("/tables/:id/service", async (req, reply) => {
    const { course, dishStatus } = req.body;
    if (!["aucun", "entree", "plat", "dessert"].includes(course)) {
      return reply.status(400).send({ error: "Étape de repas invalide" });
    }
    if (!["aucun", "a_reclamer", "servi"].includes(dishStatus)) {
      return reply.status(400).send({ error: "État de plat invalide" });
    }
    tableServices[req.params.id] = {
      ...req.body,
      tableId: req.params.id,
      lastEventAt: new Date().toISOString(),
    };
    return tableServices[req.params.id];
  });

  app.put<{ Params: { id: string }; Body: { tableId: string; occurredAt: string } }>("/tables/:id/open", async (req) => {
    tableStatuts[req.params.id] = "occupee";
    return { tableId: req.params.id, status: "occupee", openedAt: req.body.occurredAt };
  });

  app.put<{ Params: { id: string }; Body: { tableId: string; occurredAt: string } }>("/tables/:id/bill", async (req) => {
    tableStatuts[req.params.id] = "a_nettoyer";
    return { tableId: req.params.id, status: "a_nettoyer", billedAt: req.body.occurredAt };
  });

  app.put<{ Params: { id: string }; Body: { tableId: string; menuItemId: string; quantite: number; orderedAt: string } }>("/tables/:id/dish-order", async (req) => ({
    tableId: req.params.id,
    menuItemId: req.body.menuItemId,
    quantite: req.body.quantite,
    status: "en_attente",
    orderedAt: req.body.orderedAt,
  }));

  app.put<{ Params: { id: string }; Body: { tableId: string; lineId: string; reclameAt: string } }>("/tables/:id/dish-request", async (req) => ({
    tableId: req.params.id,
    lineId: req.body.lineId,
    status: "a_reclamer",
    reclameAt: req.body.reclameAt,
  }));

  app.put<{ Params: { id: string }; Body: { tableId: string; lineId: string; readyAt: string } }>("/tables/:id/dish-ready", async (req) => ({
    tableId: req.params.id,
    lineId: req.body.lineId,
    status: "pret",
    readyAt: req.body.readyAt,
  }));
}
