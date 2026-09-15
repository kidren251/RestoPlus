import type { FastifyInstance } from "fastify";
import type { MenuItem, MenuItemIngredient } from "@resto-plus/types";
import { applyStockMovement, items as stockItems } from "./stock";
import "../auth";

const DEMO_RESTAURANT_ID = "demo-restaurant";

// Données mockées — Phase 1. Premier menu réel utilisé comme exemple (9 recettes).
// Lien plat ↔ ingrédients : base de la décrémentation automatique du stock à la
// commande et, avec prixVente ici + prixAchat sur chaque StockItem lié, de
// l'équation prix/marge.
const items: MenuItem[] = [
  {
    id: "veloute-potimarron-chataigne",
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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
    restaurantId: DEMO_RESTAURANT_ID,
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

function hasWriteAccess(role: string | undefined): boolean {
  return !role || role !== "serveur";
}

export async function menuRoutes(app: FastifyInstance) {
  // GET /menu-items
  app.get("/menu-items", async (req) => {
    const restaurantId = req.auth?.restaurantId ?? DEMO_RESTAURANT_ID;
    return items.filter((item) => item.restaurantId === restaurantId);
  });

  // POST /menu-items — crée un plat et son lien vers les ingrédients de stock
  app.post<{ Body: { nom: string; categorie?: string; prixVente: number; ingredients: MenuItemIngredient[] } }>(
    "/menu-items",
    async (req, reply) => {
      if (!hasWriteAccess(req.auth?.accessRole)) {
        return reply.status(403).send({ error: "ACCESS_LEVEL_INSUFFICIENT" });
      }
      if (!req.body.nom?.trim()) {
        return reply.status(400).send({ error: "Le nom est obligatoire" });
      }
      const item: MenuItem = {
        id: `menu_${Date.now()}`,
        restaurantId: req.auth?.restaurantId ?? DEMO_RESTAURANT_ID,
        nom: req.body.nom.trim(),
        categorie: req.body.categorie,
        prixVente: req.body.prixVente,
        ingredients: req.body.ingredients ?? [],
      };
      items.push(item);
      return reply.status(201).send(item);
    }
  );

  // POST /menu-items/:id/order — un serveur commande ce plat : décrémente chaque
  // ingrédient lié dans le stock et remonte les alertes de seuil déclenchées.
  app.post<{ Params: { id: string }; Body: { tableId: string; quantite: number } }>(
    "/menu-items/:id/order",
    async (req, reply) => {
      const item = items.find((candidate) => candidate.id === req.params.id);
      if (!item) return reply.status(404).send({ error: "Plat introuvable" });

      const quantite = req.body.quantite ?? 1;
      if (!Number.isFinite(quantite) || quantite <= 0) {
        return reply.status(400).send({ error: "Quantité invalide" });
      }

      // Validation préalable de tous les ingrédients avant toute décrémentation :
      // évite un stock partiellement décrémenté si un ingrédient venait à manquer en cours de route.
      for (const ingredient of item.ingredients) {
        const stockItem = stockItems.find((candidate) => candidate.id === ingredient.stockItemId);
        if (!stockItem) return reply.status(404).send({ error: `Ingrédient introuvable (${ingredient.stockItemId})` });
        if (stockItem.quantiteActuelle < ingredient.quantite * quantite) {
          return reply.status(400).send({ error: `Stock insuffisant : ${stockItem.nom}` });
        }
      }

      const movements = [];
      const alerts = [];
      for (const ingredient of item.ingredients) {
        const result = applyStockMovement(
          ingredient.stockItemId,
          "sortie",
          ingredient.quantite * quantite,
          `Commande table ${req.body.tableId} : ${item.nom} ×${quantite}`,
          req.auth?.userId
        );
        if ("error" in result) {
          return reply.status(result.status).send({ error: `${item.nom} : ${result.error}` });
        }
        movements.push(result.movement);
        if (result.alert) alerts.push(result.alert);
      }

      return reply.status(201).send({ menuItemId: item.id, tableId: req.body.tableId, quantite, movements, alerts });
    }
  );
}
