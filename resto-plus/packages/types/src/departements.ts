/**
 * Catalogue des départements — Resto Plus / PalaceOS
 *
 * MODÈLE CIBLE « départements × modules » (voir docs/architecture.md) :
 *  - un DÉPARTEMENT est une équipe : membres N0-N2, canal de messagerie, délégations,
 *    compte rendu. Toute la mécanique existante (droits, audit, délégation) s'y applique ;
 *  - un MODULE est un outil (plan de salle, stock, tickets, chambres…) que le département
 *    active.
 *
 * ÉTAT ACTUEL : ce catalogue est la cible, il n'est pas encore branché. Le code utilise
 * toujours le type fermé `Pole = "salle" | "cuisine" | "direction"` (index.ts) et des
 * contraintes SQL `check (pole in (...))`. La bascule se fait pendant le branchement
 * Supabase (P1) : voir « Départements hôteliers » dans docs/axes-de-progression.md.
 *
 * Les départements sont un CATALOGUE de types (pas des départements libres) : chaque type
 * apporte ses modules et ses intitulés ; le N4 les active à la mise en place d'un
 * établissement, le N3 peut les renommer. (Décision du 11/10/2026.)
 *
 * PRIORITÉ PRODUIT : la restauration (salle, cuisine) d'abord. Les départements hôteliers
 * (maintenance, espaces verts, gouvernance) viennent ensuite, pour des hôtels jusqu'au
 * moyen standing.
 */

export type TypeDepartement =
  | "direction"
  | "salle"
  | "cuisine"
  | "maintenance"
  | "espaces_verts"
  | "gouvernance";

export type ModuleId =
  | "plan_salle"
  | "reservations"
  | "taches"
  | "haccp"
  | "stock"
  | "carte"
  | "commandes"
  | "tickets" // tickets inter-départements (création ouverte à tous, traitement par le destinataire)
  | "planning" // planification des interventions
  | "preventif" // interventions récurrentes qui génèrent des tickets
  | "chambres" // état des chambres, répartition, contrôle (gouvernance)
  | "linge";

export interface DefinitionDepartement {
  libelle: string;
  modules: readonly ModuleId[];
  /** Intitulés affichés par niveau : le niveau N0-N2 reste commun, seul le titre change. */
  titres: { 0: string; 1: string; 2: string };
  /** Le compte rendu de ce département est requis pour clôturer la journée de service. */
  compteRenduQuotidien: boolean;
  /** Déjà utilisable dans l'app (false = prévu, pas encore développé). */
  disponible: boolean;
}

export const CATALOGUE_DEPARTEMENTS: Record<TypeDepartement, DefinitionDepartement> = {
  direction: {
    libelle: "Direction",
    modules: [],
    titres: { 0: "—", 1: "—", 2: "Manager" },
    compteRenduQuotidien: false,
    disponible: true,
  },
  salle: {
    libelle: "Salle",
    modules: ["plan_salle", "reservations", "taches", "tickets"],
    titres: { 0: "Serveur", 1: "Chef de rang", 2: "Manager de salle" },
    compteRenduQuotidien: true,
    disponible: true,
  },
  cuisine: {
    libelle: "Cuisine",
    modules: ["haccp", "stock", "carte", "commandes", "tickets"],
    titres: { 0: "Commis", 1: "Chef de partie", 2: "Chef de cuisine" },
    compteRenduQuotidien: true,
    disponible: true,
  },
  maintenance: {
    libelle: "Maintenance",
    modules: ["tickets", "planning", "preventif", "stock"],
    titres: { 0: "Technicien", 1: "Chef d'équipe", 2: "Responsable technique" },
    compteRenduQuotidien: false,
    disponible: false,
  },
  espaces_verts: {
    libelle: "Espaces verts",
    modules: ["tickets", "planning", "preventif", "taches"],
    titres: { 0: "Jardinier", 1: "Chef jardinier", 2: "Responsable des espaces verts" },
    compteRenduQuotidien: false,
    disponible: false,
  },
  gouvernance: {
    libelle: "Gouvernance",
    // Dépend des arrivées / départs du PMS : voir packages/types/src/pms.ts.
    modules: ["chambres", "tickets", "linge", "stock", "taches"],
    titres: { 0: "Valet / femme de chambre", 1: "Gouvernante d'étage", 2: "Gouvernante générale" },
    compteRenduQuotidien: true,
    disponible: false,
  },
};
