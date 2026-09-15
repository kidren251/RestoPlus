/**
 * Store réseau + sync engine — Resto Plus
 *
 * Ce store est le chef d'orchestre de l'offline-first :
 * - détecte les changements de connectivité (NetInfo)
 * - maintient une référence au SyncEngine singleton
 * - expose le pendingCount pour les indicateurs UI
 */

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { SyncEngine } from "@resto-plus/sync-engine";
import type { QueuedAction } from "@resto-plus/sync-engine";
import { api } from "../api/client";

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  engine: SyncEngine | null;
  /** À appeler une seule fois au démarrage dans App.tsx */
  init: () => Promise<void>;
}

const sendAction = async (action: QueuedAction): Promise<void> => {
  switch (action.type) {
    case "table_status_change":
      await api.put(`/tables/${(action.payload as { id: string }).id}/statut`, action.payload);
      break;
    case "table_move":
      await api.put(`/tables/${(action.payload as { id: string }).id}/position`, action.payload);
      break;
    case "table_info_update":
      await api.put(`/tables/${(action.payload as { id: string }).id}/info`, action.payload);
      break;
    case "table_service_update":
      await api.put(`/tables/${(action.payload as { tableId: string }).tableId}/service`, action.payload);
      break;
    case "table_open":
      await api.put(`/tables/${(action.payload as { tableId: string }).tableId}/open`, action.payload);
      break;
    case "table_bill_sent":
      await api.put(`/tables/${(action.payload as { tableId: string }).tableId}/bill`, action.payload);
      break;
    case "client_upsert":
      await api.post("/clients", action.payload);
      break;
    case "dish_order":
      await api.put(`/tables/${(action.payload as { tableId: string }).tableId}/dish-order`, action.payload);
      break;
    case "dish_request":
      await api.put(`/tables/${(action.payload as { tableId: string }).tableId}/dish-request`, action.payload);
      break;
    case "dish_ready":
      await api.put(`/tables/${(action.payload as { tableId: string }).tableId}/dish-ready`, action.payload);
      break;
    case "reservation_create":
      await api.post("/reservations", action.payload);
      break;
    case "reservation_cancel":
      await api.delete(`/reservations/${(action.payload as { id: string }).id}`);
      break;
    case "checklist_entry":
      await api.post("/checklist-entries", action.payload);
      break;
    case "message_send":
      await api.post("/messages", action.payload);
      break;
    case "stock_item_create":
      await api.post("/stock-items", action.payload);
      break;
    case "stock_movement":
      await api.post(`/stock-items/${(action.payload as { stockItemId: string }).stockItemId}/movements`, action.payload);
      break;
  }
};

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: true,
  pendingCount: 0,
  engine: null,

  init: async () => {
    const engine = new SyncEngine({
      send: sendAction,
      storage: AsyncStorage,
      baseRetryIntervalMs: 5_000,
      maxAttempts: 5,
      onPendingCountChange: (count) => set({ pendingCount: count }),
    });

    await engine.hydrate();
    set({ engine });

    // Écouter les changements réseau
    NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      engine.setOnline(online);
      set({ isOnline: online });
    });
  },
}));

/** Raccourci pour enqueuer une action depuis n'importe quel store */
export function enqueueSync(
  type: Parameters<SyncEngine["enqueue"]>[0],
  payload: unknown
) {
  const engine = useSyncStore.getState().engine;
  if (!engine) {
    console.warn("SyncEngine non initialisé");
    return;
  }
  engine.enqueue(type, payload);
}
