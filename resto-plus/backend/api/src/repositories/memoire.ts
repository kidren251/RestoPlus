import type { Checklist, Client, Reservation, ReglagesDroits, Salle, TableServiceState } from "@resto-plus/types";
import type { Releve } from "./haccp";
import { jourDeService } from "@resto-plus/types";
import { DEMO_RESTAURANT_ID } from "../tenant";

/**
 * Données de démo en mémoire, partagées par les repositories *.memoire.ts (un geste
 * comme « installer des clients » touche à la fois la salle et les réservations).
 * Mêmes identifiants que l'app hors ligne : salle-1, t1…t6, r1…r5.
 */
export interface EtatMemoire {
  restaurants: { id: string; nom: string; slug: string; reglagesDroits: ReglagesDroits }[];
  salles: Salle[];
  services: Record<string, TableServiceState>;
  reservations: (Reservation & { restaurantId: string; date: string })[];
  clients: (Client & { restaurantId: string })[];
  checklists: (Checklist & { restaurantId: string })[];
  releves: Releve[];
}

/** Plan HACCP de démo (même contenu que scripts/seed-demo.mjs). */
export const CHECKLISTS_DEMO: Checklist[] = [
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

export function creerEtatMemoire(): EtatMemoire {
  const aujourdhui = jourDeService();
  const r = DEMO_RESTAURANT_ID;
  return {
    restaurants: [{ id: r, nom: "Restaurant de démo", slug: "demo", reglagesDroits: {} }],
    salles: [
      {
        id: "salle-1",
        restaurantId: r,
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
    ],
    services: {},
    reservations: [
      { id: "r1", restaurantId: r, date: aujourdhui, tableId: "t2", clientId: "client-fontaine", nomClient: "M. Fontaine", couverts: 2, heure: "19:30", allergenes: [], notes: "Anniversaire — prévoir bougie", source: "telephone", status: "a_venir", serviceEvents: [] },
      { id: "r2", restaurantId: r, date: aujourdhui, tableId: "t3", clientId: "client-beaumont", nomClient: "Mme Beaumont", couverts: 4, heure: "20:00", allergenes: ["gluten", "lactose"], allergenesSignalesAt: new Date().toISOString(), notes: "", source: "telephone", status: "a_venir", serviceEvents: [] },
      { id: "r3", restaurantId: r, date: aujourdhui, tableId: "t4", nomClient: "M. Renard", couverts: 6, heure: "20:30", allergenes: ["arachides"], allergenesSignalesAt: new Date().toISOString(), notes: "Client régulier — table habituelle", source: "telephone", status: "a_venir", serviceEvents: [] },
      { id: "r4", restaurantId: r, date: aujourdhui, tableId: "t6", nomClient: "Famille Moreau", couverts: 4, heure: "19:00", allergenes: [], notes: "", source: "site", status: "a_venir", serviceEvents: [] },
      { id: "r5", restaurantId: r, date: aujourdhui, tableId: "t1", nomClient: "Mme Leclerc", couverts: 2, heure: "21:00", allergenes: ["fruits de mer"], allergenesSignalesAt: new Date().toISOString(), notes: "VIP — compte fidélité", source: "telephone", status: "a_venir", serviceEvents: [] },
    ],
    clients: [
      { id: "client-fontaine", restaurantId: r, nom: "M. Fontaine", telephone: "+33 6 00 00 00 01", preferences: "Table calme", notes: "Anniversaire signalé lors de la réservation", createdAt: "2025-04-12T10:00:00.000Z", lastVisitAt: "2026-09-09T19:42:00.000Z" },
      { id: "client-beaumont", restaurantId: r, nom: "Mme Beaumont", notes: "Demander ses allergies à chaque repas", createdAt: "2025-07-20T10:00:00.000Z", lastVisitAt: "2026-09-09T20:08:00.000Z" },
    ],
    checklists: CHECKLISTS_DEMO.map((c) => ({ ...c, restaurantId: r })),
    releves: [],
  };
}
