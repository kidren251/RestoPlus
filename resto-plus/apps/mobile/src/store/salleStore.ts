/**
 * Store plan de salle — Resto Plus
 * Gère les tables de la salle active (statuts, positions, infos) + sync offline.
 */

import { create } from "zustand";
import type { Client, DishServiceStatus, DishWorkflowStatus, Salle, ServiceAlert, ServiceCourse, ServiceEvent, Table, TableServiceState, StatutTable } from "@resto-plus/types";
import { api } from "../api/client";
import { enqueueSync } from "./syncStore";
import { nouvelId } from "../utils/identifiant";

// Données mockées pour Expo Go (Phase 1 sans Supabase)
const MOCK_SALLE: Salle = {
  id: "salle-1",
  nom: "Salle Principale",
  largeurCanvas: 320,
  hauteurCanvas: 400,
  tables: [
    {
      id: "t1",
      nom: "Table 1",
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
      nom: "Table 2",
      x: 110,
      y: 30,
      largeur: 70,
      hauteur: 50,
      rotation: 0,
      forme: "rectangle",
      capacite: 4,
      zoneId: "z1",
      statut: "libre",
    },
    {
      id: "t3",
      nom: "Table 3",
      x: 20,
      y: 130,
      largeur: 70,
      hauteur: 50,
      rotation: 0,
      forme: "carree",
      capacite: 4,
      zoneId: "z1",
      statut: "libre",
    },
    {
      id: "t4",
      nom: "Table 4",
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
      nom: "Table 5",
      x: 20,
      y: 230,
      largeur: 80,
      hauteur: 60,
      rotation: 0,
      forme: "rectangle",
      capacite: 8,
      zoneId: "z2",
      statut: "libre",
    },
    {
      id: "t6",
      nom: "Table 6",
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

// ---- Commande : structure fictive en attendant le vrai système de commande ----
export type StatutPlat = DishWorkflowStatus;

export interface LignePlat {
  id: string;
  nom: string;
  quantite: number;
  statut: StatutPlat;
  reclameAt?: string;
  serviAt?: string;
}

export interface Commande {
  tableId: string;
  lignes: LignePlat[];
}

const MOCK_COMMANDES: Record<string, Commande> = {
  t2: {
    tableId: "t2",
    lignes: [
      { id: "l1", nom: "Foie gras poêlé", quantite: 2, statut: "servi", reclameAt: "2026-09-09T19:58:00.000Z", serviAt: "2026-09-09T20:04:00.000Z" },
      { id: "l2", nom: "Filet de bœuf Rossini", quantite: 2, statut: "en_preparation", reclameAt: "2026-09-09T20:22:00.000Z" },
      { id: "l3", nom: "Soufflé au Grand Marnier", quantite: 2, statut: "en_attente" },
    ],
  },
  t3: {
    tableId: "t3",
    lignes: [
      { id: "l1", nom: "Velouté de saison", quantite: 4, statut: "pret", reclameAt: "2026-09-09T20:15:00.000Z" },
    ],
  },
};

const MOCK_SERVICE_STATES: Record<string, TableServiceState> = {
  t2: {
    tableId: "t2",
    reservationId: "r1",
    clientId: "client-fontaine",
    clientName: "M. Fontaine",
    course: "plat",
    dishStatus: "a_reclamer",
    seatedAt: "2026-09-09T19:42:00.000Z",
    lastEventAt: "2026-09-09T20:22:00.000Z",
    events: [
      { id: "service-t2-1", reservationId: "r1", tableId: "t2", type: "arrivee", label: "Arrivée des clients", occurredAt: "2026-09-09T19:42:00.000Z" },
      { id: "service-t2-2", reservationId: "r1", tableId: "t2", type: "plat_servi", label: "Plats servis", occurredAt: "2026-09-09T20:22:00.000Z" },
    ],
  },
  t3: {
    tableId: "t3",
    reservationId: "r2",
    clientId: "client-beaumont",
    clientName: "Mme Beaumont",
    course: "entree",
    dishStatus: "servi",
    seatedAt: "2026-09-09T20:08:00.000Z",
    lastEventAt: "2026-09-09T20:18:00.000Z",
  },
};

interface SalleState {
  salle: Salle | null;
  isLoading: boolean;
  error: string | null;
  selectedTableId: string | null;
  commandes: Record<string, Commande>;
  serviceStates: Record<string, TableServiceState>;
  alerts: ServiceAlert[];

  loadSalle: (salleId?: string) => Promise<void>;
  setStatutTable: (tableId: string, statut: StatutTable) => void;
  moveTable: (tableId: string, x: number, y: number) => void;
  updateTableInfo: (tableId: string, updates: { nom?: string; capacite?: number }) => void;
  updateTableService: (tableId: string, updates: { course?: ServiceCourse; dishStatus?: DishServiceStatus }) => void;
  /** Ouverture hors ligne, sans réservation (repli quand l'installation n'atteint pas le serveur). */
  openTable: (tableId: string) => void;
  /** Applique le repas renvoyé par le serveur (installation, changement de table). */
  appliquerRepas: (tableId: string, etat: TableServiceState | undefined, statut: StatutTable) => void;
  sendAddition: (tableId: string) => void;
  /** Fiche client + allergies du repas en cours (jamais stockées sur la fiche). */
  saveClient: (tableId: string, client: Pick<Client, "nom" | "telephone" | "notes">, allergenes: string[]) => void;
  updateSalleConfiguration: (updates: { nom?: string; largeurCanvas?: number; hauteurCanvas?: number }) => void;
  addTable: (input: { nom: string; capacite: number; forme: Table["forme"] }) => void;
  removeTable: (tableId: string) => void;
  addLignePlat: (tableId: string, nom: string, quantite: number) => void;
  requestDish: (tableId: string, lineId?: string) => void;
  markDishReady: (tableId: string, lineId: string) => void;
  markAlertRead: (alertId: string) => void;
  selectTable: (tableId: string | null) => void;
  getTable: (tableId: string) => Table | undefined;
  getCommande: (tableId: string) => Commande | undefined;
}

export const useSalleStore = create<SalleState>((set, get) => ({
  salle: null,
  isLoading: false,
  error: null,
  selectedTableId: null,
  commandes: MOCK_COMMANDES,
  serviceStates: MOCK_SERVICE_STATES,
  alerts: [],

  loadSalle: async (salleId?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Tentative réseau, fallback sur mock
      try {
        // Identifiants en base = uuid : on prend la salle demandée, sinon la première
        // salle du restaurant.
        const id = salleId ?? (await api.get<Pick<Salle, "id">[]>("/salles"))[0]?.id;
        if (!id) throw new Error("Aucune salle pour ce restaurant");
        const data = await api.get<Salle>(`/salles/${id}`);
        const serviceStates = data.tables.reduce<Record<string, TableServiceState>>((states, table) => {
          if (table.serviceState) states[table.id] = table.serviceState;
          return states;
        }, get().serviceStates);
        set({ salle: applyServiceStatuses(data, serviceStates), serviceStates, isLoading: false });
      } catch {
        // Mode offline ou backend non disponible → données mockées
        set({ salle: applyServiceStatuses(MOCK_SALLE, get().serviceStates), isLoading: false });
      }
    } catch (e) {
      set({ error: String(e), isLoading: false, salle: applyServiceStatuses(MOCK_SALLE, get().serviceStates) });
    }
  },

  setStatutTable: (tableId, statut) => {
    set((state) => {
      if (!state.salle) return state;
      // Table nettoyée : le repas précédent n'y est plus affiché (comme côté serveur).
      const serviceStates = { ...state.serviceStates };
      if (statut === "libre") delete serviceStates[tableId];
      return {
        serviceStates,
        salle: {
          ...state.salle,
          tables: state.salle.tables.map((t) =>
            t.id === tableId ? { ...t, statut } : t
          ),
        },
      };
    });
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

  updateTableInfo: (tableId, updates) => {
    set((state) => {
      if (!state.salle) return state;
      return {
        salle: {
          ...state.salle,
          tables: state.salle.tables.map((t) =>
            t.id === tableId ? { ...t, ...updates } : t
          ),
        },
      };
    });
    enqueueSync("table_info_update", { id: tableId, ...updates });
  },

  updateTableService: (tableId, updates) => {
    const current = get().serviceStates[tableId] ?? { tableId, course: "aucun", dishStatus: "aucun" };
    const occurredAt = new Date().toISOString();
    const event = createServiceEvent(current, updates, occurredAt);
    const next = {
      ...current,
      ...updates,
      lastEventAt: occurredAt,
      events: event ? [...(current.events ?? []), event] : current.events,
    };
    set((state) => ({ serviceStates: { ...state.serviceStates, [tableId]: next } }));
    enqueueSync("table_service_update", next);
  },

  appliquerRepas: (tableId, etat, statut) => {
    set((state) => {
      const serviceStates = { ...state.serviceStates };
      if (etat) serviceStates[tableId] = etat;
      else delete serviceStates[tableId];
      return {
        serviceStates,
        salle: state.salle
          ? { ...state.salle, tables: state.salle.tables.map((table) => (table.id === tableId ? { ...table, statut } : table)) }
          : state.salle,
      };
    });
  },

  openTable: (tableId) => {
    const current = get().serviceStates[tableId] ?? { tableId, course: "aucun" as const, dishStatus: "aucun" as const };
    const occurredAt = new Date().toISOString();
    const next: TableServiceState = {
      ...current,
      course: current.course === "aucun" ? "entree" : current.course,
      dishStatus: "aucun",
      seatedAt: current.seatedAt ?? occurredAt,
      lastEventAt: occurredAt,
      events: [...(current.events ?? []), {
        id: nouvelId(),
        reservationId: current.reservationId ?? `local-${tableId}`,
        tableId,
        type: "installation",
        label: "Table ouverte et clients installés",
        occurredAt,
      }],
    };
    set((state) => ({
      salle: state.salle ? { ...state.salle, tables: state.salle.tables.map((table) => table.id === tableId ? { ...table, statut: "occupee" } : table) } : state.salle,
      serviceStates: { ...state.serviceStates, [tableId]: next },
    }));
    enqueueSync("table_open", { tableId, occurredAt });
  },

  sendAddition: (tableId) => {
    const current = get().serviceStates[tableId] ?? { tableId, course: "dessert" as const, dishStatus: "aucun" as const };
    const occurredAt = new Date().toISOString();
    const next = {
      ...current,
      dishStatus: "aucun" as const,
      // Repas terminé : les allergies (donnée de santé) ne sont plus conservées.
      allergenes: undefined,
      allergenesSignalesAt: undefined,
      lastEventAt: occurredAt,
      events: [...(current.events ?? []), {
        id: nouvelId(),
        reservationId: current.reservationId ?? `local-${tableId}`,
        tableId,
        type: "addition" as const,
        label: "Addition envoyée",
        occurredAt,
      }],
    };
    set((state) => ({
      salle: state.salle ? { ...state.salle, tables: state.salle.tables.map((table) => table.id === tableId ? { ...table, statut: "a_nettoyer" } : table) } : state.salle,
      serviceStates: { ...state.serviceStates, [tableId]: next },
    }));
    enqueueSync("table_bill_sent", { tableId, occurredAt });
  },

  saveClient: (tableId, client, allergenes) => {
    const current = get().serviceStates[tableId] ?? { tableId, course: "entree" as const, dishStatus: "aucun" as const };
    const occurredAt = new Date().toISOString();
    const savedClient: Client = {
      id: current.clientId ?? nouvelId(),
      nom: client.nom,
      telephone: client.telephone,
      notes: client.notes,
      createdAt: current.client?.createdAt ?? occurredAt,
      lastVisitAt: occurredAt,
      visitStatus: "installe",
    };
    const next = {
      ...current,
      clientId: savedClient.id,
      clientName: client.nom,
      client: savedClient,
      allergenes: allergenes.length > 0 ? allergenes : undefined,
      allergenesSignalesAt: allergenes.length > 0 ? current.allergenesSignalesAt ?? occurredAt : undefined,
      lastEventAt: occurredAt,
    };
    set((state) => ({
      serviceStates: { ...state.serviceStates, [tableId]: next },
    }));
    enqueueSync("client_upsert", savedClient);
    enqueueSync("table_service_update", next);
  },

  addLignePlat: (tableId, nom, quantite) => {
    const orderedAt = new Date().toISOString();
    const ligne: LignePlat = {
      id: `l_${Date.now()}`,
      nom,
      quantite,
      statut: "en_attente",
    };
    set((state) => {
      const commande = state.commandes[tableId] ?? { tableId, lignes: [] };
      return { commandes: { ...state.commandes, [tableId]: { ...commande, lignes: [...commande.lignes, ligne] } } };
    });
    enqueueSync("dish_order", { tableId, menuItemId: ligne.id, quantite, orderedAt });
  },

  requestDish: (tableId, lineId) => {
    const commande = get().commandes[tableId];
    const line = commande?.lignes.find((candidate) => lineId ? candidate.id === lineId : candidate.statut === "en_preparation");
    if (!line || line.statut === "servi" || line.statut === "pret") return;
    const reclameAt = new Date().toISOString();
    set((state) => ({
      commandes: {
        ...state.commandes,
        [tableId]: { ...commande, lignes: commande!.lignes.map((candidate) => candidate.id === line.id ? { ...candidate, statut: "a_reclamer", reclameAt } : candidate) },
      },
    }));
    enqueueSync("dish_request", { tableId, lineId: line.id, reclameAt });
  },

  markDishReady: (tableId, lineId) => {
    const commande = get().commandes[tableId];
    const line = commande?.lignes.find((candidate) => candidate.id === lineId);
    if (!commande || !line || line.statut !== "a_reclamer") return;
    const readyAt = new Date().toISOString();
    const service = get().serviceStates[tableId];
    const alert: ServiceAlert = {
      id: `alert-${tableId}-${lineId}-${Date.now()}`,
      tableId,
      clientName: service?.clientName,
      message: `Plat prêt : ${line.nom}`,
      createdAt: readyAt,
      read: false,
    };
    set((state) => ({
      commandes: {
        ...state.commandes,
        [tableId]: { ...commande, lignes: commande.lignes.map((candidate) => candidate.id === lineId ? { ...candidate, statut: "pret" } : candidate) },
      },
      serviceStates: {
        ...state.serviceStates,
        [tableId]: service ? { ...service, course: "plat", dishStatus: "servi", lastEventAt: readyAt } : service,
      },
      alerts: [alert, ...state.alerts],
    }));
    enqueueSync("dish_ready", { tableId, lineId, readyAt });
  },

  markAlertRead: (alertId) => set((state) => ({ alerts: state.alerts.map((alert) => alert.id === alertId ? { ...alert, read: true } : alert) })),

  updateSalleConfiguration: (updates) => {
    set((state) => state.salle ? { salle: { ...state.salle, ...updates } } : state);
  },

  addTable: ({ nom, capacite, forme }) => {
    set((state) => {
      if (!state.salle) return state;
      const index = state.salle.tables.length + 1;
      const table: Table = {
        id: `t-${Date.now()}`,
        nom: nom.trim() || `Table ${index}`,
        x: 20 + ((index - 1) % 3) * 90,
        y: 20 + Math.floor((index - 1) / 3) * 90,
        largeur: forme === "ronde" ? 60 : 70,
        hauteur: forme === "ronde" ? 60 : 50,
        rotation: 0,
        forme,
        capacite: Math.max(1, Math.round(capacite)),
        zoneId: "z1",
        statut: "libre",
      };
      return { salle: { ...state.salle, tables: [...state.salle.tables, table] } };
    });
  },

  removeTable: (tableId) => {
    set((state) => state.salle ? {
      salle: { ...state.salle, tables: state.salle.tables.filter((table) => table.id !== tableId) },
    } : state);
  },

  selectTable: (tableId) => set({ selectedTableId: tableId }),

  getTable: (tableId) =>
    get().salle?.tables.find((t) => t.id === tableId),

  getCommande: (tableId) => get().commandes[tableId],
}));

function applyServiceStatuses(
  salle: Salle,
  serviceStates: Record<string, TableServiceState>
): Salle {
  return {
    ...salle,
    tables: salle.tables.map((table) => {
      const service = serviceStates[table.id];
      if (!service) return table;
      return {
        ...table,
        statut: service.events?.some((event) => event.type === "addition")
          ? "a_nettoyer"
          : service.course !== "aucun"
            ? "occupee"
            : table.statut,
      };
    }),
  };
}

function createServiceEvent(
  current: TableServiceState,
  updates: { course?: ServiceCourse; dishStatus?: DishServiceStatus },
  occurredAt: string
): ServiceEvent | undefined {
  if (updates.dishStatus === "servi" && updates.dishStatus !== current.dishStatus) {
    const course = updates.course ?? current.course;
    const type = course === "entree" ? "entree_servie" : course === "plat" ? "plat_servi" : "dessert_servi";
    return { id: nouvelId(), reservationId: current.reservationId ?? `local-${current.tableId}`, tableId: current.tableId, type, label: `${course === "entree" ? "Entrée" : course === "plat" ? "Plat" : "Dessert"} servi`, occurredAt };
  }
  if (updates.dishStatus === "a_reclamer" && updates.dishStatus !== current.dishStatus) {
    return { id: nouvelId(), reservationId: current.reservationId ?? `local-${current.tableId}`, tableId: current.tableId, type: "note", label: "Plat à réclamer", occurredAt };
  }
  return undefined;
}