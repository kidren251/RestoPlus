/**
 * Checklists HACCP : plan par établissement, relevés qui font foi (heure du téléphone,
 * jamais en double), droits (cuisine), isolation.
 */
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { appel, identite, nouvelleApp } from "./helpers";

const commis = identite(null, "comptecuisin-0", "serveur", "cuisine");
const serveurSalle = identite(null, "comptesalle-0", "serveur", "salle");
const autreResto = identite("resto-b", "b-commis", "serveur", "cuisine");
let app: FastifyInstance;

beforeAll(async () => {
  app = await nouvelleApp();
});

describe("checklists HACCP", () => {
  it("le plan HACCP de l'établissement est servi dans l'ordre", async () => {
    const { json } = await appel(app, "GET", "/checklists", commis);
    expect(json.map((c: { type: string }) => c.type)).toEqual(["Ouverture cuisine", "Fermeture cuisine", "Contrôle 4h"]);
    expect(json[0].items[0].requiertValeur).toBe(true);
  });

  it("un autre établissement ne voit pas ce plan", async () => {
    expect((await appel(app, "GET", "/checklists", autreResto)).json).toEqual([]);
  });

  it("un commis enregistre un relevé de température, avec l'heure du téléphone", async () => {
    const heure = new Date(Date.now() - 30 * 60_000).toISOString(); // fait hors ligne il y a 30 min
    const { status, json } = await appel(app, "POST", "/checklist-entries", commis, { id: randomUUID(), checklistId: "cl-ouverture", itemId: "i1", valeur: 3.5, conforme: true, timestamp: heure });
    expect(status).toBe(201);
    expect(json.valeur).toBe("3.5");
    expect(json.releveAt).toBe(heure);
  });

  it("le même relevé renvoyé deux fois (file hors ligne) n'est gardé qu'une fois", async () => {
    const id = randomUUID();
    const releve = { id, checklistId: "cl-ouverture", itemId: "i2", timestamp: new Date().toISOString() };
    await appel(app, "POST", "/checklist-entries", commis, releve);
    await appel(app, "POST", "/checklist-entries", commis, releve);
    const { json } = await appel(app, "GET", "/checklist-entries", commis);
    expect(json.filter((r: { id: string }) => r.id === id)).toHaveLength(1);
  });

  it("une heure dans le futur est ramenée à maintenant", async () => {
    const futur = new Date(Date.now() + 3 * 3600_000).toISOString();
    const { json } = await appel(app, "POST", "/checklist-entries", commis, { checklistId: "cl-4h", itemId: "i11", timestamp: futur });
    expect(Date.parse(json.releveAt)).toBeLessThanOrEqual(Date.now());
  });

  it("l'app retrouve les relevés du jour", async () => {
    const { json } = await appel(app, "GET", "/checklist-entries", commis);
    expect(json.map((r: { itemId: string }) => r.itemId)).toEqual(expect.arrayContaining(["i1", "i2", "i11"]));
  });

  it("point de contrôle inconnu ou d'une autre checklist : 404", async () => {
    expect((await appel(app, "POST", "/checklist-entries", commis, { checklistId: "cl-ouverture", itemId: "i10" })).status).toBe(404);
    expect((await appel(app, "POST", "/checklist-entries", commis, { checklistId: "cl-x", itemId: "i1" })).status).toBe(404);
  });

  it("un serveur de salle ne remplit pas le HACCP (403)", async () => {
    expect((await appel(app, "POST", "/checklist-entries", serveurSalle, { checklistId: "cl-ouverture", itemId: "i1" })).status).toBe(403);
  });

  it("le relevé est inscrit au journal d'audit (catégorie HACCP)", async () => {
    const directeur = identite(null, "comptesalle-3", "directeur_admin", "direction");
    const { json } = await appel(app, "GET", "/audit", directeur);
    expect(json.evenements.some((e: { action: string; categorie: string }) => e.action === "haccp.checklist" && e.categorie === "haccp")).toBe(true);
  });
});
