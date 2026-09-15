// Types partagés front/back — Resto Plus / PalaceOS
// Voir docs/architecture.md pour le contexte complet

export type Role = "serveur" | "manager" | "extra" | "direction";
export type AccessRole = "serveur" | "chef_rang" | "manager_admin" | "directeur_admin";
// Pôle métier de l'équipier au sein de l'établissement : détermine les espaces visibles
// (un cuisinier n'a pas accès au plan de salle, un serveur n'a pas accès aux stocks/checklists cuisine).
// "direction" (N2/N3) voit les deux espaces. Défini à la création de l'accès de l'équipier
// (invitation ou fiche membre), modifiable par le N3 de l'établissement ; le cadre général
// (les pôles existants) relève du niveau N4.
export type Pole = "salle" | "cuisine" | "direction";
export type PlatformRole = "restaurant_user" | "dev_creator";
export type AccessLevel = 0 | 1 | 2 | 3 | 4;
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
  pole: Pole;
  actif: boolean;
}

export interface RestaurantInvitation {
  id: string;
  restaurantId: string;
  role: "serveur";
  pole: Pole;
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
  platformRole?: PlatformRole;
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

// --- Gestion des stocks cuisine ---

export type UniteStock = "kg" | "g" | "l" | "ml" | "unite";
export type StockMovementType = "reception" | "sortie" | "perte" | "ajustement";

export interface StockItem {
  id: string;
  restaurantId?: string;
  nom: string;
  categorie?: string;
  unite: UniteStock;
  quantiteActuelle: number;
  seuilAlerte: number;
  prixAchat?: number; // coût unitaire (par unité de `unite`) — base de l'équation prix/marge
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  stockItemId: string;
  restaurantId?: string;
  type: StockMovementType;
  quantite: number; // toujours positive, le type détermine le sens
  quantiteApres: number;
  motif?: string;
  userId?: string;
  timestamp: string;
}

export type StockAlertNiveau = "bas" | "rupture";

export interface StockAlert {
  id: string;
  stockItemId: string;
  stockItemNom: string;
  restaurantId?: string;
  niveau: StockAlertNiveau;
  message: string;
  createdAt: string;
  read: boolean;
}

// --- Carte / plats : lien commande ↔ ingrédients (base de l'équation prix/marge) ---

export interface MenuItemIngredient {
  stockItemId: string;
  quantite: number; // quantité de l'ingrédient (dans son unite de stock) consommée par plat servi
}

export interface MenuItem {
  id: string;
  restaurantId?: string;
  nom: string;
  categorie?: string;
  prixVente: number;
  ingredients: MenuItemIngredient[];
}

// --- Messagerie ciblée ---

export interface Message {
  id: string;
  emetteurId: string;
  stratesCibles: Role[];
  contenu: string;
  timestamp: string;
}
