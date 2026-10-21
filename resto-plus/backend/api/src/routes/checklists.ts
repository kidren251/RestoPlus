import type { FastifyInstance } from "fastify";
import { requirePermission } from "../permissions";
import { journaliser } from "../audit";
import { restaurantDe } from "../tenant";
import { jourEffectif } from "../journeeStore";
import { repositories } from "../repositories";

type CorpsReleve = {
  id?: string;
  checklistId?: string;
  itemId?: string;
  valeur?: string | number;
  photoUrl?: string;
  conforme?: boolean;
  commentaire?: string;
  /** Heure du relevé sur le téléphone. */
  timestamp?: string;
};

/** Heure du relevé : celle du téléphone (relevé fait hors ligne), jamais dans le futur. */
function heureDuReleve(timestamp: string | undefined): string {
  const maintenant = Date.now();
  const t = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isNaN(t) || t > maintenant + 5 * 60_000 ? new Date(maintenant).toISOString() : new Date(t).toISOString();
}

export async function checklistsRoutes(app: FastifyInstance) {
  // GET /checklists — plan HACCP de l'établissement
  app.get("/checklists", async (req) => repositories.haccp.listerChecklists(restaurantDe(req)));

  // POST /checklist-entries — un relevé ; il fait foi lors d'un contrôle sanitaire.
  app.post<{ Body: CorpsReleve }>("/checklist-entries", { preHandler: requirePermission("checklist.remplir") }, async (req, reply) => {
    const restaurantId = restaurantDe(req);
    const { checklistId, itemId } = req.body ?? {};
    if (!checklistId || !itemId || !(await repositories.haccp.pointExiste(restaurantId, checklistId, itemId))) {
      return reply.status(404).send({ error: "Point de contrôle introuvable" });
    }
    const releve = await repositories.haccp.enregistrer(restaurantId, {
      id: req.body.id,
      checklistId,
      itemId,
      valeur: req.body.valeur === undefined || req.body.valeur === null ? undefined : String(req.body.valeur).slice(0, 200),
      photoUrl: typeof req.body.photoUrl === "string" ? req.body.photoUrl : undefined,
      conforme: typeof req.body.conforme === "boolean" ? req.body.conforme : undefined,
      commentaire: typeof req.body.commentaire === "string" ? req.body.commentaire.slice(0, 1000) : undefined,
      releveAt: heureDuReleve(req.body.timestamp),
      userId: req.auth?.userId,
    });
    journaliser(req, "haccp.checklist", {
      cible: { type: "checklist", id: checklistId },
      details: { entreeId: releve.id, itemId, valeur: releve.valeur ?? null, conforme: releve.conforme ?? null, commentaire: releve.commentaire ?? null, releveAt: releve.releveAt },
    });
    return reply.status(201).send(releve);
  });

  // GET /checklist-entries?date=AAAA-MM-JJ — relevés d'une journée de service (par
  // défaut celle en cours) : l'app retrouve ce qui a déjà été fait aujourd'hui.
  app.get<{ Querystring: { date?: string } }>("/checklist-entries", async (req) => {
    const restaurantId = restaurantDe(req);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date ?? "") ? req.query.date! : jourEffectif(restaurantId);
    return repositories.haccp.releves(restaurantId, date);
  });
}
