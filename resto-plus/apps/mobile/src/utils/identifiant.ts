import { randomUUID } from "expo-crypto";

/**
 * Identifiant d'une donnée créée dans l'app (réservation, fiche client, événement du
 * dîner). Généré sur le téléphone pour fonctionner hors ligne ; c'est un uuid, le
 * format attendu par la base.
 */
export function nouvelId(): string {
  return randomUUID();
}
