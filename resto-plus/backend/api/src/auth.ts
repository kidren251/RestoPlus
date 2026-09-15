import type { FastifyRequest } from "fastify";
import type { AccessRole, PlatformRole } from "@resto-plus/types";
import { supabase } from "./supabase";

export interface AuthContext {
  userId: string;
  restaurantId?: string;
  accessRole?: AccessRole;
  platformRole: PlatformRole;
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

// En production, l'auth est exigée par défaut (fail-closed) : il faut explicitement
// poser REQUIRE_AUTH=false pour la désactiver, et c'est refusé au démarrage (voir plus bas).
// Hors production (dev local, tests Expo Go sans Supabase), l'auth reste optionnelle par
// défaut pour ne pas bloquer les tests en mode mock ; il faut REQUIRE_AUTH=true pour l'exiger.
const isProduction = process.env.NODE_ENV === "production";
const requireAuthEnv = process.env.REQUIRE_AUTH;

if (isProduction && requireAuthEnv === "false") {
  throw new Error(
    "REQUIRE_AUTH=false est interdit quand NODE_ENV=production : l'API démarrerait sans authentification."
  );
}

const authRequired = isProduction ? requireAuthEnv !== "false" : requireAuthEnv === "true";

export async function authenticateRequest(request: FastifyRequest): Promise<AuthContext | null> {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    if (authRequired) {
      throw new Error("AUTH_REQUIRED");
    }
    return null;
  }

  if (!supabase) {
    throw new Error("AUTH_PROVIDER_UNAVAILABLE");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    throw new Error("AUTH_INVALID");
  }

  const platformRole: PlatformRole = userData.user.app_metadata?.platform_role === "dev_creator"
    ? "dev_creator"
    : "restaurant_user";

  if (platformRole === "dev_creator") {
    return {
      userId: userData.user.id,
      platformRole,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_members")
    .select("restaurant_id, access_role, actif")
    .eq("user_id", userData.user.id)
    .eq("actif", true)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("RESTAURANT_MEMBERSHIP_REQUIRED");
  }

  return {
    userId: userData.user.id,
    restaurantId: membership.restaurant_id,
    accessRole: membership.access_role as AccessRole,
    platformRole,
  };
}

export function isAuthRequired(): boolean {
  return authRequired;
}