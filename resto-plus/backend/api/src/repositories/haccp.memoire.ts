import { randomUUID } from "node:crypto";
import { jourDeService, type ChecklistItem } from "@resto-plus/types";
import type { EtatMemoire } from "./memoire";
import type { HaccpRepository, ModificationPoint } from "./haccp";

/** Applique une modification de point (null = retirer la valeur). */
function appliquer(item: ChecklistItem & { actif?: boolean }, m: ModificationPoint) {
  if (m.label !== undefined) item.label = m.label;
  if (m.requiertValeur !== undefined) item.requiertValeur = m.requiertValeur;
  if (m.requiertPhoto !== undefined) item.requiertPhoto = m.requiertPhoto;
  if (m.seuilMin !== undefined) item.seuilMin = m.seuilMin ?? undefined;
  if (m.seuilMax !== undefined) item.seuilMax = m.seuilMax ?? undefined;
  if (m.unite !== undefined) item.unite = m.unite ?? undefined;
  if (m.consigne !== undefined) item.consigne = m.consigne ?? undefined;
  if (m.actif !== undefined) item.actif = m.actif;
  // Mêmes règles que les contraintes de la migration 0019.
  if (!item.requiertValeur) {
    if ((m.seuilMin ?? null) !== null || (m.seuilMax ?? null) !== null) throw new Error("checklist_items_seuils_si_valeur");
    item.seuilMin = undefined;
    item.seuilMax = undefined;
  }
  if (item.seuilMin !== undefined && item.seuilMax !== undefined && item.seuilMin > item.seuilMax) {
    throw new Error("checklist_items_seuils_ordonnes");
  }
}

export function creerHaccpMemoire(etat: EtatMemoire): HaccpRepository {
  const checklistsDe = (restaurantId: string) => etat.checklists.filter((c) => c.restaurantId === restaurantId);

  return {
    async listerChecklists(restaurantId) {
      return checklistsDe(restaurantId)
        .filter((c) => c.actif !== false)
        .map(({ restaurantId: _r, actif: _a, ...c }) => ({
          ...c,
          items: c.items.filter((i) => i.actif !== false).map(({ actif: _actif, ...i }) => i),
        }));
    },

    async point(restaurantId, checklistId, itemId) {
      const c = checklistsDe(restaurantId).find((c) => c.id === checklistId && c.actif !== false);
      const item = c?.items.find((i) => i.id === itemId && i.actif !== false);
      return item ? { ...item } : null;
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

    async creerChecklist(restaurantId, { nom, frequence }) {
      const checklist = { id: randomUUID(), restaurantId, type: nom, frequence, items: [] };
      etat.checklists.push(checklist);
      return { id: checklist.id, type: nom, frequence, items: [] };
    },

    async modifierChecklist(restaurantId, checklistId, m) {
      const c = checklistsDe(restaurantId).find((c) => c.id === checklistId);
      if (!c) return null;
      if (m.nom !== undefined) c.type = m.nom;
      if (m.frequence !== undefined) c.frequence = m.frequence;
      if (m.actif !== undefined) c.actif = m.actif;
      if (m.ordre !== undefined) {
        const liste = etat.checklists;
        liste.splice(liste.indexOf(c), 1);
        const autres = liste.filter((x) => x.restaurantId === restaurantId);
        const avant = autres[m.ordre];
        liste.splice(avant ? liste.indexOf(avant) : liste.length, 0, c);
      }
      return { id: c.id, type: c.type, frequence: c.frequence, items: c.items.filter((i) => i.actif !== false) };
    },

    async ajouterPoint(restaurantId, checklistId, point) {
      const c = checklistsDe(restaurantId).find((c) => c.id === checklistId);
      if (!c) return null;
      const item: ChecklistItem & { actif?: boolean } = { id: randomUUID(), label: point.label, requiertValeur: false, requiertPhoto: false };
      appliquer(item, point);
      c.items.push(item);
      return { ...item };
    },

    async modifierPoint(restaurantId, itemId, m) {
      for (const c of checklistsDe(restaurantId)) {
        const item = c.items.find((i) => i.id === itemId);
        if (!item) continue;
        appliquer(item, m);
        if (m.ordre !== undefined) {
          c.items.splice(c.items.indexOf(item), 1);
          c.items.splice(Math.max(0, Math.min(m.ordre, c.items.length)), 0, item);
        }
        return { ...item };
      }
      return null;
    },
  };
}
