import type { ChecklistItem } from "./index";

/**
 * Seuils HACCP — règle partagée par l'app (affichage en rouge) et l'API (qui décide).
 * Un point chiffré (température, % de composés polaires…) a un minimum et/ou un
 * maximum : un relevé hors seuil est non conforme.
 */

/** Lit une valeur saisie au téléphone : « 3,5 », « 3.5 °C », « -18 ». */
export function valeurNumerique(saisie: string | number | undefined | null): number | undefined {
  if (saisie === undefined || saisie === null) return undefined;
  const texte = String(saisie).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!texte) return undefined;
  const nombre = Number(texte[0]);
  return Number.isFinite(nombre) ? nombre : undefined;
}

type Seuils = Pick<ChecklistItem, "seuilMin" | "seuilMax">;

/** Conformité d'un relevé chiffré ; undefined si le point n'a pas de seuil ou pas de valeur lisible. */
export function estConforme(seuils: Seuils, saisie: string | number | undefined | null): boolean | undefined {
  if (seuils.seuilMin === undefined && seuils.seuilMax === undefined) return undefined;
  const valeur = valeurNumerique(saisie);
  if (valeur === undefined) return undefined;
  if (seuils.seuilMin !== undefined && valeur < seuils.seuilMin) return false;
  if (seuils.seuilMax !== undefined && valeur > seuils.seuilMax) return false;
  return true;
}

/** « ≤ 4 °C », « ≥ 63 °C », « 0 à 4 °C » — rappel affiché sous le point. */
export function libelleSeuil(item: Seuils & Pick<ChecklistItem, "unite">): string | undefined {
  const unite = item.unite ? ` ${item.unite}` : "";
  const { seuilMin: min, seuilMax: max } = item;
  if (min !== undefined && max !== undefined) return `${min} à ${max}${unite}`;
  if (max !== undefined) return `≤ ${max}${unite}`;
  if (min !== undefined) return `≥ ${min}${unite}`;
  return undefined;
}
