import type { FastifyInstance } from "fastify";
import { checkPermission, requirePermission } from "../permissions";
import type { StockAlert, StockItem, StockMovement, StockMovementType, UniteStock } from "@resto-plus/types";
import { items as menuItems } from "./menu";
import { journaliser } from "../audit";
import "../auth";
import { appartient, duRestaurant, restaurantDe, DEMO_RESTAURANT_ID } from "../tenant";

// Données mockées — Phase 1 (en mémoire, non branché sur Postgres/Supabase).
// Ingrédients du premier menu réel utilisé comme exemple (9 recettes, voir menu.ts).
export const items: StockItem[] = [
  { id: "potimarron", restaurantId: DEMO_RESTAURANT_ID, nom: "Potimarron", categorie: "Légumes", unite: "kg", quantiteActuelle: 8, seuilAlerte: 2, prixAchat: 2.5, updatedAt: new Date().toISOString() },
  { id: "chataignes-bocal", restaurantId: DEMO_RESTAURANT_ID, nom: "Châtaignes cuites (bocal)", categorie: "Épicerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 14, updatedAt: new Date().toISOString() },
  { id: "oignon", restaurantId: DEMO_RESTAURANT_ID, nom: "Oignon", categorie: "Légumes", unite: "kg", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 2, updatedAt: new Date().toISOString() },
  { id: "creme-liquide", restaurantId: DEMO_RESTAURANT_ID, nom: "Crème liquide", categorie: "Crémerie", unite: "l", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 4, updatedAt: new Date().toISOString() },
  { id: "beurre-doux", restaurantId: DEMO_RESTAURANT_ID, nom: "Beurre doux", categorie: "Crémerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 10, updatedAt: new Date().toISOString() },
  { id: "lentilles-vertes", restaurantId: DEMO_RESTAURANT_ID, nom: "Lentilles vertes", categorie: "Épicerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 3.6, updatedAt: new Date().toISOString() },
  { id: "buche-chevre", restaurantId: DEMO_RESTAURANT_ID, nom: "Bûche de chèvre", categorie: "Crémerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 12, updatedAt: new Date().toISOString() },
  { id: "pain-mie", restaurantId: DEMO_RESTAURANT_ID, nom: "Pain de mie", categorie: "Boulangerie", unite: "unite", quantiteActuelle: 6, seuilAlerte: 2, prixAchat: 0.4, updatedAt: new Date().toISOString() },
  { id: "vinaigrette-persil", restaurantId: DEMO_RESTAURANT_ID, nom: "Vinaigrette & persil", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 1.1, updatedAt: new Date().toISOString() },
  { id: "saumon", restaurantId: DEMO_RESTAURANT_ID, nom: "Saumon frais (pavé)", categorie: "Poissonnerie", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 25, updatedAt: new Date().toISOString() },
  { id: "avocat", restaurantId: DEMO_RESTAURANT_ID, nom: "Avocat", categorie: "Fruits & légumes", unite: "unite", quantiteActuelle: 10, seuilAlerte: 3, prixAchat: 0.9, updatedAt: new Date().toISOString() },
  { id: "citron-vert", restaurantId: DEMO_RESTAURANT_ID, nom: "Citron vert", categorie: "Fruits & légumes", unite: "unite", quantiteActuelle: 12, seuilAlerte: 4, prixAchat: 0.4, updatedAt: new Date().toISOString() },
  { id: "aneth-huile-baies", restaurantId: DEMO_RESTAURANT_ID, nom: "Aneth, huile d'olive, baies", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.6, updatedAt: new Date().toISOString() },
  { id: "filet-mignon-porc", restaurantId: DEMO_RESTAURANT_ID, nom: "Filet mignon de porc", categorie: "Boucherie", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 16, updatedAt: new Date().toISOString() },
  { id: "pommes-terre", restaurantId: DEMO_RESTAURANT_ID, nom: "Pommes de terre", categorie: "Légumes", unite: "kg", quantiteActuelle: 10, seuilAlerte: 2, prixAchat: 1.5, updatedAt: new Date().toISOString() },
  { id: "creme-fraiche-moutarde", restaurantId: DEMO_RESTAURANT_ID, nom: "Crème fraîche & moutarde", categorie: "Crémerie", unite: "l", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 4, updatedAt: new Date().toISOString() },
  { id: "cabillaud", restaurantId: DEMO_RESTAURANT_ID, nom: "Dos de cabillaud", categorie: "Poissonnerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 28, updatedAt: new Date().toISOString() },
  { id: "poireaux", restaurantId: DEMO_RESTAURANT_ID, nom: "Poireaux", categorie: "Légumes", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 3, updatedAt: new Date().toISOString() },
  { id: "chapelure", restaurantId: DEMO_RESTAURANT_ID, nom: "Chapelure", categorie: "Épicerie", unite: "kg", quantiteActuelle: 1, seuilAlerte: 0.3, prixAchat: 10, updatedAt: new Date().toISOString() },
  { id: "herbes-huile", restaurantId: DEMO_RESTAURANT_ID, nom: "Herbes fraîches & huile", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.5, updatedAt: new Date().toISOString() },
  { id: "riz-arborio", restaurantId: DEMO_RESTAURANT_ID, nom: "Riz arborio", categorie: "Épicerie", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 4, updatedAt: new Date().toISOString() },
  { id: "champignons-paris", restaurantId: DEMO_RESTAURANT_ID, nom: "Champignons de Paris", categorie: "Légumes", unite: "kg", quantiteActuelle: 3, seuilAlerte: 1, prixAchat: 4.5, updatedAt: new Date().toISOString() },
  { id: "vin-blanc-bouillon", restaurantId: DEMO_RESTAURANT_ID, nom: "Vin blanc sec & bouillon", categorie: "Épicerie", unite: "unite", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 0.8, updatedAt: new Date().toISOString() },
  { id: "parmesan", restaurantId: DEMO_RESTAURANT_ID, nom: "Parmesan AOP", categorie: "Crémerie", unite: "kg", quantiteActuelle: 1.5, seuilAlerte: 0.3, prixAchat: 26, updatedAt: new Date().toISOString() },
  { id: "chocolat-noir", restaurantId: DEMO_RESTAURANT_ID, nom: "Chocolat noir à pâtisser", categorie: "Épicerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 9, updatedAt: new Date().toISOString() },
  { id: "oeufs", restaurantId: DEMO_RESTAURANT_ID, nom: "Œufs", categorie: "Épicerie", unite: "unite", quantiteActuelle: 24, seuilAlerte: 6, prixAchat: 0.3, updatedAt: new Date().toISOString() },
  { id: "sucre", restaurantId: DEMO_RESTAURANT_ID, nom: "Sucre", categorie: "Épicerie", unite: "kg", quantiteActuelle: 4, seuilAlerte: 1, prixAchat: 1.3, updatedAt: new Date().toISOString() },
  { id: "farine-t55", restaurantId: DEMO_RESTAURANT_ID, nom: "Farine T55", categorie: "Épicerie", unite: "kg", quantiteActuelle: 18, seuilAlerte: 5, prixAchat: 1.1, updatedAt: new Date().toISOString() },
  { id: "pate-feuilletee", restaurantId: DEMO_RESTAURANT_ID, nom: "Pâte feuilletée pur beurre", categorie: "Boulangerie", unite: "unite", quantiteActuelle: 6, seuilAlerte: 2, prixAchat: 1.2, updatedAt: new Date().toISOString() },
  { id: "pommes", restaurantId: DEMO_RESTAURANT_ID, nom: "Pommes", categorie: "Fruits & légumes", unite: "kg", quantiteActuelle: 6, seuilAlerte: 1.5, prixAchat: 2.7, updatedAt: new Date().toISOString() },
  { id: "sucre-creme-beurre-tarte", restaurantId: DEMO_RESTAURANT_ID, nom: "Sucre, crème & beurre (tarte)", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.6, updatedAt: new Date().toISOString() },
  { id: "fruits-rouges-surgeles", restaurantId: DEMO_RESTAURANT_ID, nom: "Fruits rouges (surgelés)", categorie: "Épicerie", unite: "kg", quantiteActuelle: 2, seuilAlerte: 0.5, prixAchat: 11, updatedAt: new Date().toISOString() },
  { id: "gelatine-sucre-pannacotta", restaurantId: DEMO_RESTAURANT_ID, nom: "Gélatine & sucre (panna cotta)", categorie: "Épicerie", unite: "unite", quantiteActuelle: 5, seuilAlerte: 1, prixAchat: 0.4, updatedAt: new Date().toISOString() },
];

// Au démarrage, tout le stock mock est considéré comme confirmé (comptable).
for (const item of items) item.quantiteConfirmee = item.quantiteActuelle;

export const movements: StockMovement[] = [];
const alerts: StockAlert[] = [];

/**
 * Une réception est confirmée immédiatement (le cuisinier charge son stock seul) ;
 * toute baisse reste provisoire jusqu'à la validation du compte rendu cuisine.
 */
function statutInitial(type: StockMovementType, delta: number): StockMovement["statut"] {
  return type === "reception" || delta >= 0 ? "confirme" : "provisoire";
}

/**
 * Applique un mouvement de stock et déclenche une alerte "front-de-seuil" (front
 * montant → sous le seuil, ou rupture) — pas à chaque mouvement tant qu'on reste bas,
 * pour ne pas noyer le chef de cuisine sous des doublons.
 * Réutilisé par la commande de plats (menu.ts) pour la décrémentation automatique.
 */
export function applyStockMovement(
  itemId: string,
  type: StockMovementType,
  quantite: number,
  motif: string | undefined,
  actorId: string | undefined
): { item: StockItem; movement: StockMovement; alert?: StockAlert } | { error: string; status: number } {
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return { error: "Article introuvable", status: 404 };
  if (!Number.isFinite(quantite) || quantite < 0) return { error: "Quantité invalide", status: 400 };

  const quantiteAvant = item.quantiteActuelle;
  const quantiteApres =
    type === "reception" ? quantiteAvant + quantite : type === "ajustement" ? quantite : quantiteAvant - quantite; // sortie, perte

  if (quantiteApres < 0) return { error: "Quantité insuffisante en stock", status: 400 };

  const delta = quantiteApres - quantiteAvant;
  const statut = statutInitial(type, delta);
  item.quantiteActuelle = quantiteApres;
  if (statut === "confirme") item.quantiteConfirmee = (item.quantiteConfirmee ?? quantiteAvant) + delta;
  item.updatedAt = new Date().toISOString();

  const movement: StockMovement = {
    id: `mvt_${Date.now()}_${Math.round(Math.random() * 1000)}`,
    stockItemId: item.id,
    restaurantId: item.restaurantId,
    type,
    quantite,
    quantiteApres,
    delta,
    statut,
    motif,
    userId: actorId,
    timestamp: item.updatedAt,
  };
  movements.push(movement);

  let alert: StockAlert | undefined;
  const franchitSeuil = quantiteAvant > item.seuilAlerte && quantiteApres <= item.seuilAlerte;
  const franchitRupture = quantiteAvant > 0 && quantiteApres <= 0;
  if (franchitSeuil || franchitRupture) {
    alert = {
      id: `alrt_${Date.now()}`,
      stockItemId: item.id,
      stockItemNom: item.nom,
      restaurantId: item.restaurantId,
      niveau: franchitRupture ? "rupture" : "bas",
      message: franchitRupture
        ? `Rupture de stock : ${item.nom}`
        : `Stock bas : ${item.nom} (${quantiteApres} ${item.unite}, seuil ${item.seuilAlerte} ${item.unite})`,
      createdAt: movement.timestamp,
      read: false,
    };
    alerts.push(alert);
  }

  return { item, movement, alert };
}

/** Confirme un mouvement provisoire : il entre dans le stock comptable. */
export function confirmerMouvement(movement: StockMovement) {
  if (movement.statut !== "provisoire") return;
  const item = items.find((candidate) => candidate.id === movement.stockItemId);
  if (item) item.quantiteConfirmee = (item.quantiteConfirmee ?? 0) + (movement.delta ?? 0);
  movement.statut = "confirme";
}

export async function stockRoutes(app: FastifyInstance) {
  // GET /stock-items
  app.get("/stock-items", async (req) => {
    const restaurantId = restaurantDe(req);
    return items.filter((item) => item.restaurantId === restaurantId);
  });

  // POST /stock-items — crée un nouvel article
  app.post<{ Body: { nom: string; categorie?: string; unite: UniteStock; seuilAlerte?: number; prixAchat?: number } }>(
    "/stock-items", { preHandler: requirePermission("stock.entree") },
    async (req, reply) => {
      if (!req.body.nom?.trim()) {
        return reply.status(400).send({ error: "Le nom est obligatoire" });
      }
      const item: StockItem = {
        id: `stk_${Date.now()}`,
        restaurantId: restaurantDe(req),
        nom: req.body.nom.trim(),
        categorie: req.body.categorie,
        unite: req.body.unite,
        quantiteActuelle: 0,
        quantiteConfirmee: 0,
        seuilAlerte: req.body.seuilAlerte ?? 0,
        prixAchat: req.body.prixAchat,
        updatedAt: new Date().toISOString(),
      };
      items.push(item);
      journaliser(req, "stock.article_cree", {
        cible: { type: "article", id: item.id, libelle: item.nom },
        apres: { unite: item.unite, seuilAlerte: item.seuilAlerte, prixAchat: item.prixAchat ?? null },
      });
      return reply.status(201).send(item);
    }
  );

  // POST /stock-items/:id/movements — enregistre un mouvement (réception, sortie, perte, ajustement)
  // Réception : N1+ ; toute baisse : N2 (chef de cuisine), et reste provisoire jusqu'au compte rendu.
  app.post<{ Params: { id: string }; Body: { type: StockMovementType; quantite: number; motif?: string } }>(
    "/stock-items/:id/movements",
    async (req, reply) => {
      if (!checkPermission(req, reply, req.body.type === "reception" ? "stock.entree" : "stock.sortie")) return;
      if (!appartient(items.find((item) => item.id === req.params.id), req)) return reply.status(404).send({ error: "Article introuvable" });
      const result = applyStockMovement(req.params.id, req.body.type, req.body.quantite, req.body.motif, req.auth?.userId);
      if ("error" in result) return reply.status(result.status).send({ error: result.error });
      const { movement } = result;
      journaliser(req, "stock.mouvement", {
        cible: { type: "article", id: result.item.id, libelle: result.item.nom },
        avant: movement.quantiteApres - (movement.delta ?? 0),
        apres: movement.quantiteApres,
        details: { mouvementId: movement.id, type: movement.type, quantite: movement.quantite, statut: movement.statut ?? null, motif: movement.motif ?? null },
      });
      return reply.status(201).send(result.movement);
    }
  );

  // DELETE /stock-items/:id — retirer un article du stock (N2)
  app.delete<{ Params: { id: string } }>("/stock-items/:id", { preHandler: requirePermission("stock.sortie") }, async (req, reply) => {
    const index = items.findIndex((item) => item.id === req.params.id);
    if (index === -1 || !appartient(items[index], req)) return reply.status(404).send({ error: "Article introuvable" });
    if (movements.some((movement) => movement.stockItemId === req.params.id && movement.statut === "provisoire")) {
      return reply.status(409).send({ error: "Des sorties de cet article attendent la validation du compte rendu cuisine." });
    }
    const plat = menuItems.find((menuItem) => menuItem.ingredients.some((ingredient) => ingredient.stockItemId === req.params.id));
    if (plat) {
      return reply.status(409).send({ error: `Article utilisé dans le plat « ${plat.nom} » : retire-le de la carte d'abord.` });
    }
    const [retire] = items.splice(index, 1);
    journaliser(req, "stock.article_supprime", {
      cible: { type: "article", id: retire.id, libelle: retire.nom },
      avant: { quantite: retire.quantiteActuelle, quantiteValidee: retire.quantiteConfirmee ?? null, unite: retire.unite },
    });
    return { id: req.params.id, deleted: true };
  });

  // POST /stock-movements/:id/annuler — le chef de cuisine conteste une sortie provisoire
  app.post<{ Params: { id: string } }>("/stock-movements/:id/annuler", { preHandler: requirePermission("stock.sortie") }, async (req, reply) => {
    const movement = movements.find((candidate) => candidate.id === req.params.id);
    if (!movement || !appartient(movement, req)) return reply.status(404).send({ error: "Mouvement introuvable" });
    if (movement.statut !== "provisoire") return reply.status(409).send({ error: "Seul un mouvement en attente de validation peut être annulé." });
    const item = items.find((candidate) => candidate.id === movement.stockItemId);
    if (item) {
      item.quantiteActuelle = Math.max(0, item.quantiteActuelle - (movement.delta ?? 0));
      item.updatedAt = new Date().toISOString();
    }
    movement.statut = "annule";
    journaliser(req, "stock.mouvement_annule", {
      cible: { type: "article", id: movement.stockItemId, libelle: item?.nom },
      avant: "provisoire",
      apres: "annule",
      details: { mouvementId: movement.id, type: movement.type, quantite: movement.quantite, stockRetabli: item?.quantiteActuelle ?? null },
    });
    return movement;
  });

  // GET /stock-items/:id/movements — historique d'un article
  app.get<{ Params: { id: string } }>("/stock-items/:id/movements", async (req) => {
    return duRestaurant(movements, req)
      .filter((movement) => movement.stockItemId === req.params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  });

  // GET /stock-alerts — alertes de seuil pour le chef de cuisine / la direction (N2+)
  app.get("/stock-alerts", async (req) => {
    const restaurantId = restaurantDe(req);
    return alerts.filter((alert) => alert.restaurantId === restaurantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  // POST /stock-alerts/:id/read — marque une alerte comme lue
  app.post<{ Params: { id: string } }>("/stock-alerts/:id/read", async (req, reply) => {
    const alert = alerts.find((candidate) => candidate.id === req.params.id);
    if (!alert || !appartient(alert, req)) return reply.status(404).send({ error: "Alerte introuvable" });
    alert.read = true;
    return alert;
  });
}
