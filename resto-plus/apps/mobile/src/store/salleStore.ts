/**
 * Store plan de salle — Resto Plus
 * Gère les tables de la salle active (statuts, positions) + sync offline.
 */

import { create } from "zustand";
import type { Salle, Table, StatutTable } from "@resto-plus/types";
import { api } from "../api/client";
import { enqueueSync } from "./syncStore";

// Données mockées pour Expo Go (Phase 1 sans Supabase)
const MOCK_SALLE: Salle = {
  id: "salle-1",
  nom: "Salle Principale",
  largeurCanvas: 320,
  hauteurCanvas: 400,
  tables: [
    {
      id: "t1",
      x: 20,
      y: 30,
      largeur: 60,
      hauteur: 60,
      rotation: 0,
      forme: "ronde",
      capacite: 2,
      zoneId: "z1",
      statut: "libre",
    },
    {
      id: "t2",
      x: 110,
      y: 30,
      largeur: 70,
      hauteur: 50,
      rotation: 0,
      forme: "rectangle",
      capacite: 4,
      zoneId: "z1",
      statut: "occupee",
    },
    {
      id: "t3",
      x: 20,
      y: 130,
      largeur: 70,
      hauteur: 50,
      rotation: 0,
      forme: "carree",
      capacite: 4,
      zoneId: "z1",
      statut: "reservee",
    },
    {
      id: "t4",
      x: 120,
      y: 130,
      largeur: 60,
      hauteur: 60,
      rotation: 0,
      forme: "ronde",
      capacite: 6,
      zoneId: "z2",
      statut: "libre",
    },
    {
      id: "t5",
      x: 20,
      y: 230,
      largeur: 80,
      hauteur: 60,
      rotation: 0,
      forme: "rectangle",
      capacite: 8,
      zoneId: "z2",
      statut: "a_nettoyer",
    },
    {
      id: "t6",
      x: 140,
      y: 230,
      largeur: 60,
      hauteur: 50,
      rotation: 15,
      forme: "carree",
      capacite: 4,
      zoneId: "z2",
      statut: "libre",
    },
  ],
  decor: [
    { id: "d1", type: "bar", x: 210, y: 20, largeur: 90, hauteur: 30, rotation: 0 },
    { id: "d2", type: "entree", x: 0, y: 350, largeur: 60, hauteur: 20, rotation: 0 },
    { id: "d3", type: "cuisine", x: 210, y: 300, largeur: 90, hauteur: 90, rotation: 0 },
  ],
};

interface SalleState {
  salle: Salle | null;
  isLoading: boolean;
  error: string | null;
  selectedTableId: string | null;

  loadSalle: (salleId?: string) => Promise<void>;
  setStatutTable: (tableId: string, statut: StatutTable) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  selectTable: (tableId: string | null) => void;
  getTable: (tableId: string) => Table | undefined;
}

export const useSalleStore = create<SalleState>((set, get) => ({
  salle: null,
  isLoading: false,
  error: null,
  selectedTableId: null,

  loadSalle: async (_salleId?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Tentative réseau, fallback sur mock
      try {
        const data = await api.get<Salle>("/salles/salle-1");
        set({ salle: data, isLoading: false });
      } catch {
        // Mode offline ou backend non disponible → données mockées
        set({ salle: MOCK_SALLE, isLoading: false });
      }
    } catch (e) {
      set({ error: String(e), isLoading: false, salle: MOCK_SALLE });
    }
  },

  setStatutTable: (tableId, statut) => {
    set((state) => {
      if (!state.salle) return state;
      return {
        salle: {
          ...state.salle,
          tables: state.salle.tables.map((t) =>
            t.id === tableId ? { ...t, statut } : t
          ),
        },
      };
    });
    // Enqueuer pour sync
    enqueueSync("table_status_change", { id: tableId, statut });
  },

  moveTable: (tableId, x, y) => {
    set((state) => {
      if (!state.salle) return state;
      return {
        salle: {
          ...state.salle,
          tables: state.salle.tables.map((t) =>
            t.id === tableId ? { ...t, x, y } : t
          ),
        },
      };
    });
    enqueueSync("table_move", { id: tableId, x, y });
  },

  selectTable: (tableId) => set({ selectedTableId: tableId }),

  getTable: (tableId) =>
    get().salle?.tables.find((t) => t.id === tableId),
}));
