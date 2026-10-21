import { randomUUID } from "node:crypto";
import { jourDeService } from "@resto-plus/types";
import type { EtatMemoire } from "./memoire";
import type { HaccpRepository } from "./haccp";

export function creerHaccpMemoire(etat: EtatMemoire): HaccpRepository {
  return {
    async listerChecklists(restaurantId) {
      return etat.checklists.filter((c) => c.restaurantId === restaurantId).map(({ restaurantId: _r, ...c }) => c);
    },

    async pointExiste(restaurantId, checklistId, itemId) {
      return etat.checklists.some((c) => c.restaurantId === restaurantId && c.id === checklistId && c.items.some((i) => i.id === itemId));
    },

    async enregistrer(restaurantId, nouveau) {
      const existant = nouveau.id ? etat.releves.find((r) => r.id === nouveau.id && r.restaurantId === restaurantId) : undefined;
      if (existant) return existant;
      const releve = { ...nouveau, id: nouveau.id ?? randomUUID(), restaurantId, dateService: jourDeService(nouveau.releveAt) };
      etat.releves.push(releve);
      return releve;
    },

    async releves(restaurantId, dateService) {
      return etat.releves.filter((r) => r.restaurantId === restaurantId && r.dateService === dateService);
    },
  };
}
