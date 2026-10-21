/**
 * Test d'isolation entre restaurants — Resto Plus
 *
 * Vérifie que le restaurant B ne peut ni voir ni modifier aucune donnée du restaurant A,
 * route par route, et que A garde toutes ses fonctionnalités. À compléter après toute
 * nouvelle route : chaque route qui lit un objet par son id doit y figurer.
 *
 * Restaurant A = restaurant de démo ; restaurant B = autre établissement simulé
 * (en-tête X-Demo-Restaurant-Id, accepté uniquement quand REQUIRE_AUTH n'est pas exigé).
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { appel, identite, nouvelleApp } from "./helpers";

const A = {
  dir: identite(null, "comptesalle-3", "directeur_admin", "direction"),
  cuis2: identite(null, "comptecuisin-2", "manager_admin", "cuisine"),
  salle2: identite(null, "comptesalle-2", "manager_admin", "salle"),
};
const B = {
  dir: identite("resto-b", "b-directeur", "directeur_admin", "direction"),
  cuis2: identite("resto-b", "b-chef", "manager_admin", "cuisine"),
  salle2: identite("resto-b", "b-manager", "manager_admin", "salle"),
  salle0: identite("resto-b", "b-serveur", "serveur", "salle"),
};

let app: FastifyInstance;
let mvt: { id: string };
let compte: { id: string };
let deleg: { id: string };

beforeAll(async () => {
  app = await nouvelleApp();
  // Données propres au restaurant A, créées pour tester qu'elles restent invisibles à B.
  const perte = await appel(app, "POST", "/stock-items/saumon/movements", A.cuis2, { type: "perte", quantite: 0.2 });
  expect(perte.status).toBe(201);
  mvt = perte.json;
  const creation = await appel(app, "POST", "/comptes", A.dir, { nom: "Employé A", accessRole: "chef_rang", pole: "cuisine" });
  expect(creation.status).toBe(201);
  compte = creation.json.compte;
  const delegation = await appel(app, "POST", "/delegations", A.dir, { delegueId: "comptecuisin-1", pole: "cuisine", jours: 1 });
  expect(delegation.status).toBe(201);
  deleg = delegation.json;
});

describe("le restaurant B ne voit rien de A", () => {
  const listes: [string, string, keyof typeof B, (json: any) => unknown][] = [
    ["réservations", "/reservations", "salle2", (j) => j],
    ["clients", "/clients", "salle2", (j) => j],
    ["salles", "/salles", "salle2", (j) => j],
    ["stock", "/stock-items", "cuis2", (j) => j],
    ["carte", "/menu-items", "cuis2", (j) => j],
    ["alertes stock", "/stock-alerts", "cuis2", (j) => j],
    ["historique d'un article de A", "/stock-items/saumon/movements", "cuis2", (j) => j],
    ["relevés HACCP", "/checklist-entries", "cuis2", (j) => j],
    ["comptes rendus", "/comptes-rendus", "dir", (j) => j],
    ["comptes de l'équipe", "/comptes", "dir", (j) => j.comptes],
    ["délégations", "/delegations", "dir", (j) => j],
    ["membres temporaires", "/restaurant/members", "dir", (j) => j.members],
    ["journal d'audit", "/audit", "dir", (j) => j.evenements],
    ["destinataires messagerie", "/messagerie/destinataires", "dir", (j) => j],
  ];

  it.each(listes)("%s", async (_label, url, qui, extraire) => {
    const { status, json } = await appel(app, "GET", url, B[qui]);
    expect(status).toBe(200);
    expect(extraire(json)).toEqual([]);
  });
});

describe("le restaurant B ne peut rien toucher chez A", () => {
  it.each([
    ["lire un client de A", "GET", "/clients/client-fontaine", "salle2", undefined],
    ["écraser un client de A", "POST", "/clients", "salle2", { id: "client-fontaine", nom: "Piraté", createdAt: "", lastVisitAt: "" }],
    ["lire la salle de A", "GET", "/salles/salle-1", "salle2", undefined],
    ["déplacer une table de A", "PUT", "/tables/t1/position", "salle2", { x: 0, y: 0 }],
    ["changer le service d'une table de A", "PUT", "/tables/t1/service", "salle2", { tableId: "t1", course: "plat", dishStatus: "servi" }],
    ["envoyer l'addition d'une table de A", "PUT", "/tables/t2/bill", "salle2", { tableId: "t2", occurredAt: new Date().toISOString() }],
    ["annuler une réservation de A", "DELETE", "/reservations/r1", "salle2", undefined],
    ["mouvement sur un article de A", "POST", "/stock-items/saumon/movements", "cuis2", { type: "perte", quantite: 1 }],
    ["retirer un article de A", "DELETE", "/stock-items/oeufs", "cuis2", undefined],
    ["commander un plat de A", "POST", "/menu-items/veloute-potimarron-chataigne/order", "salle0", { tableId: "t1", quantite: 1 }],
    ["couper la messagerie d'un compte de A", "POST", "/comptes/comptesalle-0/messagerie", "dir", { active: false }],
    ["déléguer à un employé de A", "POST", "/delegations", "dir", { delegueId: "comptecuisin-1", pole: "cuisine", jours: 1 }],
    ["lire le tableau d'affichage de A", "GET", "/conversations/annonce-general/messages", "salle0", undefined],
    ["écrire sur le tableau d'affichage de A", "POST", "/conversations/annonce-general/messages", "salle2", { contenu: "intrusion" }],
    ["écrire en privé à un employé de A", "POST", "/conversations/dm", "dir", { targetId: "comptecuisin-2" }],
  ] as const)("%s → 404", async (_label, method, url, qui, body) => {
    const { status } = await appel(app, method, url, B[qui], body);
    expect(status).toBe(404);
  });

  it("annuler une sortie de stock de A → 404", async () => {
    expect((await appel(app, "POST", `/stock-movements/${mvt.id}/annuler`, B.cuis2)).status).toBe(404);
  });

  it("désactiver un compte de A → 404", async () => {
    expect((await appel(app, "POST", `/comptes/${compte.id}/desactiver`, B.dir)).status).toBe(404);
  });

  it("nouveau code pour un compte de A → 404", async () => {
    expect((await appel(app, "POST", `/comptes/${compte.id}/code`, B.dir)).status).toBe(404);
  });

  it("révoquer une délégation de A → 404", async () => {
    expect((await appel(app, "POST", `/delegations/${deleg.id}/revoquer`, B.dir)).status).toBe(404);
  });

  it("créer un plat avec le stock de A → 400", async () => {
    const body = { nom: "Vol", prixVente: 10, ingredients: [{ stockItemId: "saumon", quantite: 1 }] };
    expect((await appel(app, "POST", "/menu-items", B.cuis2, body)).status).toBe(400);
  });
});

describe("le restaurant A garde tout", () => {
  it("lit son client", async () => {
    expect((await appel(app, "GET", "/clients/client-fontaine", A.salle2)).status).toBe(200);
  });

  it("déplace sa table", async () => {
    expect((await appel(app, "PUT", "/tables/t1/position", A.salle2, { x: 20, y: 30 })).status).toBe(200);
  });

  it("annule sa sortie de stock", async () => {
    expect((await appel(app, "POST", `/stock-movements/${mvt.id}/annuler`, A.cuis2)).status).toBe(200);
  });

  it("révoque sa délégation", async () => {
    expect((await appel(app, "POST", `/delegations/${deleg.id}/revoquer`, A.dir)).status).toBe(200);
  });

  it("voit ses conversations", async () => {
    const { status, json } = await appel(app, "GET", "/conversations", A.salle2);
    expect(status).toBe(200);
    expect(json.length).toBeGreaterThan(0);
  });
});
