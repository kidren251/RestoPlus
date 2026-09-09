import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type PeriodeTache = "matin" | "soir";

export interface TacheSalle {
  id: string;
  label: string;
  periode: PeriodeTache;
}

const TACHES_PAR_DEFAUT: TacheSalle[] = [
  { id: "matin-01", label: "Vérifier la propreté des tables et des chaises", periode: "matin" },
  { id: "matin-02", label: "Installer les couverts, verres et serviettes", periode: "matin" },
  { id: "matin-03", label: "Contrôler les menus et supports de table", periode: "matin" },
  { id: "matin-04", label: "Vérifier l’éclairage et la température de la salle", periode: "matin" },
  { id: "matin-05", label: "Préparer la zone d’accueil et le vestiaire", periode: "matin" },
  { id: "soir-01", label: "Réinstaller la salle après le service", periode: "soir" },
  { id: "soir-02", label: "Nettoyer les tables, chaises et consoles", periode: "soir" },
  { id: "soir-03", label: "Réapprovisionner les serviettes et consommables", periode: "soir" },
  { id: "soir-04", label: "Contrôler les réservations du lendemain", periode: "soir" },
  { id: "soir-05", label: "Éteindre les équipements et sécuriser la salle", periode: "soir" },
];

const STORAGE_KEY = "resto_plus_taches_salle_v1";

type TachesState = {
  taches: TacheSalle[];
  cochees: Record<string, boolean>;
  date: string;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  toggle: (tacheId: string) => void;
  reset: () => Promise<void>;
};

function dateDuJour() {
  return new Date().toISOString().slice(0, 10);
}

export const useTachesSalleStore = create<TachesState>((set, get) => ({
  taches: TACHES_PAR_DEFAUT,
  cochees: {},
  date: dateDuJour(),
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    const today = dateDuJour();
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as { date: string; cochees: Record<string, boolean> }) : null;
      set({
        cochees: saved?.date === today ? saved.cochees : {},
        date: today,
        isLoading: false,
      });
    } catch {
      set({ cochees: {}, date: today, isLoading: false });
    }
  },

  toggle: (tacheId) => {
    const next = { ...get().cochees, [tacheId]: !get().cochees[tacheId] };
    set({ cochees: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: get().date, cochees: next }));
  },

  reset: async () => {
    set({ cochees: {} });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: get().date, cochees: {} }));
  },
}));
