import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isMockMode } from "../supabase";
import "../auth";

type RestaurantUniverse = {
  id: string;
  nom: string;
  slug: string;
  actif: boolean;
  rlsEnabled: boolean;
  realtimeEnabled: boolean;
  createdAt: string;
};

type CreateRestaurantBody = {
  nom?: string;
  slug?: string;
  restaurantId?: string;
  actif?: boolean;
  rlsEnabled?: boolean;
  realtimeEnabled?: boolean;
};

const universes: RestaurantUniverse[] = [];

export async function platformRoutes(app: FastifyInstance) {
  app.get("/platform/restaurants", async (req, reply) => {
    if (!canManagePlatform(req, reply)) return;
    return { restaurants: universes };
  });

  app.post<{ Body: CreateRestaurantBody }>("/platform/restaurants", async (req, reply) => {
    if (!canManagePlatform(req, reply)) return;

    const nom = req.body.nom?.trim();
    const slug = normalizeSlug(req.body.slug ?? "");
    if (!nom || !slug) {
      return reply.status(400).send({ error: "Le nom et le slug sont obligatoires" });
    }

    if (universes.some((universe) => universe.slug === slug)) {
      return reply.status(409).send({ error: "Ce slug restaurant existe déjà" });
    }

    const universe: RestaurantUniverse = {
      id: req.body.restaurantId?.trim() || randomUUID(),
      nom,
      slug,
      actif: req.body.actif ?? true,
      rlsEnabled: req.body.rlsEnabled ?? true,
      realtimeEnabled: req.body.realtimeEnabled ?? true,
      createdAt: new Date().toISOString(),
    };
    universes.push(universe);

    return reply.status(201).send({ restaurant: universe, provisioning: "mock" });
  });
}

function canManagePlatform(request: FastifyRequest, reply: FastifyReply): boolean {
  const isDevelopmentMock = isMockMode && process.env.NODE_ENV !== "production";
  if (isDevelopmentMock || request.auth?.platformRole === "dev_creator") return true;
  void reply.status(403).send({ error: "PLATFORM_CREATOR_REQUIRED" });
  return false;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
