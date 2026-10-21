/**
 * Checklists HACCP sur la base Supabase de DEV : plan GBPH de démo, seuils, conformité,
 * copie du point dans le relevé, édition du plan, relevés non modifiables, isolation.
 * Lancer : yarn workspace @resto-plus/api test:supabase
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import type { Checklist, ChecklistItem } from "@resto-plus/types";
import { appel, identite } from "../helpers";

const commis = identite(null, "comptecuisin-0", "serveur", "cuisine");
const chefCuisine = identite(null, "comptecuisin-2", "manager_admin", "cuisine");
const autreResto = identite("d3e00000-0000-4000-8000-0000000000bb", "b-chef", "manager_admin", "cuisine");
let app: FastifyInstance;
let db: pg.Client;
let plan: Checklist[];

function point(libelle: string): { checklist: Checklist; item: ChecklistItem } {
  for (const checklist of plan) {
    const item = checklist.items.find((i) => i.label.startsWith(libelle));
    if (item) return { checklist, item };
  }
  throw new Error(`Point introuvable : ${libelle}`);
}

beforeAll(async () => {
  execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env: process.env });
  db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const { buildApp } = await import("../../src/app");
  app = await buildApp({ logger: false });
  plan = (await appel(app, "GET", "/checklists", commis)).json;
});

afterAll(async () => {
  await db.end();
  execFileSync(process.execPath, ["scripts/seed-demo.mjs"], { env: process.env });
});

describe("HACCP en base", () => {
  it("sert le plan GBPH de démo avec ses seuils", () => {
    expect(plan.map((c) => c.type)).toEqual([
      "Réception des marchandises",
      "Ouverture cuisine",
      "Températures pendant le service",
      "Fermeture cuisine",
      "Contrôles hebdomadaires",
    ]);
    expect(point("Température chambre froide positive").item).toMatchObject({ seuilMin: 0, seuilMax: 4, unite: "°C" });
    expect(point("Température congélateur").item.seuilMax).toBe(-18);
  });

  it("frigo à 6 °C fait hors ligne : non conforme, heure du téléphone, copie du point", async () => {
    const { checklist, item } = point("Température chambre froide positive");
    const id = randomUUID();
    const heure = new Date(Date.now() - 20 * 60_000).toISOString();
    const corps = { id, checklistId: checklist.id, itemId: item.id, valeur: "6", conforme: true, timestamp: heure };
    expect((await appel(app, "POST", "/checklist-entries", commis, corps)).status).toBe(201);
    // Renvoyé par la file hors ligne : pas de doublon.
    expect((await appel(app, "POST", "/checklist-entries", commis, corps)).status).toBe(201);
    const { rows } = await db.query(
      "select valeur, conforme, releve_at, date_service, libelle, seuil_min, seuil_max, unite from checklist_entries where id = $1",
      [id]
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ valeur: "6", conforme: false, libelle: item.label, seuil_min: "0", seuil_max: "4", unite: "°C" });
    expect(rows[0].releve_at.toISOString()).toBe(heure);
    expect(rows[0].date_service).not.toBeNull();
  });

  it("un relevé ne peut pas être modifié, même directement en base", async () => {
    const { rows } = await db.query("select id from checklist_entries limit 1");
    await expect(db.query("update checklist_entries set valeur = '3' where id = $1", [rows[0].id])).rejects.toThrow(/ne peut pas être modifié/);
  });

  it("le chef de cuisine durcit un seuil : le relevé suivant suit le nouveau, l'ancien garde sa copie", async () => {
    const { checklist, item } = point("Température réfrigérateurs des postes");
    const avant = randomUUID();
    await appel(app, "POST", "/checklist-entries", commis, { id: avant, checklistId: checklist.id, itemId: item.id, valeur: "3,5" });
    expect((await appel(app, "PUT", `/checklist-items/${item.id}`, chefCuisine, { seuilMax: 3 })).status).toBe(200);
    const apres = randomUUID();
    const { json } = await appel(app, "POST", "/checklist-entries", commis, { id: apres, checklistId: checklist.id, itemId: item.id, valeur: "3,5" });
    expect(json.conforme).toBe(false);
    const { rows } = await db.query("select id, conforme, seuil_max from checklist_entries where id in ($1, $2)", [avant, apres]);
    const parId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(parId[avant]).toMatchObject({ conforme: true, seuil_max: "4" });
    expect(parId[apres]).toMatchObject({ conforme: false, seuil_max: "3" });
  });

  it("créer une checklist, y ajouter un point, le retirer", async () => {
    const creee = await appel(app, "POST", "/checklists", chefCuisine, { nom: "Bar", frequence: "ouverture" });
    expect(creee.status).toBe(201);
    const ajout = await appel(app, "POST", `/checklists/${creee.json.id}/items`, chefCuisine, { label: "Température arrière-bar", requiertValeur: true, seuilMax: 6, unite: "°C" });
    expect(ajout.status).toBe(201);
    expect((await appel(app, "PUT", `/checklist-items/${ajout.json.id}`, chefCuisine, { actif: false })).status).toBe(200);
    expect((await db.query("select actif from checklist_items where id = $1", [ajout.json.id])).rows[0].actif).toBe(false);
  });

  it("seuils incohérents : 400, rien n'est écrit", async () => {
    const { item } = point("Maintien au chaud");
    expect((await appel(app, "PUT", `/checklist-items/${item.id}`, chefCuisine, { seuilMax: 10 })).status).toBe(400);
    expect((await db.query("select seuil_max from checklist_items where id = $1", [item.id])).rows[0].seuil_max).toBeNull();
  });

  it("un autre établissement ne voit, ne remplit ni ne modifie rien", async () => {
    const { checklist, item } = point("Maintien au chaud");
    expect((await appel(app, "GET", "/checklists", autreResto)).json).toEqual([]);
    expect((await appel(app, "GET", "/checklist-entries", autreResto)).json).toEqual([]);
    expect((await appel(app, "POST", "/checklist-entries", autreResto, { checklistId: checklist.id, itemId: item.id, valeur: "70" })).status).toBe(404);
    expect((await appel(app, "PUT", `/checklist-items/${item.id}`, autreResto, { seuilMin: 0 })).status).toBe(404);
  });
});
