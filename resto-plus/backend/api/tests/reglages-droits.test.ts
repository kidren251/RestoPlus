/**
 * Droits du service réglables par établissement depuis la console N4.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { can, niveauMinimum, validerReglagesDroits } from "@resto-plus/types";
import { appel, identite, nouvelleApp } from "./helpers";
import { DEMO_RESTAURANT_ID } from "../src/tenant";

const serveur = identite(null, "comptesalle-0", "serveur", "salle");
const chefRang = identite(null, "comptesalle-1", "chef_rang", "salle");
const directeur = identite(null, "comptesalle-3", "directeur_admin", "direction");
const url = `/platform/restaurants/${DEMO_RESTAURANT_ID}/reglages-droits`;
let app: FastifyInstance;

beforeAll(async () => {
  app = await nouvelleApp();
});

describe("règle partagée", () => {
  it("un réglage remplace le niveau par défaut d'un droit réglable", () => {
    expect(can({ accessRole: "serveur", pole: "salle" }, "service.installer")).toBe(true);
    expect(can({ accessRole: "serveur", pole: "salle" }, "service.installer", { "service.installer": 1 })).toBe(false);
    expect(niveauMinimum("service.addition", { "service.addition": 0 })).toBe(0);
  });

  it("un réglage ne change jamais les pôles", () => {
    expect(can({ accessRole: "directeur_admin", pole: "cuisine" }, "service.installer", { "service.installer": 0 })).toBe(false);
  });

  it("validation : droits sensibles et niveaux hors 0-3 refusés", () => {
    expect(validerReglagesDroits({ "service.installer": 1 })).toEqual({ "service.installer": 1 });
    expect(validerReglagesDroits({ "audit.consulter": 0 })).toBeNull();
    expect(validerReglagesDroits({ "stock.sortie": 0 })).toBeNull();
    expect(validerReglagesDroits({ "service.installer": 5 })).toBeNull();
    expect(validerReglagesDroits(["service.installer"])).toBeNull();
  });
});

describe("console N4 → API", () => {
  it("par défaut, un serveur (N0) installe des clients", async () => {
    expect((await appel(app, "POST", "/tables/t5/installer", serveur, { couverts: 2 })).status).toBe(201);
  });

  it("le N4 réserve l'installation aux N1 : le serveur est refusé, le chef de rang passe", async () => {
    const { status } = await appel(app, "PUT", url, {}, { reglages: { "service.installer": 1 } });
    expect(status).toBe(200);
    expect((await appel(app, "POST", "/tables/t6/installer", serveur, { couverts: 2 })).status).toBe(403);
    expect((await appel(app, "POST", "/tables/t6/installer", chefRang, { couverts: 2 })).status).toBe(201);
  });

  it("l'app lit les réglages de son établissement", async () => {
    expect((await appel(app, "GET", "/restaurant/reglages-droits", serveur)).json.reglages).toEqual({ "service.installer": 1 });
  });

  it("un réglage invalide est refusé en bloc (400) et rien ne change", async () => {
    expect((await appel(app, "PUT", url, {}, { reglages: { "service.installer": 0, "audit.consulter": 0 } })).status).toBe(400);
    expect((await appel(app, "GET", url, {})).json.reglages).toEqual({ "service.installer": 1 });
  });

  it("la modification est inscrite au journal d'audit", async () => {
    const { json } = await appel(app, "GET", "/audit", directeur);
    expect(json.evenements.some((e: { action: string }) => e.action === "droits.reglages_modifies")).toBe(true);
  });

  it("établissement inconnu : 404", async () => {
    expect((await appel(app, "PUT", "/platform/restaurants/inconnu/reglages-droits", {}, { reglages: {} })).status).toBe(404);
  });
});
