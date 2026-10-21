import type { FastifyInstance } from "fastify";
import type { Delegation, DroitsSession } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { resolveIdentity } from "../demoIdentity";
import { delegationActive, delegations, finDeDelegation } from "../delegationStore";
import { trouverMembre } from "./comptes";
import { journaliser } from "../audit";
import "../auth";
import { restaurantDe } from "../tenant";

/**
 * Délégation des tâches — Resto Plus
 *
 * Le directeur (N3) confie à un N1 d'un pôle (ex. sous-chef de cuisine) les tâches et
 * responsabilités du N2 de ce pôle pendant une absence : compte rendu du service,
 * sorties de stock, gestion de l'équipe du pôle. Une seule délégation active par pôle.
 * Elle s'arrête d'elle-même à la fin de service du dernier jour, ou sur révocation.
 */

const DUREES_JOURS = [1, 3, 7, 14];

export async function delegationsRoutes(app: FastifyInstance) {
  const gestion = { preHandler: requirePermission("delegations.gerer") };

  // GET /session/droits — droits effectifs de l'appelant (délégation incluse)
  app.get("/session/droits", async (req, reply) => {
    const identity = resolveIdentity(req);
    if (!identity) return reply.status(401).send({ error: "IDENTITY_REQUIRED" });
    const restaurantId = restaurantDe(req);
    const delegation = identity.accessRole === "chef_rang" ? delegationActive(restaurantId, identity.id) : undefined;
    const droits: DroitsSession = delegation && delegation.pole === identity.pole
      ? { accessRole: "manager_admin", delegation }
      : { accessRole: identity.accessRole };
    return droits;
  });

  // GET /delegations — délégations en cours (non révoquées, non expirées)
  app.get("/delegations", gestion, async (req) => {
    const restaurantId = restaurantDe(req);
    const now = new Date().toISOString();
    return delegations.filter((d) => d.restaurantId === restaurantId && !d.revoqueeAt && d.fin > now);
  });

  // POST /delegations — confie les tâches du N2 d'un pôle à un N1 de ce pôle
  app.post<{ Body: { delegueId: string; pole: string; jours: number } }>("/delegations", gestion, async (req, reply) => {
    const { delegueId, pole, jours } = req.body;
    if (pole !== "salle" && pole !== "cuisine") return reply.status(400).send({ error: "Pôle invalide" });
    if (!DUREES_JOURS.includes(jours)) return reply.status(400).send({ error: "Durée invalide" });
    const restaurantId = restaurantDe(req);
    const membre = trouverMembre(restaurantId, delegueId);
    if (!membre || membre.statut !== "actif") return reply.status(404).send({ error: "Employé introuvable ou compte inactif." });
    if (membre.accessRole !== "chef_rang" || membre.pole !== pole) {
      return reply.status(400).send({ error: "La délégation se donne à un N1 du même pôle." });
    }

    const now = new Date().toISOString();
    // Une seule délégation active par pôle : la nouvelle remplace l'ancienne.
    for (const existante of delegations) {
      if (existante.restaurantId === restaurantId && existante.pole === pole && !existante.revoqueeAt && existante.fin > now) {
        existante.revoqueeAt = now;
      }
    }
    const delegation: Delegation & { restaurantId: string } = {
      id: `deleg-${Date.now()}`,
      restaurantId,
      delegueId: membre.id,
      delegueNom: membre.nom,
      pole,
      debut: now,
      fin: finDeDelegation(jours),
      creeParNom: resolveIdentity(req)?.nom,
    };
    delegations.push(delegation);
    journaliser(req, "delegation.creee", {
      cible: { type: "compte", id: membre.id, libelle: membre.nom },
      apres: { pole, niveauExerce: "manager_admin" },
      details: { delegationId: delegation.id, debut: delegation.debut, fin: delegation.fin },
    });
    return reply.status(201).send(delegation);
  });

  // POST /delegations/:id/revoquer — retour du N2, fin anticipée
  app.post<{ Params: { id: string } }>("/delegations/:id/revoquer", gestion, async (req, reply) => {
    const delegation = delegations.find((d) => d.id === req.params.id && d.restaurantId === restaurantDe(req));
    if (!delegation) return reply.status(404).send({ error: "Délégation introuvable" });
    delegation.revoqueeAt = new Date().toISOString();
    journaliser(req, "delegation.revoquee", {
      cible: { type: "compte", id: delegation.delegueId, libelle: delegation.delegueNom },
      details: { delegationId: delegation.id, pole: delegation.pole, finPrevue: delegation.fin },
    });
    return delegation;
  });
}
