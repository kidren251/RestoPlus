import type { StatutTable } from "@resto-plus/types";
import type { EtatMemoire } from "./memoire";
import type { InfosTable, SalleResume, SallesRepository } from "./salles";

export function creerSallesMemoire(etat: EtatMemoire): SallesRepository {
  const trouverTable = (restaurantId: string, tableId: string) =>
    etat.salles.filter((s) => s.restaurantId === restaurantId).flatMap((s) => s.tables).find((t) => t.id === tableId);

  return {
    async lister(restaurantId) {
      return etat.salles
        .filter((s) => s.restaurantId === restaurantId)
        .map(({ tables: _tables, decor: _decor, ...resume }): SalleResume => resume);
    },

    async lire(restaurantId, salleId) {
      const salle = etat.salles.find((s) => s.id === salleId && s.restaurantId === restaurantId);
      if (!salle) return null;
      return { ...salle, tables: salle.tables.map((t) => ({ ...t, serviceState: etat.services[t.id] })) };
    },

    async tableExiste(restaurantId, tableId) {
      return !!trouverTable(restaurantId, tableId);
    },

    async changerStatut(restaurantId, tableId, statut: StatutTable) {
      const table = trouverTable(restaurantId, tableId);
      if (!table) return;
      table.statut = statut;
      if (statut === "libre") delete etat.services[tableId];
    },

    async deplacer(restaurantId, tableId, x, y) {
      const table = trouverTable(restaurantId, tableId);
      if (table) Object.assign(table, { x, y });
    },

    async modifierInfos(restaurantId, tableId, infos: InfosTable) {
      const table = trouverTable(restaurantId, tableId);
      if (!table) return {};
      if (infos.nom !== undefined) table.nom = infos.nom;
      if (infos.capacite !== undefined) table.capacite = infos.capacite;
      return { nom: table.nom, capacite: table.capacite };
    },

    async ecrireService(restaurantId, recu) {
      // Le lien avec la réservation n'est posé que par les gestes du service (installer,
      // changer de table) : une mise à jour du repas ne peut ni le retirer ni le changer.
      const service = { ...recu, reservationId: etat.services[recu.tableId]?.reservationId };
      etat.services[service.tableId] = service;
      // Déroulé du dîner rattaché à la réservation (comme service_events en base).
      const resa = etat.reservations.find((r) => r.id === service.reservationId && r.restaurantId === restaurantId);
      if (resa && service.events) {
        const connus = new Set((resa.serviceEvents ?? []).map((e) => e.id));
        resa.serviceEvents = [...(resa.serviceEvents ?? []), ...service.events.filter((e) => !connus.has(e.id))];
      }
      return service;
    },
  };
}
