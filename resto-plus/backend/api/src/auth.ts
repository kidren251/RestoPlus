import type { FastifyRequest } from "fastify";
import type { AccessRole } from "@resto-plus/types";
import { supabase } from "./supabase";

export interface AuthContext {
  userId: string;
  restaurantId: string;
  accessRole: AccessRole;
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

const authRequired = process.env.REQUIRE_AUTH === "true";

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
  };
}

export function isAuthRequired(): boolean {
  return authRequired;
}