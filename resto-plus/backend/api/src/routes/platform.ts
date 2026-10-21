import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { validerReglagesDroits } from "@resto-plus/types";
import { isAuthRequired } from "../auth";
import { repositories } from "../repositories";
import { journaliser } from "../audit";
import { restaurantDe } from "../tenant";

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
  // GET /restaurant/reglages-droits — réglages de SON établissement, lus par l'app à la
  // connexion pour masquer les mêmes actions que celles que l'API refuse.
  app.get("/restaurant/reglages-droits", async (req) => {
    return { reglages: await repositories.etablissements.reglagesDroits(restaurantDe(req)) };
  });

  app.get("/platform/restaurants", async (req, reply) => {
    if (!canManagePlatform(req, reply)) return;
    // Établissements existants (base ou démo) + univers créés depuis la console (maquette).
    const existants = (await repositories.etablissements.lister()).map((e) => ({
      ...e,
      actif: true,
      rlsEnabled: true,
      realtimeEnabled: false,
      createdAt: "",
    }));
    return { restaurants: [...existants, ...universes.filter((u) => !existants.some((e) => e.id === u.id))] };
  });

  // Droits du service réglables par établissement (liste fermée : PERMISSIONS_REGLABLES).
  app.get<{ Params: { id: string } }>("/platform/restaurants/:id/reglages-droits", async (req, reply) => {
    if (!canManagePlatform(req, reply)) return;
    return { reglages: await repositories.etablissements.reglagesDroits(req.params.id) };
  });

  app.put<{ Params: { id: string }; Body: { reglages: unknown } }>("/platform/restaurants/:id/reglages-droits", async (req, reply) => {
    if (!canManagePlatform(req, reply)) return;
    const reglages = validerReglagesDroits(req.body?.reglages);
    if (!reglages) return reply.status(400).send({ error: "Réglages invalides : droits réglables uniquement, niveaux 0 à 3" });
    const avant = await repositories.etablissements.reglagesDroits(req.params.id);
    if (!(await repositories.etablissements.modifierReglagesDroits(req.params.id, reglages))) {
      return reply.status(404).send({ error: "Établissement introuvable" });
    }
    journaliser(req, "droits.reglages_modifies", { restaurantId: req.params.id, avant, apres: reglages });
    return { reglages };
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

// ╔════════════════════════════════════════════════════════════════════════════════╗
// ║  ⚠️⚠️⚠️  SÉCURITÉ ABAISSÉE POUR LA DÉMO  ⚠️⚠️⚠️                                    ║
// ║  En mode démo hors production (REQUIRE_AUTH=false), la console plateforme N4   ║
// ║  est ouverte à TOUT appelant de l'API, sans aucune vérification d'identité :    ║
// ║  c'est ce qui permet de la tester depuis Expo Go, y compris sur la base de dev. ║
// ║  Côté app, elle n'est affichée qu'au N3 (voir AppNavigator), mais l'API, elle,  ║
// ║  ne filtre rien dans ce mode.                                                   ║
// ║  Dès que l'authentification est exigée (REQUIRE_AUTH=true ou production), seul  ║
// ║  platform_role=dev_creator (app_metadata Supabase) y a accès.                   ║
// ╚════════════════════════════════════════════════════════════════════════════════╝
function canManagePlatform(request: FastifyRequest, reply: FastifyReply): boolean {
  const modeDemo = !isAuthRequired() && process.env.NODE_ENV !== "production";
  if (modeDemo || request.auth?.platformRole === "dev_creator") return true;
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
