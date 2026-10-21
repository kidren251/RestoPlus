/**
 * Application des migrations SQL — Resto Plus
 *
 * Applique dans l'ordre les fichiers de backend/db/migrations/ qui ne l'ont pas encore
 * été, chacun dans sa propre transaction (une migration qui échoue ne laisse rien à
 * moitié appliqué). Les migrations appliquées sont notées dans outils.migrations,
 * un schéma non exposé par l'API publique de Supabase.
 *
 * Lancer : yarn workspace @resto-plus/api db:migrate            (applique)
 *          yarn workspace @resto-plus/api db:migrate --a-blanc  (essai, tout est annulé)
 * Connexion : SUPABASE_DB_URL dans backend/api/.env (Session pooler).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const aBlanc = process.argv.includes("--a-blanc");

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL manquant (backend/api/.env).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  if (aBlanc) await client.query("begin");
  await client.query(`
    create schema if not exists outils;
    create table if not exists outils.migrations (
      nom text primary key,
      appliquee_at timestamptz not null default now()
    );
  `);
  const { rows } = await client.query("select nom from outils.migrations");
  const dejaAppliquees = new Set(rows.map((r) => r.nom));
  const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith(".sql")).sort();
  const aAppliquer = fichiers.filter((f) => !dejaAppliquees.has(f));

  if (aAppliquer.length === 0) {
    console.log(`Base à jour (${fichiers.length} migrations).`);
  }

  for (const fichier of aAppliquer) {
    const sql = fs.readFileSync(path.join(dossier, fichier), "utf8");
    await client.query(aBlanc ? "savepoint migration" : "begin");
    try {
      await client.query(sql);
      await client.query("insert into outils.migrations (nom) values ($1)", [fichier]);
      if (!aBlanc) await client.query("commit");
      console.log(`OK   ${fichier}`);
    } catch (erreur) {
      await client.query(aBlanc ? "rollback to savepoint migration" : "rollback");
      console.error(`ÉCHEC ${fichier} : ${erreur.message}`);
      process.exitCode = 1;
      break;
    }
  }

  if (aBlanc) {
    await client.query("rollback");
    console.log("Essai à blanc : tout a été annulé, la base n'a pas changé.");
  }
} finally {
  await client.end();
}
