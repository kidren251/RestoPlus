/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║  INTÉGRATION PMS — NOTE DE RÉFÉRENCE                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Le PMS (Property Management System) est le logiciel de réservation de l'hôtel. La
 * gouvernance a besoin de ses données (arrivées, départs, recouches) ; le PMS a besoin du
 * statut ménage pour attribuer une chambre. Ce dossier est le SEUL point de contact avec
 * un PMS : aucune route, aucun écran ne doit parler à un PMS directement.
 *
 * ÉTAT ACTUEL (octobre 2026) : fondations seulement.
 *  - `PmsConnector` : le contrat que tout connecteur respecte ;
 *  - `ConnecteurManuel` : sans PMS, la gouvernante saisit elle-même les mouvements ;
 *  - `creerConnecteurPms()` : choisit le connecteur selon la configuration de
 *    l'établissement (préparée par le N4, voir ConfigurationEtablissement).
 *  Aucun connecteur réel (Mews, Apaleo, Opera Cloud…) n'est écrit, aucune route n'expose
 *  encore ce module. Suivi : « Départements hôteliers » dans docs/axes-de-progression.md.
 *
 * ── Ajouter un connecteur réel ───────────────────────────────────────────────────────
 *  1. Étudier l'API du fournisseur (authentification, limites de débit, webhooks,
 *     environnement de test) : rien n'est supposé ici, chaque PMS est différent.
 *  2. Créer `pms/connecteurs/<fournisseur>.ts` qui implémente `PmsConnector`, et déclarer
 *     honnêtement ses `capacites` (un PMS qui n'accepte pas le statut ménage → false).
 *  3. L'ajouter dans `creerConnecteurPms()`.
 *  4. Traduire les statuts du fournisseur vers `StatutMenage` dans le connecteur, jamais
 *     ailleurs.
 *
 * ── Règles de responsabilité ─────────────────────────────────────────────────────────
 *  - OCCUPATION : le PMS fait foi. On lit, on ne modifie jamais une réservation.
 *  - STATUT MÉNAGE : Resto Plus fait foi. On l'envoie au PMS si
 *    `PmsConfiguration.envoyerStatutMenage` et `capacites.ecrireStatutMenage`.
 *  - Correspondance chambre ↔ lieu : uniquement par `Lieu.pmsRoomId`, saisi par le N4 à la
 *    mise en place. Une chambre PMS sans lieu correspondant est signalée, pas inventée.
 *
 * ── Sécurité (mêmes règles que docs/architecture.md) ─────────────────────────────────
 *  - Les identifiants PMS restent CÔTÉ SERVEUR (coffre de secrets, référencé par
 *    `PmsConfiguration.referenceSecret`), jamais dans l'app mobile ni dans la base en clair.
 *  - Un connecteur est créé POUR UN restaurant : les données d'un PMS ne doivent jamais
 *    être rangées sous un autre `restaurant_id` (isolation, voir tenant.ts).
 *  - Webhooks entrants : vérifier la signature du fournisseur avant tout traitement, et
 *    les traiter de façon idempotente (un même événement peut arriver deux fois).
 *  - Données personnelles : ne garder que ce qui sert au ménage (chambre, dates, nombre
 *    de clients, remarques ménage). Pas de nom, téléphone ni e-mail client (RGPD).
 *  - Journaliser chaque synchronisation et chaque envoi de statut (audit.ts, catégorie
 *    « sécurité » ou une catégorie dédiée à créer).
 *
 * ── Synchronisation ──────────────────────────────────────────────────────────────────
 *  - Les dates suivent la journée de service de l'établissement (serviceDay.ts, fuseau
 *    du restaurant), pas l'UTC.
 *  - Si le PMS est injoignable, la gouvernance continue avec les dernières données
 *    connues (`synchroniseAt` affiché) et peut basculer en saisie manuelle.
 */

import type { PmsChambre, PmsConfiguration, PmsFournisseur, PmsMouvementsJour, StatutMenage } from "@resto-plus/types";

export interface PmsCapacites {
  lireChambres: boolean;
  lireMouvements: boolean;
  ecrireStatutMenage: boolean;
  /** Le fournisseur pousse les changements (webhooks) au lieu d'être interrogé. */
  webhooks: boolean;
}

/** Contrat commun à tous les connecteurs PMS. Un connecteur = un restaurant. */
export interface PmsConnector {
  readonly fournisseur: PmsFournisseur;
  readonly restaurantId: string;
  readonly capacites: PmsCapacites;
  listerChambres(): Promise<PmsChambre[]>;
  /** Arrivées, départs et recouches d'une journée de service (date AAAA-MM-JJ). */
  mouvementsDuJour(date: string): Promise<PmsMouvementsJour>;
  /** Envoie le statut ménage d'une chambre au PMS. À n'appeler que si `capacites.ecrireStatutMenage`. */
  envoyerStatutMenage(pmsRoomId: string, statut: StatutMenage): Promise<void>;
}

/**
 * Sans PMS connecté : les mouvements sont saisis dans l'app par la gouvernance.
 * Stockage en mémoire pour l'instant, comme le reste de l'API (voir P1).
 */
export class ConnecteurManuel implements PmsConnector {
  readonly fournisseur = "manuel" as const;
  readonly capacites: PmsCapacites = { lireChambres: false, lireMouvements: true, ecrireStatutMenage: false, webhooks: false };
  private readonly mouvements = new Map<string, PmsMouvementsJour>();

  constructor(readonly restaurantId: string) {}

  async listerChambres(): Promise<PmsChambre[]> {
    // Les chambres viennent du référentiel des lieux, pas d'un PMS.
    return [];
  }

  async mouvementsDuJour(date: string): Promise<PmsMouvementsJour> {
    return this.mouvements.get(date) ?? { date, arrivees: [], departs: [], recouches: [] };
  }

  /** Saisie par la gouvernante (N1+) des mouvements d'une journée. */
  saisirMouvements(mouvements: PmsMouvementsJour): void {
    this.mouvements.set(mouvements.date, mouvements);
  }

  async envoyerStatutMenage(): Promise<void> {
    // Rien à envoyer : pas de PMS.
  }
}

/** Choisit le connecteur d'un établissement selon sa configuration (préparée par le N4). */
export function creerConnecteurPms(restaurantId: string, config: PmsConfiguration | undefined): PmsConnector {
  if (!config || !config.actif || config.fournisseur === "manuel") {
    return new ConnecteurManuel(restaurantId);
  }
  // Connecteurs réels : à écrire dans pms/connecteurs/ (voir la note en tête de fichier).
  throw new Error(`PMS_CONNECTEUR_NON_DISPONIBLE: ${config.fournisseur}`);
}
