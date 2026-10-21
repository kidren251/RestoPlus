/**
 * Matrice des droits — Resto Plus
 *
 * 1. La règle elle-même (`can()`, partagée app / API) : niveaux N0-N3 et pôles.
 * 2. Son application par l'API : refus 403, délégation N1 → N2 du même pôle.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { can, type AccessRole, type Permission, type Pole } from "@resto-plus/types";
import { appel, identite, nouvelleApp } from "./helpers";

const N: AccessRole[] = ["serveur", "chef_rang", "manager_admin", "directeur_admin"];

describe("can() — matrice partagée", () => {
  const cas: [Permission, Pole, number][] = [
    // [droit, pôle, plus petit niveau autorisé dans ce pôle (4 = jamais)]
    ["service.commander", "salle", 0],
    ["service.commander", "cuisine", 4],
    ["service.suivre", "salle", 1],
    ["service.addition", "salle", 1],
    ["reservation.gerer", "salle", 1],
    ["taches.reinitialiser", "salle", 2],
    ["salle.configurer", "salle", 2],
    ["salle.configurer", "cuisine", 4],
    ["checklist.remplir", "cuisine", 0],
    ["checklist.remplir", "salle", 4],
    ["cuisine.plat_pret", "cuisine", 0],
    ["stock.entree", "cuisine", 1],
    ["stock.sortie", "cuisine", 2],
    ["stock.sortie", "salle", 4],
    ["carte.gerer", "cuisine", 1],
    ["compte_rendu.salle", "salle", 2],
    ["compte_rendu.salle", "cuisine", 4],
    ["compte_rendu.cuisine", "cuisine", 2],
    ["acces.gerer", "salle", 2],
    ["acces.changer_pole", "salle", 3],
    ["comptes.gerer", "cuisine", 3],
    ["delegations.gerer", "salle", 3],
    ["audit.consulter", "cuisine", 3],
    ["tickets.creer", "salle", 1],
    ["tickets.creer", "cuisine", 1],
  ];

  it.each(cas)("%s en %s : à partir de N%i", (permission, pole, minimum) => {
    N.forEach((accessRole, niveau) => {
      expect(can({ accessRole, pole }, permission), `N${niveau}`).toBe(niveau >= minimum);
    });
  });

  it("le pôle direction passe partout, au niveau requis", () => {
    expect(can({ accessRole: "directeur_admin", pole: "direction" }, "stock.sortie")).toBe(true);
    expect(can({ accessRole: "directeur_admin", pole: "direction" }, "salle.configurer")).toBe(true);
    expect(can({ accessRole: "chef_rang", pole: "direction" }, "stock.sortie")).toBe(false);
  });
});

describe("application par l'API", () => {
  let app: FastifyInstance;
  const serveur = identite(null, "comptesalle-0", "serveur", "salle");
  const chefRangSalle = identite(null, "comptesalle-1", "chef_rang", "salle");
  const managerSalle = identite(null, "comptesalle-2", "manager_admin", "salle");
  const chefPartie = identite(null, "comptecuisin-1", "chef_rang", "cuisine");
  const directeur = identite(null, "comptesalle-3", "directeur_admin", "direction");

  beforeAll(async () => {
    app = await nouvelleApp();
  });

  it("un N0 ne déplace pas une table (403)", async () => {
    const { status, json } = await appel(app, "PUT", "/tables/t1/position", serveur, { x: 1, y: 1 });
    expect(status).toBe(403);
    expect(json.permission).toBe("salle.configurer");
  });

  it("un N2 de salle déplace une table", async () => {
    expect((await appel(app, "PUT", "/tables/t1/position", managerSalle, { x: 1, y: 1 })).status).toBe(200);
  });

  it("un N1 de salle ne touche pas au stock (mauvais pôle)", async () => {
    expect((await appel(app, "POST", "/stock-items/saumon/movements", chefRangSalle, { type: "perte", quantite: 0.1 })).status).toBe(403);
  });

  it("seul le N3 consulte le journal d'audit", async () => {
    expect((await appel(app, "GET", "/audit", managerSalle)).status).toBe(403);
    expect((await appel(app, "GET", "/audit", directeur)).status).toBe(200);
  });

  it("le refus est journalisé dans l'audit", async () => {
    await appel(app, "GET", "/audit", serveur);
    const { json } = await appel(app, "GET", "/audit", directeur);
    expect(json.evenements.some((e: { action: string }) => e.action === "acces.refuse")).toBe(true);
  });

  it("délégation : un N1 de cuisine obtient les droits N2 de son pôle, pas de l'autre", async () => {
    const sortie = { type: "perte", quantite: 0.1 };
    expect((await appel(app, "POST", "/stock-items/saumon/movements", chefPartie, sortie)).status).toBe(403);

    const deleg = await appel(app, "POST", "/delegations", directeur, { delegueId: "comptecuisin-1", pole: "cuisine", jours: 1 });
    expect(deleg.status).toBe(201);

    expect((await appel(app, "POST", "/stock-items/saumon/movements", chefPartie, sortie)).status).toBe(201);
    const chefPartieEnSalle = identite(null, "comptecuisin-1", "chef_rang", "cuisine");
    expect((await appel(app, "PUT", "/tables/t1/position", chefPartieEnSalle, { x: 2, y: 2 })).status).toBe(403);

    await appel(app, "POST", `/delegations/${deleg.json.id}/revoquer`, directeur);
    expect((await appel(app, "POST", "/stock-items/saumon/movements", chefPartie, sortie)).status).toBe(403);
  });
});
