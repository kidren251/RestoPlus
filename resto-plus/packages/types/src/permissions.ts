/**
 * Matrice des droits — Resto Plus
 *
 * Source unique de vérité des niveaux d'accès (N0-N3) et des pôles, lue à la fois
 * par l'app mobile (pour masquer/verrouiller l'interface) et par l'API (pour
 * refuser les requêtes, voir backend/api/src/permissions.ts). Modifier un droit ici
 * le modifie des deux côtés : ne jamais dupliquer ces règles ailleurs.
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
} as const satisfies Record<string, PermissionRule>;

export type Permission = keyof typeof PERMISSIONS;

export interface PermissionSubject {
  accessRole: AccessRole;
  pole: Pole;
}

export function can(subject: PermissionSubject, permission: Permission): boolean {
  const rule: PermissionRule = PERMISSIONS[permission];
  if (ACCESS_LEVEL[subject.accessRole] < rule.minLevel) return false;
  if (!rule.poles || subject.pole === "direction") return true;
  return rule.poles.includes(subject.pole);
}
