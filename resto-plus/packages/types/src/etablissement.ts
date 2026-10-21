/**
 * Configuration d'un établissement — préparée par le N4 avant livraison
 *
 * Tout ce qu'il faut pour livrer un client « clé en main » : type d'établissement,
 * départements activés, référentiel des lieux, connexion PMS, horaires. Le N4 la saisit
 * dans la console plateforme (DevCreatorPanelScreen) lors de la création de l'univers ;
 * le N3 du client peut ensuite ajuster les libellés et les lieux, pas les modules.
 *
 * PRINCIPE « RIEN DE SUPERFLU » : chaque client reçoit une version sur mesure. L'app
 * n'affiche QUE les départements et modules activés ici (voir `modulesActifs()`) : pas
 * de tuile grisée, pas d'écran vide pour un service que l'établissement n'a pas. Un
 * restaurant seul ne voit jamais « Gouvernance » ni « Chambres ».
 *
 * ÉTAT ACTUEL : types seulement. La console N4 ne crée encore qu'un univers minimal
 * (nom, slug, options), voir backend/api/src/routes/platform.ts.
 */

import { CATALOGUE_DEPARTEMENTS, type ModuleId, type TypeDepartement } from "./departements";
import type { Lieu } from "./lieux";
import type { PmsConfiguration } from "./pms";

/** Cible produit : de la restauration pure jusqu'à l'hôtel de moyen standing (pas les palaces pour l'instant). */
export type TypeEtablissement = "restaurant" | "hotel";

export interface DepartementActive {
  type: TypeDepartement;
  /** Libellé propre au client (ex : « Service technique » au lieu de « Maintenance »). */
  libelle?: string;
  actif: boolean;
}

export interface ConfigurationEtablissement {
  restaurantId: string;
  typeEtablissement: TypeEtablissement;
  departements: DepartementActive[];
  lieux: Lieu[];
  /** Absent pour un restaurant sans hébergement. */
  pms?: PmsConfiguration;
  /** Fuseau de l'établissement (journée de service, planning). */
  fuseauHoraire: string;
  /** Heure de bascule de la journée de service (5 par défaut). */
  heureBasculeService: number;
  options: OptionsEtablissement;
}

/** Réglages réservés au N4, pour les établissements qui en ont besoin. */
export interface OptionsEtablissement {
  /**
   * Un membre peut appartenir à plusieurs départements (ex : agent d'entretien qui fait
   * aussi les espaces verts). Défaut : false, un membre = un département (+ direction),
   * ce qui suffit à un restaurant. N'activer que si le client le demande.
   */
  multiDepartements: boolean;
}

export const OPTIONS_PAR_DEFAUT: OptionsEtablissement = {
  multiDepartements: false,
};

/** Modules réellement disponibles pour cet établissement : seule source de ce que l'app affiche. */
export function modulesActifs(config: Pick<ConfigurationEtablissement, "departements">): Set<ModuleId> {
  const modules = new Set<ModuleId>();
  for (const departement of config.departements) {
    if (!departement.actif) continue;
    for (const module of CATALOGUE_DEPARTEMENTS[departement.type].modules) modules.add(module);
  }
  return modules;
}
