import type { Reservation, TableServiceState } from "@resto-plus/types";

/**
 * Gestes du service qui touchent plusieurs données à la fois (table, réservation,
 * repas en cours, déroulé du dîner). Côté Supabase, chacun est une fonction SQL
 * exécutée en une transaction (migration 0017) : tout est fait, ou rien.
 */
export type CodeErreurService = "TABLE_INTROUVABLE" | "TABLE_OCCUPEE" | "RESERVATION_INTROUVABLE" | "AUCUN_REPAS";

export class ErreurService extends Error {
  constructor(public readonly code: CodeErreurService) {
    super(code);
  }
}

export interface Installation {
  /** Réservation existante (même prévue pour une autre table) ; absente = walk-in. */
  reservationId?: string;
  /** Nombre de couverts d'un walk-in. */
  couverts?: number;
}

export interface ServiceRepository {
  installer(restaurantId: string, tableId: string, installation: Installation, at: string): Promise<{ etat: TableServiceState; reservation: Reservation }>;
  /** Le repas en cours (client, étape, allergies, réservation) change de table. */
  deplacer(restaurantId: string, deTableId: string, versTableId: string, at: string): Promise<TableServiceState>;
  /** Addition : table à nettoyer, réservation terminée, allergies effacées. */
  terminer(restaurantId: string, tableId: string, at: string): Promise<void>;
}
