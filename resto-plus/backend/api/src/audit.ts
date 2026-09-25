import { createHash } from "node:crypto";
import type { FastifyRequest } from "fastify";
import {
  CATEGORIE_ACTION,
  CONSERVATION_AUDIT,
  type AuditAction,
  type AuditActeur,
  type AuditCategorie,
  type AuditEvenement,
  type AuditValeur,
  type AuditVerification,
} from "@resto-plus/types";
import { resolveIdentity } from "./demoIdentity";
import { delegationActive } from "./delegationStore";
import { restaurantDe, DEMO_RESTAURANT_ID } from "./tenant";

/**
 * Journal d'audit infalsifiable — Resto Plus
 *
 * - On ne peut qu'AJOUTER : aucune fonction de modification ou de suppression n'est
 *   exposée (seule la purge légale, en fin de durée de conservation, retire les plus
 *   anciens événements).
 * - Chaque événement contient l'empreinte SHA-256 du précédent : modifier, supprimer
 *   ou insérer une ligne casse la chaîne, et verifierChaine() le détecte.
 * - Une chaîne par restaurant ET par catégorie, car chaque catégorie a sa propre
 *   durée de conservation : la purge retire toujours le début d'une chaîne, et garde
 *   l'empreinte du dernier événement purgé comme point d'ancrage.
 *
 * En mémoire pour le prototype ; en base, la table audit_log (migration 0012) refuse
 * UPDATE et DELETE par trigger.
 */


type Ancre = { sequence: number; empreinte: string };

const evenements: AuditEvenement[] = [];
const ancres = new Map<string, Ancre>();

function cleChaine(restaurantId: string, categorie: AuditCategorie) {
  return `${restaurantId}:${categorie}`;
}

function origine(restaurantId: string, categorie: AuditCategorie): Ancre {
  return ancres.get(cleChaine(restaurantId, categorie)) ?? { sequence: 0, empreinte: `ORIGINE:${restaurantId}:${categorie}` };
}

/** JSON à clés triées : la même donnée donne toujours la même empreinte. */
function canonique(valeur: unknown): string {
  if (valeur === null || typeof valeur !== "object") return JSON.stringify(valeur);
  if (Array.isArray(valeur)) return `[${valeur.map(canonique).join(",")}]`;
  const entrees = Object.entries(valeur as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entrees.map(([k, v]) => `${JSON.stringify(k)}:${canonique(v)}`).join(",")}}`;
}

function calculerEmpreinte(evenement: Omit<AuditEvenement, "empreinte">) {
  return createHash("sha256").update(evenement.empreintePrecedente).update(canonique(evenement)).digest("hex");
}

function chaine(restaurantId: string, categorie: AuditCategorie) {
  return evenements.filter((e) => e.restaurantId === restaurantId && e.categorie === categorie);
}

/** Qui agit : identité de la session, avec la mention d'une délégation active. */
export function acteurDe(req: FastifyRequest): AuditActeur | undefined {
  const identity = resolveIdentity(req);
  if (!identity) return req.auth?.userId ? { id: req.auth.userId } : undefined;
  const restaurantId = restaurantDe(req);
  const delegation = identity.accessRole === "chef_rang" ? delegationActive(restaurantId, identity.id) : undefined;
  return {
    id: identity.id,
    nom: identity.nom,
    accessRole: identity.accessRole,
    pole: identity.pole,
    ...(delegation && delegation.pole === identity.pole ? { parDelegation: true } : {}),
  };
}

export interface EntreeAudit {
  cible?: AuditEvenement["cible"];
  avant?: AuditValeur;
  apres?: AuditValeur;
  details?: Record<string, AuditValeur>;
  /** Pour les routes publiques (connexion…) où la session ne dit pas qui agit. */
  acteur?: AuditActeur;
  restaurantId?: string;
}

/** Ajoute un événement au journal. `req` null : action système (ex. purge). */
export function journaliser(req: FastifyRequest | null, action: AuditAction, entree: EntreeAudit = {}): AuditEvenement {
  const restaurantId = entree.restaurantId ?? (req ? restaurantDe(req) : DEMO_RESTAURANT_ID);
  const categorie = CATEGORIE_ACTION[action];
  const precedent = chaine(restaurantId, categorie).at(-1) ?? origine(restaurantId, categorie);
  const sansEmpreinte: Omit<AuditEvenement, "empreinte"> = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    restaurantId,
    categorie,
    sequence: precedent.sequence + 1,
    action,
    at: new Date().toISOString(),
    acteur: entree.acteur ?? (req ? acteurDe(req) : undefined),
    cible: entree.cible,
    avant: entree.avant,
    apres: entree.apres,
    details: entree.details,
    empreintePrecedente: precedent.empreinte,
  };
  const evenement = Object.freeze({ ...sansEmpreinte, empreinte: calculerEmpreinte(sansEmpreinte) }) as AuditEvenement;
  evenements.push(evenement);
  return evenement;
}

/** Recalcule toute la chaîne : la moindre modification est détectée. */
export function verifierChaine(restaurantId: string, categorie: AuditCategorie): AuditVerification {
  const liste = chaine(restaurantId, categorie);
  let attendu = origine(restaurantId, categorie);
  for (const evenement of liste) {
    const { empreinte, ...reste } = evenement;
    const rompu =
      evenement.sequence !== attendu.sequence + 1 ||
      evenement.empreintePrecedente !== attendu.empreinte ||
      calculerEmpreinte(reste) !== empreinte;
    if (rompu) return { categorie, evenements: liste.length, integre: false, rompueA: attendu.sequence + 1 };
    attendu = { sequence: evenement.sequence, empreinte };
  }
  return { categorie, evenements: liste.length, integre: true };
}

export function verifierTout(restaurantId: string): AuditVerification[] {
  return (Object.keys(CONSERVATION_AUDIT) as AuditCategorie[]).map((categorie) => verifierChaine(restaurantId, categorie));
}

export function lireJournal(restaurantId: string, filtre: { categorie?: AuditCategorie; limite?: number } = {}): AuditEvenement[] {
  return evenements
    .filter((e) => e.restaurantId === restaurantId && (!filtre.categorie || e.categorie === filtre.categorie))
    .slice()
    .reverse()
    .slice(0, filtre.limite ?? 200);
}

/**
 * Purge légale : retire les événements plus vieux que la durée de conservation de leur
 * catégorie. Ils sont toujours en tête de chaîne ; l'empreinte du dernier retiré devient
 * l'ancre, donc la chaîne restante reste vérifiable.
 */
export function purgerExpires(now = new Date()) {
  const cles = new Set(evenements.map((e) => cleChaine(e.restaurantId, e.categorie)));
  for (const cle of cles) {
    const [restaurantId, categorie] = cle.split(":") as [string, AuditCategorie];
    const limite = new Date(now);
    limite.setFullYear(limite.getFullYear() - CONSERVATION_AUDIT[categorie].annees);
    const expires = chaine(restaurantId, categorie).filter((e) => e.at < limite.toISOString());
    const dernier = expires.at(-1);
    if (!dernier) continue;
    ancres.set(cle, { sequence: dernier.sequence, empreinte: dernier.empreinte });
    for (const expire of expires) evenements.splice(evenements.indexOf(expire), 1);
  }
}

// Purge quotidienne ; unref : ne retient pas le processus à l'arrêt.
setInterval(() => purgerExpires(), 24 * 60 * 60 * 1000).unref();

/** Accès brut réservé aux tests d'intégrité (simuler une falsification). */
export const _evenementsPourTests = evenements;
