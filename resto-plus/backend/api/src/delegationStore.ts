import type { Delegation, PermissionSubject } from "@resto-plus/types";
import { jourDeService } from "@resto-plus/types";

/**
 * Délégations des tâches (données) — séparé des routes (routes/delegations.ts) pour que
 * permissions.ts puisse les lire sans dépendance circulaire.
 */
export const delegations: (Delegation & { restaurantId: string })[] = [];

export function delegationActive(restaurantId: string, userId: string | undefined, now = new Date()) {
  if (!userId) return undefined;
  const iso = now.toISOString();
  return delegations.find(
    (delegation) =>
      delegation.restaurantId === restaurantId &&
      delegation.delegueId === userId &&
      !delegation.revoqueeAt &&
      delegation.debut <= iso &&
      delegation.fin > iso
  );
}

/**
 * Un N1 sous délégation exerce les droits du N2 de son pôle. Seul le niveau est
 * relevé : le pôle ne change pas, la délégation ne donne jamais accès à l'autre pôle.
 */
export function appliquerDelegation(subject: PermissionSubject, restaurantId: string, userId: string | undefined): PermissionSubject {
  if (subject.accessRole !== "chef_rang") return subject;
  const delegation = delegationActive(restaurantId, userId);
  if (!delegation || delegation.pole !== subject.pole) return subject;
  return { ...subject, accessRole: "manager_admin" };
}

/**
 * Fin de délégation : l'heure de bascule de la journée de service qui suit le
 * `jours`-ième service (1 = jusqu'à la fin du service en cours, même après minuit).
 */
export function finDeDelegation(jours: number, now = new Date()): string {
  let instant = new Date(now);
  instant.setUTCMinutes(0, 0, 0);
  let jour = jourDeService(now);
  let restants = jours;
  // Pas d'une heure : la bascule tombe toujours sur une heure pleine.
  while (restants > 0) {
    instant = new Date(instant.getTime() + 60 * 60 * 1000);
    const suivant = jourDeService(instant);
    if (suivant !== jour) {
      jour = suivant;
      restants -= 1;
    }
  }
  return instant.toISOString();
}
