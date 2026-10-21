/**
 * Données de démo en base — Resto Plus
 *
 * Insère (ou remet à zéro) le restaurant de démo : ses départements, sa salle, ses
 * tables et son décor. Mêmes valeurs que le mode mémoire (repositories/*.memoire.ts),
 * avec des uuid fixes : le script peut être relancé sans créer de doublons.
 * Les domaines non encore branchés (stock, carte, comptes…) s'ajouteront ici au fur et
 * à mesure (docs/axes-de-progression.md, P1).
 *
 * Lancer : yarn workspace @resto-plus/api db:seed   (SUPABASE_DB_URL dans .env)
 */
import pg from "pg";

const RESTAURANT = "d3e00000-0000-4000-8000-000000000001"; // = DEMO_RESTAURANT_ID (src/tenant.ts)
const SALLE = "d3e00000-0000-4000-8000-00000000a001";
const id = (prefixe, n) => `d3e00000-0000-4000-8000-00000000${prefixe}${String(n).padStart(3, "0")}`;

const TABLES = [
  { n: 1, x: 20, y: 30, largeur: 60, hauteur: 60, rotation: 0, forme: "ronde", capacite: 2, zone: "z1" },
  { n: 2, x: 110, y: 30, largeur: 70, hauteur: 50, rotation: 0, forme: "rectangle", capacite: 4, zone: "z1" },
  { n: 3, x: 20, y: 130, largeur: 70, hauteur: 50, rotation: 0, forme: "carree", capacite: 4, zone: "z1" },
  { n: 4, x: 120, y: 130, largeur: 60, hauteur: 60, rotation: 0, forme: "ronde", capacite: 6, zone: "z2" },
  { n: 5, x: 20, y: 230, largeur: 80, hauteur: 60, rotation: 0, forme: "rectangle", capacite: 8, zone: "z2" },
  { n: 6, x: 140, y: 230, largeur: 60, hauteur: 50, rotation: 15, forme: "carree", capacite: 4, zone: "z2" },
];
const DECOR = [
  { n: 1, type: "bar", x: 210, y: 20, largeur: 90, hauteur: 30 },
  { n: 2, type: "entree", x: 0, y: 350, largeur: 60, hauteur: 20 },
  { n: 3, type: "cuisine", x: 210, y: 300, largeur: 90, hauteur: 90 },
];

if (!process.env.SUPABASE_DB_URL) {
  console.error("SUPABASE_DB_URL manquant (backend/api/.env).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("begin");

  await client.query(
    `insert into restaurants (id, nom, slug) values ($1, 'Restaurant de démo', 'demo')
     on conflict (id) do update set nom = excluded.nom`,
    [RESTAURANT]
  );
  await client.query(
    `insert into departements (restaurant_id, type, nom, compte_rendu_quotidien) values
       ($1, 'direction', 'Direction', false), ($1, 'salle', 'Salle', true), ($1, 'cuisine', 'Cuisine', true)
     on conflict (restaurant_id, type) do nothing`,
    [RESTAURANT]
  );

  await client.query(
    `insert into salles (id, restaurant_id, nom, largeur_canvas, hauteur_canvas)
     values ($1, $2, 'Salle Principale', 320, 400)
     on conflict (id) do update set nom = excluded.nom, largeur_canvas = 320, hauteur_canvas = 400`,
    [SALLE, RESTAURANT]
  );
  for (const t of TABLES) {
    await client.query(
      `insert into tables_salle (id, restaurant_id, salle_id, nom, zone, x, y, largeur, hauteur, rotation, forme, capacite, statut)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'libre')
       on conflict (id) do update set nom = excluded.nom, zone = excluded.zone, x = excluded.x, y = excluded.y,
         largeur = excluded.largeur, hauteur = excluded.hauteur, rotation = excluded.rotation,
         forme = excluded.forme, capacite = excluded.capacite, statut = 'libre'`,
      [id("b", t.n), RESTAURANT, SALLE, `Table ${t.n}`, t.zone, t.x, t.y, t.largeur, t.hauteur, t.rotation, t.forme, t.capacite]
    );
  }
  for (const d of DECOR) {
    await client.query(
      `insert into elements_decor (id, restaurant_id, salle_id, type, x, y, largeur, hauteur)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set type = excluded.type, x = excluded.x, y = excluded.y,
         largeur = excluded.largeur, hauteur = excluded.hauteur`,
      [id("c", d.n), RESTAURANT, SALLE, d.type, d.x, d.y, d.largeur, d.hauteur]
    );
  }
  // Remise à zéro du service en cours (une démo repart d'une salle vide).
  await client.query("delete from etat_service_tables where restaurant_id = $1", [RESTAURANT]);

  await client.query("commit");
  console.log(`Démo prête : 1 restaurant, 3 départements, 1 salle, ${TABLES.length} tables, ${DECOR.length} éléments de décor.`);
} catch (erreur) {
  await client.query("rollback");
  console.error("ÉCHEC :", erreur.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
