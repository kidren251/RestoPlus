// Types partagés front/back — Resto Plus / PalaceOS
// Voir docs/architecture.md pour le contexte complet

export type Role = "serveur" | "manager" | "extra" | "direction";

export interface User {
  id: string;
  nom: string;
  role: Role;
  service: "restauration" | "hebergement" | "conciergerie" | "spa";
}

// --- Plan de salle spatial ---

export type FormeTable = "ronde" | "carree" | "rectangle";
export type StatutTable = "libre" | "occupee" | "reservee" | "a_nettoyer";

export interface Table {
  id: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  rotation: number;
  forme: FormeTable;
  capacite: number;
  zoneId: string;
  statut: StatutTable;
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
  nom: string;
  largeurCanvas: number;
  hauteurCanvas: number;
  tables: Table[];
  decor: ElementDecor[];
}

export interface Reservation {
  id: string;
  tableId: string;
  nomClient: string;
  couverts: number;
  heure: string;
  allergenes: string[];
  notes?: string;
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
