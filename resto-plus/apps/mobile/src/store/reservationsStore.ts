/**
 * Réservations du soir — Resto Plus
 * Partagé par l'écran Réservations et le panneau de la table (installer des clients,
 * changer de table). Les gestes du service passent directement par l'API : ils créent
 * ou déplacent des données côté serveur (réservation walk-in, déroulé du dîner).
 */

import { create } from "zustand";
import type { Reservation, StatutTable, TableServiceState } from "@resto-plus/types";
import { api, ApiError, messageErreur } from "../api/client";
import { enqueueSync } from "./syncStore";
import { useSalleStore } from "./salleStore";
import { nouvelId } from "../utils/identifiant";

export type NouvelleReservation = Pick<Reservation, "nomClient" | "couverts" | "heure" | "tableId" | "allergenes" | "allergenesSignalesAt" | "notes">;

type Resultat = { ok: true } | { ok: false; error: string };

interface ReservationsState {
  reservations: Reservation[];
  isLoading: boolean;
  charger: () => Promise<void>;
  creer: (reservation: NouvelleReservation) => void;
  annuler: (id: string) => void;
  /** Installe une réservation (même prévue ailleurs) ou un walk-in à cette table. */
  installer: (tableId: string, choix: { reservationId: string } | { couverts: number }) => Promise<Resultat>;
  /** Le repas en cours change de table. */
  changerDeTable: (deTableId: string, versTableId: string) => Promise<Resultat>;
}

/** Réservations qui peuvent encore être installées ce soir. */
export function reservationsAttendues(reservations: Reservation[]): Reservation[] {
  return reservations.filter((r) => r.status === "a_venir" || r.status === "arrivee" || !r.status);
}

export const useReservationsStore = create<ReservationsState>((set, get) => ({
  reservations: [],
  isLoading: false,

  charger: async () => {
    set({ isLoading: true });
    try {
      set({ reservations: await api.get<Reservation[]>("/reservations") });
    } catch {
      // Hors ligne : on garde la dernière liste connue.
    } finally {
      set({ isLoading: false });
    }
  },

  creer: (nouvelle) => {
    const reservation: Reservation = { ...nouvelle, id: nouvelId(), status: "a_venir", source: "telephone", serviceEvents: [] };
    set((state) => ({ reservations: [...state.reservations, reservation] }));
    enqueueSync("reservation_create", reservation);
  },

  annuler: (id) => {
    set((state) => ({ reservations: state.reservations.filter((r) => r.id !== id) }));
    enqueueSync("reservation_cancel", { id });
  },

  installer: async (tableId, choix) => {
    try {
      const { etat, reservation } = await api.post<{ etat: TableServiceState; reservation: Reservation }>(`/tables/${tableId}/installer`, choix);
      useSalleStore.getState().appliquerRepas(tableId, etat, "occupee");
      set((state) => ({
        reservations: state.reservations.some((r) => r.id === reservation.id)
          ? state.reservations.map((r) => (r.id === reservation.id ? reservation : r))
          : [...state.reservations, reservation],
      }));
      return { ok: true };
    } catch (erreur) {
      if (erreur instanceof ApiError) return { ok: false, error: messageErreur(erreur) };
      // Pas de réseau : la table est ouverte sur ce téléphone, sans réservation ; elle
      // sera rattachée quand le service reprendra en ligne.
      useSalleStore.getState().openTable(tableId);
      return { ok: true };
    }
  },

  changerDeTable: async (deTableId, versTableId) => {
    try {
      const etat = await api.post<TableServiceState>(`/tables/${deTableId}/deplacer`, { versTableId });
      const salle = useSalleStore.getState();
      salle.appliquerRepas(deTableId, undefined, "libre" as StatutTable);
      salle.appliquerRepas(versTableId, { ...etat, events: salle.serviceStates[deTableId]?.events }, "occupee");
      set((state) => ({
        reservations: state.reservations.map((r) => (r.id === etat.reservationId ? { ...r, tableId: versTableId } : r)),
      }));
      return { ok: true };
    } catch (erreur) {
      return { ok: false, error: messageErreur(erreur, "Changement de table impossible hors ligne.") };
    }
  },
}));
