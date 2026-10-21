import type { FastifyRequest } from "fastify";
import type { AccessRole, Pole } from "@resto-plus/types";
import { isAuthRequired } from "./auth";

export interface Identity {
  id: string;
  nom: string;
  accessRole: AccessRole;
  pole: Pole;
}

/**
 * Résout l'identité de l'appelant pour la messagerie : priorité à une vraie session
 * Supabase (req.auth) quand elle porte accessRole+pole, sinon repli sur les en-têtes
 * de démo envoyées par le client (voir apps/mobile/src/api/client.ts).
 * Ces en-têtes ne sont PAS un mécanisme de sécurité — juste un identifiant de test
 * tant que les 7 comptes de démo ne sont pas de vrais comptes Supabase Auth.
 */
export function resolveIdentity(req: FastifyRequest): Identity | null {
  if (req.auth?.accessRole && req.auth.pole) {
    return {
      id: req.auth.userId,
      nom: req.auth.userId,
      accessRole: req.auth.accessRole,
      pole: req.auth.pole,
    };
  }

  // ╔════════════════════════════════════════════════════════════════════════════════╗
  // ║  ⚠️⚠️⚠️  SÉCURITÉ ABAISSÉE POUR LA DÉMO  ⚠️⚠️⚠️                                    ║
  // ║  Les en-têtes X-Demo-User-* sont FALSIFIABLES : n'importe qui peut s'y déclarer ║
  // ║  directeur. Ils ne sont lus que si REQUIRE_AUTH=false (Expo Go, comptes de      ║
  // ║  démo sans Supabase). Avec l'authentification exigée, seule la session Supabase ║
  // ║  (req.auth) compte et cette fonction renvoie null sans elle.                    ║
  // ╚════════════════════════════════════════════════════════════════════════════════╝
  if (isAuthRequired()) return null;

  const id = req.headers["x-demo-user-id"];
  const nomHeader = req.headers["x-demo-user-nom"];
  const accessRole = req.headers["x-demo-user-accessrole"];
  const pole = req.headers["x-demo-user-pole"];
  if (typeof id !== "string" || typeof accessRole !== "string" || typeof pole !== "string") {
    return null;
  }
  let nom = id;
  if (typeof nomHeader === "string") {
    try {
      nom = decodeURIComponent(nomHeader);
    } catch {
      nom = nomHeader;
    }
  }
  return { id, nom, accessRole: accessRole as AccessRole, pole: pole as Pole };
}
