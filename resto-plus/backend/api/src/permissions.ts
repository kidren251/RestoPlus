import type { FastifyReply, FastifyRequest } from "fastify";
import { can, type Permission, type PermissionSubject } from "@resto-plus/types";
import { isAuthRequired } from "./auth";
import { resolveIdentity } from "./demoIdentity";
import { appliquerDelegation } from "./delegationStore";
import { journaliser } from "./audit";
import { restaurantDe } from "./tenant";


/**
 * Qui fait la requête, pour le contrôle des droits.
 * - Session Supabase (req.auth) : seule source acceptée dès que l'auth est exigée.
 * - En-têtes de démo (X-Demo-User-*) : acceptés uniquement quand l'auth n'est pas
 *   exigée (dev / Expo Go). Ils sont falsifiables, donc jamais pris en compte en prod.
 */
export function resolveSubject(req: FastifyRequest): PermissionSubject | null {
  const restaurantId = restaurantDe(req);
  if (req.auth?.accessRole && req.auth.pole) {
    return appliquerDelegation({ accessRole: req.auth.accessRole, pole: req.auth.pole }, restaurantId, req.auth.userId);
  }
  if (isAuthRequired()) return null;
  const identity = resolveIdentity(req);
  if (!identity) return null;
  // Délégation du N3 : un N1 exerce temporairement les droits du N2 de son pôle.
  return appliquerDelegation({ accessRole: identity.accessRole, pole: identity.pole }, restaurantId, identity.id);
}

/**
 * preHandler Fastify : refuse la requête si l'appelant n'a pas le droit demandé
 * (matrice partagée dans packages/types/src/permissions.ts).
 * Sans aucune identité et sans auth exigée (curl, anciens clients), on laisse passer
 * comme le reste du mode mock ; avec l'auth exigée, l'absence d'identité est un refus.
 */
export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    checkPermission(req, reply, permission);
  };
}

/**
 * Variante utilisable dans un handler quand le droit dépend de la requête (ex. type
 * de mouvement de stock). Renvoie false et a déjà répondu 401/403 si refusé.
 */
export function checkPermission(req: FastifyRequest, reply: FastifyReply, permission: Permission): boolean {
  const subject = resolveSubject(req);
  if (!subject) {
    if (!isAuthRequired()) return true;
    reply.status(401).send({ error: "AUTH_REQUIRED" });
    return false;
  }
  if (!can(subject, permission)) {
    // Une tentative hors de ses droits est une information de sécurité, pas une faute :
    // on garde la trace de la route et du droit manquant, rien de plus.
    journaliser(req, "acces.refuse", { details: { permission, route: `${req.method} ${req.routeOptions.url ?? req.url}` } });
    reply.status(403).send({ error: "ACCESS_LEVEL_INSUFFICIENT", permission });
    return false;
  }
  return true;
}
