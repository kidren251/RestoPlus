/**
 * Référentiel des lieux — Resto Plus / PalaceOS
 *
 * Arborescence physique d'un établissement : bâtiment > étage > chambre / salle / espace
 * extérieur / local technique / équipement. Socle commun des tickets (où est le problème),
 * de la gouvernance (quelles chambres) et du préventif (quel équipement).
 *
 * Mise en place : saisi par le N4 dans la console plateforme AVANT la livraison au client
 * (voir ConfigurationEtablissement, etablissement.ts), puis ajustable par le N3.
 *
 * ÉTAT ACTUEL : types seulement, pas encore de table SQL ni de route.
 */

import type { TypeDepartement } from "./departements";

export type TypeLieu =
  | "batiment"
  | "etage"
  | "chambre"
  | "salle" // salle de restaurant, salle de réunion, lobby…
  | "espace_exterieur" // jardin, terrasse, parking, piscine
  | "local_technique"
  | "equipement" // chaudière, chambre froide, ascenseur… (cible du préventif)
  | "zone";

export interface Lieu {
  id: string;
  restaurantId: string;
  /** Lieu parent (étage d'une chambre, bâtiment d'un étage). Absent = racine. */
  parentId?: string;
  type: TypeLieu;
  nom: string;
  /** Code court affiché (ex : numéro de chambre « 204 »). */
  code?: string;
  /** Départements qui interviennent par défaut sur ce lieu (destinataires suggérés des tickets). */
  departementsResponsables?: TypeDepartement[];
  /**
   * Identifiant de la chambre dans le PMS de l'hôtel. C'est la clé de correspondance
   * entre nos lieux et les données PMS (arrivées, départs, statut ménage) : sans elle,
   * une chambre ne reçoit rien du PMS. Voir backend/api/src/pms/.
   */
  pmsRoomId?: string;
  actif: boolean;
}
