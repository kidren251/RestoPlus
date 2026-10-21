/**
 * Journal du service — matière première des comptes rendus de fin de journée
 * (voir comptesRendus.ts). En mémoire tant que ce domaine n'est pas branché sur
 * Supabase. L'état des tables lui-même est dans repositories/salles.
 */
export const journalCommandes: { menuItemId: string; nom: string; prixVente: number; quantite: number; tableId: string; restaurantId: string; at: string }[] = [];
export const journalAdditions: { tableId: string; restaurantId: string; at: string }[] = [];
