import type { FastifyInstance } from "fastify";
import { requirePermission } from "../permissions";
import { appartient, DEMO_RESTAURANT_ID, duRestaurant } from "../tenant";
import { tableInfos, tablePositions, tableServices, tableStatuts } from "./tableState";

// Données mockées Phase 1
const MOCK_SALLES = [
  {
    id: "salle-1",
    restaurantId: DEMO_RESTAURANT_ID,
    nom: "Salle Principale",
    largeurCanvas: 320,
    hauteurCanvas: 400,
    tables: [
      { id: "t1", x: 20, y: 30, largeur: 60, hauteur: 60, rotation: 0, forme: "ronde", capacite: 2, zoneId: "z1", statut: "libre" },
      { id: "t2", x: 110, y: 30, largeur: 70, hauteur: 50, rotation: 0, forme: "rectangle", capacite: 4, zoneId: "z1", statut: "libre" },
      { id: "t3", x: 20, y: 130, largeur: 70, hauteur: 50, rotation: 0, forme: "carree", capacite: 4, zoneId: "z1", statut: "libre" },
      { id: "t4", x: 120, y: 130, largeur: 60, hauteur: 60, rotation: 0, forme: "ronde", capacite: 6, zoneId: "z2", statut: "libre" },
      { id: "t5", x: 20, y: 230, largeur: 80, hauteur: 60, rotation: 0, forme: "rectangle", capacite: 8, zoneId: "z2", statut: "libre" },
      { id: "t6", x: 140, y: 230, largeur: 60, hauteur: 50, rotation: 15, forme: "carree", capacite: 4, zoneId: "z2", statut: "libre" },
    ],
    decor: [
      { id: "d1", type: "bar", x: 210, y: 20, largeur: 90, hauteur: 30, rotation: 0 },
      { id: "d2", type: "entree", x: 0, y: 350, largeur: 60, hauteur: 20, rotation: 0 },
      { id: "d3", type: "cuisine", x: 210, y: 300, largeur: 90, hauteur: 90, rotation: 0 },
    ],
  },
];

/** Une table n'est modifiable que par le restaurant propriétaire de sa salle. */
export function tableDuRestaurant(tableId: string, restaurantId: string): boolean {
  return MOCK_SALLES.some((salle) => salle.restaurantId === restaurantId && salle.tables.some((table) => table.id === tableId));
}

// Statuts mutables en mémoire (reset au redémarrage du serveur, normal en Phase 1)
export async function sallesRoutes(app: FastifyInstance) {
  // GET /salles — liste toutes les salles
  app.get("/salles", async (req) => {
    return duRestaurant(MOCK_SALLES, req);
  });

  // GET /salles/:id — une salle avec ses tables (statuts overrides appliqués)
  app.get<{ Params: { id: string } }>("/salles/:id", async (req, reply) => {
    const salle = MOCK_SALLES.find((s) => s.id === req.params.id);
    if (!salle || !appartient(salle, req)) return reply.status(404).send({ error: "Salle introuvable" });

    // Appliquer les statuts/positions modifiés en mémoire
    const tables = salle.tables.map((t) => ({
      ...t,
      ...tableInfos[t.id],
      serviceState: tableServices[t.id],
      statut: tableStatuts[t.id] ?? t.statut,
      x: tablePositions[t.id]?.x ?? t.x,
      y: tablePositions[t.id]?.y ?? t.y,
    }));

    return { ...salle, tables };
  });

  // POST /salles — créer une salle (stub Phase 2)
  app.post("/salles", { preHandler: requirePermission("salle.configurer") }, async (_req, reply) => {
    return reply.status(501).send({ error: "Non implémenté — Phase 2" });
  });
}
