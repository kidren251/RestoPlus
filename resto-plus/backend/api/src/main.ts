import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

// TODO Étape 1 : routes /salles, /tables, /checklists, /messages
// avec vérification RBAC via Supabase RLS (voir backend/db/migrations)

const port = Number(process.env.PORT ?? 3000);

app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
