import type { CompteRenduService, JourneeService, PoleService } from "@resto-plus/types";
import { jourDeService } from "@resto-plus/types";

/**
 * Clôture de la journée de service — Resto Plus
 *
 * Deux éléments disent qu'une journée de service est finie :
 * 1. l'horloge : la bascule du petit matin (5h par défaut, voir serviceDay.ts), filet
 *    de sécurité si personne ne valide ;
 * 2. les responsables : dès que le compte rendu SALLE et le compte rendu CUISINE sont
 *    tous deux validés par leur N2, la journée est clôturée. Tout ce qui arrive ensuite
 *    compte pour le service suivant, même avant 5h.
 *
 * Données séparées des routes pour être lues par les réservations sans dépendance circulaire.
 */

export const comptesRendus: CompteRenduService[] = [];

function lendemain(jour: string): string {
  const date = new Date(`${jour}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function premiereValidation(restaurantId: string, jour: string, pole: PoleService) {
  return comptesRendus
    .filter((cr) => cr.restaurantId === restaurantId && cr.date === jour && cr.pole === pole && cr.statut === "valide" && cr.valideAt)
    .sort((a, b) => (a.valideAt ?? "").localeCompare(b.valideAt ?? ""))[0];
}

export function etatJournee(restaurantId: string, jour: string): JourneeService {
  const salle = premiereValidation(restaurantId, jour, "salle");
  const cuisine = premiereValidation(restaurantId, jour, "cuisine");
  const resume = (cr: CompteRenduService | undefined) =>
    cr && { valideAt: cr.valideAt as string, valideParNom: cr.valideParNom, valideParDelegation: cr.valideParDelegation };
  // Clôture = instant où le second pôle a validé.
  const clotureAt = salle && cuisine ? [salle.valideAt as string, cuisine.valideAt as string].sort()[1] : undefined;
  return { date: jour, salle: resume(salle), cuisine: resume(cuisine), cloturee: !!clotureAt, clotureAt };
}

/**
 * Journée de service à laquelle appartient un instant : celle de l'horloge, sauf si
 * elle a déjà été clôturée par les deux comptes rendus avant cet instant.
 */
export function jourEffectif(restaurantId: string, instant: Date | string = new Date()): string {
  const iso = typeof instant === "string" ? instant : instant.toISOString();
  let jour = jourDeService(iso);
  // Borné : une journée ne peut être clôturée qu'une fois qu'elle a commencé.
  for (let i = 0; i < 3; i++) {
    const { clotureAt } = etatJournee(restaurantId, jour);
    if (!clotureAt || iso <= clotureAt) break;
    jour = lendemain(jour);
  }
  return jour;
}

/** Journées ayant au moins un compte rendu, plus récentes d'abord. */
export function historiqueJournees(restaurantId: string, limite = 14): JourneeService[] {
  const jours = [...new Set(comptesRendus.filter((cr) => cr.restaurantId === restaurantId).map((cr) => cr.date))];
  return jours
    .sort()
    .reverse()
    .slice(0, limite)
    .map((jour) => etatJournee(restaurantId, jour));
}
