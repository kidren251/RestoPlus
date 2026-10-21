import { supabase } from "../supabase";
import { creerClientsMemoire, creerEtablissementsMemoire, creerReservationsMemoire, creerServiceMemoire } from "./autres.memoire";
import { creerClientsSupabase, creerEtablissementsSupabase, creerReservationsSupabase, creerServiceSupabase } from "./autres.supabase";
import type { ClientsRepository } from "./clients";
import type { EtablissementsRepository } from "./etablissements";
import { creerEtatMemoire } from "./memoire";
import type { ReservationsRepository } from "./reservations";
import type { SallesRepository } from "./salles";
import { creerSallesMemoire } from "./salles.memoire";
import { creerSallesSupabase } from "./salles.supabase";
import type { ServiceRepository } from "./service";
import type { HaccpRepository } from "./haccp";
import { creerHaccpMemoire } from "./haccp.memoire";
import { creerHaccpSupabase } from "./haccp.supabase";

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
  reservations: ReservationsRepository;
  clients: ClientsRepository;
  service: ServiceRepository;
  etablissements: EtablissementsRepository;
  haccp: HaccpRepository;
}

export function creerRepositories(): Repositories {
  if (supabase) {
    return {
      salles: creerSallesSupabase(supabase),
      reservations: creerReservationsSupabase(supabase),
      clients: creerClientsSupabase(supabase),
      service: creerServiceSupabase(supabase),
      etablissements: creerEtablissementsSupabase(supabase),
      haccp: creerHaccpSupabase(supabase),
    };
  }
  const etat = creerEtatMemoire();
  return {
    salles: creerSallesMemoire(etat),
    reservations: creerReservationsMemoire(etat),
    clients: creerClientsMemoire(etat),
    service: creerServiceMemoire(etat),
    etablissements: creerEtablissementsMemoire(etat),
    haccp: creerHaccpMemoire(etat),
  };
}

export const repositories = creerRepositories();
