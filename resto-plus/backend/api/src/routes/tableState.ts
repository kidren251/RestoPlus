import type { StatutTable, TableServiceState } from "@resto-plus/types";

export const tableStatuts: Record<string, StatutTable> = {};
export const tablePositions: Record<string, { x: number; y: number }> = {};
export const tableInfos: Record<string, { nom?: string; capacite?: number }> = {};
export const tableServices: Record<string, TableServiceState> = {};

/**
 * Journal du service — matière première des comptes rendus de fin de journée
 * (voir comptesRendus.ts). En mémoire tant que Supabase n'est pas branché.
 */
export const journalCommandes: { menuItemId: string; nom: string; prixVente: number; quantite: number; tableId: string; restaurantId: string; at: string }[] = [];
export const journalAdditions: { tableId: string; restaurantId: string; at: string }[] = [];