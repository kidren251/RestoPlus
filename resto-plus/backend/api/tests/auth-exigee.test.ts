/**
 * Mode authentification exigée (REQUIRE_AUTH=true) : les en-têtes de démo ne valent
 * plus rien, toute route métier sans jeton est refusée. auth.ts lit la variable au
 * chargement du module, d'où le vi.resetModules() avant de construire l'app.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appel, identite } from "./helpers";

let app: FastifyInstance;

beforeAll(async () => {
  vi.stubEnv("REQUIRE_AUTH", "true");
  vi.stubEnv("SUPABASE_URL", "");
  vi.resetModules();
  const { buildApp } = await import("../src/app");
  app = await buildApp({ logger: false });
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("REQUIRE_AUTH=true", () => {
  it("/health reste public et annonce l'auth exigée", async () => {
    const { status, json } = await appel(app, "GET", "/health", {});
    expect(status).toBe(200);
    expect(json.authRequired).toBe(true);
  });

  it("une route métier sans jeton → 401", async () => {
    expect((await appel(app, "GET", "/salles", {})).status).toBe(401);
  });

  it("les en-têtes de démo ne remplacent pas un jeton", async () => {
    const directeur = identite("resto-b", "comptesalle-3", "directeur_admin", "direction");
    expect((await appel(app, "GET", "/audit", directeur)).status).toBe(401);
  });

  it("un jeton sans fournisseur d'auth configuré → 503, jamais 200", async () => {
    const { status } = await appel(app, "GET", "/salles", { authorization: "Bearer faux-jeton" });
    expect(status).toBe(503);
  });
});
