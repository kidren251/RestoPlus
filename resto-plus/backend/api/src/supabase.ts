/**
 * Initialisation Supabase — Resto Plus backend
 * Phase 1 : mock activé si les variables d'env ne sont pas définies.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

export const isMockMode = !supabaseUrl || !supabaseKey;

// Le backend interroge la base pour son propre compte (ex: lookup de membership dans
// auth.ts), pas au nom d'un utilisateur avec sa session. Avec la RLS activée (migration
// 0006), ces requêtes doivent passer par la clé service_role, qui contourne la RLS —
// l'autorisation est déjà vérifiée côté code. La clé anon ne suffit plus : elle se
// heurterait silencieusement aux policies RLS (auth.uid() est null côté serveur).
if (!isMockMode && !supabaseServiceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] SUPABASE_SERVICE_ROLE_KEY absente : le backend utilise la clé anon. " +
      "Une fois la RLS activée, ses propres requêtes (ex: membership) échoueront."
  );
}

export const supabase = isMockMode
  ? null
  : createClient(supabaseUrl, supabaseKey);
