import type { Salle, StatutTable, TableServiceState } from "@resto-plus/types";

/**
 * Accès aux données du plan de salle — Resto Plus
 *
 * Deux implémentations de la même interface :
 *  - salles.memoire.ts : données de démo en mémoire (tests, mode démo sans Supabase) ;
 *  - salles.supabase.ts : base Supabase (tables salles, tables_salle, elements_decor,
 *    etat_service_tables — migrations 0001, 0003, 0016).
 *
 * Chaque méthode reçoit le restaurant de l'appelant et ne voit QUE ses données :
 * l'isolation est vérifiée ici en plus de la route (défense en profondeur), puisque
 * l'API lit la base avec la clé service_role, qui ignore la RLS.
 */

export type SalleResume = Omit<Salle, "tables" | "decor">;

export interface InfosTable {
  nom?: string;
  capacite?: number;
}

export interface SallesRepository {
  lister(restaurantId: string): Promise<SalleResume[]>;
  /** Salle complète : tables (avec le repas en cours) et décor. */
  lire(restaurantId: string, salleId: string): Promise<Salle | null>;
  tableExiste(restaurantId: string, tableId: string): Promise<boolean>;
  /** Une table remise « libre » (nettoyée) perd son repas précédent. */
  changerStatut(restaurantId: string, tableId: string, statut: StatutTable): Promise<void>;
  deplacer(restaurantId: string, tableId: string, x: number, y: number): Promise<void>;
  modifierInfos(restaurantId: string, tableId: string, infos: InfosTable): Promise<InfosTable>;
  /** Met à jour le repas en cours (étape, plats, allergies) et enregistre son déroulé. */
  ecrireService(restaurantId: string, etat: TableServiceState): Promise<TableServiceState>;
}
