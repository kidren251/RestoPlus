/**
 * Journée de service — Resto Plus
 *
 * Un service ne s'arrête pas à minuit : un dîner qui se termine à 2h du matin
 * appartient toujours au service de la veille. La journée de service bascule donc à
 * une heure fixe du petit matin (5h par défaut), dans le fuseau horaire du
 * restaurant, et non à minuit ni en UTC.
 *
 * Exemple (heureBascule = 5, Europe/Paris) :
 *   jeudi 24 à 23h40 → service du jeudi 24
 *   vendredi 25 à 1h55 → service du jeudi 24
 *   vendredi 25 à 5h00 → service du vendredi 25
 */

export interface ParametresService {
  /** Fuseau IANA du restaurant, ex. "Europe/Paris". */
  fuseauHoraire: string;
  /** Heure locale (0-23) à laquelle on passe à la journée de service suivante. */
  heureBascule: number;
}

export const PARAMETRES_SERVICE_DEFAUT: ParametresService = {
  fuseauHoraire: "Europe/Paris",
  heureBascule: 5,
};

/** Journée de service (AAAA-MM-JJ) à laquelle appartient un instant donné. */
export function jourDeService(instant: Date | string = new Date(), parametres: ParametresService = PARAMETRES_SERVICE_DEFAUT): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  // Reculer de l'heure de bascule revient à faire commencer la journée à cette heure-là.
  const decale = new Date(date.getTime() - parametres.heureBascule * 60 * 60 * 1000);
  // en-CA formate en AAAA-MM-JJ.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: parametres.fuseauHoraire,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(decale);
}
