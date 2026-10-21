import type { Reservation } from "@resto-plus/types";

/** Réservation à créer : `heure` est l'heure locale « HH:MM » de la journée `date`. */
export interface NouvelleReservation {
  /** Identifiant généré par l'app (uuid) : une réservation créée hors ligne garde le sien. */
  id?: string;
  date: string;
  heure: string;
  nomClient: string;
  couverts: number;
  tableId?: string;
  clientId?: string;
  allergenes: string[];
  allergenesSignalesAt?: string;
  notes?: string;
  source?: Reservation["source"];
}

export interface ReservationsRepository {
  /** Réservations d'une journée de service, hors annulées, avec le déroulé du dîner. */
  lister(restaurantId: string, date: string): Promise<Reservation[]>;
  creer(restaurantId: string, reservation: NouvelleReservation): Promise<Reservation>;
  /** Passe la réservation au statut « annulée » (ses allergies sont effacées). */
  annuler(restaurantId: string, id: string): Promise<boolean>;
}
