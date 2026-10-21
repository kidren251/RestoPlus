import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

/**
 * Outils communs aux tests de l'API : l'app est construite sans serveur et interrogée
 * avec app.inject(). Vitest isole chaque fichier de test, donc chaque fichier part de
 * données de démo fraîches (stockage en mémoire).
 */

export function nouvelleApp(): Promise<FastifyInstance> {
  return buildApp({ logger: false });
}

/** En-têtes d'identité de démo (acceptés seulement quand REQUIRE_AUTH n'est pas exigé). */
export function identite(restaurant: string | null, id: string, role: string, pole: string) {
  return {
    "x-demo-user-id": id,
    "x-demo-user-nom": id,
    "x-demo-user-accessrole": role,
    "x-demo-user-pole": pole,
    ...(restaurant ? { "x-demo-restaurant-id": restaurant } : {}),
  };
}

type Methode = "GET" | "POST" | "PUT" | "DELETE";

export async function appel(app: FastifyInstance, method: Methode, url: string, headers: Record<string, string>, body?: unknown) {
  const res = await app.inject({
    method,
    url,
    headers,
    ...(method === "GET" ? {} : { payload: (body ?? {}) as object }),
  });
  let json: any = {};
  try {
    json = res.json();
  } catch {
    // réponse vide
  }
  return { status: res.statusCode, json };
}
