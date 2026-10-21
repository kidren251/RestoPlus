/**
 * Store checklists HACCP — Resto Plus
 * Gère les checklists du jour avec leurs items et les entrées validées.
 */

import { create } from "zustand";
import { estConforme, type Checklist, type ChecklistItem, type ChecklistEntry } from "@resto-plus/types";
import { api } from "../api/client";
import { enqueueSync } from "./syncStore";
import { nouvelId } from "../utils/identifiant";

/** Relevé tel que renvoyé par l'API (GET /checklist-entries). */
interface ReleveServeur {
  id: string;
  checklistId: string;
  itemId: string;
  userId?: string;
  valeur?: string;
  photoUrl?: string;
  conforme?: boolean;
  releveAt: string;
}

interface ChecklistState {
  checklists: Checklist[];
  entries: Record<string, ChecklistEntry>; // clé : itemId — dernier relevé du point
  /** Nombre de relevés du jour par point (un relevé refait s'ajoute, l'ancien reste). */
  nbReleves: Record<string, number>;
  isLoading: boolean;
  activeChecklistId: string | null;

  loadChecklists: () => Promise<void>;
  validerItem: (
    checklistId: string,
    item: ChecklistItem,
    valeur?: string,
    photoUrl?: string
  ) => void;
  setActiveChecklist: (id: string | null) => void;
  getEntreeItem: (itemId: string) => ChecklistEntry | undefined;
  getNombreEnAttente: () => number;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklists: [],
  entries: {},
  nbReleves: {},
  isLoading: false,
  activeChecklistId: null,

  loadChecklists: async () => {
    set({ isLoading: true });
    try {
      const [data, releves] = await Promise.all([
        api.get<Checklist[]>("/checklists"),
        api.get<ReleveServeur[]>("/checklist-entries"),
      ]);
      // Relevés déjà faits aujourd'hui (sur ce téléphone ou un autre) : le dernier par point.
      const entries = { ...get().entries };
      const nbReleves: Record<string, number> = {};
      for (const r of releves) {
        nbReleves[r.itemId] = (nbReleves[r.itemId] ?? 0) + 1;
        entries[r.itemId] = {
          id: r.id,
          checklistId: r.checklistId,
          itemId: r.itemId,
          userId: r.userId ?? "",
          valeur: r.valeur,
          photoUrl: r.photoUrl,
          conforme: r.conforme,
          timestamp: r.releveAt,
          statut: "valide",
          syncStatus: "synced",
        };
      }
      set({ checklists: data, entries, nbReleves, isLoading: false });
    } catch {
      // Hors ligne : on garde le dernier plan chargé.
      set({ isLoading: false });
    }
  },

  validerItem: (checklistId, item, valeur, photoUrl) => {
    const entry: ChecklistEntry = {
      id: nouvelId(),
      checklistId,
      userId: "current-user", // sera remplacé par l'auth Supabase Phase 2
      itemId: item.id,
      valeur,
      photoUrl,
      // Affichage immédiat ; la conformité enregistrée est recalculée par l'API.
      conforme: item.requiertValeur ? estConforme(item, valeur) : undefined,
      timestamp: new Date().toISOString(),
      statut: "valide",
      syncStatus: "local",
    };

    // Un relevé ne s'efface jamais : le refaire en ajoute un nouveau (le serveur garde
    // les deux), l'écran affiche le plus récent.
    set((state) => ({
      entries: { ...state.entries, [item.id]: entry },
      nbReleves: { ...state.nbReleves, [item.id]: (state.nbReleves[item.id] ?? 0) + 1 },
    }));

    enqueueSync("checklist_entry", {
      id: entry.id,
      checklistId,
      itemId: item.id,
      valeur,
      photoUrl,
      timestamp: entry.timestamp,
    });
  },

  setActiveChecklist: (id) => set({ activeChecklistId: id }),

  getEntreeItem: (itemId) => get().entries[itemId],

  getNombreEnAttente: () => {
    const { checklists, entries } = get();
    let total = 0;
    for (const cl of checklists) {
      for (const item of cl.items) {
        if (!entries[item.id]) total++;
      }
    }
    return total;
  },
}));
