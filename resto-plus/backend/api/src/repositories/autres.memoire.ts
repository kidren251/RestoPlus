import { randomUUID } from "node:crypto";
import { jourDeService, type Reservation } from "@resto-plus/types";
import type { ClientsRepository } from "./clients";
import type { EtablissementsRepository } from "./etablissements";
import type { EtatMemoire } from "./memoire";
import type { ReservationsRepository } from "./reservations";
import { ErreurService, type ServiceRepository } from "./service";

/** Implémentations en mémoire des réservations, clients, gestes du service et réglages. */

export function creerReservationsMemoire(etat: EtatMemoire): ReservationsRepository {
  return {
    async lister(restaurantId, date) {
      return etat.reservations.filter((r) => r.restaurantId === restaurantId && r.date === date && r.status !== "annulee");
    },

    async creer(restaurantId, nouvelle) {
      const reservation = {
        ...nouvelle,
        id: nouvelle.id ?? randomUUID(),
        restaurantId,
        status: "a_venir" as const,
        source: nouvelle.source ?? "telephone",
        serviceEvents: [],
      };
      etat.reservations.push(reservation);
      return reservation;
    },

    async annuler(restaurantId, id) {
      const resa = etat.reservations.find((r) => r.id === id && r.restaurantId === restaurantId);
      if (!resa) return false;
      Object.assign(resa, { status: "annulee", allergenes: [], allergenesSignalesAt: undefined });
      return true;
    },
  };
}

export function creerClientsMemoire(etat: EtatMemoire): ClientsRepository {
  return {
    async lister(restaurantId) {
      return etat.clients.filter((c) => c.restaurantId === restaurantId);
    },

    async lire(restaurantId, id) {
      return etat.clients.find((c) => c.id === id && c.restaurantId === restaurantId) ?? null;
    },

    async enregistrer(restaurantId, client) {
      const index = etat.clients.findIndex((c) => c.id === client.id);
      const fiche = { ...client, restaurantId };
      if (index === -1) {
        etat.clients.push(fiche);
      } else {
        if (etat.clients[index].restaurantId !== restaurantId) return null;
        etat.clients[index] = fiche;
      }
      return fiche;
    },
  };
}

export function creerServiceMemoire(etat: EtatMemoire): ServiceRepository {
  const table = (restaurantId: string, tableId: string) =>
    etat.salles.filter((s) => s.restaurantId === restaurantId).flatMap((s) => s.tables).find((t) => t.id === tableId);

  const evenement = (resa: Reservation, tableId: string, type: "installation" | "changement_table" | "addition", label: string, at: string) => {
    resa.serviceEvents = [...(resa.serviceEvents ?? []), { id: randomUUID(), reservationId: resa.id, tableId, type, label, occurredAt: at }];
  };

  return {
    async installer(restaurantId, tableId, installation, at) {
      const t = table(restaurantId, tableId);
      if (!t) throw new ErreurService("TABLE_INTROUVABLE");
      if (t.statut === "occupee") throw new ErreurService("TABLE_OCCUPEE");

      let resa: (typeof etat.reservations)[number] | undefined;
      if (installation.reservationId) {
        resa = etat.reservations.find(
          (r) => r.id === installation.reservationId && r.restaurantId === restaurantId && (r.status === "a_venir" || r.status === "arrivee")
        );
        if (!resa) throw new ErreurService("RESERVATION_INTROUVABLE");
        Object.assign(resa, { tableId, status: "installee" });
      } else {
        const heure = new Date(at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
        resa = {
          id: randomUUID(),
          restaurantId,
          date: jourDeService(at),
          tableId,
          nomClient: "Sans réservation",
          couverts: Math.max(1, installation.couverts ?? 1),
          heure,
          allergenes: [],
          source: "walk_in",
          status: "installee",
          serviceEvents: [],
        };
        etat.reservations.push(resa);
      }

      const service = {
        tableId,
        reservationId: resa.id,
        clientId: resa.clientId,
        clientName: resa.nomClient,
        course: "entree" as const,
        dishStatus: "aucun" as const,
        seatedAt: at,
        lastEventAt: at,
        allergenes: resa.allergenes.length > 0 ? [...resa.allergenes] : undefined,
        allergenesSignalesAt: resa.allergenesSignalesAt,
      };
      etat.services[tableId] = service;
      t.statut = "occupee";
      evenement(resa, tableId, "installation", resa.source === "walk_in" ? "Clients installés (sans réservation)" : "Clients installés", at);
      return { etat: service, reservation: resa };
    },

    async deplacer(restaurantId, deTableId, versTableId, at) {
      const de = table(restaurantId, deTableId);
      const vers = table(restaurantId, versTableId);
      if (!de || !vers) throw new ErreurService("TABLE_INTROUVABLE");
      if (vers.statut === "occupee") throw new ErreurService("TABLE_OCCUPEE");
      const service = etat.services[deTableId];
      if (!service) throw new ErreurService("AUCUN_REPAS");

      const deplace = { ...service, tableId: versTableId, lastEventAt: at };
      delete etat.services[deTableId];
      etat.services[versTableId] = deplace;
      de.statut = "libre";
      vers.statut = "occupee";
      const resa = etat.reservations.find((r) => r.id === service.reservationId);
      if (resa) {
        resa.tableId = versTableId;
        evenement(resa, versTableId, "changement_table", `Changement de table : ${de.nom ?? "table"} → ${vers.nom ?? "table"}`, at);
      }
      return deplace;
    },

    async terminer(restaurantId, tableId, at) {
      const t = table(restaurantId, tableId);
      if (!t) throw new ErreurService("TABLE_INTROUVABLE");
      t.statut = "a_nettoyer";
      const service = etat.services[tableId];
      if (!service) return;
      delete service.allergenes;
      delete service.allergenesSignalesAt;
      service.lastEventAt = at;
      const resa = etat.reservations.find((r) => r.id === service.reservationId);
      if (resa) {
        Object.assign(resa, { status: "terminee", allergenes: [], allergenesSignalesAt: undefined });
        evenement(resa, tableId, "addition", "Addition envoyée", at);
      }
    },
  };
}

export function creerEtablissementsMemoire(etat: EtatMemoire): EtablissementsRepository {
  return {
    async lister() {
      return etat.restaurants.map(({ id, nom, slug }) => ({ id, nom, slug }));
    },

    async reglagesDroits(restaurantId) {
      return etat.restaurants.find((r) => r.id === restaurantId)?.reglagesDroits ?? {};
    },

    async modifierReglagesDroits(restaurantId, reglages) {
      const restaurant = etat.restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) return false;
      restaurant.reglagesDroits = reglages;
      return true;
    },
  };
}
