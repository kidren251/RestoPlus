import type { FrequenceChecklist } from "@resto-plus/types";

/** Libellés des fréquences du plan HACCP (écran des relevés et éditeur du plan). */
export const FREQUENCES: { id: FrequenceChecklist; label: string; court: string }[] = [
  { id: "reception", label: "À chaque livraison", court: "RÉCEPTION" },
  { id: "ouverture", label: "À l'ouverture", court: "OUVERTURE" },
  { id: "service", label: "Pendant le service", court: "SERVICE" },
  { id: "fermeture", label: "À la fermeture", court: "FERMETURE" },
  { id: "4h", label: "Toutes les 4 heures", court: "CONTRÔLE 4H" },
  { id: "hebdomadaire", label: "Chaque semaine", court: "HEBDOMADAIRE" },
];

export function libelleFrequence(frequence: FrequenceChecklist): string {
  return FREQUENCES.find((f) => f.id === frequence)?.court ?? frequence.toUpperCase();
}
