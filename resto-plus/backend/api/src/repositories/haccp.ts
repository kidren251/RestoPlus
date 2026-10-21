import type { Checklist, ChecklistItem, FrequenceChecklist } from "@resto-plus/types";

/** Relevé HACCP tel que reçu de l'app. Il fait foi lors d'un contrôle sanitaire. */
export interface NouveauReleve {
  /** Identifiant généré par l'app (uuid) : un relevé renvoyé deux fois n'est gardé qu'une fois. */
  id?: string;
  checklistId: string;
  itemId: string;
  valeur?: string;
  photoUrl?: string;
  /** Calculée par l'API à partir des seuils du point (ou déclarée pour un point sans seuil). */
  conforme?: boolean;
  commentaire?: string;
  /** Heure du relevé sur le téléphone. */
  releveAt: string;
  /** Compte Supabase de la personne (absent en mode démo). */
  userId?: string;
  /** Copie du point au moment du relevé : un relevé ancien reste lisible si le plan change. */
  libelle?: string;
  seuilMin?: number;
  seuilMax?: number;
  unite?: string;
}

export interface Releve extends NouveauReleve {
  id: string;
  restaurantId: string;
  /** Journée de service du relevé (AAAA-MM-JJ). */
  dateService: string;
}

/** Point de contrôle à créer ou à modifier (null = retirer le seuil, l'unité, la consigne). */
export interface ModificationPoint {
  label?: string;
  requiertValeur?: boolean;
  requiertPhoto?: boolean;
  seuilMin?: number | null;
  seuilMax?: number | null;
  unite?: string | null;
  consigne?: string | null;
  ordre?: number;
  /** false = retiré du plan (jamais supprimé : ses relevés gardent leur sens). */
  actif?: boolean;
}

export interface ModificationChecklist {
  nom?: string;
  frequence?: FrequenceChecklist;
  ordre?: number;
  actif?: boolean;
}

export interface HaccpRepository {
  /** Plan HACCP de l'établissement : checklists et points actifs, dans l'ordre. */
  listerChecklists(restaurantId: string): Promise<Checklist[]>;
  /** Point actif de cette checklist de cet établissement, ou null. */
  point(restaurantId: string, checklistId: string, itemId: string): Promise<ChecklistItem | null>;
  /** Enregistre un relevé ; jamais modifié ensuite. */
  enregistrer(restaurantId: string, releve: NouveauReleve): Promise<Releve>;
  releves(restaurantId: string, dateService: string): Promise<Releve[]>;

  // Édition du plan (droit haccp.configurer).
  creerChecklist(restaurantId: string, checklist: { nom: string; frequence: FrequenceChecklist }): Promise<Checklist>;
  /** null si la checklist n'est pas de cet établissement. */
  modifierChecklist(restaurantId: string, checklistId: string, modification: ModificationChecklist): Promise<Checklist | null>;
  ajouterPoint(restaurantId: string, checklistId: string, point: ModificationPoint & { label: string }): Promise<ChecklistItem | null>;
  modifierPoint(restaurantId: string, itemId: string, modification: ModificationPoint): Promise<ChecklistItem | null>;
}
