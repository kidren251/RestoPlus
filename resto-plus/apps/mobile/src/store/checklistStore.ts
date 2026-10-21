/**
 * Store checklists HACCP — Resto Plus
 * Gère les checklists du jour avec leurs items et les entrées validées.
 */

import { create } from "zustand";
import type { Checklist, ChecklistItem, ChecklistEntry } from "@resto-plus/types";
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
  releveAt: string;
}

// Données mockées (Phase 1 sans Supabase)
const MOCK_CHECKLISTS: Checklist[] = [
  {
    id: "cl-ouverture",
    type: "Ouverture cuisine",
    frequence: "ouverture",
    items: [
      { id: "i1", label: "Vérification température réfrigérateurs", requiertPhoto: false, requiertValeur: true },
      { id: "i2", label: "Contrôle date des produits", requiertPhoto: false, requiertValeur: false },
      { id: "i3", label: "Nettoyage plans de travail", requiertPhoto: true, requiertValeur: false },
      { id: "i4", label: "Vérification stocks salle", requiertPhoto: false, requiertValeur: false },
      { id: "i5", label: "Test équipements (four, friteuse)", requiertPhoto: false, requiertValeur: false },
    ],
  },
  {
    id: "cl-fermeture",
    type: "Fermeture cuisine",
    frequence: "fermeture",
    items: [
      { id: "i6", label: "Nettoyage et désinfection cuisine", requiertPhoto: true, requiertValeur: false },
      { id: "i7", label: "Relevé températures finales", requiertPhoto: false, requiertValeur: true },
      { id: "i8", label: "Emballage et étiquetage restes", requiertPhoto: false, requiertValeur: false },
      { id: "i9", label: "Vérification fermeture chambre froide", requiertPhoto: false, requiertValeur: false },
    ],
  },
  {
    id: "cl-4h",
    type: "Contrôle 4h",
    frequence: "4h",
    items: [
      { id: "i10", label: "Relevé température réfrigérateurs", requiertPhoto: false, requiertValeur: true },
      { id: "i11", label: "Vérification hygiène personnelle", requiertPhoto: false, requiertValeur: false },
    ],
  },
];

interface ChecklistState {
  checklists: Checklist[];
  entries: Record<string, ChecklistEntry>; // clé : itemId
  isLoading: boolean;
  activeChecklistId: string | null;

  loadChecklists: () => Promise<void>;
  validerItem: (
    checklistId: string,
    item: ChecklistItem,
    valeur?: string,
    photoUrl?: string
  ) => void;
  devaliderItem: (itemId: string) => void;
  setActiveChecklist: (id: string | null) => void;
  getEntreeItem: (itemId: string) => ChecklistEntry | undefined;
  getNombreEnAttente: () => number;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklists: [],
  entries: {},
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
      for (const r of releves) {
        entries[r.itemId] = {
          id: r.id,
          checklistId: r.checklistId,
          itemId: r.itemId,
          userId: r.userId ?? "",
          valeur: r.valeur,
          photoUrl: r.photoUrl,
          timestamp: r.releveAt,
          statut: "valide",
          syncStatus: "synced",
        };
      }
      set({ checklists: data, entries, isLoading: false });
    } catch {
      // Mode offline → données mockées
      set({ checklists: MOCK_CHECKLISTS, isLoading: false });
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
      timestamp: new Date().toISOString(),
      statut: "valide",
      syncStatus: "local",
    };

    set((state) => ({
      entries: { ...state.entries, [item.id]: entry },
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

  devaliderItem: (itemId) => {
    set((state) => {
      const next = { ...state.entries };
      delete next[itemId];
      return { entries: next };
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
