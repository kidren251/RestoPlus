// Types partagés front/back — Resto Plus / PalaceOS
// Voir docs/architecture.md pour le contexte complet

export type Role = "serveur" | "manager" | "extra" | "direction";
export type AccessRole = "manager_admin" | "access_admin" | "chef_rang" | "serveur";
export type ClientVisitStatus = "a_venir" | "installe" | "addition" | "termine";
export type DishWorkflowStatus = "en_attente" | "en_preparation" | "a_reclamer" | "pret" | "servi";

export interface Restaurant {
  id: string;
  nom: string;
  slug: string;
  createdAt: string;
}

export interface RestaurantMember {
  restaurantId: string;
  userId: string;
  accessRole: AccessRole;
  actif: boolean;
}

export interface RestaurantInvitation {
  id: string;
  restaurantId: string;
  role: "serveur";
  token: string;
  expiresAt: string;
  maxUses: 1;
  usedAt?: string;
  revokedAt?: string;
}

export interface ServiceAlert {
  id: string;
  tableId: string;
  clientName?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface User {
  id: string;
  nom: string;
  role: Role;
  accessRole?: AccessRole;
  service: "restauration" | "hebergement" | "conciergerie" | "spa";
  restaurantId?: string;
}

export interface Client {
  id: string;
  restaurantId?: string;
  nom: string;
  telephone?: string;
  email?: string;
  preferences?: string;
  allergies?: string[];
  notes?: string;
  createdAt: string;
  lastVisitAt?: string;
  visitStatus?: ClientVisitStatus;
}

// --- Plan de salle spatial ---

export type FormeTable = "ronde" | "carree" | "rectangle";
export type StatutTable = "libre" | "occupee" | "reservee" | "a_nettoyer";

export interface Table {
  id: string;
  restaurantId?: string;
  nom?: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  rotation: number;
  forme: FormeTable;
  capacite: number;
  zoneId: string;
  statut: StatutTable;
  serviceState?: TableServiceState;
}

export type ServiceCourse = "aucun" | "entree" | "plat" | "dessert";
export type DishServiceStatus = "aucun" | "a_reclamer" | "servi";

export interface TableServiceState {
  tableId: string;
  reservationId?: string;
  clientId?: string;
  clientName?: string;
  client?: Client;
  course: ServiceCourse;
  dishStatus: DishServiceStatus;
  seatedAt?: string;
  lastEventAt?: string;
  events?: ServiceEvent[];
}

export interface ServiceEvent {
  id: string;
  reservationId: string;
  tableId: string;
  type: "arrivee" | "installation" | "entree_servie" | "plat_servi" | "dessert_servi" | "addition" | "depart" | "note";
  label: string;
  occurredAt: string;
  actorId?: string;
  note?: string;
  restaurantId?: string;
}

export interface ElementDecor {
  id: string;
  type: "mur" | "bar" | "entree" | "cuisine";
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  rotation: number;
}

export interface Salle {
  id: string;
  restaurantId?: string;
  nom: string;
  largeurCanvas: number;
  hauteurCanvas: number;
  tables: Table[];
  decor: ElementDecor[];
}

export interface Reservation {
  id: string;
  restaurantId?: string;
  tableId: string;
  clientId?: string;
  nomClient: string;
  couverts: number;
  heure: string;
  allergenes: string[];
  notes?: string;
  source?: "telephone" | "site" | "email" | "walk_in" | "conciergerie";
  createdAt?: string;
  status?: "a_venir" | "arrivee" | "installee" | "terminee" | "annulee";
  serviceEvents?: ServiceEvent[];
}

// --- Checklists HACCP ---

export interface ChecklistItem {
  id: string;
  label: string;
  requiertPhoto: boolean;
  requiertValeur: boolean; // ex: température
}

export interface Checklist {
  id: string;
  type: string;
  frequence: "ouverture" | "fermeture" | "4h" | "hebdomadaire";
  items: ChecklistItem[];
}

export interface ChecklistEntry {
  id: string;
  checklistId: string;
  userId: string;
  itemId: string;
  valeur?: string;
  photoUrl?: string;
  timestamp: string;
  statut: "en_attente" | "valide" | "en_retard";
  syncStatus: "local" | "synced";
}

// --- Messagerie ciblée ---

export interface Message {
  id: string;
  emetteurId: string;
  stratesCibles: Role[];
  contenu: string;
  timestamp: string;
}
