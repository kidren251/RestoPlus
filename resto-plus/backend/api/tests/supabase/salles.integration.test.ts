/**
 * Plan de salle branché sur Supabase — tests d'intégration sur la base de DEV.
 *
 * Lancer : yarn workspace @resto-plus/api test:supabase
 * (exclus de `yarn test` : ils lisent backend/api/.env et écrivent dans la base de dev,
 * puis remettent la démo dans son état d'origine.)
 * Prérequis : migrations appliquées (db:migrate) et démo insérée (db:seed).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { appel, identite } from "../helpers";

const RESTAURANT_DEMO = "d3e00000-0000-4000-8000-000000000001";
const AUTRE_RESTAURANT = "d3e00000-0000-4000-8000-0000000000bb";
const managerSalle = identite(null, "comptesalle-2", "manager_admin", "salle");
const chefRang = identite(null, "comptesalle-1", "chef_rang", "salle");
const serveur = identite(null, "comptesalle-0", "serveur", "salle");
const managerAutreResto = identite(AUTRE_RESTAURANT, "b-manager", "manager_admin", "salle");

let app: FastifyInstance;
let db: pg.Client;
let salleId: string;
let table1: { id: string; x: number; y: number };

beforeAll(async () => {
  db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const { buildApp } = await import("../../src/app");
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  // Remet la démo comme le seed l'a laissée.
  if (table1) {
    await db.query("update tables_salle set x = $2, y = $3, statut = 'libre' where id = $1", [table1.id, table1.x, table1.y]);
  }
  await db.query("delete from etat_service_tables where restaurant_id = $1", [RESTAURANT_DEMO]);
  await db.end();
});

describe("lecture depuis Supabase", () => {
  it("/health annonce le mode supabase", async () => {
    expect((await appel(app, "GET", "/health", {})).json.mode).toBe("supabase");
  });

  it("liste la salle de démo", async () => {
    const { status, json } = await appel(app, "GET", "/salles", managerSalle);
    expect(status).toBe(200);
    expect(json).toHaveLength(1);
    salleId = json[0].id;
    expect(json[0].nom).toBe("Salle Principale");
  });

  it("lit la salle avec ses 6 tables et son décor", async () => {
    const { json } = await appel(app, "GET", `/salles/${salleId}`, managerSalle);
    expect(json.tables).toHaveLength(6);
    expect(json.decor).toHaveLength(3);
    const t = json.tables.find((t: { nom: string }) => t.nom === "Table 1");
    table1 = { id: t.id, x: t.x, y: t.y };
  });
});

describe("écriture persistée en base", () => {
  it("un N2 déplace une table : la position est bien en base", async () => {
    expect((await appel(app, "PUT", `/tables/${table1.id}/position`, managerSalle, { x: 42.5, y: 77 })).status).toBe(200);
    const { rows } = await db.query("select x, y from tables_salle where id = $1", [table1.id]);
    expect(rows[0]).toEqual({ x: 42.5, y: 77 });
  });

  it("la position survit à un redémarrage de l'API", async () => {
    const { buildApp } = await import("../../src/app");
    const nouvelleInstance = await buildApp({ logger: false });
    const { json } = await appel(nouvelleInstance, "GET", `/salles/${salleId}`, managerSalle);
    expect(json.tables.find((t: { id: string }) => t.id === table1.id).x).toBe(42.5);
    await nouvelleInstance.close();
  });

  it("un N0 ne déplace pas une table (403)", async () => {
    expect((await appel(app, "PUT", `/tables/${table1.id}/position`, serveur, { x: 0, y: 0 })).status).toBe(403);
  });

  it("repas : allergies enregistrées, puis effacées en base à l'addition", async () => {
    const repas = { tableId: table1.id, course: "entree", dishStatus: "aucun", clientName: "Mme Test", allergenes: ["gluten"], allergenesSignalesAt: new Date().toISOString() };
    expect((await appel(app, "PUT", `/tables/${table1.id}/service`, chefRang, repas)).status).toBe(200);
    let { rows } = await db.query("select allergenes, client_nom from etat_service_tables where table_id = $1", [table1.id]);
    expect(rows[0]).toEqual({ allergenes: ["gluten"], client_nom: "Mme Test" });

    await appel(app, "PUT", `/tables/${table1.id}/bill`, chefRang, { tableId: table1.id, occurredAt: new Date().toISOString() });
    ({ rows } = await db.query("select t.statut, e.allergenes, e.allergenes_signales_at from tables_salle t join etat_service_tables e on e.table_id = t.id where t.id = $1", [table1.id]));
    expect(rows[0]).toEqual({ statut: "a_nettoyer", allergenes: [], allergenes_signales_at: null });
  });
});

describe("isolation entre restaurants, en base", () => {
  it("un autre restaurant ne voit aucune salle", async () => {
    expect((await appel(app, "GET", "/salles", managerAutreResto)).json).toEqual([]);
  });

  it("un autre restaurant ne lit pas la salle de démo (404)", async () => {
    expect((await appel(app, "GET", `/salles/${salleId}`, managerAutreResto)).status).toBe(404);
  });

  it("un autre restaurant ne déplace pas une table de démo (404) et rien ne change en base", async () => {
    const avant = (await db.query("select x, y from tables_salle where id = $1", [table1.id])).rows[0];
    expect((await appel(app, "PUT", `/tables/${table1.id}/position`, managerAutreResto, { x: 1, y: 1 })).status).toBe(404);
    expect((await db.query("select x, y from tables_salle where id = $1", [table1.id])).rows[0]).toEqual(avant);
  });

  it("un ancien identifiant de démo (t1) répond 404, pas une erreur serveur", async () => {
    expect((await appel(app, "PUT", "/tables/t1/position", managerSalle, { x: 1, y: 1 })).status).toBe(404);
    expect((await appel(app, "GET", "/salles/salle-1", managerSalle)).status).toBe(404);
  });
});
