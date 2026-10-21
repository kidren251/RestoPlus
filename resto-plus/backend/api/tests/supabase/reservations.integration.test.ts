/**
 * Réservations, gestes du service et droits réglables — sur la base Supabase de DEV.
 * Lancer : yarn workspace @resto-plus/api test:supabase
 * À la fin, la démo est remise à zéro (scripts/seed-demo.mjs).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import type { Reservation } from "@resto-plus/types";
import { appel, identite } from "../helpers";

const RESTAURANT_DEMO = "d3e00000-0000-4000-8000-000000000001";
const AUTRE_RESTAURANT = "d3e00000-0000-4000-8000-0000000000bb";
const serveur = identite(null, "comptesalle-0", "serveur", "salle");
const chefRang = identite(null, "comptesalle-1", "chef_rang", "salle");
const autreResto = identite(AUTRE_RESTAURANT, "b-serveur", "chef_rang", "salle");

let app: FastifyInstance;
let db: pg.Client;
const table: Record<string, string> = {}; // « Table 1 » → uuid
let beaumont: Reservation;

const ligne = async (sql: string, params: unknown[]) => (await db.query(sql, params)).rows[0];

beforeAll(async () => {
  execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env: process.env });
  db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const { buildApp } = await import("../../src/app");
  app = await buildApp({ logger: false });
  const salles = (await appel(app, "GET", "/salles", chefRang)).json;
  for (const t of (await appel(app, "GET", `/salles/${salles[0].id}`, chefRang)).json.tables) table[t.nom] = t.id;
});

afterAll(async () => {
  await db.query("update restaurants set reglages_droits = '{}' where id = $1", [RESTAURANT_DEMO]);
  await db.end();
  execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env: process.env });
});

describe("réservations en base", () => {
  it("liste les 5 réservations du soir, heure locale et table", async () => {
    const liste: Reservation[] = (await appel(app, "GET", "/reservations", chefRang)).json;
    expect(liste.map((r) => r.heure)).toEqual(["19:00", "19:30", "20:00", "20:30", "21:00"]);
    beaumont = liste.find((r) => r.nomClient === "Mme Beaumont")!;
    expect(beaumont.tableId).toBe(table["Table 3"]);
    expect(beaumont.allergenes).toEqual(["gluten", "lactose"]);
  });

  it("crée une réservation avec l'identifiant généré par l'app", async () => {
    const id = randomUUID();
    const { status } = await appel(app, "POST", "/reservations", chefRang, { id, nomClient: "M. Tardif", couverts: 2, heure: "22:15" });
    expect(status).toBe(201);
    const enBase = await ligne("select heure_locale, status, table_id from reservations where id = $1", [id]);
    expect(enBase).toEqual({ heure_locale: "22:15:00", status: "a_venir", table_id: null });
  });

  it("annuler : statut « annulée » en base, allergies effacées", async () => {
    const leclerc = (await appel(app, "GET", "/reservations", chefRang)).json.find((r: Reservation) => r.nomClient === "Mme Leclerc");
    expect((await appel(app, "DELETE", `/reservations/${leclerc.id}`, chefRang)).status).toBe(200);
    expect(await ligne("select status, allergenes from reservations where id = $1", [leclerc.id])).toEqual({ status: "annulee", allergenes: [] });
  });
});

describe("gestes du service en base", () => {
  it("un serveur installe un walk-in à la table 5", async () => {
    const { status, json } = await appel(app, "POST", `/tables/${table["Table 5"]}/installer`, serveur, { couverts: 3 });
    expect(status).toBe(201);
    const resa = await ligne("select source, status, couverts, table_id from reservations where id = $1", [json.reservation.id]);
    expect(resa).toEqual({ source: "walk_in", status: "installee", couverts: 3, table_id: table["Table 5"] });
    expect((await ligne("select type from service_events where reservation_id = $1", [json.reservation.id])).type).toBe("installation");
    // Visible dans la liste du soir (badge « sans résa » côté app).
    const liste: Reservation[] = (await appel(app, "GET", "/reservations", chefRang)).json;
    expect(liste.some((r) => r.id === json.reservation.id && r.source === "walk_in")).toBe(true);
  });

  it("Mme Beaumont, réservée table 3, s'installe table 1 : réservation et allergies suivent", async () => {
    const { status } = await appel(app, "POST", `/tables/${table["Table 1"]}/installer`, serveur, { reservationId: beaumont.id });
    expect(status).toBe(201);
    expect((await ligne("select table_id from reservations where id = $1", [beaumont.id])).table_id).toBe(table["Table 1"]);
    expect((await ligne("select allergenes from etat_service_tables where table_id = $1", [table["Table 1"]])).allergenes).toEqual(["gluten", "lactose"]);
  });

  it("le déroulé envoyé par l'app (plat servi) est enregistré", async () => {
    const evenement = { id: randomUUID(), reservationId: beaumont.id, tableId: table["Table 1"], type: "entree_servie", label: "Entrée servie", occurredAt: new Date().toISOString() };
    const repas = { tableId: table["Table 1"], course: "plat", dishStatus: "aucun", clientName: "Mme Beaumont", allergenes: ["gluten", "lactose"], allergenesSignalesAt: new Date().toISOString(), events: [evenement] };
    expect((await appel(app, "PUT", `/tables/${table["Table 1"]}/service`, chefRang, repas)).status).toBe(200);
    // Renvoyé deux fois (file hors ligne) : pas de doublon.
    await appel(app, "PUT", `/tables/${table["Table 1"]}/service`, chefRang, repas);
    expect((await ligne("select count(*)::int as n from service_events where id = $1", [evenement.id])).n).toBe(1);
  });

  it("changer de table : table 1 → table 3, tout suit", async () => {
    const { status } = await appel(app, "POST", `/tables/${table["Table 1"]}/deplacer`, serveur, { versTableId: table["Table 3"] });
    expect(status).toBe(200);
    expect((await ligne("select statut from tables_salle where id = $1", [table["Table 1"]])).statut).toBe("libre");
    expect((await ligne("select client_nom from etat_service_tables where table_id = $1", [table["Table 3"]])).client_nom).toBe("Mme Beaumont");
    const types = (await db.query("select type from service_events where reservation_id = $1 order by occurred_at", [beaumont.id])).rows.map((r) => r.type);
    expect(types).toEqual(["installation", "entree_servie", "changement_table"]);
  });

  it("vers une table occupée : 409, rien ne bouge", async () => {
    expect((await appel(app, "POST", `/tables/${table["Table 3"]}/deplacer`, serveur, { versTableId: table["Table 5"] })).status).toBe(409);
    expect((await ligne("select client_nom from etat_service_tables where table_id = $1", [table["Table 3"]])).client_nom).toBe("Mme Beaumont");
  });

  it("l'addition termine la réservation et efface les allergies partout", async () => {
    await appel(app, "PUT", `/tables/${table["Table 3"]}/bill`, chefRang, { tableId: table["Table 3"], occurredAt: new Date().toISOString() });
    expect(await ligne("select status, allergenes from reservations where id = $1", [beaumont.id])).toEqual({ status: "terminee", allergenes: [] });
    expect((await ligne("select allergenes from etat_service_tables where table_id = $1", [table["Table 3"]])).allergenes).toEqual([]);
  });

  it("un autre restaurant ne peut rien installer chez nous (404)", async () => {
    expect((await appel(app, "POST", `/tables/${table["Table 2"]}/installer`, autreResto, { couverts: 2 })).status).toBe(404);
    expect((await appel(app, "GET", "/reservations", autreResto)).json).toEqual([]);
  });
});

describe("droits réglés par le N4, en base", () => {
  it("installation réservée aux N1 : le serveur est refusé, le chef de rang passe", async () => {
    const url = `/platform/restaurants/${RESTAURANT_DEMO}/reglages-droits`;
    expect((await appel(app, "PUT", url, {}, { reglages: { "service.installer": 1 } })).status).toBe(200);
    expect((await ligne("select reglages_droits from restaurants where id = $1", [RESTAURANT_DEMO])).reglages_droits).toEqual({ "service.installer": 1 });
    expect((await appel(app, "POST", `/tables/${table["Table 2"]}/installer`, serveur, { couverts: 2 })).status).toBe(403);
    expect((await appel(app, "POST", `/tables/${table["Table 2"]}/installer`, chefRang, { couverts: 2 })).status).toBe(201);
  });
});
