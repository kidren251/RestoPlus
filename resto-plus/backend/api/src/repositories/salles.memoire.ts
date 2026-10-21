import type { Salle, StatutTable, TableServiceState } from "@resto-plus/types";
import { DEMO_RESTAURANT_ID } from "../tenant";
import type { InfosTable, SalleResume, SallesRepository } from "./salles";

// Données de démo (mêmes identifiants que l'app hors ligne : salle-1, t1…t6).
const SALLES_DEMO: Salle[] = [
  {
    id: "salle-1",
    restaurantId: DEMO_RESTAURANT_ID,
    nom: "Salle Principale",
    largeurCanvas: 320,
    hauteurCanvas: 400,
    tables: [
      { id: "t1", nom: "Table 1", x: 20, y: 30, largeur: 60, hauteur: 60, rotation: 0, forme: "ronde", capacite: 2, zoneId: "z1", statut: "libre" },
      { id: "t2", nom: "Table 2", x: 110, y: 30, largeur: 70, hauteur: 50, rotation: 0, forme: "rectangle", capacite: 4, zoneId: "z1", statut: "libre" },
      { id: "t3", nom: "Table 3", x: 20, y: 130, largeur: 70, hauteur: 50, rotation: 0, forme: "carree", capacite: 4, zoneId: "z1", statut: "libre" },
      { id: "t4", nom: "Table 4", x: 120, y: 130, largeur: 60, hauteur: 60, rotation: 0, forme: "ronde", capacite: 6, zoneId: "z2", statut: "libre" },
      { id: "t5", nom: "Table 5", x: 20, y: 230, largeur: 80, hauteur: 60, rotation: 0, forme: "rectangle", capacite: 8, zoneId: "z2", statut: "libre" },
      { id: "t6", nom: "Table 6", x: 140, y: 230, largeur: 60, hauteur: 50, rotation: 15, forme: "carree", capacite: 4, zoneId: "z2", statut: "libre" },
    ],
    decor: [
      { id: "d1", type: "bar", x: 210, y: 20, largeur: 90, hauteur: 30, rotation: 0 },
      { id: "d2", type: "entree", x: 0, y: 350, largeur: 60, hauteur: 20, rotation: 0 },
      { id: "d3", type: "cuisine", x: 210, y: 300, largeur: 90, hauteur: 90, rotation: 0 },
    ],
  },
];

export function creerSallesMemoire(): SallesRepository {
  const salles: Salle[] = structuredClone(SALLES_DEMO);
  const services: Record<string, TableServiceState> = {};

  const trouverTable = (restaurantId: string, tableId: string) =>
    salles.find((s) => s.restaurantId === restaurantId)?.tables.find((t) => t.id === tableId);

  return {
    async lister(restaurantId) {
      return salles
        .filter((s) => s.restaurantId === restaurantId)
        .map(({ tables: _tables, decor: _decor, ...resume }): SalleResume => resume);
    },

    async lire(restaurantId, salleId) {
      const salle = salles.find((s) => s.id === salleId && s.restaurantId === restaurantId);
      if (!salle) return null;
      return { ...salle, tables: salle.tables.map((t) => ({ ...t, serviceState: services[t.id] })) };
    },

    async tableExiste(restaurantId, tableId) {
      return !!trouverTable(restaurantId, tableId);
    },

    async changerStatut(restaurantId, tableId, statut: StatutTable) {
      const table = trouverTable(restaurantId, tableId);
      if (table) table.statut = statut;
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

    async ecrireService(_restaurantId, etat) {
      services[etat.tableId] = etat;
      return etat;
    },

    async terminerRepas(restaurantId, tableId) {
      const table = trouverTable(restaurantId, tableId);
      if (table) table.statut = "a_nettoyer";
      const service = services[tableId];
      if (service) {
        delete service.allergenes;
        delete service.allergenesSignalesAt;
      }
    },
  };
}
