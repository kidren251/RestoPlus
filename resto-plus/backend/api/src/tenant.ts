import type { FastifyRequest } from "fastify";
import { isAuthRequired } from "./auth";

/**
 * Appartenance des données au restaurant — Resto Plus
 *
 * RÈGLE : toute donnée lue ou modifiée par l'API doit appartenir au restaurant de
 * l'utilisateur connecté. L'API accède à Supabase avec la clé service_role, qui ignore
 * la RLS : c'est donc ICI, et nulle part ailleurs, que se joue l'isolation entre
 * restaurants. Toute nouvelle route qui lit un objet par son id passe par
 * `appartient()` et répond 404 (jamais 403, pour ne pas révéler qu'il existe ailleurs).
 */

export const DEMO_RESTAURANT_ID = "demo-restaurant";

/** Restaurant auquel rien n'appartient : réponse sûre quand on ne sait pas qui appelle. */
const AUCUN_RESTAURANT = "aucun-restaurant";

// ╔══════════════════════════════════════════════════════════════════════════════════╗
// ║  ⚠️⚠️⚠️  SÉCURITÉ ABAISSÉE POUR LA DÉMO (Expo Go, REQUIRE_AUTH=false)  ⚠️⚠️⚠️        ║
// ║                                                                                  ║
// ║  Sans authentification exigée, le restaurant n'est pas prouvé par une session :  ║
// ║   - par défaut, tout appel est rattaché au restaurant de démo ;                  ║
// ║   - l'en-tête X-Demo-Restaurant-Id permet de simuler un AUTRE restaurant, pour   ║
// ║     les tests d'isolation (test « restaurant A contre restaurant B »).           ║
// ║  N'importe qui peut donc choisir son restaurant en mode démo.                     ║
// ║                                                                                  ║
// ║  Dès que REQUIRE_AUTH=true (ou NODE_ENV=production), ce bloc est ignoré : seul   ║
// ║  le restaurant porté par la session Supabase (req.auth) est pris en compte.      ║
// ║  NE JAMAIS déployer une API publique avec REQUIRE_AUTH=false.                    ║
// ╚══════════════════════════════════════════════════════════════════════════════════╝
function restaurantDeDemo(req: FastifyRequest): string {
  const entete = req.headers["x-demo-restaurant-id"];
  return typeof entete === "string" && entete.trim() ? entete.trim() : DEMO_RESTAURANT_ID;
}

export function restaurantDe(req: FastifyRequest): string {
  if (req.auth?.restaurantId) return req.auth.restaurantId;
  if (isAuthRequired()) return AUCUN_RESTAURANT;
  return restaurantDeDemo(req);
}

/** La donnée appartient-elle au restaurant de l'appelant ? */
export function appartient(donnee: { restaurantId?: string } | undefined, req: FastifyRequest): boolean {
  return !!donnee && donnee.restaurantId === restaurantDe(req);
}

/** Ne garde que les données du restaurant de l'appelant. */
export function duRestaurant<T extends { restaurantId?: string }>(donnees: T[], req: FastifyRequest): T[] {
  const restaurantId = restaurantDe(req);
  return donnees.filter((donnee) => donnee.restaurantId === restaurantId);
}
