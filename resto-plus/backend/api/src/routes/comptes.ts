import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { CompteEquipe, IdentiteConnexion, ResumeUtilisateurs } from "@resto-plus/types";
import { requirePermission } from "../permissions";
import { countInterimairesActifs } from "./invitations";
import { journaliser } from "../audit";
import "../auth";
import { restaurantDe, DEMO_RESTAURANT_ID } from "../tenant";

/**
 * Comptes équipe permanents — Resto Plus
 *
 * Le directeur (N3) crée un compte (nom, niveau N0-N2, pôle) : l'API renvoie un code
 * d'activation à usage unique, à transmettre à l'employé. Celui-ci installe l'app,
 * choisit « Activer mon compte », saisit le code puis son identifiant et son mot de
 * passe : son compte est rattaché durablement au restaurant. C'est distinct de
 * l'accès intérimaire (QR d'invitation), limité dans le temps.
 *
 * Passage à Supabase : l'activation deviendra supabase.auth.admin.createUser +
 * insertion dans restaurant_members (migration 0010), la connexion
 * supabase.auth.signInWithPassword côté mobile. Les routes gardent le même contrat.
 */

type CompteInterne = CompteEquipe & {
  restaurantId: string;
  passwordHash?: string;
  activationCodeHash?: string;
  createdBy?: string;
};

const ACTIVATION_DAYS = 7;
const MIN_PASSWORD_LENGTH = 8;
// Sans 0/O, 1/I/L : le code est souvent dicté ou recopié à la main.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEMO_LOGIN_PREFIXES = ["comptesalle-", "comptecuisin-"];

// Annuaire du restaurant de démo : les 7 comptes de test (connexion vérifiée côté
// mobile, voir apps/mobile/src/data/demoAccounts.ts — garder les deux listes alignées)
// y figurent pour la messagerie et les délégations. Sans mot de passe côté API.
const COMPTES_DEMO: [string, string, CompteEquipe["accessRole"], CompteEquipe["pole"]][] = [
  ["comptesalle-0", "Serveur (N0) — pôle salle", "serveur", "salle"],
  ["comptesalle-1", "Chef de rang (N1) — pôle salle", "chef_rang", "salle"],
  ["comptesalle-2", "Manager de salle (N2) — pôle salle", "manager_admin", "salle"],
  ["comptesalle-3", "Directeur d'établissement (N3) — direction", "directeur_admin", "direction"],
  ["comptecuisin-0", "Commis de cuisine (N0) — pôle cuisine", "serveur", "cuisine"],
  ["comptecuisin-1", "Chef de partie (N1) — pôle cuisine", "chef_rang", "cuisine"],
  ["comptecuisin-2", "Chef de cuisine (N2) — pôle cuisine", "manager_admin", "cuisine"],
];

const comptes: CompteInterne[] = COMPTES_DEMO.map(([id, nom, accessRole, pole]) => ({
  id,
  restaurantId: DEMO_RESTAURANT_ID,
  nom,
  accessRole,
  pole,
  statut: "actif",
  messagerie: true,
  demo: true,
  login: id,
  createdAt: new Date().toISOString(),
}));

/** Membre de l'annuaire (messagerie, délégations). */
export function trouverMembre(restaurantId: string, id: string): CompteEquipe | undefined {
  const compte = comptes.find((candidate) => candidate.restaurantId === restaurantId && candidate.id === id);
  return compte && versPublic(compte);
}

/** Membres actifs ayant accès à la messagerie. */
export function membresMessagerie(restaurantId: string): CompteEquipe[] {
  return comptes
    .filter((compte) => compte.restaurantId === restaurantId && compte.statut === "actif" && compte.messagerie)
    .map(versPublic);
}

function genererCode() {
  const bloc = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `RP-${bloc()}-${bloc()}`;
}

function normaliserCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function hashCode(code: string) {
  return createHash("sha256").update(normaliserCode(code)).digest("hex");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifierPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidat = scryptSync(password, salt, 64);
  return timingSafeEqual(candidat, Buffer.from(hash, "hex"));
}

/** Vue publique d'un compte : jamais de hash dans une réponse. */
function versPublic(compte: CompteInterne): CompteEquipe {
  const { passwordHash: _p, activationCodeHash: _c, createdBy: _b, ...visible } = compte;
  return visible;
}

function versIdentite(compte: CompteInterne): IdentiteConnexion {
  return { id: compte.id, nom: compte.nom, accessRole: compte.accessRole, pole: compte.pole, restaurantId: compte.restaurantId };
}

function nouveauCodeActivation(compte: CompteInterne) {
  const code = genererCode();
  compte.activationCodeHash = hashCode(code);
  compte.activationExpiresAt = new Date(Date.now() + ACTIVATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return code;
}

// Anti force brute minimal sur les routes publiques. Seuls les ÉCHECS comptent : tous
// les téléphones d'un restaurant sortent souvent par la même IP (Wi-Fi), il ne faut
// pas qu'une équipe qui se connecte normalement se bloque elle-même.
const FENETRE_ECHECS_MS = 15 * 60 * 1000;
const echecs = new Map<string, { count: number; resetAt: number }>();

function bloque(cle: string, max: number, reply: FastifyReply): boolean {
  const entry = echecs.get(cle);
  if (!entry || entry.resetAt < Date.now()) return false;
  if (entry.count < max) return false;
  reply.status(429).send({ error: "Trop de tentatives. Réessaie dans quelques minutes." });
  return true;
}

function noterEchec(cle: string) {
  const entry = echecs.get(cle);
  if (!entry || entry.resetAt < Date.now()) echecs.set(cle, { count: 1, resetAt: Date.now() + FENETRE_ECHECS_MS });
  else entry.count += 1;
}

export function resumeUtilisateurs(restaurantId: string): ResumeUtilisateurs {
  const duRestaurant = comptes.filter((compte) => compte.restaurantId === restaurantId);
  return {
    permanentsActifs: duRestaurant.filter((compte) => compte.statut === "actif").length,
    enAttenteActivation: duRestaurant.filter((compte) => compte.statut === "en_attente_activation").length,
    interimairesActifs: countInterimairesActifs(restaurantId),
  };
}

export async function comptesRoutes(app: FastifyInstance) {
  const gestion = { preHandler: requirePermission("comptes.gerer") };

  // GET /comptes — comptes du restaurant + résumé des utilisateurs (base de facturation)
  app.get("/comptes", gestion, async (req) => {
    const restaurantId = restaurantDe(req);
    return {
      comptes: comptes.filter((compte) => compte.restaurantId === restaurantId).map(versPublic),
      resume: resumeUtilisateurs(restaurantId),
    };
  });

  // POST /comptes — le N3 crée un compte N0-N2 et reçoit le code d'activation (affiché une seule fois)
  app.post<{ Body: { nom: string; accessRole: string; pole: string; messagerie?: boolean } }>("/comptes", gestion, async (req, reply) => {
    const nom = req.body.nom?.trim();
    const { accessRole, pole } = req.body;
    if (!nom) return reply.status(400).send({ error: "Le nom est obligatoire" });
    if (accessRole !== "serveur" && accessRole !== "chef_rang" && accessRole !== "manager_admin") {
      return reply.status(400).send({ error: "Niveau invalide : N0, N1 ou N2 uniquement" });
    }
    if (pole !== "salle" && pole !== "cuisine") return reply.status(400).send({ error: "Pôle invalide" });

    const compte: CompteInterne = {
      id: `compte-${Date.now()}`,
      restaurantId: restaurantDe(req),
      nom,
      accessRole,
      pole,
      statut: "en_attente_activation",
      messagerie: req.body.messagerie !== false,
      createdAt: new Date().toISOString(),
      createdBy: req.auth?.userId,
    };
    const code = nouveauCodeActivation(compte);
    comptes.push(compte);
    // Jamais le code d'activation dans le journal : seulement sa date d'expiration.
    journaliser(req, "compte.cree", {
      cible: { type: "compte", id: compte.id, libelle: compte.nom },
      apres: { accessRole: compte.accessRole, pole: compte.pole, messagerie: compte.messagerie },
      details: { codeExpireLe: compte.activationExpiresAt ?? null },
    });
    return reply.status(201).send({ compte: versPublic(compte), codeActivation: code });
  });

  // POST /comptes/:id/code — nouveau code (perdu ou expiré), l'ancien devient invalide
  app.post<{ Params: { id: string } }>("/comptes/:id/code", gestion, async (req, reply) => {
    const compte = comptes.find((candidate) => candidate.id === req.params.id && candidate.restaurantId === restaurantDe(req));
    if (!compte) return reply.status(404).send({ error: "Compte introuvable" });
    if (compte.statut !== "en_attente_activation") return reply.status(409).send({ error: "Ce compte est déjà activé ou désactivé." });
    const code = nouveauCodeActivation(compte);
    journaliser(req, "compte.nouveau_code", { cible: { type: "compte", id: compte.id, libelle: compte.nom }, details: { codeExpireLe: compte.activationExpiresAt ?? null } });
    return { compte: versPublic(compte), codeActivation: code };
  });

  // POST /comptes/:id/desactiver — départ d'un employé : plus de connexion possible
  app.post<{ Params: { id: string } }>("/comptes/:id/desactiver", gestion, async (req, reply) => {
    const compte = comptes.find((candidate) => candidate.id === req.params.id && candidate.restaurantId === restaurantDe(req));
    if (!compte) return reply.status(404).send({ error: "Compte introuvable" });
    if (compte.accessRole === "directeur_admin") return reply.status(400).send({ error: "Le compte de la direction ne peut pas être désactivé ici." });
    const statutAvant = compte.statut;
    compte.statut = "desactive";
    compte.activationCodeHash = undefined;
    journaliser(req, "compte.desactive", { cible: { type: "compte", id: compte.id, libelle: compte.nom }, avant: statutAvant, apres: "desactive" });
    return versPublic(compte);
  });

  // POST /comptes/:id/messagerie — le N3 ouvre ou coupe l'accès messagerie d'un compte
  app.post<{ Params: { id: string }; Body: { active: boolean } }>("/comptes/:id/messagerie", gestion, async (req, reply) => {
    const compte = comptes.find((candidate) => candidate.id === req.params.id && candidate.restaurantId === restaurantDe(req));
    if (!compte) return reply.status(404).send({ error: "Compte introuvable" });
    if (compte.accessRole === "directeur_admin") return reply.status(400).send({ error: "La direction garde toujours l'accès à la messagerie." });
    const avant = compte.messagerie;
    compte.messagerie = req.body.active === true;
    journaliser(req, "compte.messagerie", { cible: { type: "compte", id: compte.id, libelle: compte.nom }, avant, apres: compte.messagerie });
    return versPublic(compte);
  });

  // POST /comptes/activer — public : première connexion d'un nouvel employé
  app.post<{ Body: { code: string; login: string; password: string } }>("/comptes/activer", async (req, reply) => {
    const cle = `activation:${req.ip}`;
    if (bloque(cle, 20, reply)) return;
    const login = req.body.login?.trim().toLowerCase();
    const { code, password } = req.body;
    if (!code || !login || !password) return reply.status(400).send({ error: "Code, identifiant et mot de passe sont obligatoires." });

    const compte = comptes.find((candidate) => candidate.activationCodeHash === hashCode(code));
    if (!compte || compte.statut !== "en_attente_activation" || !compte.activationExpiresAt || new Date(compte.activationExpiresAt) <= new Date()) {
      noterEchec(cle);
      journaliser(req, "activation.echouee", { details: { ip: req.ip, identifiantDemande: login } });
      return reply.status(400).send({ error: "Code d'activation invalide ou expiré. Demande un nouveau code à ta direction." });
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(login) || DEMO_LOGIN_PREFIXES.some((prefix) => login.startsWith(prefix))) {
      return reply.status(400).send({ error: "Identifiant invalide : 3 à 32 caractères (lettres, chiffres, . _ -)." });
    }
    if (comptes.some((candidate) => candidate.login === login)) {
      return reply.status(409).send({ error: "Cet identifiant est déjà pris." });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return reply.status(400).send({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
    }

    compte.login = login;
    compte.passwordHash = hashPassword(password);
    compte.statut = "actif";
    compte.activationCodeHash = undefined;
    compte.activationExpiresAt = undefined;
    journaliser(req, "compte.active", {
      acteur: { id: compte.id, nom: compte.nom, accessRole: compte.accessRole, pole: compte.pole },
      restaurantId: compte.restaurantId,
      cible: { type: "compte", id: compte.id, libelle: compte.nom },
      avant: "en_attente_activation",
      apres: "actif",
      details: { identifiant: login },
    });
    return versIdentite(compte);
  });

  // POST /auth/login — public : connexion d'un compte activé
  app.post<{ Body: { login: string; password: string } }>("/auth/login", async (req, reply) => {
    const login = req.body.login?.trim().toLowerCase();
    const cle = `login:${req.ip}:${login}`;
    if (bloque(cle, 10, reply)) return;
    const compte = comptes.find((candidate) => candidate.login === login);
    // Même réponse que le compte existe ou non, pour ne pas révéler les identifiants.
    if (!compte?.passwordHash || !req.body.password || !verifierPassword(req.body.password, compte.passwordHash)) {
      noterEchec(cle);
      journaliser(req, "connexion.echouee", { restaurantId: compte?.restaurantId, details: { ip: req.ip, identifiant: login ?? null, motif: "identifiants invalides" } });
      return reply.status(401).send({ error: "Identifiant ou mot de passe invalide." });
    }
    const acteur = { id: compte.id, nom: compte.nom, accessRole: compte.accessRole, pole: compte.pole };
    if (compte.statut !== "actif") {
      journaliser(req, "connexion.echouee", { acteur, restaurantId: compte.restaurantId, details: { ip: req.ip, identifiant: login, motif: "compte désactivé" } });
      return reply.status(403).send({ error: "Ce compte a été désactivé par la direction." });
    }
    journaliser(req, "connexion.reussie", { acteur, restaurantId: compte.restaurantId, details: { ip: req.ip } });
    return versIdentite(compte);
  });
}
