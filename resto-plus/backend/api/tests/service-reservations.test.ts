/**
 * Réservations et gestes du service : installer des clients (réservation ou walk-in),
 * changer de table, addition, annulation. Décisions du 21/10/2026.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { Reservation } from "@resto-plus/types";
import { appel, identite, nouvelleApp } from "./helpers";

const serveur = identite(null, "comptesalle-0", "serveur", "salle");
const chefRang = identite(null, "comptesalle-1", "chef_rang", "salle");
const commis = identite(null, "comptecuisin-0", "serveur", "cuisine");
let app: FastifyInstance;

const reservations = async (): Promise<Reservation[]> => (await appel(app, "GET", "/reservations", chefRang)).json;
const service = async (tableId: string) =>
  (await appel(app, "GET", "/salles/salle-1", chefRang)).json.tables.find((t: { id: string }) => t.id === tableId);

beforeAll(async () => {
  app = await nouvelleApp();
});

describe("réservations", () => {
  it("liste les réservations du soir", async () => {
    expect((await reservations()).length).toBe(5);
  });

  it("crée une réservation sans table (attribuée à l'arrivée)", async () => {
    const { status, json } = await appel(app, "POST", "/reservations", chefRang, { nomClient: "M. Sanstable", couverts: 3, heure: "21:15" });
    expect(status).toBe(201);
    expect(json.tableId).toBeUndefined();
  });

  it("refuse des allergies non signalées par le client", async () => {
    const corps = { nomClient: "X", couverts: 2, heure: "20:00", allergenes: ["gluten"] };
    expect((await appel(app, "POST", "/reservations", chefRang, corps)).status).toBe(400);
  });

  it("refuse une table d'un autre restaurant", async () => {
    const corps = { nomClient: "X", couverts: 2, heure: "20:00", tableId: "table-inconnue" };
    expect((await appel(app, "POST", "/reservations", chefRang, corps)).status).toBe(404);
  });

  it("annuler = statut « annulée » : disparaît de la liste du soir", async () => {
    expect((await appel(app, "DELETE", "/reservations/r4", chefRang)).json.status).toBe("annulee");
    expect((await reservations()).some((r) => r.id === "r4")).toBe(false);
  });
});

describe("installer des clients (dès N0)", () => {
  it("un serveur (N0) installe un walk-in : la réservation « sans résa » apparaît", async () => {
    const { status, json } = await appel(app, "POST", "/tables/t5/installer", serveur, { couverts: 3 });
    expect(status).toBe(201);
    expect(json.reservation.source).toBe("walk_in");
    expect(json.etat.clientName).toBe("Sans réservation");
    const walkIn = (await reservations()).find((r) => r.id === json.reservation.id);
    expect(walkIn?.couverts).toBe(3);
    expect(walkIn?.serviceEvents?.[0].type).toBe("installation");
    expect((await service("t5")).statut).toBe("occupee");
  });

  it("une table occupée ne peut pas être installée (409)", async () => {
    expect((await appel(app, "POST", "/tables/t5/installer", serveur, { couverts: 2 })).status).toBe(409);
  });

  it("le client réservé à la table 3 demande la table 1 : sa réservation suit, allergies comprises", async () => {
    const { status, json } = await appel(app, "POST", "/tables/t1/installer", serveur, { reservationId: "r2" });
    expect(status).toBe(201);
    expect(json.reservation.tableId).toBe("t1");
    const t1 = await service("t1");
    expect(t1.serviceState.clientName).toBe("Mme Beaumont");
    expect(t1.serviceState.allergenes).toEqual(["gluten", "lactose"]);
  });

  it("une mise à jour du repas sans la réservation ne casse pas le lien", async () => {
    // L'app peut renvoyer l'état du repas sans reservationId (file hors ligne, ancien état).
    await appel(app, "PUT", "/tables/t1/service", chefRang, { tableId: "t1", course: "plat", dishStatus: "aucun", clientName: "Mme Beaumont", allergenes: ["gluten", "lactose"], allergenesSignalesAt: new Date().toISOString() });
    expect((await service("t1")).serviceState.reservationId).toBe("r2");
  });

  it("une réservation déjà installée ne s'installe pas deux fois (404)", async () => {
    expect((await appel(app, "POST", "/tables/t3/installer", serveur, { reservationId: "r2" })).status).toBe(404);
  });

  it("un commis de cuisine ne peut pas installer (mauvais pôle, 403)", async () => {
    expect((await appel(app, "POST", "/tables/t3/installer", commis, { couverts: 2 })).status).toBe(403);
  });
});

describe("changer de table et addition", () => {
  it("le repas de la table 1 déménage à la table 3", async () => {
    const { status, json } = await appel(app, "POST", "/tables/t1/deplacer", serveur, { versTableId: "t3" });
    expect(status).toBe(200);
    expect(json.tableId).toBe("t3");
    expect((await service("t1")).statut).toBe("libre");
    expect((await service("t1")).serviceState).toBeUndefined();
    expect((await service("t3")).serviceState.clientName).toBe("Mme Beaumont");
    const r2 = (await reservations()).find((r) => r.id === "r2");
    expect(r2?.tableId).toBe("t3");
    expect(r2?.serviceEvents?.map((e) => e.type)).toEqual(["installation", "changement_table"]);
  });

  it("vers une table occupée : refusé (409)", async () => {
    expect((await appel(app, "POST", "/tables/t3/deplacer", serveur, { versTableId: "t5" })).status).toBe(409);
  });

  it("l'addition termine la réservation et efface ses allergies", async () => {
    await appel(app, "PUT", "/tables/t3/bill", chefRang, { tableId: "t3", occurredAt: new Date().toISOString() });
    const r2 = (await reservations()).find((r) => r.id === "r2");
    expect(r2?.status).toBe("terminee");
    expect(r2?.allergenes).toEqual([]);
    expect((await service("t3")).serviceState.allergenes).toBeUndefined();
  });

  it("table nettoyée (remise libre) : le repas précédent disparaît", async () => {
    await appel(app, "PUT", "/tables/t3/statut", chefRang, { statut: "libre" });
    expect((await service("t3")).serviceState).toBeUndefined();
  });
});
