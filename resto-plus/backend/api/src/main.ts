import Fastify from "fastify";
import { sallesRoutes } from "./routes/salles";
import { tablesRoutes } from "./routes/tables";
import { checklistsRoutes } from "./routes/checklists";
import { reservationsRoutes } from "./routes/reservations";
import { clientsRoutes } from "./routes/clients";
import { invitationsRoutes } from "./routes/invitations";
import { platformRoutes } from "./routes/platform";
import { stockRoutes } from "./routes/stock";
import { menuRoutes } from "./routes/menu";
import { isMockMode } from "./supabase";
import { authenticateRequest, isAuthRequired } from "./auth";

const app = Fastify({ logger: true });

app.decorateRequest("auth", null);

app.addHook("onRequest", async (req, reply) => {
  const isInvitationRedemption = req.method === "POST" && req.url === "/invitations/redeem";
  if (req.method === "OPTIONS" || req.url === "/health" || isInvitationRedemption) return;
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
  reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
});
app.options("*", async (_req, reply) => reply.status(204).send());

// Santé
app.get("/health", async () => ({
  status: "ok",
  mode: isMockMode ? "mock" : "supabase",
  authRequired: isAuthRequired(),
  ts: new Date().toISOString(),
}));

async function start() {
  if (!isAuthRequired()) {
    app.log.warn(
      "REQUIRE_AUTH=false : toutes les routes métier sont accessibles sans jeton. " +
        "OK en dev/Expo Go, jamais acceptable en production."
    );
  }

  await app.register(sallesRoutes);
  await app.register(tablesRoutes);
  await app.register(checklistsRoutes);
  await app.register(reservationsRoutes);
  await app.register(clientsRoutes);
  await app.register(invitationsRoutes);
  await app.register(platformRoutes);
  await app.register(stockRoutes);
  await app.register(menuRoutes);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
