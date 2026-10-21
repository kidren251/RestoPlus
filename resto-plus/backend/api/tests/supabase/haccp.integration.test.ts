/**
 * Checklists HACCP sur la base Supabase de DEV.
 * Lancer : yarn workspace @resto-plus/api test:supabase
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import type { Checklist } from "@resto-plus/types";
import { appel, identite } from "../helpers";

const commis = identite(null, "comptecuisin-0", "serveur", "cuisine");
const autreResto = identite("d3e00000-0000-4000-8000-0000000000bb", "b-commis", "serveur", "cuisine");
let app: FastifyInstance;
let db: pg.Client;
let ouverture: Checklist;

beforeAll(async () => {
  execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env: process.env });
  db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const { buildApp } = await import("../../src/app");
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await db.end();
  execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env: process.env });
});

describe("HACCP en base", () => {
  it("sert le plan HACCP de l'établissement, dans l'ordre", async () => {
    const plan: Checklist[] = (await appel(app, "GET", "/checklists", commis)).json;
    expect(plan.map((c) => c.type)).toEqual(["Ouverture cuisine", "Fermeture cuisine", "Contrôle 4h"]);
    ouverture = plan[0];
    expect(ouverture.items.map((i) => i.label)[0]).toBe("Vérification température réfrigérateurs");
  });

  it("un relevé fait hors ligne garde l'heure du téléphone et sa journée de service", async () => {
    const id = randomUUID();
    const heure = new Date(Date.now() - 20 * 60_000).toISOString();
    const corps = { id, checklistId: ouverture.id, itemId: ouverture.items[0].id, valeur: 3.5, conforme: true, timestamp: heure };
    expect((await appel(app, "POST", "/checklist-entries", commis, corps)).status).toBe(201);
    // Renvoyé par la file hors ligne : pas de doublon.
    expect((await appel(app, "POST", "/checklist-entries", commis, corps)).status).toBe(201);
    const { rows } = await db.query("select valeur, conforme, releve_at, date_service from checklist_entries where id = $1", [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].valeur).toBe("3.5");
    expect(rows[0].releve_at.toISOString()).toBe(heure);
    expect(rows[0].date_service).not.toBeNull();
  });

  it("un relevé ne peut pas être modifié, même directement en base", async () => {
    const { rows } = await db.query("select id from checklist_entries limit 1");
    await expect(db.query("update checklist_entries set valeur = '9' where id = $1", [rows[0].id])).rejects.toThrow(/ne peut pas être modifié/);
  });

  it("l'app retrouve les relevés du jour", async () => {
    const releves = (await appel(app, "GET", "/checklist-entries", commis)).json;
    expect(releves.some((r: { itemId: string }) => r.itemId === ouverture.items[0].id)).toBe(true);
  });

  it("un autre établissement ne voit ni le plan ni les relevés, et ne peut rien enregistrer", async () => {
    expect((await appel(app, "GET", "/checklists", autreResto)).json).toEqual([]);
    expect((await appel(app, "GET", "/checklist-entries", autreResto)).json).toEqual([]);
    const corps = { checklistId: ouverture.id, itemId: ouverture.items[0].id };
    expect((await appel(app, "POST", "/checklist-entries", autreResto, corps)).status).toBe(404);
  });
});
