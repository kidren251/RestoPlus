import { supabase } from "../supabase";
import type { SallesRepository } from "./salles";
import { creerSallesMemoire } from "./salles.memoire";
import { creerSallesSupabase } from "./salles.supabase";

/**
 * Point d'entrée des repositories : Supabase si SUPABASE_URL et une clé sont
 * configurées (backend/api/.env), sinon données de démo en mémoire (tests, Expo Go
 * sans base). Les routes n'importent que d'ici, jamais une implémentation directement.
 *
 * Branchement progressif (P1, docs/axes-de-progression.md) : les domaines non encore
 * listés ici gardent leur stockage en mémoire dans leur fichier de routes.
 */
export interface Repositories {
  salles: SallesRepository;
}

export function creerRepositories(): Repositories {
  if (supabase) {
    return { salles: creerSallesSupabase(supabase) };
  }
  return { salles: creerSallesMemoire() };
}

export const repositories = creerRepositories();
