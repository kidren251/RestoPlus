import type { FastifyInstance } from "fastify";
import { requirePermission } from "../permissions";
import type { MenuItem, MenuItemIngredient } from "@resto-plus/types";
import { applyStockMovement, items as stockItems } from "./stock";
import { journalCommandes } from "./tableState";
import { journaliser } from "../audit";
import "../auth";
import { appartient, restaurantDe, DEMO_RESTAURANT_ID } from "../tenant";

// Données mockées — Phase 1. Premier menu réel utilisé comme exemple (9 recettes).
// Lien plat ↔ ingrédients : base de la décrémentation automatique du stock à la
// commande et, avec prixVente ici + prixAchat sur chaque StockItem lié, de
// l'équation prix/marge.
export const items: MenuItem[] = [
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

export async function menuRoutes(app: FastifyInstance) {
  // GET /menu-items
  app.get("/menu-items", async (req) => {
    const restaurantId = restaurantDe(req);
    return items.filter((item) => item.restaurantId === restaurantId);
  });

  // POST /menu-items — crée un plat et son lien vers les ingrédients de stock
  app.post<{ Body: { nom: string; categorie?: string; prixVente: number; ingredients: MenuItemIngredient[] } }>(
    "/menu-items", { preHandler: requirePermission("carte.gerer") },
    async (req, reply) => {
      if (!req.body.nom?.trim()) {
        return reply.status(400).send({ error: "Le nom est obligatoire" });
      }
      // Un plat ne peut être relié qu'aux ingrédients du stock de son propre restaurant.
      const restaurantId = restaurantDe(req);
      const etranger = (req.body.ingredients ?? []).find(
        (ingredient) => stockItems.find((stockItem) => stockItem.id === ingredient.stockItemId)?.restaurantId !== restaurantId
      );
      if (etranger) return reply.status(400).send({ error: `Ingrédient introuvable (${etranger.stockItemId})` });
      const item: MenuItem = {
        id: `menu_${Date.now()}`,
        restaurantId: restaurantDe(req),
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
    "/menu-items/:id/order", { preHandler: requirePermission("service.commander") },
    async (req, reply) => {
      const item = items.find((candidate) => candidate.id === req.params.id);
      if (!item || !appartient(item, req)) return reply.status(404).send({ error: "Plat introuvable" });

      const quantite = req.body.quantite ?? 1;
      if (!Number.isFinite(quantite) || quantite <= 0) {
        return reply.status(400).send({ error: "Quantité invalide" });
      }

      // Validation préalable de tous les ingrédients avant toute décrémentation :
      // évite un stock partiellement décrémenté si un ingrédient venait à manquer en cours de route.
      for (const ingredient of item.ingredients) {
        const stockItem = stockItems.find((candidate) => candidate.id === ingredient.stockItemId);
        // Un plat ne décrémente que le stock de son propre restaurant.
        if (!stockItem || stockItem.restaurantId !== item.restaurantId) return reply.status(404).send({ error: `Ingrédient introuvable (${ingredient.stockItemId})` });
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

      journalCommandes.push({ menuItemId: item.id, nom: item.nom, prixVente: item.prixVente, quantite, tableId: req.body.tableId, restaurantId: item.restaurantId ?? restaurantDe(req), at: new Date().toISOString() });
      journaliser(req, "commande.plat", {
        cible: { type: "plat", id: item.id, libelle: item.nom },
        details: {
          table: req.body.tableId,
          quantite,
          prixVente: item.prixVente,
          sortiesStock: movements.map((movement) => movement.id).join(","),
        },
      });
      return reply.status(201).send({ menuItemId: item.id, tableId: req.body.tableId, quantite, movements, alerts });
    }
  );
}
