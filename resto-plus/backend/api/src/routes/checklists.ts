import type { FastifyInstance, FastifyReply } from "fastify";
import { estConforme, type AuditValeur, type FrequenceChecklist } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { journaliser } from "../audit";
import { restaurantDe } from "../tenant";
import { jourEffectif } from "../journeeStore";
import { repositories } from "../repositories";
import type { ModificationPoint } from "../repositories/haccp";

const FREQUENCES: FrequenceChecklist[] = ["reception", "ouverture", "service", "fermeture", "4h", "hebdomadaire"];

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

/**
 * Lit un point de contrôle envoyé par l'écran « Plan HACCP ». Renvoie un message
 * d'erreur pour l'utilisateur si quelque chose est invalide.
 */
function lirePoint(corps: Record<string, unknown>, creation: boolean): ModificationPoint | string {
  const m: ModificationPoint = {};
  if (corps.label !== undefined || creation) {
    if (typeof corps.label !== "string" || !corps.label.trim() || corps.label.length > 200) return "Libellé obligatoire (200 caractères au plus).";
    m.label = corps.label.trim();
  }
  for (const cle of ["requiertValeur", "requiertPhoto", "actif"] as const) {
    if (corps[cle] !== undefined) {
      if (typeof corps[cle] !== "boolean") return "Valeur invalide.";
      m[cle] = corps[cle] as boolean;
    }
  }
  for (const cle of ["seuilMin", "seuilMax"] as const) {
    if (corps[cle] !== undefined) {
      if (corps[cle] !== null && (typeof corps[cle] !== "number" || !Number.isFinite(corps[cle]))) return "Seuil invalide.";
      m[cle] = corps[cle] as number | null;
    }
  }
  for (const [cle, max] of [["unite", 10], ["consigne", 300]] as const) {
    if (corps[cle] !== undefined) {
      if (corps[cle] !== null && (typeof corps[cle] !== "string" || (corps[cle] as string).length > max)) return "Texte trop long.";
      m[cle] = corps[cle] === null || !(corps[cle] as string).trim() ? null : (corps[cle] as string).trim();
    }
  }
  if (corps.ordre !== undefined) {
    if (!Number.isInteger(corps.ordre) || (corps.ordre as number) < 0) return "Ordre invalide.";
    m.ordre = corps.ordre as number;
  }
  if (m.seuilMin != null && m.seuilMax != null && m.seuilMin > m.seuilMax) return "Le seuil minimum dépasse le seuil maximum.";
  return m;
}

/** Une modification telle qu'enregistrée au journal d'audit (sans les champs absents). */
function pourAudit(modification: object): { [cle: string]: AuditValeur } {
  return Object.fromEntries(Object.entries(modification).filter(([, v]) => v !== undefined)) as { [cle: string]: AuditValeur };
}

/** Contraintes de la migration 0019 (seuils) violées : erreur de saisie, pas une panne. */
function repondreErreurPlan(erreur: unknown, reply: FastifyReply) {
  const message = erreur instanceof Error ? erreur.message : "";
  if (message.includes("checklist_items_seuils_si_valeur")) {
    return reply.status(400).send({ error: "Un seuil n'a de sens que pour un point avec valeur chiffrée." });
  }
  if (message.includes("checklist_items_seuils_ordonnes")) {
    return reply.status(400).send({ error: "Le seuil minimum dépasse le seuil maximum." });
  }
  throw erreur;
}

export async function checklistsRoutes(app: FastifyInstance) {
  const edition = { preHandler: requirePermission("haccp.configurer") };

  // GET /checklists — plan HACCP de l'établissement (points actifs, avec leurs seuils)
  app.get("/checklists", async (req) => repositories.haccp.listerChecklists(restaurantDe(req)));

  // POST /checklist-entries — un relevé ; il fait foi lors d'un contrôle sanitaire.
  app.post<{ Body: CorpsReleve }>("/checklist-entries", { preHandler: requirePermission("checklist.remplir") }, async (req, reply) => {
    const restaurantId = restaurantDe(req);
    const { checklistId, itemId } = req.body ?? {};
    const point = checklistId && itemId ? await repositories.haccp.point(restaurantId, checklistId, itemId) : null;
    if (!checklistId || !itemId || !point) {
      return reply.status(404).send({ error: "Point de contrôle introuvable" });
    }
    const valeur = req.body.valeur === undefined || req.body.valeur === null ? undefined : String(req.body.valeur).slice(0, 200);
    // Point chiffré avec seuils : c'est l'API qui décide de la conformité, pas l'app.
    const conformeSeuils = point.requiertValeur ? estConforme(point, valeur) : undefined;
    const releve = await repositories.haccp.enregistrer(restaurantId, {
      id: req.body.id,
      checklistId,
      itemId,
      valeur,
      photoUrl: typeof req.body.photoUrl === "string" ? req.body.photoUrl : undefined,
      conforme: conformeSeuils ?? (typeof req.body.conforme === "boolean" ? req.body.conforme : undefined),
      commentaire: typeof req.body.commentaire === "string" ? req.body.commentaire.slice(0, 1000) : undefined,
      releveAt: heureDuReleve(req.body.timestamp),
      userId: req.auth?.userId,
      // Copie du point au moment du relevé (traçabilité si le plan change ensuite).
      libelle: point.label,
      seuilMin: point.seuilMin,
      seuilMax: point.seuilMax,
      unite: point.unite,
    });
    journaliser(req, "haccp.checklist", {
      cible: { type: "checklist", id: checklistId, libelle: point.label },
      details: {
        entreeId: releve.id,
        itemId,
        valeur: releve.valeur ?? null,
        unite: point.unite ?? null,
        conforme: releve.conforme ?? null,
        commentaire: releve.commentaire ?? null,
        releveAt: releve.releveAt,
      },
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

  // ─── Édition du plan HACCP (chef de cuisine N2, directeur N3) ───────────────────
  // Chaque modification est inscrite au journal d'audit (catégorie HACCP). Rien n'est
  // supprimé : une checklist ou un point retiré est désactivé, ses relevés restent lisibles.

  app.post<{ Body: { nom?: string; frequence?: FrequenceChecklist } }>("/checklists", edition, async (req, reply) => {
    const nom = req.body?.nom?.trim();
    const frequence = req.body?.frequence;
    if (!nom || nom.length > 100 || !frequence || !FREQUENCES.includes(frequence)) {
      return reply.status(400).send({ error: "Nom et fréquence obligatoires." });
    }
    const checklist = await repositories.haccp.creerChecklist(restaurantDe(req), { nom, frequence });
    journaliser(req, "haccp.plan_modifie", { cible: { type: "checklist", id: checklist.id, libelle: nom }, apres: { nom, frequence } });
    return reply.status(201).send(checklist);
  });

  app.put<{ Params: { id: string }; Body: { nom?: string; frequence?: FrequenceChecklist; ordre?: number; actif?: boolean } }>(
    "/checklists/:id",
    edition,
    async (req, reply) => {
      const { nom, frequence, ordre, actif } = req.body ?? {};
      if (nom !== undefined && (typeof nom !== "string" || !nom.trim() || nom.length > 100)) return reply.status(400).send({ error: "Nom invalide." });
      if (frequence !== undefined && !FREQUENCES.includes(frequence)) return reply.status(400).send({ error: "Fréquence invalide." });
      if (ordre !== undefined && (!Number.isInteger(ordre) || ordre < 0)) return reply.status(400).send({ error: "Ordre invalide." });
      if (actif !== undefined && typeof actif !== "boolean") return reply.status(400).send({ error: "Valeur invalide." });
      const modification = { nom: nom?.trim(), frequence, ordre, actif };
      const checklist = await repositories.haccp.modifierChecklist(restaurantDe(req), req.params.id, modification);
      if (!checklist) return reply.status(404).send({ error: "Checklist introuvable" });
      journaliser(req, "haccp.plan_modifie", { cible: { type: "checklist", id: checklist.id, libelle: checklist.type }, apres: pourAudit(modification) });
      return checklist;
    }
  );

  app.post<{ Params: { id: string }; Body: Record<string, unknown> }>("/checklists/:id/items", edition, async (req, reply) => {
    const point = lirePoint(req.body ?? {}, true);
    if (typeof point === "string") return reply.status(400).send({ error: point });
    try {
      const cree = await repositories.haccp.ajouterPoint(restaurantDe(req), req.params.id, point as ModificationPoint & { label: string });
      if (!cree) return reply.status(404).send({ error: "Checklist introuvable" });
      journaliser(req, "haccp.plan_modifie", { cible: { type: "point", id: cree.id, libelle: cree.label }, apres: pourAudit(point) });
      return reply.status(201).send(cree);
    } catch (erreur) {
      return repondreErreurPlan(erreur, reply);
    }
  });

  app.put<{ Params: { id: string }; Body: Record<string, unknown> }>("/checklist-items/:id", edition, async (req, reply) => {
    const modification = lirePoint(req.body ?? {}, false);
    if (typeof modification === "string") return reply.status(400).send({ error: modification });
    try {
      const point = await repositories.haccp.modifierPoint(restaurantDe(req), req.params.id, modification);
      if (!point) return reply.status(404).send({ error: "Point de contrôle introuvable" });
      journaliser(req, "haccp.plan_modifie", { cible: { type: "point", id: point.id, libelle: point.label }, apres: pourAudit(modification) });
      return point;
    } catch (erreur) {
      return repondreErreurPlan(erreur, reply);
    }
  });
}
