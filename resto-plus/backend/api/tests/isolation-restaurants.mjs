/**
 * Test d'isolation entre restaurants — Resto Plus
 *
 * Vérifie que le restaurant B ne peut ni voir ni modifier aucune donnée du restaurant A,
 * route par route, et que A garde toutes ses fonctionnalités. À relancer après toute
 * nouvelle route : chaque route qui lit un objet par son id doit y figurer.
 *
 * Prérequis : API lancée en mode démo (REQUIRE_AUTH=false), données fraîches.
 * Lancer : yarn workspace @resto-plus/api test:isolation   (API=http://... pour une autre adresse)
 */
// Restaurant A = restaurant de démo ; restaurant B = autre établissement simulé
// (en-tête X-Demo-Restaurant-Id, accepté uniquement quand REQUIRE_AUTH=false).
const U = process.env.API ?? "http://localhost:3000";
const as = (restaurant, id, role, pole) => ({
  "Content-Type": "application/json",
  "X-Demo-User-Id": id,
  "X-Demo-User-Nom": id,
  "X-Demo-User-AccessRole": role,
  "X-Demo-User-Pole": pole,
  ...(restaurant ? { "X-Demo-Restaurant-Id": restaurant } : {}),
});
const A = {
  dir: as(null, "comptesalle-3", "directeur_admin", "direction"),
  cuis2: as(null, "comptecuisin-2", "manager_admin", "cuisine"),
  salle2: as(null, "comptesalle-2", "manager_admin", "salle"),
};
const B = {
  dir: as("resto-b", "b-directeur", "directeur_admin", "direction"),
  cuis2: as("resto-b", "b-chef", "manager_admin", "cuisine"),
  salle2: as("resto-b", "b-manager", "manager_admin", "salle"),
  salle0: as("resto-b", "b-serveur", "serveur", "salle"),
};
let ko = 0;
async function call(method, path, headers, body) {
  const res = await fetch(U + path, { method, headers, body: body ? JSON.stringify(body) : method === "POST" || method === "PUT" ? "{}" : undefined });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}
async function attendu(label, statutAttendu, method, path, headers, body) {
  const { status, json } = await call(method, path, headers, body);
  const ok = status === statutAttendu;
  if (!ok) ko++;
  console.log(`${ok ? "OK " : "KO!"} ${status} ${label}${ok ? "" : "  → " + JSON.stringify(json).slice(0, 140)}`);
  return json;
}
async function vide(label, path, headers, extraire = (j) => j) {
  const { status, json } = await call("GET", path, headers);
  const liste = extraire(json);
  const ok = status === 200 && Array.isArray(liste) && liste.length === 0;
  if (!ok) ko++;
  console.log(`${ok ? "OK " : "KO!"} ${status} ${label} : ${Array.isArray(liste) ? liste.length + " élément(s)" : JSON.stringify(json).slice(0, 100)}`);
}

// --- Données du restaurant A ---
const mvt = await attendu("A : perte de stock (prépare le test)", 201, "POST", "/stock-items/saumon/movements", A.cuis2, { type: "perte", quantite: 0.2 });
const compte = (await attendu("A : crée un compte", 201, "POST", "/comptes", A.dir, { nom: "Employé A", accessRole: "chef_rang", pole: "cuisine" })).compte;
const deleg = await attendu("A : délégation", 201, "POST", "/delegations", A.dir, { delegueId: "comptecuisin-1", pole: "cuisine", jours: 1 });

console.log("\n— Le restaurant B ne voit rien de A");
await vide("B : réservations", "/reservations", B.salle2);
await vide("B : clients", "/clients", B.salle2);
await vide("B : salles", "/salles", B.salle2);
await vide("B : stock", "/stock-items", B.cuis2);
await vide("B : carte", "/menu-items", B.cuis2);
await vide("B : alertes stock", "/stock-alerts", B.cuis2);
await vide("B : historique d'un article de A", "/stock-items/saumon/movements", B.cuis2);
await vide("B : relevés HACCP", "/checklist-entries", B.cuis2);
await vide("B : comptes rendus", "/comptes-rendus", B.dir);
await vide("B : comptes de l'équipe", "/comptes", B.dir, (j) => j.comptes);
await vide("B : délégations", "/delegations", B.dir);
await vide("B : membres temporaires", "/restaurant/members", B.dir, (j) => j.members);
await vide("B : journal d'audit", "/audit", B.dir, (j) => j.evenements);
await vide("B : destinataires messagerie", "/messagerie/destinataires", B.dir);

console.log("\n— Le restaurant B ne peut rien toucher chez A (404 attendu)");
await attendu("B : lire un client de A", 404, "GET", "/clients/client-fontaine", B.salle2);
await attendu("B : écraser un client de A", 404, "POST", "/clients", B.salle2, { id: "client-fontaine", nom: "Piraté", allergies: [], createdAt: "", lastVisitAt: "" });
await attendu("B : lire la salle de A", 404, "GET", "/salles/salle-1", B.salle2);
await attendu("B : déplacer une table de A", 404, "PUT", "/tables/t1/position", B.salle2, { x: 0, y: 0 });
await attendu("B : changer le service d'une table de A", 404, "PUT", "/tables/t1/service", B.salle2, { tableId: "t1", course: "plat", dishStatus: "servi" });
await attendu("B : envoyer l'addition d'une table de A", 404, "PUT", "/tables/t2/bill", B.salle2, { tableId: "t2", occurredAt: new Date().toISOString() });
await attendu("B : annuler une réservation de A", 404, "DELETE", "/reservations/r1", B.salle2);
await attendu("B : mouvement sur un article de A", 404, "POST", "/stock-items/saumon/movements", B.cuis2, { type: "perte", quantite: 1 });
await attendu("B : retirer un article de A", 404, "DELETE", "/stock-items/oeufs", B.cuis2);
await attendu("B : annuler une sortie de A", 404, "POST", `/stock-movements/${mvt.id}/annuler`, B.cuis2);
await attendu("B : commander un plat de A", 404, "POST", "/menu-items/veloute-potimarron-chataigne/order", B.salle0, { tableId: "t1", quantite: 1 });
await attendu("B : créer un plat avec le stock de A", 400, "POST", "/menu-items", B.cuis2, { nom: "Vol", prixVente: 10, ingredients: [{ stockItemId: "saumon", quantite: 1 }] });
await attendu("B : désactiver un compte de A", 404, "POST", `/comptes/${compte.id}/desactiver`, B.dir);
await attendu("B : couper la messagerie d'un compte de A", 404, "POST", "/comptes/comptesalle-0/messagerie", B.dir, { active: false });
await attendu("B : nouveau code pour un compte de A", 404, "POST", `/comptes/${compte.id}/code`, B.dir);
await attendu("B : révoquer une délégation de A", 404, "POST", `/delegations/${deleg.id}/revoquer`, B.dir);
await attendu("B : déléguer à un employé de A", 404, "POST", "/delegations", B.dir, { delegueId: "comptecuisin-1", pole: "cuisine", jours: 1 });
await attendu("B : lire le tableau d'affichage de A", 404, "GET", "/conversations/annonce-general/messages", B.salle0);
await attendu("B : écrire sur le tableau d'affichage de A", 404, "POST", "/conversations/annonce-general/messages", B.salle2, { contenu: "intrusion" });
await attendu("B : écrire en privé à un employé de A", 404, "POST", "/conversations/dm", B.dir, { targetId: "comptecuisin-2" });

console.log("\n— Le restaurant A garde tout (fonctionnalités de démo intactes)");
await attendu("A : son client", 200, "GET", "/clients/client-fontaine", A.salle2);
await attendu("A : déplacer sa table", 200, "PUT", "/tables/t1/position", A.salle2, { x: 20, y: 30 });
await attendu("A : annuler sa sortie", 200, "POST", `/stock-movements/${mvt.id}/annuler`, A.cuis2);
await attendu("A : révoquer sa délégation", 200, "POST", `/delegations/${deleg.id}/revoquer`, A.dir);
const conv = (await call("GET", "/conversations", A.salle2)).json;
console.log(`OK  ... A voit ses ${conv.length} conversations`);
console.log(ko === 0 ? "\nTOUT OK" : `\n${ko} ÉCHEC(S)`);
process.exit(ko === 0 ? 0 : 1);
