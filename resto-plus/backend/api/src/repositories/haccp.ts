import type { Checklist } from "@resto-plus/types";

/** Relevé HACCP tel que reçu de l'app. Il fait foi lors d'un contrôle sanitaire. */
export interface NouveauReleve {
  /** Identifiant généré par l'app (uuid) : un relevé renvoyé deux fois n'est gardé qu'une fois. */
  id?: string;
  checklistId: string;
  itemId: string;
  valeur?: string;
  photoUrl?: string;
  conforme?: boolean;
  commentaire?: string;
  /** Heure du relevé sur le téléphone. */
  releveAt: string;
  /** Compte Supabase de la personne (absent en mode démo). */
  userId?: string;
}

export interface Releve extends NouveauReleve {
  id: string;
  restaurantId: string;
  /** Journée de service du relevé (AAAA-MM-JJ). */
  dateService: string;
}

export interface HaccpRepository {
  /** Plan HACCP de l'établissement : checklists actives et leurs points, dans l'ordre. */
  listerChecklists(restaurantId: string): Promise<Checklist[]>;
  /** Le point de contrôle appartient-il à cette checklist de cet établissement ? */
  pointExiste(restaurantId: string, checklistId: string, itemId: string): Promise<boolean>;
  /** Enregistre un relevé ; jamais modifié ensuite. */
  enregistrer(restaurantId: string, releve: NouveauReleve): Promise<Releve>;
  releves(restaurantId: string, dateService: string): Promise<Releve[]>;
}
