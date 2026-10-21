/**
 * Checklists HACCP : plan par établissement (inspiré du GBPH), relevés qui font foi
 * (heure du téléphone, jamais en double, refaits sans effacer), seuils et conformité
 * calculée par l'API, édition du plan (N2 cuisine), droits, isolation.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { estConforme, libelleSeuil, valeurNumerique, type Checklist, type ChecklistItem } from "@resto-plus/types";
import { appel, identite, nouvelleApp } from "./helpers";

const commis = identite(null, "comptecuisin-0", "serveur", "cuisine");
const chefPartie = identite(null, "comptecuisin-1", "chef_rang", "cuisine");
const chefCuisine = identite(null, "comptecuisin-2", "manager_admin", "cuisine");
const managerSalle = identite(null, "comptesalle-2", "manager_admin", "salle");
const serveurSalle = identite(null, "comptesalle-0", "serveur", "salle");
const directeur = identite(null, "comptesalle-3", "directeur_admin", "direction");
const autreResto = identite("resto-b", "b-commis", "serveur", "cuisine");
let app: FastifyInstance;
let plan: Checklist[];

/** Point du plan par le début de son libellé (plan de démo : backend/db/plan-haccp-demo.json). */
function point(libelle: string): { checklist: Checklist; item: ChecklistItem } {
  for (const checklist of plan) {
    const item = checklist.items.find((i) => i.label.startsWith(libelle));
    if (item) return { checklist, item };
  }
  throw new Error(`Point introuvable : ${libelle}`);
}

const releve = (libelle: string, valeur?: string | number, extra: Record<string, unknown> = {}) => {
  const { checklist, item } = point(libelle);
  return { id: randomUUID(), checklistId: checklist.id, itemId: item.id, valeur, timestamp: new Date().toISOString(), ...extra };
};

beforeAll(async () => {
  app = await nouvelleApp();
  plan = (await appel(app, "GET", "/checklists", commis)).json;
});

describe("règles de seuil partagées", () => {
  it("lit les valeurs saisies au téléphone", () => {
    expect(valeurNumerique("3,5")).toBe(3.5);
    expect(valeurNumerique("3.5 °C")).toBe(3.5);
    expect(valeurNumerique("-18")).toBe(-18);
    expect(valeurNumerique("ok")).toBeUndefined();
  });

  it("conformité et rappel du seuil", () => {
    expect(estConforme({ seuilMin: 0, seuilMax: 4 }, "6")).toBe(false);
    expect(estConforme({ seuilMin: 0, seuilMax: 4 }, "3,8")).toBe(true);
    expect(estConforme({ seuilMin: 63 }, "58")).toBe(false);
    expect(estConforme({}, "12")).toBeUndefined();
    expect(libelleSeuil({ seuilMin: 0, seuilMax: 4, unite: "°C" })).toBe("0 à 4 °C");
    expect(libelleSeuil({ seuilMax: -18, unite: "°C" })).toBe("≤ -18 °C");
    expect(libelleSeuil({ seuilMin: 63, unite: "°C" })).toBe("≥ 63 °C");
  });
});

describe("plan HACCP de démo (structure GBPH)", () => {
  it("5 checklists, dans l'ordre", () => {
    expect(plan.map((c) => c.type)).toEqual([
      "Réception des marchandises",
      "Ouverture cuisine",
      "Températures pendant le service",
      "Fermeture cuisine",
      "Contrôles hebdomadaires",
    ]);
  });

  it("les points chiffrés ont leurs seuils et leur unité", () => {
    expect(point("Température chambre froide positive").item).toMatchObject({ seuilMin: 0, seuilMax: 4, unite: "°C" });
    expect(point("Maintien au chaud").item).toMatchObject({ seuilMin: 63 });
    expect(point("Huile de friture").item).toMatchObject({ seuilMax: 24, unite: "%" });
  });

  it("un autre établissement ne voit pas ce plan", async () => {
    expect((await appel(app, "GET", "/checklists", autreResto)).json).toEqual([]);
  });
});

describe("relevés", () => {
  it("frigo à 6 °C : non conforme, décidé par l'API même si l'app dit le contraire", async () => {
    const { status, json } = await appel(app, "POST", "/checklist-entries", commis, releve("Température chambre froide positive", "6", { conforme: true }));
    expect(status).toBe(201);
    expect(json.conforme).toBe(false);
    // Copie du point au moment du relevé.
    expect(json).toMatchObject({ libelle: "Température chambre froide positive", seuilMin: 0, seuilMax: 4, unite: "°C" });
  });

  it("frigo à 3,5 °C : conforme", async () => {
    const { json } = await appel(app, "POST", "/checklist-entries", commis, releve("Température réfrigérateurs des postes", "3,5"));
    expect(json.conforme).toBe(true);
  });

  it("point sans seuil : la conformité déclarée est gardée", async () => {
    const { json } = await appel(app, "POST", "/checklist-entries", commis, releve("Emballages intacts", undefined, { conforme: false }));
    expect(json.conforme).toBe(false);
  });

  it("un relevé fait hors ligne garde l'heure du téléphone", async () => {
    const heure = new Date(Date.now() - 30 * 60_000).toISOString();
    const { json } = await appel(app, "POST", "/checklist-entries", commis, releve("Maintien au chaud", 65, { timestamp: heure }));
    expect(json.releveAt).toBe(heure);
    expect(json.valeur).toBe("65");
  });

  it("le même relevé renvoyé deux fois (file hors ligne) n'est gardé qu'une fois", async () => {
    const unique = releve("DLC des produits entamés");
    await appel(app, "POST", "/checklist-entries", commis, unique);
    await appel(app, "POST", "/checklist-entries", commis, unique);
    const { json } = await appel(app, "GET", "/checklist-entries", commis);
    expect(json.filter((r: { id: string }) => r.id === unique.id)).toHaveLength(1);
  });

  it("refaire un relevé en ajoute un nouveau : les deux restent dans l'historique", async () => {
    const libelle = "Température congélateur";
    await appel(app, "POST", "/checklist-entries", commis, releve(libelle, "-12"));
    await appel(app, "POST", "/checklist-entries", commis, releve(libelle, "-19"));
    const { json } = await appel(app, "GET", "/checklist-entries", commis);
    const releves = json.filter((r: { itemId: string }) => r.itemId === point(libelle).item.id);
    expect(releves.map((r: { valeur: string; conforme: boolean }) => [r.valeur, r.conforme])).toEqual([["-12", false], ["-19", true]]);
  });

  it("une heure dans le futur est ramenée à maintenant", async () => {
    const futur = new Date(Date.now() + 3 * 3600_000).toISOString();
    const { json } = await appel(app, "POST", "/checklist-entries", commis, releve("Tenue propre", undefined, { timestamp: futur }));
    expect(Date.parse(json.releveAt)).toBeLessThanOrEqual(Date.now());
  });

  it("point inconnu ou d'une autre checklist : 404", async () => {
    const reception = point("Emballages intacts");
    const ouverture = point("Tenue propre");
    expect((await appel(app, "POST", "/checklist-entries", commis, { checklistId: reception.checklist.id, itemId: ouverture.item.id })).status).toBe(404);
    expect((await appel(app, "POST", "/checklist-entries", commis, { checklistId: "cl-x", itemId: ouverture.item.id })).status).toBe(404);
  });

  it("un serveur de salle ne remplit pas le HACCP (403)", async () => {
    expect((await appel(app, "POST", "/checklist-entries", serveurSalle, releve("Tenue propre"))).status).toBe(403);
  });

  it("le relevé est inscrit au journal d'audit (catégorie HACCP)", async () => {
    const { json } = await appel(app, "GET", "/audit", directeur);
    expect(json.evenements.some((e: { action: string; categorie: string }) => e.action === "haccp.checklist" && e.categorie === "haccp")).toBe(true);
  });
});

describe("édition du plan HACCP", () => {
  let checklistId: string;
  let pointId: string;

  it("seuls le chef de cuisine (N2) et le directeur modifient le plan", async () => {
    const corps = { nom: "Bar", frequence: "ouverture" };
    expect((await appel(app, "POST", "/checklists", commis, corps)).status).toBe(403);
    expect((await appel(app, "POST", "/checklists", chefPartie, corps)).status).toBe(403);
    expect((await appel(app, "POST", "/checklists", managerSalle, corps)).status).toBe(403);
    const { status, json } = await appel(app, "POST", "/checklists", chefCuisine, corps);
    expect(status).toBe(201);
    checklistId = json.id;
  });

  it("ajoute un point chiffré avec seuils", async () => {
    const corps = { label: "Température arrière-bar", requiertValeur: true, seuilMin: 0, seuilMax: 6, unite: "°C" };
    const { status, json } = await appel(app, "POST", `/checklists/${checklistId}/items`, chefCuisine, corps);
    expect(status).toBe(201);
    pointId = json.id;
    const { json: releveFait } = await appel(app, "POST", "/checklist-entries", commis, { checklistId, itemId: pointId, valeur: "5" });
    expect(releveFait.conforme).toBe(true);
  });

  it("changer le seuil : les anciens relevés gardent leur copie", async () => {
    expect((await appel(app, "PUT", `/checklist-items/${pointId}`, directeur, { seuilMax: 4 })).status).toBe(200);
    const { json } = await appel(app, "POST", "/checklist-entries", commis, { checklistId, itemId: pointId, valeur: "5" });
    expect(json.conforme).toBe(false);
    const historique = (await appel(app, "GET", "/checklist-entries", commis)).json.filter((r: { itemId: string }) => r.itemId === pointId);
    expect(historique.map((r: { seuilMax: number }) => r.seuilMax)).toEqual([6, 4]);
  });

  it("saisies invalides refusées (400)", async () => {
    const url = `/checklists/${checklistId}/items`;
    expect((await appel(app, "POST", url, chefCuisine, { label: "" })).status).toBe(400);
    expect((await appel(app, "POST", url, chefCuisine, { label: "X", requiertValeur: true, seuilMin: 5, seuilMax: 2 })).status).toBe(400);
    expect((await appel(app, "POST", url, chefCuisine, { label: "Sans valeur", seuilMax: 4 })).status).toBe(400);
    expect((await appel(app, "POST", "/checklists", chefCuisine, { nom: "X", frequence: "mensuelle" })).status).toBe(400);
  });

  it("retirer un point : il disparaît du plan, mais ses relevés restent", async () => {
    expect((await appel(app, "PUT", `/checklist-items/${pointId}`, chefCuisine, { actif: false })).status).toBe(200);
    const bar = (await appel(app, "GET", "/checklists", commis)).json.find((c: Checklist) => c.id === checklistId);
    expect(bar.items).toEqual([]);
    expect((await appel(app, "POST", "/checklist-entries", commis, { checklistId, itemId: pointId, valeur: "3" })).status).toBe(404);
    const historique = (await appel(app, "GET", "/checklist-entries", commis)).json.filter((r: { itemId: string }) => r.itemId === pointId);
    expect(historique).toHaveLength(2);
  });

  it("retirer une checklist : elle disparaît du plan", async () => {
    expect((await appel(app, "PUT", `/checklists/${checklistId}`, chefCuisine, { actif: false })).status).toBe(200);
    expect((await appel(app, "GET", "/checklists", commis)).json.some((c: Checklist) => c.id === checklistId)).toBe(false);
  });

  it("un autre établissement ne peut pas modifier ce plan (404)", async () => {
    const chefB = identite("resto-b", "b-chef", "manager_admin", "cuisine");
    expect((await appel(app, "PUT", `/checklist-items/${point("Maintien au chaud").item.id}`, chefB, { seuilMin: 0 })).status).toBe(404);
  });

  it("chaque modification est inscrite au journal d'audit", async () => {
    const { json } = await appel(app, "GET", "/audit", directeur);
    expect(json.evenements.filter((e: { action: string }) => e.action === "haccp.plan_modifie").length).toBeGreaterThanOrEqual(4);
  });
});
