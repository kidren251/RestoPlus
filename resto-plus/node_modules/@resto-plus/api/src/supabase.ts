/**
 * Initialisation Supabase — Resto Plus backend
 * Phase 1 : mock activé si les variables d'env ne sont pas définies.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? "";

export const isMockMode = !supabaseUrl || !supabaseKey;

export const supabase = isMockMode
  ? null
  : createClient(supabaseUrl, supabaseKey);
