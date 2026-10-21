import { buildApp } from "./app";
import { isAuthRequired } from "./auth";

async function start() {
  const app = await buildApp();

  if (!isAuthRequired()) {
    app.log.warn(
      "REQUIRE_AUTH=false : toutes les routes métier sont accessibles sans jeton. " +
        "OK en dev/Expo Go, jamais acceptable en production."
    );
  }

  const port = Number(process.env.PORT ?? 3000);
  try {
    await app.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
