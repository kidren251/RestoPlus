/**
 * Journal d'audit — Resto Plus
 *
 * Trace des actions importantes : qui, quoi, quand, sur quel objet, avant/après.
 * Buts : prouver ce qui s'est réellement passé en cas de litige (stock, comptabilité,
 * contrôle sanitaire, droits d'accès) et prouver que l'outil a fonctionné correctement.
 *
 * Ce n'est PAS un outil de surveillance des salariés : on ne journalise ni le contenu
 * des messages, ni les données des clients (nom, allergies…), ni les simples
 * consultations d'écran. Minimisation RGPD : seulement ce qui sert à ces preuves.
 */

import type { AccessRole, Pole } from "./index";

/**
 * Chaque catégorie a sa propre chaîne d'empreintes et sa durée de conservation.
 * Durées à faire valider par un juriste / DPO avant la mise en production.
 */
export type AuditCategorie = "comptabilite" | "haccp" | "administration" | "securite";

export const CONSERVATION_AUDIT: Record<AuditCategorie, { annees: number; libelle: string; motif: string }> = {
  comptabilite: { annees: 10, libelle: "Comptabilité", motif: "Pièces justificatives comptables (Code de commerce, art. L123-22)" },
  haccp: { annees: 5, libelle: "Hygiène (HACCP)", motif: "Traçabilité sanitaire, contrôles des services vétérinaires" },
  administration: { annees: 5, libelle: "Comptes et droits", motif: "Preuve de qui détenait quels droits, et quand" },
  securite: { annees: 1, libelle: "Sécurité", motif: "Journaux de connexion (recommandation CNIL : 6 mois à 1 an)" },
};

export type AuditAction =
  // Comptabilité
  | "stock.article_cree"
  | "stock.article_supprime"
  | "stock.mouvement"
  | "stock.mouvement_annule"
  | "commande.plat"
  | "service.addition"
  | "compte_rendu.valide"
  | "journee.cloturee"
  // HACCP
  | "haccp.checklist"
  // Comptes et droits
  | "compte.cree"
  | "compte.nouveau_code"
  | "compte.active"
  | "compte.desactive"
  | "compte.messagerie"
  | "delegation.creee"
  | "delegation.revoquee"
  | "droits.reglages_modifies"
  | "invitation.creee"
  | "invitation.utilisee"
  // Sécurité
  | "connexion.reussie"
  | "connexion.echouee"
  | "activation.echouee"
  | "acces.refuse";

export const CATEGORIE_ACTION: Record<AuditAction, AuditCategorie> = {
  "stock.article_cree": "comptabilite",
  "stock.article_supprime": "comptabilite",
  "stock.mouvement": "comptabilite",
  "stock.mouvement_annule": "comptabilite",
  "commande.plat": "comptabilite",
  "service.addition": "comptabilite",
  "compte_rendu.valide": "comptabilite",
  "journee.cloturee": "comptabilite",
  "haccp.checklist": "haccp",
  "compte.cree": "administration",
  "compte.nouveau_code": "administration",
  "compte.active": "administration",
  "compte.desactive": "administration",
  "compte.messagerie": "administration",
  "delegation.creee": "administration",
  "delegation.revoquee": "administration",
  "droits.reglages_modifies": "administration",
  "invitation.creee": "administration",
  "invitation.utilisee": "administration",
  "connexion.reussie": "securite",
  "connexion.echouee": "securite",
  "activation.echouee": "securite",
  "acces.refuse": "securite",
};

export interface AuditActeur {
  id: string;
  nom?: string;
  accessRole?: AccessRole;
  pole?: Pole;
  /** Action faite sous délégation du N3 (N1 exerçant les droits du N2). */
  parDelegation?: boolean;
}

/** Valeur scalaire ou petit objet : jamais de donnée client ni de contenu de message. */
export type AuditValeur = string | number | boolean | null | { [cle: string]: AuditValeur };

export interface AuditEvenement {
  id: string;
  restaurantId: string;
  categorie: AuditCategorie;
  /** Rang dans la chaîne de la catégorie (1, 2, 3…), sans trou. */
  sequence: number;
  action: AuditAction;
  at: string;
  /** Absent pour les actions sans identité (ex. tentative de connexion anonyme). */
  acteur?: AuditActeur;
  cible?: { type: string; id: string; libelle?: string };
  avant?: AuditValeur;
  apres?: AuditValeur;
  details?: Record<string, AuditValeur>;
  /** Empreinte de l'événement précédent de la même chaîne. */
  empreintePrecedente: string;
  /** SHA-256 de (empreintePrecedente + contenu de cet événement). */
  empreinte: string;
}

export interface AuditVerification {
  categorie: AuditCategorie;
  evenements: number;
  integre: boolean;
  /** Premier rang où la chaîne est rompue, si elle l'est. */
  rompueA?: number;
}
