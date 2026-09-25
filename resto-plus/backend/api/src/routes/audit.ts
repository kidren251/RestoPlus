import type { FastifyInstance } from "fastify";
import { CONSERVATION_AUDIT, type AuditCategorie } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { lireJournal, verifierTout } from "../audit";
import "../auth";
import { restaurantDe } from "../tenant";


/**
 * Consultation du journal d'audit par la direction (N3) — lecture seule : aucune route
 * ne permet de modifier ou de supprimer un événement.
 */
export async function auditRoutes(app: FastifyInstance) {
  const lecture = { preHandler: requirePermission("audit.consulter") };

  // GET /audit?categorie=comptabilite&limite=100 — événements récents + état d'intégrité
  app.get<{ Querystring: { categorie?: string; limite?: string } }>("/audit", lecture, async (req, reply) => {
    const categorie = req.query.categorie as AuditCategorie | undefined;
    if (categorie && !(categorie in CONSERVATION_AUDIT)) return reply.status(400).send({ error: "Catégorie inconnue" });
    const limite = Math.min(Math.max(Number(req.query.limite) || 100, 1), 500);
    const restaurantId = restaurantDe(req);
    return {
      evenements: lireJournal(restaurantId, { categorie, limite }),
      verification: verifierTout(restaurantId),
      conservation: CONSERVATION_AUDIT,
    };
  });
}
