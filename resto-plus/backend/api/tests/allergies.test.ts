/**
 * Allergies (donnée de santé) : portées par le repas, jamais par la fiche client,
 * acceptées seulement si le client les a signalées, effacées à l'addition.
 * Voir docs/rgpd.md et la migration 0015.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { appel, identite, nouvelleApp } from "./helpers";

const chefRang = identite(null, "comptesalle-1", "chef_rang", "salle");
let app: FastifyInstance;

async function serviceDeLaTable(tableId: string) {
  const { json } = await appel(app, "GET", "/salles/salle-1", chefRang);
  return json.tables.find((t: { id: string }) => t.id === tableId)?.serviceState;
}

beforeAll(async () => {
  app = await nouvelleApp();
});

describe("allergies du repas", () => {
  const repas = { tableId: "t1", course: "entree", dishStatus: "aucun", clientName: "Mme Test" };

  it("refusées si le client ne les a pas signalées", async () => {
    const { status } = await appel(app, "PUT", "/tables/t1/service", chefRang, { ...repas, allergenes: ["gluten"] });
    expect(status).toBe(400);
  });

  it("acceptées quand le client les a signalées", async () => {
    const corps = { ...repas, allergenes: ["gluten"], allergenesSignalesAt: new Date().toISOString() };
    expect((await appel(app, "PUT", "/tables/t1/service", chefRang, corps)).status).toBe(200);
    expect((await serviceDeLaTable("t1")).allergenes).toEqual(["gluten"]);
  });

  it("effacées à l'envoi de l'addition", async () => {
    const addition = await appel(app, "PUT", "/tables/t1/bill", chefRang, { tableId: "t1", occurredAt: new Date().toISOString() });
    expect(addition.status).toBe(200);
    const service = await serviceDeLaTable("t1");
    expect(service.allergenes).toBeUndefined();
    expect(service.allergenesSignalesAt).toBeUndefined();
    expect(service.clientName).toBe("Mme Test");
  });

  it("jamais sur la fiche client", async () => {
    const { json } = await appel(app, "GET", "/clients", chefRang);
    expect(json.length).toBeGreaterThan(0);
    for (const client of json) expect(client).not.toHaveProperty("allergies");
  });
});
