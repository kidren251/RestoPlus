import type { FastifyInstance } from "fastify";
import { requirePermission } from "../permissions";
import { journaliser } from "../audit";
import { duRestaurant, restaurantDe } from "../tenant";

// Données mockées — Phase 1
const MOCK_CHECKLISTS = [
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

// Entrées en mémoire
const entries: unknown[] = [];

export async function checklistsRoutes(app: FastifyInstance) {
  // GET /checklists
  app.get("/checklists", async () => {
    return MOCK_CHECKLISTS;
  });

  // POST /checklist-entries
  app.post<{ Body: Record<string, unknown> }>("/checklist-entries", { preHandler: requirePermission("checklist.remplir") }, async (req, reply) => {
    const entry = {
      id: `entry_${Date.now()}`,
      ...req.body,
      restaurantId: restaurantDe(req),
      receivedAt: new Date().toISOString(),
    };
    entries.push(entry);
    // Relevé sanitaire tel que reçu : il fait foi lors d'un contrôle.
    const releve = req.body as Record<string, unknown>;
    const texte = (cle: string) => (typeof releve[cle] === "string" || typeof releve[cle] === "number" || typeof releve[cle] === "boolean" ? (releve[cle] as string | number | boolean) : null);
    journaliser(req, "haccp.checklist", {
      cible: { type: "checklist", id: String(texte("checklistId") ?? texte("itemId") ?? entry.id) },
      details: { entreeId: entry.id, valeur: texte("valeur") ?? texte("temperature"), conforme: texte("conforme"), commentaire: texte("commentaire") },
    });
    return reply.status(201).send(entry);
  });

  // GET /checklist-entries — debug uniquement
  app.get("/checklist-entries", async (req) => {
    return duRestaurant(entries as { restaurantId?: string }[], req);
  });
}
