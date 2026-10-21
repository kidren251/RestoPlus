import type { Client } from "@resto-plus/types";

export interface ClientsRepository {
  lister(restaurantId: string): Promise<Client[]>;
  lire(restaurantId: string, id: string): Promise<Client | null>;
  /**
   * Crée ou met à jour une fiche (identifiant généré par l'app). Renvoie null si
   * l'identifiant appartient à un autre restaurant : la route répond 404.
   */
  enregistrer(restaurantId: string, client: Client): Promise<Client | null>;
}
