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
  // Pas d'allergies sur la fiche client (donnée de santé) : elles sont portées par le
  // repas (TableServiceState / Reservation) et effacées à sa fin. Voir docs/rgpd.md.
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
  /** Allergies signalées par le client pour CE repas ; effacées à l'addition. */
  allergenes?: string[];
  /** Heure à laquelle le client les a signalées (son consentement). */
  allergenesSignalesAt?: string;
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
  type: "arrivee" | "installation" | "changement_table" | "entree_servie" | "plat_servi" | "dessert_servi" | "addition" | "depart" | "note";
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
  /** Table prévue (facultative : elle peut être attribuée à l'arrivée du client). */
  tableId?: string;
  /** Journée de service (AAAA-MM-JJ) ; `heure` est l'heure locale « HH:MM ». */
  date?: string;
  clientId?: string;
  nomClient: string;
  couverts: number;
  heure: string;
  /** Allergies pour ce repas, signalées par le client ; effacées à la fin du repas. */
  allergenes: string[];
  /** Heure à laquelle le client les a signalées (son consentement). */
  allergenesSignalesAt?: string;
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
/**
 * Une réception est confirmée immédiatement. Toute baisse (sortie, perte, ajustement,
 * commande) reste "provisoire" jusqu'à la validation du compte rendu cuisine par le
 * chef de cuisine (N2), qui peut aussi l'annuler.
 */
export type StockMovementStatut = "provisoire" | "confirme" | "annule";

export interface StockItem {
  id: string;
  restaurantId?: string;
  nom: string;
  categorie?: string;
  unite: UniteStock;
  quantiteActuelle: number; // stock théorique, mouvements provisoires inclus
  quantiteConfirmee?: number; // stock comptable : seuls les mouvements confirmés
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
  delta?: number; // variation signée appliquée au stock (quantiteApres - quantité avant)
  statut?: StockMovementStatut;
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

// --- Messagerie ---
//
// Trois espaces distincts, pas un chat unique :
// - "annonce" : tableau d'affichage de l'établissement (lecture par tous, écriture
//   réservée à N2/N3 — pas un fil de discussion, pas de réponses).
// - "canal" : discussion multi-sens au sein d'un pôle (salle ou cuisine),
//   configurable par le N3 de l'établissement.
// - "dm" : message direct, limité à la ligne hiérarchique directe (voir
//   docs/architecture.md) — jamais entre deux membres du même niveau.

export type ConversationType = "annonce" | "canal" | "dm";

export interface Conversation {
  id: string;
  restaurantId?: string;
  type: ConversationType;
  nom?: string; // "annonce" et "canal" uniquement
  pole?: Pole; // "canal" scopé à un pôle uniquement
  participantIds?: string[]; // "dm" uniquement (exactement 2)
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  restaurantId?: string;
  emetteurId: string;
  emetteurNom: string;
  emetteurAccessRole: AccessRole; // priorisation visuelle N3 > N2 sur le tableau d'affichage
  contenu: string;
  timestamp: string;
}

// --- Comptes rendus de service (fin de journée, validés par le N2 du pôle) ---

export type PoleService = "salle" | "cuisine";

export interface CompteRenduPlat {
  nom: string;
  quantite: number;
  chiffreAffaires: number;
}

export interface CompteRenduLigneStock {
  movementId: string;
  stockItemId: string;
  stockItemNom: string;
  unite: UniteStock;
  type: StockMovementType;
  quantite: number;
  delta: number;
  coutEstime?: number;
  motif?: string;
  timestamp: string;
  /** Journée de service de la sortie (voir serviceDay.ts). */
  jourService: string;
  statut: StockMovementStatut;
}

export interface CompteRenduService {
  id: string;
  restaurantId?: string;
  pole: PoleService;
  /** Journée de service (AAAA-MM-JJ) : bascule à l'heure de fin de service, pas à minuit. */
  date: string;
  /** Heure locale de bascule vers la journée suivante (ex. 5 = 5h du matin). */
  heureBascule?: number;
  statut: "brouillon" | "valide";
  /** Début de la période couverte : validation précédente du même pôle. */
  periodeDebut?: string;
  genereAt: string;
  valideAt?: string;
  valideParId?: string;
  valideParNom?: string;
  /** Validé par un N1 à qui la direction a délégué les responsabilités du N2. */
  valideParDelegation?: boolean;
  observations?: string;
  plats: CompteRenduPlat[];
  chiffreAffairesEstime: number;
  // Salle
  nbReservations?: number;
  totalCouverts?: number;
  nbAdditions?: number;
  // Cuisine
  mouvementsStock?: CompteRenduLigneStock[];
  coutMatiereEstime?: number;
  valeurPertes?: number;
}

// --- Comptes équipe permanents (créés par le N3, activés par code) ---

export type CompteEquipeStatut = "en_attente_activation" | "actif" | "desactive";

/**
 * Membre de l'annuaire du restaurant. Création par le N3 limitée à N0-N2 en salle
 * ou en cuisine ; l'annuaire contient aussi la direction (et, en démo, les 7 comptes
 * de test) pour la messagerie et les délégations.
 */
export interface CompteEquipe {
  id: string;
  restaurantId?: string;
  nom: string;
  accessRole: AccessRole;
  pole: Pole;
  statut: CompteEquipeStatut;
  /** Accès à la messagerie, réglé par le N3. */
  messagerie: boolean;
  /** Compte de démonstration (connexion locale, voir docs/comptes-demo.md). */
  demo?: boolean;
  login?: string;
  createdAt: string;
  activationExpiresAt?: string;
}

/** Destinataire proposé en message direct (hiérarchie et accès messagerie déjà filtrés). */
export interface Destinataire {
  id: string;
  nom: string;
  accessRole: AccessRole;
  pole: Pole;
}

/**
 * Délégation des tâches : le N3 confie temporairement à un N1 (ex. sous-chef de
 * cuisine) les responsabilités du N2 de son pôle — compte rendu, sorties de stock…
 */
export interface Delegation {
  id: string;
  restaurantId?: string;
  delegueId: string;
  delegueNom: string;
  pole: PoleService;
  debut: string;
  /** Fin de la délégation : à l'heure de fin de service du dernier jour. */
  fin: string;
  creeParNom?: string;
  revoqueeAt?: string;
}

/** Droits effectifs de la session : le niveau peut être relevé par une délégation active. */
export interface DroitsSession {
  accessRole: AccessRole;
  delegation?: Delegation;
}

/** Base de la facturation par utilisateur (voir la gestion des comptes, N3). */
export interface ResumeUtilisateurs {
  permanentsActifs: number;
  enAttenteActivation: number;
  interimairesActifs: number;
}

/** Validation d'un pôle pour une journée de service. */
export interface ValidationPole {
  valideAt: string;
  valideParNom?: string;
  valideParDelegation?: boolean;
}

/**
 * Journée de service et sa clôture : elle est close quand les comptes rendus salle ET
 * cuisine sont validés (sinon, la bascule du petit matin sert de filet de sécurité).
 */
export interface JourneeService {
  date: string;
  salle?: ValidationPole;
  cuisine?: ValidationPole;
  cloturee: boolean;
  clotureAt?: string;
}

/** Identité renvoyée par la connexion ou l'activation d'un compte. */
export interface IdentiteConnexion {
  id: string;
  nom: string;
  accessRole: AccessRole;
  pole: Pole;
  restaurantId?: string;
}

export * from "./permissions";
export * from "./serviceDay";
export * from "./audit";
export * from "./departements";
export * from "./lieux";
export * from "./pms";
export * from "./etablissement";
