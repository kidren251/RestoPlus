/**
 * Store carte / plats — Resto Plus
 * Lien commande ↔ ingrédients : quand un serveur commande un plat, décrémente
 * automatiquement chaque ingrédient lié dans le stock cuisine (via stockStore), ce
 * qui déclenche au passage les alertes de seuil pour le chef de cuisine. Sert aussi
 * de base à l'équation prix/marge (prixVente ici, prixAchat sur chaque StockItem lié).
 */

import { create } from "zustand";
import type { MenuItem, StockItem } from "@resto-plus/types";
import { api } from "../api/client";
import { useStockStore } from "./stockStore";
import { useSalleStore } from "./salleStore";

// Données mockées (Phase 1 sans Supabase / mode hors ligne). Premier menu réel
// utilisé comme exemple (9 recettes) — voir aussi backend/api/src/routes/menu.ts.
const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: "veloute-potimarron-chataigne",
    nom: "Velouté de potimarron & châtaigne",
    categorie: "Entrées",
    prixVente: 6.6,
    ingredients: [
      { stockItemId: "potimarron", quantite: 1 },
      { stockItemId: "chataignes-bocal", quantite: 0.2 },
      { stockItemId: "oignon", quantite: 0.1 },
      { stockItemId: "creme-liquide", quantite: 0.2 },
      { stockItemId: "beurre-doux", quantite: 0.04 },
    ],
  },
  {
    id: "salade-lentilles-chevre-chaud",
    nom: "Salade de lentilles & chèvre chaud",
    categorie: "Entrées",
    prixVente: 4.8,
    ingredients: [
      { stockItemId: "lentilles-vertes", quantite: 0.25 },
      { stockItemId: "buche-chevre", quantite: 0.2 },
      { stockItemId: "pain-mie", quantite: 1 },
      { stockItemId: "vinaigrette-persil", quantite: 1 },
    ],
  },
  {
    id: "tartare-saumon-avocat",
    nom: "Tartare de saumon & avocat",
    categorie: "Entrées",
    prixVente: 13.2,
    ingredients: [
      { stockItemId: "saumon", quantite: 0.4 },
      { stockItemId: "avocat", quantite: 2 },
      { stockItemId: "citron-vert", quantite: 2 },
      { stockItemId: "aneth-huile-baies", quantite: 1 },
    ],
  },
  {
    id: "filet-mignon-ecrase-pdt",
    nom: "Filet mignon & écrasé de pommes de terre",
    categorie: "Plats",
    prixVente: 12.4,
    ingredients: [
      { stockItemId: "filet-mignon-porc", quantite: 0.6 },
      { stockItemId: "pommes-terre", quantite: 0.8 },
      { stockItemId: "creme-fraiche-moutarde", quantite: 0.2 },
      { stockItemId: "beurre-doux", quantite: 0.05 },
    ],
  },
  {
    id: "dos-cabillaud-poireaux",
    nom: "Dos de cabillaud & poireaux",
    categorie: "Plats",
    prixVente: 17,
    ingredients: [
      { stockItemId: "cabillaud", quantite: 0.5 },
      { stockItemId: "poireaux", quantite: 0.6 },
      { stockItemId: "chapelure", quantite: 0.05 },
      { stockItemId: "beurre-doux", quantite: 0.05 },
      { stockItemId: "herbes-huile", quantite: 1 },
    ],
  },
  {
    id: "risotto-champignons",
    nom: "Risotto aux champignons",
    categorie: "Plats",
    prixVente: 5.9,
    ingredients: [
      { stockItemId: "riz-arborio", quantite: 0.3 },
      { stockItemId: "champignons-paris", quantite: 0.4 },
      { stockItemId: "vin-blanc-bouillon", quantite: 1 },
      { stockItemId: "oignon", quantite: 0.1 },
      { stockItemId: "parmesan", quantite: 0.08 },
    ],
  },
  {
    id: "fondant-chocolat",
    nom: "Fondant au chocolat",
    categorie: "Desserts",
    prixVente: 3.9,
    ingredients: [
      { stockItemId: "chocolat-noir", quantite: 0.2 },
      { stockItemId: "beurre-doux", quantite: 0.1 },
      { stockItemId: "oeufs", quantite: 3 },
      { stockItemId: "sucre", quantite: 0.08 },
      { stockItemId: "farine-t55", quantite: 0.05 },
    ],
  },
  {
    id: "tarte-fine-pommes-caramel",
    nom: "Tarte fine aux pommes & caramel",
    categorie: "Desserts",
    prixVente: 3.4,
    ingredients: [
      { stockItemId: "pate-feuilletee", quantite: 1 },
      { stockItemId: "pommes", quantite: 0.6 },
      { stockItemId: "sucre-creme-beurre-tarte", quantite: 1 },
    ],
  },
  {
    id: "panna-cotta-fruits-rouges",
    nom: "Panna cotta aux fruits rouges",
    categorie: "Desserts",
    prixVente: 4.2,
    ingredients: [
      { stockItemId: "creme-liquide", quantite: 0.4 },
      { stockItemId: "fruits-rouges-surgeles", quantite: 0.2 },
      { stockItemId: "gelatine-sucre-pannacotta", quantite: 1 },
    ],
  },
];

interface MenuState {
  items: MenuItem[];
  isLoading: boolean;

  loadMenu: () => Promise<void>;
  commanderPlat: (tableId: string, menuItemId: string, quantite: number) => { ok: true } | { ok: false; error: string };
  margeUnitaire: (menuItemId: string) => number | undefined;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  isLoading: false,

  loadMenu: async () => {
    set({ isLoading: true });
    try {
      const data = await api.get<MenuItem[]>("/menu-items");
      set({ items: data, isLoading: false });
    } catch {
      set({ items: MOCK_MENU_ITEMS, isLoading: false });
    }
  },

  commanderPlat: (tableId, menuItemId, quantite) => {
    const menuItem = get().items.find((candidate) => candidate.id === menuItemId);
    if (!menuItem) return { ok: false, error: "Plat introuvable" };

    const stock = useStockStore.getState();
    // Validation préalable de tous les ingrédients avant toute décrémentation, pour
    // ne pas laisser le stock à moitié décrémenté si un ingrédient venait à manquer.
    for (const ingredient of menuItem.ingredients) {
      const stockItem = stock.items.find((candidate) => candidate.id === ingredient.stockItemId);
      if (!stockItem || stockItem.quantiteActuelle < ingredient.quantite * quantite) {
        return { ok: false, error: `Stock insuffisant : ${stockItem?.nom ?? ingredient.stockItemId}` };
      }
    }

    useSalleStore.getState().addLignePlat(tableId, `${menuItem.nom}`, quantite);
    for (const ingredient of menuItem.ingredients) {
      stock.enregistrerMouvement(
        ingredient.stockItemId,
        "sortie",
        ingredient.quantite * quantite,
        `Commande table ${tableId} : ${menuItem.nom} ×${quantite}`
      );
    }
    return { ok: true };
  },

  margeUnitaire: (menuItemId) => {
    const menuItem = get().items.find((candidate) => candidate.id === menuItemId);
    if (!menuItem) return undefined;
    const stockItems = useStockStore.getState().items;
    let coutIngredients = 0;
    for (const ingredient of menuItem.ingredients) {
      const stockItem: StockItem | undefined = stockItems.find((candidate) => candidate.id === ingredient.stockItemId);
      if (!stockItem?.prixAchat) return undefined; // coût inconnu pour au moins un ingrédient → marge non calculable
      coutIngredients += stockItem.prixAchat * ingredient.quantite;
    }
    return menuItem.prixVente - coutIngredients;
  },
}));
