import Fastify, { type FastifyServerOptions } from "fastify";
import { sallesRoutes } from "./routes/salles";
import { tablesRoutes } from "./routes/tables";
import { checklistsRoutes } from "./routes/checklists";
import { reservationsRoutes } from "./routes/reservations";
import { clientsRoutes } from "./routes/clients";
import { invitationsRoutes } from "./routes/invitations";
import { platformRoutes } from "./routes/platform";
import { stockRoutes } from "./routes/stock";
import { menuRoutes } from "./routes/menu";
import { messagingRoutes } from "./routes/messaging";
import { comptesRendusRoutes } from "./routes/comptesRendus";
import { comptesRoutes } from "./routes/comptes";
import { delegationsRoutes } from "./routes/delegations";
import { auditRoutes } from "./routes/audit";
import { isMockMode } from "./supabase";
import { authenticateRequest, isAuthRequired } from "./auth";

/**
 * Construction de l'API, sans démarrage du serveur : main.ts l'écoute sur un port,
 * les tests l'interrogent directement avec app.inject().
 */
export async function buildApp(options: FastifyServerOptions = { logger: true }) {
  const app = Fastify(options);

  app.decorateRequest("auth", null);

  // Routes publiques : on ne peut pas encore être connecté quand on les appelle.
  const PUBLIC_POST_ROUTES = ["/invitations/redeem", "/comptes/activer", "/auth/login"];

  app.addHook("onRequest", async (req, reply) => {
    const isPublicRoute = req.method === "POST" && PUBLIC_POST_ROUTES.includes(req.url);
    if (req.method === "OPTIONS" || req.url === "/health" || isPublicRoute) return;
    try {
      req.auth = await authenticateRequest(req);
    } catch (error) {
      const code = error instanceof Error ? error.message : "AUTH_INVALID";
      const status = code === "AUTH_PROVIDER_UNAVAILABLE" ? 503 : 401;
      return reply.status(status).send({ error: code });
    }
  });

  // CORS permissif pour dev local (Expo Go)
  app.addHook("onRequest", async (_req, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Demo-User-Id, X-Demo-User-Nom, X-Demo-User-AccessRole, X-Demo-User-Pole, X-Demo-Restaurant-Id");
  });
  app.options("*", async (_req, reply) => reply.status(204).send());

  // Santé
  app.get("/health", async () => ({
    status: "ok",
    mode: isMockMode ? "mock" : "supabase",
    authRequired: isAuthRequired(),
    ts: new Date().toISOString(),
  }));

  await app.register(sallesRoutes);
  await app.register(tablesRoutes);
  await app.register(checklistsRoutes);
  await app.register(reservationsRoutes);
  await app.register(clientsRoutes);
  await app.register(invitationsRoutes);
  await app.register(platformRoutes);
  await app.register(stockRoutes);
  await app.register(menuRoutes);
  await app.register(messagingRoutes);
  await app.register(comptesRendusRoutes);
  await app.register(comptesRoutes);
  await app.register(delegationsRoutes);
  await app.register(auditRoutes);

  return app;
}
