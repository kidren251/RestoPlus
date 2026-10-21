/**
 * Matrice des droits — Resto Plus
 *
 * Source unique de vérité des niveaux d'accès (N0-N3) et des pôles, lue à la fois
 * par l'app mobile (pour masquer/verrouiller l'interface) et par l'API (pour
 * refuser les requêtes, voir backend/api/src/permissions.ts). Modifier un droit ici
 * le modifie des deux côtés : ne jamais dupliquer ces règles ailleurs.
 *
 * Certains droits du service sont RÉGLABLES par établissement (console N4, voir
 * PERMISSIONS_REGLABLES) : seul leur niveau minimum change, jamais leurs pôles. Les
 * droits sensibles (audit, comptes, stock, délégations…) restent fixes.
 *
 * Le « verrou de service » du directeur (N3) n'est PAS un droit : c'est une sécurité
 * anti-clic accidentel côté interface. Le N3 garde le droit, il doit simplement
 * déverrouiller explicitement le service pour l'exercer.
 */

import type { AccessRole, Pole } from "./index";

export const ACCESS_LEVEL: Record<AccessRole, 0 | 1 | 2 | 3> = {
  serveur: 0,
  chef_rang: 1,
  manager_admin: 2,
  directeur_admin: 3,
};

interface PermissionRule {
  /** Niveau minimum requis (N0 = 0 … N3 = 3). */
  minLevel: 0 | 1 | 2 | 3;
  /** Pôles autorisés. Absent = tous les pôles. Le pôle "direction" passe partout. */
  poles?: readonly Pole[];
}

const SALLE = ["salle"] as const;
const CUISINE = ["cuisine"] as const;

export const PERMISSIONS = {
  // Service en salle
  "service.installer": { minLevel: 0, poles: SALLE }, // installer des clients (réservation ou sans), changer de table
  "service.commander": { minLevel: 0, poles: SALLE }, // commander un plat, réclamer un plat
  "service.suivre": { minLevel: 1, poles: SALLE }, // étape du repas, état du plat, ouvrir une table, statut
  "service.addition": { minLevel: 1, poles: SALLE },
  "client.editer": { minLevel: 1, poles: SALLE },
  "reservation.gerer": { minLevel: 1, poles: SALLE }, // créer, annuler
  "taches.cocher": { minLevel: 0, poles: SALLE },
  "taches.reinitialiser": { minLevel: 2, poles: SALLE },

  // Configuration et administration
  "salle.configurer": { minLevel: 2, poles: SALLE }, // déplacer, créer, supprimer, renommer des tables
  "acces.gerer": { minLevel: 2 },
  "acces.changer_pole": { minLevel: 3 },
  "invitation.creer": { minLevel: 3 },
  "comptes.gerer": { minLevel: 3 }, // créer des comptes permanents N0-N2, régler leur messagerie
  "delegations.gerer": { minLevel: 3 }, // confier temporairement les tâches d'un N2 à un N1
  "audit.consulter": { minLevel: 3 }, // journal d'audit (lecture seule, personne ne peut le modifier)

  // Comptes rendus de service : générés par l'app, validés par le N2 du pôle, transmis au N3
  "compte_rendu.salle": { minLevel: 2, poles: SALLE },
  "compte_rendu.cuisine": { minLevel: 2, poles: CUISINE }, // valide aussi les sorties de stock
  "compte_rendu.consulter": { minLevel: 2 }, // N2 : son pôle, N3 : tous

  // Cuisine
  "checklist.remplir": { minLevel: 0, poles: CUISINE },
  "cuisine.plat_pret": { minLevel: 0, poles: CUISINE },
  // Le cuisinier charge le stock seul ; toute baisse engage le chef (comptabilité).
  "stock.entree": { minLevel: 1, poles: CUISINE }, // créer un article, réception
  "stock.sortie": { minLevel: 2, poles: CUISINE }, // sortie, perte, ajustement, suppression d'article
  "carte.gerer": { minLevel: 1, poles: CUISINE },

  // Tickets inter-départements (module « tickets », pas encore développé).
  // Décision du 11/10/2026 : création de N1 à N3, pas par un N0 (qui signale à son N1).
  "tickets.creer": { minLevel: 1 },
} as const satisfies Record<string, PermissionRule>;

export type Permission = keyof typeof PERMISSIONS;

export interface PermissionSubject {
  accessRole: AccessRole;
  pole: Pole;
}

/**
 * Droits dont le N4 peut régler le niveau minimum pour un établissement. Liste fermée :
 * un droit absent d'ici garde toujours la valeur de PERMISSIONS.
 */
export const PERMISSIONS_REGLABLES = [
  "service.installer",
  "service.commander",
  "service.suivre",
  "service.addition",
  "client.editer",
  "reservation.gerer",
  "taches.cocher",
] as const satisfies readonly Permission[];

export type PermissionReglable = (typeof PERMISSIONS_REGLABLES)[number];
export type NiveauAcces = 0 | 1 | 2 | 3;

/** Niveaux minimum choisis par le N4 pour un établissement (absent = valeur par défaut). */
export type ReglagesDroits = Partial<Record<PermissionReglable, NiveauAcces>>;

/** Libellés de la console N4. */
export const LIBELLES_PERMISSIONS_REGLABLES: Record<PermissionReglable, string> = {
  "service.installer": "Installer des clients, changer de table",
  "service.commander": "Commander et réclamer un plat",
  "service.suivre": "Suivre le dîner (étapes, plats), ouvrir une table",
  "service.addition": "Envoyer l'addition",
  "client.editer": "Modifier la fiche client",
  "reservation.gerer": "Créer et annuler des réservations",
  "taches.cocher": "Cocher les tâches de salle",
};

export function estReglable(permission: Permission): permission is PermissionReglable {
  return (PERMISSIONS_REGLABLES as readonly Permission[]).includes(permission);
}

/** Niveau minimum effectif d'un droit pour un établissement. */
export function niveauMinimum(permission: Permission, reglages?: ReglagesDroits): NiveauAcces {
  const regle = estReglable(permission) ? reglages?.[permission] : undefined;
  return regle ?? PERMISSIONS[permission].minLevel;
}

/**
 * Valide des réglages reçus (console N4) : uniquement des droits réglables, niveaux
 * 0 à 3. Renvoie null si quoi que ce soit est invalide (rien n'est appliqué à moitié).
 */
export function validerReglagesDroits(entree: unknown): ReglagesDroits | null {
  if (!entree || typeof entree !== "object" || Array.isArray(entree)) return null;
  const reglages: ReglagesDroits = {};
  for (const [permission, niveau] of Object.entries(entree)) {
    if (!(PERMISSIONS_REGLABLES as readonly string[]).includes(permission)) return null;
    if (niveau !== 0 && niveau !== 1 && niveau !== 2 && niveau !== 3) return null;
    reglages[permission as PermissionReglable] = niveau;
  }
  return reglages;
}

export function can(subject: PermissionSubject, permission: Permission, reglages?: ReglagesDroits): boolean {
  const rule: PermissionRule = PERMISSIONS[permission];
  if (ACCESS_LEVEL[subject.accessRole] < niveauMinimum(permission, reglages)) return false;
  if (!rule.poles || subject.pole === "direction") return true;
  return rule.poles.includes(subject.pole);
}
