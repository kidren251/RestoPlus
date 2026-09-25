/**
 * Client HTTP léger pour Resto Plus.
 * Toutes les requêtes vers le backend Fastify passent par ici.
 * En Phase 1, la base URL pointe sur localhost (dev) ou sur l'adresse
 * LAN de la machine de dev pour les tests device réels.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TIMEOUT_MS = 8_000;
let accessToken: string | null = null;

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setApiAccessToken(token: string | null) {
  accessToken = token;
}

/**
 * Identité de démo transmise en en-têtes tant que Supabase Auth n'est pas branché.
 * Sert uniquement à la messagerie (savoir qui parle, à qui il a le droit d'écrire) —
 * ce n'est PAS un mécanisme de sécurité : à retirer dès qu'une vraie session
 * Supabase (Bearer token, voir setApiAccessToken) porte cette identité côté API.
 */
interface DemoIdentity {
  id: string;
  nom: string;
  accessRole: string;
  pole: string;
}
let demoIdentity: DemoIdentity | null = null;

export function setDemoIdentity(identity: DemoIdentity | null) {
  demoIdentity = identity;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(demoIdentity
          ? {
              "X-Demo-User-Id": demoIdentity.id,
              "X-Demo-User-Nom": encodeURIComponent(demoIdentity.nom),
              "X-Demo-User-AccessRole": demoIdentity.accessRole,
              "X-Demo-User-Pole": demoIdentity.pole,
            }
          : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, body || `HTTP ${res.status}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

export { ApiError };

/** Message à afficher à l'utilisateur : le champ `error` renvoyé par l'API, sinon un repli. */
export function messageErreur(error: unknown, repli = "Connexion au serveur impossible. Réessaie une fois en ligne."): string {
  if (!(error instanceof ApiError)) return repli;
  try {
    const body = JSON.parse(error.message) as { error?: string };
    if (body.error && body.error !== "ACCESS_LEVEL_INSUFFICIENT") return body.error;
    if (body.error === "ACCESS_LEVEL_INSUFFICIENT") return "Ton niveau d'accès ne permet pas cette action.";
  } catch {
    // corps non JSON : on garde le repli
  }
  return repli;
}
