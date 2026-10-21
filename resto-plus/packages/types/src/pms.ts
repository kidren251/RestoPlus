/**
 * PMS (Property Management System) — types partagés
 *
 * Le PMS est le logiciel de réservation de l'hôtel. Il détient l'occupation des chambres :
 * arrivées, départs, séjours en cours. La gouvernance en dépend (quelles chambres faire,
 * à blanc ou en recouche) ; en retour, le PMS a besoin du statut ménage pour savoir si une
 * chambre peut être attribuée à un client.
 *
 * Règle de partage des responsabilités :
 *  - OCCUPATION (séjours)  : le PMS est la source de vérité, nous ne faisons que lire ;
 *  - STATUT MÉNAGE         : Resto Plus est la source de vérité, nous l'envoyons au PMS
 *    quand le connecteur le permet.
 *
 * Le détail de l'intégration (connecteurs, sécurité, synchronisation) est documenté dans
 * backend/api/src/pms/index.ts. Sans PMS connecté, le connecteur « manuel » permet à la
 * gouvernante de saisir elle-même arrivées et départs.
 */

/** Fournisseurs envisagés. Les API réelles restent à étudier avant tout développement. */
export type PmsFournisseur = "manuel" | "mews" | "apaleo" | "opera_cloud" | "autre";

export interface PmsConfiguration {
  fournisseur: PmsFournisseur;
  /** Identifiant de l'établissement chez le fournisseur (jamais de secret ici). */
  identifiantEtablissement?: string;
  /**
   * Référence vers les identifiants d'accès stockés CÔTÉ SERVEUR (coffre de secrets).
   * Les clés PMS ne transitent jamais par l'app mobile ni par ce type.
   */
  referenceSecret?: string;
  /** Envoyer le statut ménage au PMS (si le connecteur le permet). */
  envoyerStatutMenage: boolean;
  actif: boolean;
}

/** Statut ménage d'une chambre, côté Resto Plus (module « chambres » de la gouvernance). */
export type StatutMenage = "sale" | "en_nettoyage" | "propre" | "controlee" | "hors_service";

/** Chambre telle que décrite par le PMS ; reliée à un Lieu via `Lieu.pmsRoomId`. */
export interface PmsChambre {
  pmsRoomId: string;
  numero: string;
  categorie?: string;
  etage?: string;
}

/** Séjour lu dans le PMS. Aucune donnée client au-delà du strict nécessaire au ménage. */
export interface PmsSejour {
  pmsReservationId: string;
  pmsRoomId: string;
  arrivee: string; // date ISO (jour d'arrivée)
  depart: string; // date ISO (jour de départ)
  nombreClients?: number;
  /** Ex : arrivée VIP, lit bébé. Pas de nom ni de coordonnées du client. */
  remarquesMenage?: string;
}

/** Ce dont la gouvernance a besoin pour une journée : quoi faire dans quelle chambre. */
export interface PmsMouvementsJour {
  date: string; // journée de service (voir serviceDay.ts)
  arrivees: PmsSejour[];
  departs: PmsSejour[]; // chambre à faire « à blanc »
  recouches: PmsSejour[]; // séjour en cours : chambre à rafraîchir
  /** Horodatage de la dernière synchronisation réussie avec le PMS. */
  synchroniseAt?: string;
}
