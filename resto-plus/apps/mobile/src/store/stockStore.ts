/**
 * Store gestion des stocks cuisine — Resto Plus
 * Catalogue d'ingrédients (quantité, unité, seuil d'alerte, coût d'achat) et
 * journal des mouvements (réception, sortie, perte, ajustement), offline-first.
 * Génère aussi les alertes de seuil (front montant → sous le seuil, ou rupture)
 * à destination du chef de cuisine / de la direction.
 */

import { create } from "zustand";
import type { StockAlert, StockItem, StockMovement, StockMovementType, UniteStock } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";
import { enqueueSync } from "./syncStore";

// Données mockées (Phase 1 sans Supabase / mode hors ligne).
// Ingrédients du premier menu réel utilisé comme exemple (9 recettes, voir menuStore.ts).
const MOCK_STOCK_ITEMS: StockItem[] = [
  { id: "potimarron", nom: "Potimarron", categorie: "Légumes", unite: "kg", quantiteActuelle: 8, seuilAlerte: 2, prixAchat: 2.5, updatedAt: new Date().toISOString() },
  { id: "chataignes-bocal", nom: "Châtaignes cuites (bocal)", categorie: "Épicerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 14, updatedAt: new Date().toISOString() },
  { id: "oignon", nom: "Oignon", categorie: "Légumes", unite: "kg", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 2, updatedAt: new Date().toISOString() },
  { id: "creme-liquide", nom: "Crème liquide", categorie: "Crémerie", unite: "l", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 4, updatedAt: new Date().toISOString() },
  { id: "beurre-doux", nom: "Beurre doux", categorie: "Crémerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 10, updatedAt: new Date().toISOString() },
  { id: "lentilles-vertes", nom: "Lentilles vertes", categorie: "Épicerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 3.6, updatedAt: new Date().toISOString() },
  { id: "buche-chevre", nom: "Bûche de chèvre", categorie: "Crémerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 12, updatedAt: new Date().toISOString() },
  { id: "pain-mie", nom: "Pain de mie", categorie: "Boulangerie", unite: "unite", quantiteActuelle: 6, seuilAlerte: 2, prixAchat: 0.4, updatedAt: new Date().toISOString() },
  { id: "vinaigrette-persil", nom: "Vinaigrette & persil", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 1.1, updatedAt: new Date().toISOString() },
  { id: "saumon", nom: "Saumon frais (pavé)", categorie: "Poissonnerie", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 25, updatedAt: new Date().toISOString() },
  { id: "avocat", nom: "Avocat", categorie: "Fruits & légumes", unite: "unite", quantiteActuelle: 10, seuilAlerte: 3, prixAchat: 0.9, updatedAt: new Date().toISOString() },
  { id: "citron-vert", nom: "Citron vert", categorie: "Fruits & légumes", unite: "unite", quantiteActuelle: 12, seuilAlerte: 4, prixAchat: 0.4, updatedAt: new Date().toISOString() },
  { id: "aneth-huile-baies", nom: "Aneth, huile d'olive, baies", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.6, updatedAt: new Date().toISOString() },
  { id: "filet-mignon-porc", nom: "Filet mignon de porc", categorie: "Boucherie", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 16, updatedAt: new Date().toISOString() },
  { id: "pommes-terre", nom: "Pommes de terre", categorie: "Légumes", unite: "kg", quantiteActuelle: 10, seuilAlerte: 2, prixAchat: 1.5, updatedAt: new Date().toISOString() },
  { id: "creme-fraiche-moutarde", nom: "Crème fraîche & moutarde", categorie: "Crémerie", unite: "l", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 4, updatedAt: new Date().toISOString() },
  { id: "cabillaud", nom: "Dos de cabillaud", categorie: "Poissonnerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 28, updatedAt: new Date().toISOString() },
  { id: "poireaux", nom: "Poireaux", categorie: "Légumes", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 3, updatedAt: new Date().toISOString() },
  { id: "chapelure", nom: "Chapelure", categorie: "Épicerie", unite: "kg", quantiteActuelle: 1, seuilAlerte: 0.3, prixAchat: 10, updatedAt: new Date().toISOString() },
  { id: "herbes-huile", nom: "Herbes fraîches & huile", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.5, updatedAt: new Date().toISOString() },
  { id: "riz-arborio", nom: "Riz arborio", categorie: "Épicerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 4, updatedAt: new Date().toISOString() },
  { id: "champignons-paris", nom: "Champignons de Paris", categorie: "Légumes", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 4.5, updatedAt: new Date().toISOString() },
  { id: "vin-blanc-bouillon", nom: "Vin blanc sec & bouillon", categorie: "Épicerie", unite: "unite", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 0.8, updatedAt: new Date().toISOString() },
  { id: "parmesan", nom: "Parmesan AOP", categorie: "Crémerie", unite: "kg", quantiteActuelle: 1.5, seuilAlerte: 0.3, prixAchat: 26, updatedAt: new Date().toISOString() },
  { id: "chocolat-noir", nom: "Chocolat noir à pâtisser", categorie: "Épicerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 9, updatedAt: new Date().toISOString() },
  { id: "oeufs", nom: "Œufs", categorie: "Épicerie", unite: "unite", quantiteActuelle: 24, seuilAlerte: 6, prixAchat: 0.3, updatedAt: new Date().toISOString() },
  { id: "sucre", nom: "Sucre", categorie: "Épicerie", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 1.3, updatedAt: new Date().toISOString() },
  { id: "farine-t55", nom: "Farine T55", categorie: "Épicerie", unite: "kg", quantiteActuelle: 18, seuilAlerte: 5, prixAchat: 1.1, updatedAt: new Date().toISOString() },
  { id: "pate-feuilletee", nom: "Pâte feuilletée pur beurre", categorie: "Boulangerie", unite: "unite", quantiteActuelle: 6, seuilAlerte: 2, prixAchat: 1.2, updatedAt: new Date().toISOString() },
  { id: "pommes", nom: "Pommes", categorie: "Fruits & légumes", unite: "kg", quantiteActuelle: 6, seuilAlerte: 1.5, prixAchat: 2.7, updatedAt: new Date().toISOString() },
  { id: "sucre-creme-beurre-tarte", nom: "Sucre, crème & beurre (tarte)", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.6, updatedAt: new Date().toISOString() },
  { id: "fruits-rouges-surgeles", nom: "Fruits rouges (surgelés)", categorie: "Épicerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 11, updatedAt: new Date().toISOString() },
  { id: "gelatine-sucre-pannacotta", nom: "Gélatine & sucre (panna cotta)", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.4, updatedAt: new Date().toISOString() },
];

interface StockState {
  items: StockItem[];
  movementsByItem: Record<string, StockMovement[]>;
  alerts: StockAlert[];
  isLoading: boolean;

  loadStock: () => Promise<void>;
  loadHistorique: (itemId: string) => Promise<void>;
  loadAlertes: () => Promise<void>;
  ajouterArticle: (nom: string, unite: UniteStock, seuilAlerte: number, categorie?: string, prixAchat?: number) => void;
  /**
   * `sync: false` : reflet local d'un mouvement que le serveur applique lui-même
   * (ex. sortie de stock déclenchée par une commande, voir menuStore.commanderPlat).
   */
  enregistrerMouvement: (itemId: string, type: StockMovementType, quantite: number, motif?: string, options?: { sync?: boolean }) => void;
  /** Retire un article (N2). Nécessite le réseau : renvoie un message d'erreur sinon. */
  supprimerArticle: (itemId: string) => Promise<string | null>;
  marquerAlerteLue: (alertId: string) => void;
  getArticlesEnAlerte: () => StockItem[];
  getAlertesNonLues: () => StockAlert[];
}

let _localIdCounter = 0;

function computeQuantiteApres(item: StockItem, type: StockMovementType, quantite: number): number {
  if (type === "reception") return item.quantiteActuelle + quantite;
  if (type === "ajustement") return quantite;
  return Math.max(0, item.quantiteActuelle - quantite); // sortie, perte
}

export const useStockStore = create<StockState>((set, get) => ({
  items: [],
  movementsByItem: {},
  alerts: [],
  isLoading: false,

  loadStock: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<StockItem[]>("/stock-items");
      set({ items: data, isLoading: false });
    } catch {
      // Mode offline → données mockées
      set({ items: MOCK_STOCK_ITEMS, isLoading: false });
    }
  },

  loadHistorique: async (itemId) => {
    try {
      const data = await api.get<StockMovement[]>(`/stock-items/${itemId}/movements`);
      set((state) => ({ movementsByItem: { ...state.movementsByItem, [itemId]: data } }));
    } catch {
      // Hors ligne : on garde l'historique local déjà connu, sans le remplacer.
    }
  },

  loadAlertes: async () => {
    try {
      const data = await api.get<StockAlert[]>("/stock-alerts");
      set({ alerts: data });
    } catch {
      // Hors ligne : on garde les alertes générées localement.
    }
  },

  ajouterArticle: (nom, unite, seuilAlerte, categorie, prixAchat) => {
    const item: StockItem = {
      id: `local_${Date.now()}_${_localIdCounter++}`,
      nom,
      categorie,
      unite,
      quantiteActuelle: 0,
      seuilAlerte,
      prixAchat,
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ items: [...state.items, item] }));
    enqueueSync("stock_item_create", { nom, categorie, unite, seuilAlerte, prixAchat });
  },

  enregistrerMouvement: (itemId, type, quantite, motif, options) => {
    const item = get().items.find((candidate) => candidate.id === itemId);
    if (!item) return;

    const quantiteAvant = item.quantiteActuelle;
    const quantiteApres = computeQuantiteApres(item, type, quantite);
    const delta = quantiteApres - quantiteAvant;
    // Même règle que l'API : une baisse reste provisoire jusqu'au compte rendu cuisine.
    const statut = type === "reception" || delta >= 0 ? "confirme" : "provisoire";
    const timestamp = new Date().toISOString();
    const movement: StockMovement = {
      id: `mvt_${Date.now()}_${_localIdCounter++}`,
      stockItemId: itemId,
      type,
      quantite,
      quantiteApres,
      delta,
      statut,
      motif,
      userId: "current-user", // sera remplacé par l'auth Supabase
      timestamp,
    };

    // Alerte front-de-seuil : uniquement au moment où l'on passe sous le seuil (ou en
    // rupture), pas à chaque mouvement tant qu'on y reste — pour ne pas noyer le chef
    // de cuisine sous des doublons. Reflète la logique appliquée côté API.
    const franchitSeuil = quantiteAvant > item.seuilAlerte && quantiteApres <= item.seuilAlerte;
    const franchitRupture = quantiteAvant > 0 && quantiteApres <= 0;
    const alert: StockAlert | undefined =
      franchitSeuil || franchitRupture
        ? {
            id: `alrt_${Date.now()}_${_localIdCounter++}`,
            stockItemId: itemId,
            stockItemNom: item.nom,
            niveau: franchitRupture ? "rupture" : "bas",
            message: franchitRupture
              ? `Rupture de stock : ${item.nom}`
              : `Stock bas : ${item.nom} (${quantiteApres} ${item.unite}, seuil ${item.seuilAlerte} ${item.unite})`,
            createdAt: timestamp,
            read: false,
          }
        : undefined;

    set((state) => ({
      items: state.items.map((candidate) =>
        candidate.id === itemId
          ? {
              ...candidate,
              quantiteActuelle: quantiteApres,
              quantiteConfirmee: statut === "confirme" ? (candidate.quantiteConfirmee ?? quantiteAvant) + delta : candidate.quantiteConfirmee ?? quantiteAvant,
              updatedAt: timestamp,
            }
          : candidate
      ),
      movementsByItem: {
        ...state.movementsByItem,
        [itemId]: [movement, ...(state.movementsByItem[itemId] ?? [])],
      },
      alerts: alert ? [alert, ...state.alerts] : state.alerts,
    }));

    if (options?.sync !== false) enqueueSync("stock_movement", { stockItemId: itemId, type, quantite, motif });
  },

  supprimerArticle: async (itemId) => {
    try {
      await api.delete(`/stock-items/${itemId}`);
      set((state) => ({ items: state.items.filter((item) => item.id !== itemId) }));
      return null;
    } catch (error) {
      return messageErreur(error);
    }
  },

  marquerAlerteLue: (alertId) => {
    set((state) => ({ alerts: state.alerts.map((alert) => (alert.id === alertId ? { ...alert, read: true } : alert)) }));
    void api.post(`/stock-alerts/${alertId}/read`, {}).catch(() => undefined);
  },

  getArticlesEnAlerte: () => get().items.filter((item) => item.quantiteActuelle <= item.seuilAlerte),

  getAlertesNonLues: () => get().alerts.filter((alert) => !alert.read),
}));
