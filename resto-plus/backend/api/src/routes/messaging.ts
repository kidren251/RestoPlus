import type { FastifyInstance } from "fastify";
import type { ChatMessage, Conversation, Pole } from "@resto-plus/types";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Destinataire } from "@resto-plus/types";
import { resolveIdentity, type Identity } from "../demoIdentity";
import { membresMessagerie, trouverMembre } from "./comptes";
import "../auth";
import { restaurantDe, DEMO_RESTAURANT_ID } from "../tenant";


// Conversations mockées — Phase 1 (en mémoire). Le tableau d'affichage et les deux
// canaux de pôle sont créés une fois pour l'établissement de démo ; les canaux
// supplémentaires et les DM sont créés à la demande.
const conversations: Conversation[] = [
  { id: "annonce-general", restaurantId: DEMO_RESTAURANT_ID, type: "annonce", nom: "Général", createdAt: new Date().toISOString() },
  { id: "canal-salle", restaurantId: DEMO_RESTAURANT_ID, type: "canal", nom: "Salle", pole: "salle", createdAt: new Date().toISOString() },
  { id: "canal-cuisine", restaurantId: DEMO_RESTAURANT_ID, type: "canal", nom: "Cuisine", pole: "cuisine", createdAt: new Date().toISOString() },
];

const messages: ChatMessage[] = [];

/**
 * Règle de DM : jamais entre deux membres du même niveau. La direction (N3) peut
 * écrire à tout le monde ; un manager de pôle (N2) peut écrire à la direction, à un
 * autre N2 (coordination inter-pôles), et aux membres de son propre pôle ; un N0/N1
 * ne peut écrire qu'à son N2 et à la direction.
 */
function canDm(a: Identity, b: Identity): boolean {
  if (a.id === b.id) return false;
  const isDirector = (u: Identity) => u.accessRole === "directeur_admin";
  const isManager = (u: Identity) => u.accessRole === "manager_admin";
  if (isDirector(a) || isDirector(b)) return true;
  if (isManager(a) && isManager(b)) return true;
  if (isManager(a) && a.pole === b.pole) return true;
  if (isManager(b) && b.pole === a.pole) return true;
  return false;
}

/**
 * Identité autorisée à utiliser la messagerie : un membre de l'annuaire doit être
 * actif et avoir l'accès messagerie ouvert par le N3. Une identité hors annuaire
 * (intérimaire par QR) garde l'accès en lecture/écriture à ses canaux, sans DM.
 */
function identiteMessagerie(req: FastifyRequest, reply: FastifyReply): Identity | null {
  const identity = resolveIdentity(req);
  if (!identity) {
    reply.status(401).send({ error: "IDENTITY_REQUIRED" });
    return null;
  }
  const membre = trouverMembre(restaurantDe(req), identity.id);
  if (membre && (membre.statut !== "actif" || !membre.messagerie)) {
    reply.status(403).send({ error: "Ton accès à la messagerie n'est pas activé. Demande-le à ta direction." });
    return null;
  }
  return identity;
}

function canReadConversation(identity: Identity, conversation: Conversation): boolean {
  if (conversation.type === "annonce") return true;
  if (conversation.type === "canal") return identity.pole === "direction" || identity.pole === conversation.pole;
  return (conversation.participantIds ?? []).includes(identity.id);
}

function canWriteConversation(identity: Identity, conversation: Conversation): boolean {
  if (conversation.type === "annonce") {
    return identity.accessRole === "manager_admin" || identity.accessRole === "directeur_admin";
  }
  return canReadConversation(identity, conversation);
}

export async function messagingRoutes(app: FastifyInstance) {
  // GET /conversations — celles visibles par l'appelant (annonce + son/ses canaux + ses DM)
  app.get("/conversations", async (req, reply) => {
    const identity = identiteMessagerie(req, reply);
    if (!identity) return;
    const restaurantId = restaurantDe(req);
    // Un DM n'a pas de nom : on lui donne celui de l'autre participant, pris dans l'annuaire.
    return conversations
      .filter((c) => c.restaurantId === restaurantId && canReadConversation(identity, c))
      .map((c) => {
        if (c.type !== "dm") return c;
        const autreId = c.participantIds?.find((id) => id !== identity.id);
        return { ...c, nom: (autreId && trouverMembre(restaurantId, autreId)?.nom) || c.nom };
      });
  });

  // GET /messagerie/destinataires — qui l'appelant peut contacter en message direct
  app.get("/messagerie/destinataires", async (req, reply) => {
    const identity = identiteMessagerie(req, reply);
    if (!identity) return;
    const restaurantId = restaurantDe(req);
    const destinataires: Destinataire[] = membresMessagerie(restaurantId)
      .filter((membre) => canDm(identity, membre))
      .map(({ id, nom, accessRole, pole }) => ({ id, nom, accessRole, pole }));
    return destinataires;
  });

  // POST /conversations/canaux — crée un canal de pôle, réservé au N3
  app.post<{ Body: { nom: string; pole: Pole } }>("/conversations/canaux", async (req, reply) => {
    const identity = identiteMessagerie(req, reply);
    if (!identity) return;
    if (identity.accessRole !== "directeur_admin") {
      return reply.status(403).send({ error: "DIRECTOR_ADMIN_REQUIRED" });
    }
    if (!req.body.nom?.trim()) return reply.status(400).send({ error: "Le nom est obligatoire" });
    const canal: Conversation = {
      id: `canal_${Date.now()}`,
      restaurantId: restaurantDe(req),
      type: "canal",
      nom: req.body.nom.trim(),
      pole: req.body.pole,
      createdAt: new Date().toISOString(),
    };
    conversations.push(canal);
    return reply.status(201).send(canal);
  });

  // POST /conversations/dm — trouve ou crée le DM avec la cible, si la hiérarchie l'autorise
  app.post<{ Body: { targetId: string; targetNom: string; targetAccessRole: Identity["accessRole"]; targetPole: Pole } }>(
    "/conversations/dm",
    async (req, reply) => {
      const identity = identiteMessagerie(req, reply);
      if (!identity) return;
      const restaurantId = restaurantDe(req);
      // Le niveau et le pôle de la cible viennent de l'annuaire, jamais du client.
      const target = membresMessagerie(restaurantId).find((membre) => membre.id === req.body.targetId);
      if (!target) {
        return reply.status(404).send({ error: "Ce destinataire n'a pas accès à la messagerie." });
      }
      if (!canDm(identity, target)) {
        return reply.status(403).send({ error: "DM_NOT_ALLOWED_BETWEEN_THESE_LEVELS" });
      }
      const existing = conversations.find(
        (c) =>
          c.restaurantId === restaurantId &&
          c.type === "dm" &&
          (c.participantIds ?? []).includes(identity.id) &&
          (c.participantIds ?? []).includes(target.id)
      );
      if (existing) return existing;

      const dm: Conversation = {
        id: `dm_${Date.now()}`,
        restaurantId,
        type: "dm",
        participantIds: [identity.id, target.id],
        createdAt: new Date().toISOString(),
      };
      conversations.push(dm);
      return reply.status(201).send(dm);
    }
  );

  // GET /conversations/:id/messages
  app.get<{ Params: { id: string } }>("/conversations/:id/messages", async (req, reply) => {
    const identity = identiteMessagerie(req, reply);
    if (!identity) return;
    const conversation = conversations.find((c) => c.id === req.params.id && c.restaurantId === restaurantDe(req));
    if (!conversation) return reply.status(404).send({ error: "Conversation introuvable" });
    if (!canReadConversation(identity, conversation)) return reply.status(403).send({ error: "ACCESS_DENIED" });
    return messages
      .filter((m) => m.conversationId === req.params.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  });

  // POST /conversations/:id/messages
  app.post<{ Params: { id: string }; Body: { contenu: string } }>("/conversations/:id/messages", async (req, reply) => {
    const identity = identiteMessagerie(req, reply);
    if (!identity) return;
    const conversation = conversations.find((c) => c.id === req.params.id && c.restaurantId === restaurantDe(req));
    if (!conversation) return reply.status(404).send({ error: "Conversation introuvable" });
    if (!canWriteConversation(identity, conversation)) return reply.status(403).send({ error: "ACCESS_DENIED" });
    if (!req.body.contenu?.trim()) return reply.status(400).send({ error: "Le message est vide" });

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.round(Math.random() * 1000)}`,
      conversationId: conversation.id,
      restaurantId: conversation.restaurantId,
      emetteurId: identity.id,
      emetteurNom: identity.nom,
      emetteurAccessRole: identity.accessRole,
      contenu: req.body.contenu.trim(),
      timestamp: new Date().toISOString(),
    };
    messages.push(message);
    return reply.status(201).send(message);
  });
}
