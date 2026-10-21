import type { ReglagesDroits } from "@resto-plus/types";

export interface EtablissementResume {
  id: string;
  nom: string;
  slug: string;
}

/** Réglages d'un établissement faits par le N4 (console plateforme). */
export interface EtablissementsRepository {
  lister(): Promise<EtablissementResume[]>;
  /** {} si rien n'est réglé (ou établissement inconnu) : valeurs par défaut. */
  reglagesDroits(restaurantId: string): Promise<ReglagesDroits>;
  /** false si l'établissement n'existe pas. */
  modifierReglagesDroits(restaurantId: string, reglages: ReglagesDroits): Promise<boolean>;
}
