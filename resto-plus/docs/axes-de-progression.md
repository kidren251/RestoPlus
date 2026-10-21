# Resto Plus — Axes de progression

Document vivant : liste de tout ce qui reste à faire pour passer du prototype au pilote
terrain, puis au produit. À chaque session, on choisit quelques cases, on les traite et
on les coche (`- [x]`). Quand un point est terminé, noter la date et la branche à côté.

Légende : 🔴 bloquant pour le pilote · 🟠 important · 🟡 confort / dette technique

Dernière mise à jour : 21 octobre 2026 (socle de tests de l'API)

> ## 🧭 Ordre de marche — à relire en début de session
>
> **Cible produit** : de la restauration pure jusqu'à l'hôtel de **moyen standing**
> (palaces et ultra haut de gamme laissés de côté pour l'instant).
> **Focus actuel : la restauration** (salle + cuisine). L'hôtellerie vient après.
>
> 1. **P1 — Rendre le système réel** 🔴 : Supabase + authentification unifiée.
>    ↳ **Pendant P1** : passer les départements en données (section « Départements
>    hôteliers », étape A). C'est le moment le moins cher : avant que les contraintes
>    SQL `check (pole in (...))` soient en production avec de vraies données.
> 2. **P2 — Fiabiliser** 🟠 : tests automatisés, CI, ménage technique.
> 3. **P3 — Service réel** 🟠 : temps réel, réglages par établissement.
> 4. **Pilote restaurant** 🟠.
> 5. **Hôtellerie**, dans cet ordre : tickets + planning (maintenance, espaces verts) →
>    référentiel des lieux → gouvernance → connecteurs PMS réels. Chaque étape passe
>    par la console N4 (mise en place sur mesure du client).
>
> **Règle** : pas de nouvelle fonctionnalité métier avant la fin de P1 (voir
> « Pourquoi cet ordre » en bas).
>
> **Décisions produit (11/10/2026)**
> - Départements = **catalogue de types** activés par le N4 (pas de départements libres).
> - **Un membre = un département** par défaut ; option `multiDepartements` réglable par
>   le N4 pour les établissements qui en ont besoin.
> - **Tickets : création de N1 à N3**, pas par les N0.
> - **Rien de superflu** : chaque client ne voit que les départements et modules activés
>   pour lui.

---

## P1 — Rendre le système réel 🔴

Objectif : les données survivent à un redémarrage, et on se connecte avec de vrais comptes.

### Persistance Supabase
- [ ] Créer le projet Supabase (dev) et appliquer les migrations `0001` à `0013`
- [ ] Vérifier que les migrations passent dans l'ordre sur une base vierge
- [ ] Créer une couche d'accès aux données par domaine (`backend/api/src/repositories/`),
      avec la même interface en mémoire (tests) et Supabase (réel)
- [ ] Brancher les routes une par une sur cette couche :
  - [ ] salles / tables / état des tables (`tableState.ts`)
  - [ ] clients / réservations
  - [ ] checklists HACCP
  - [ ] stock (articles, mouvements, alertes)
  - [ ] carte / commandes / additions
  - [ ] messagerie
  - [ ] comptes rendus + journée de service (`journeeStore.ts`)
  - [ ] comptes équipe / invitations
  - [ ] délégations (`delegationStore.ts`)
  - [ ] journal d'audit (`audit.ts`), avec le verrou anti-modification de `0012`
  - [ ] univers plateforme N4 (`platform.ts`)
- [ ] Script d'insertion des données de démo en base (restaurant de démo + 7 comptes)
- [ ] Relancer les tests d'isolation en mode Supabase

### Authentification unifiée
- [ ] Choisir un seul mécanisme : **Supabase Auth** (recommandé)
- [ ] Activation par code `RP-XXXX-XXXX` : crée l'utilisateur Supabase + la ligne
      `restaurant_members`
- [ ] Connexion : renvoie une session (jeton) au lieu d'une simple identité
- [ ] Mobile : stocker le jeton de façon sécurisée (`expo-secure-store`), l'envoyer en
      `Bearer`, gérer le renouvellement et la déconnexion
- [ ] Invitations QR des intérimaires : même chemin (compte temporaire avec expiration)
- [ ] Retirer les mots de passe de démo de l'app (`apps/mobile/src/data/demoAccounts.ts`)
- [ ] Retirer `EXPO_PUBLIC_PLATFORM_ROLE` / `EXPO_PUBLIC_ACCESS_ROLE` du `.env` mobile
- [ ] Vrai compte N4 (`app_metadata.platform_role`) ; console N4 invisible aux autres
- [ ] Faire tourner l'API en `REQUIRE_AUTH=true` par défaut, y compris en local
- [ ] Les connexions des comptes de démo apparaissent dans le journal d'audit

---

## P2 — Fiabiliser 🟠

### Tests
- [x] Mettre en place Vitest dans `backend/api` (tests via `app.inject()`, sans serveur) — 21/10/2026, branche `chore/socle-tests-api` (`yarn workspace @resto-plus/api test`)
- [x] Séparer la construction de l'app (`buildApp()`, `src/app.ts`) du `listen()` dans `main.ts` — 21/10/2026, branche `chore/socle-tests-api`
- [x] Porter le test d'isolation dans la suite (`tests/isolation-restaurants.test.ts`, plus besoin de lancer l'API) — 21/10/2026, branche `chore/socle-tests-api`
- [ ] Tests de la matrice des droits (les 31 cas de la session du 25/09) — commencé : `tests/droits.test.ts`
      (`can()` niveau × pôle, refus 403 journalisé, délégation) + `tests/auth-exigee.test.ts`
- [ ] Tests délégation / messagerie / compte rendu du jour
- [ ] Tests de clôture de journée (23h40 et 1h55 → même service, 5h00 → suivant)
- [ ] Tests du journal d'audit (intégrité, falsification détectée, purge à 11 ans,
      aucune donnée sensible)
- [ ] Tests unitaires de `packages/types` (`can()`, `serviceDay`) et du `sync-engine`

### Intégration continue
- [ ] GitHub Actions : `tsc --noEmit` (mobile + API + packages) + tests à chaque PR
      vers `test` et `main`
- [ ] Ajouter un lint (ESLint) et le brancher dans la CI

### Ménage technique
- [x] Corriger les 2 erreurs TypeScript de `backend/api/src/routes/tables.ts` (l. 30 et 83) — 21/10/2026, branche `chore/socle-tests-api`
- [ ] `turbo.json` : renommer `pipeline` en `tasks` (Turbo 2)
- [ ] Retirer `apps/mobile/.expo-test-export/` de git et l'ajouter au `.gitignore`
- [ ] CORS : limiter les origines autorisées hors mode dev
- [ ] Retirer les en-têtes `X-Demo-*` de la liste CORS quand l'auth est exigée
- [ ] Mettre à jour le README (statut, commandes, lien vers ce document)
- [ ] Validation des corps de requête (schémas Fastify / zod) sur toutes les routes
- [ ] Limitation de débit globale sur les routes publiques (`/auth/login`,
      `/comptes/activer`, `/invitations/redeem`) qui tienne aux redémarrages

### Découpage des gros fichiers 🟡
Règle cible : **un écran ≈ un fichier < 300 lignes**, logique dans des hooks, styles à part.

`apps/mobile/src/navigation/AppNavigator.tsx` (686 → 397 lignes) — 10/10/2026, branche `refactor/decoupage-gros-fichiers`
- [x] Extraire `CustomHeader` + styles → `navigation/CustomHeader.tsx` (+ `ScreenWithHeader`)
- [x] Extraire `RestrictedMessage` → `components/RestrictedMessage.tsx`
- [x] Extraire `PlanSalle` (le conteneur) → `screens/PlanSalleScreen.tsx`
- [x] Créer un hook `usePermissions()` (lit la session, renvoie `allows()`) au lieu de
      passer `allows` / `role` en props partout — `hooks/usePermissions.ts` ; le niveau
      effectif (délégation) et la délégation sont désormais dans `sessionStore`
- [x] Créer un composant `<RequirePermission permission="..." message="...">` qui remplace
      les ternaires `allows(x) ? <Ecran/> : <RestrictedMessage/>`
- [x] Chaque écran lit ses propres droits via `usePermissions()` (supprimer les props
      `canXxx={allows(...)}`)
- [x] Déplacer `RootStackParamList` dans `navigation/types.ts`
- [x] Objectif : `AppNavigator.tsx` ne contient plus que la liste des écrans (+ connexion
      et table des destinations `naviguerVers()`)

`apps/mobile/src/components/PlanDeSalle.tsx` (910 lignes → dossier, plus gros fichier 195) — 10/10/2026
- [x] Créer le dossier `components/plan-de-salle/`
- [x] `couleurs.ts` + `libelles.ts` : `COLORS`, `couleurStatut*`, `label*`, `formatHeure`
- [x] `TableItem.tsx` : affichage d'une table (contenu dédupliqué admin / normal)
- [x] `useTableDrag.ts` : hook du glisser-déposer (`PanResponder`, `Animated`)
- [x] `TableEditPanel.tsx` : panneau latéral d'édition, avec `SuiviDiner.tsx` et
      `CommandeEnCours.tsx` pour ses sections
- [x] `useTableEdition.ts` : logique du panneau (nom, capacité)
- [x] `Legende.tsx` + `AdminToolbar.tsx`
- [x] Styles en bas de chaque fichier (+ `panelStyles.ts` partagé par le panneau)
- [x] `PlanDeSalle.tsx` : seulement l'assemblage
- [ ] Vérifier sur téléphone que le glisser-déposer et le panneau se comportent pareil
- [ ] Vérifier sur téléphone les écrans à droits (N0 → N3, délégation, verrou directeur)

Autres fichiers à surveiller (au-delà de 400 lignes) : `ReservationsScreen.tsx` (506),
`salleStore.ts` (490), `packages/types/src/index.ts` (439), `CompteRenduScreen.tsx` (419,
contient 2 écrans → les séparer).

---

## P3 — Ce qu'un service réel exige 🟠

- [ ] Temps réel (Supabase Realtime) : plan de salle
- [ ] Temps réel : commandes cuisine
- [ ] Temps réel : stock
- [ ] Temps réel : messagerie (remplacer l'interrogation toutes les 4 à 8 s)
- [ ] Délégation appliquée immédiatement (pas seulement au retour sur l'accueil)
- [ ] Écran de réglage de l'heure de fin de service par établissement
- [ ] `GestionAccesScreen` branché sur l'API (changer de pôle, révoquer) + journalisé
- [ ] Gestion des conflits offline réelle (deux appareils modifient la même table)
- [ ] Tester sur téléphone : comptes rendus, délégation, activation de compte, journal
      d'audit, clavier de la messagerie (`docs/comptes-demo.md`)
- [ ] Test de charge simple : un service complet à 3-4 appareils

---

## Départements hôteliers (maintenance, espaces verts, gouvernance) 🟠

Objectif : équiper tous les services d'un hôtel. Modèle validé le 11/10/2026 :
**départements × modules** (voir `docs/architecture.md`, section « Départements, lieux et PMS »).
Fondations posées : `packages/types/src/{departements,lieux,pms,etablissement}.ts`,
`backend/api/src/pms/index.ts`.

### Étape A — Départements en données (à faire PENDANT P1)
- [x] Catalogue des types de départements et de leurs modules (`departements.ts`)
- [ ] Table `departements` par établissement + migration qui remplace les
      `check (pole in ('salle', 'cuisine'))` des migrations 0008 à 0013
- [ ] Remplacer le type fermé `Pole` par `TypeDepartement` dans l'app et l'API
      (une vingtaine de fichiers)
- [ ] Matrice des droits : règles par module (`tickets.traiter` vaut pour le département
      destinataire) au lieu d'une liste de pôles
- [ ] Clôture de journée : comptes rendus requis = départements avec
      `compteRenduQuotidien`, au lieu de « salle ET cuisine » en dur
- [ ] Intitulés des niveaux par département (Technicien, Gouvernante d'étage…)
- [ ] Messagerie : un canal par département actif

### Étape B — Module tickets + planning (maintenance, espaces verts)
- [ ] Types et table `tickets` : lieu, catégorie, priorité (urgent-sécurité / normal /
      planifiable), photo, département destinataire, demandeur
- [ ] Cycle de vie : nouveau → pris en compte → planifié → en cours → résolu → validé
      par le demandeur → clos (journalisé dans l'audit)
- [ ] Création ouverte à tous les départements, **de N1 à N3** (pas les N0) — droit
      `tickets.creer` déjà déclaré dans la matrice
- [ ] Assignation et créneau par le N1/N2, vue planning par équipe
- [ ] Préventif : interventions récurrentes qui génèrent des tickets
- [ ] Photos (Supabase Storage)
- [ ] Faire valider le périmètre réglementaire (registre de sécurité, carnet sanitaire…)

### Étape C — Référentiel des lieux
- [x] Types `Lieu` / `TypeLieu`, avec la correspondance PMS `pmsRoomId` (`lieux.ts`)
- [ ] Table `lieux` (arborescence bâtiment > étage > chambre / zone / équipement) + RLS
- [ ] Routes API avec isolation `appartient()` / `duRestaurant()` + test d'isolation
- [ ] Ajustement des lieux par le N3

### Étape D — Gouvernance
- [ ] État des chambres : sale → en nettoyage → propre → contrôlée, ou hors service
- [ ] Répartition des chambres entre les femmes / valets de chambre
- [ ] Checklist par chambre + contrôle par la gouvernante (validation N1/N2)
- [ ] Chambre hors service tant que son ticket maintenance n'est pas résolu
- [ ] Plan d'étage (réutiliser le moteur du plan de salle)
- [ ] Linge, produits, objets trouvés

### Intégration PMS
- [x] Types partagés : configuration, chambres, séjours, mouvements du jour (`pms.ts`)
- [x] Contrat `PmsConnector` + connecteur manuel + note d'intégration
      (`backend/api/src/pms/index.ts`)
- [ ] Routes : mouvements du jour (lecture) et saisie manuelle par la gouvernance
- [ ] Coffre de secrets côté serveur pour les identifiants PMS
- [ ] Étudier les API des PMS visés (Mews, Apaleo, Opera Cloud…) : authentification,
      webhooks, environnement de test, conditions de partenariat
- [ ] Premier connecteur réel (choisi selon le PMS de l'hôtel pilote)
- [ ] Envoi du statut ménage au PMS
- [ ] Webhooks entrants : vérification de signature + traitement idempotent
- [ ] Synchronisations journalisées dans l'audit
- [ ] Faire valider la minimisation des données clients (RGPD)

### Console N4 — mise en place d'un établissement avant livraison
- [x] Type `ConfigurationEtablissement` : type d'établissement, départements, lieux, PMS,
      fuseau, heure de bascule, options (`etablissement.ts`)
- [x] Option N4 `multiDepartements` (défaut : non) + fonction `modulesActifs()`
- [ ] Table `configurations_etablissement` + routes plateforme (N4 seulement)
- [ ] App : accueil, espaces et navigation construits à partir de `modulesActifs()` —
      aucune tuile ni écran pour un module non activé (« rien de superflu »)
- [ ] Gestion des membres : choix de plusieurs départements seulement si
      `multiDepartements` est activé
- [ ] Assistant de mise en place dans `DevCreatorPanelScreen` : établissement →
      départements → lieux → PMS → comptes du N3
- [ ] Import des lieux en masse (fichier CSV : liste des chambres par étage)
- [ ] Import des chambres depuis le PMS quand le connecteur le permet, avec
      rapprochement `pmsRoomId` ↔ lieu
- [ ] Contrôle avant livraison : lieux sans responsable, chambres PMS sans lieu,
      départements sans N2
- [ ] Console N4 sécurisée par un vrai compte N4 (voir P1)

---

## Préparer le pilote 🟠

- [ ] Hébergement de l'API (environnement de test + production séparés)
- [ ] Sauvegardes automatiques de la base
- [ ] Suivi des erreurs (Sentry ou équivalent) côté app et API
- [ ] Build installable (EAS Build) plutôt qu'Expo Go
- [ ] Procédure d'installation dans l'établissement (comptes, plan de salle, carte, stock)
- [ ] Mini guide utilisateur par niveau (N0 → N3)
- [ ] Canal de retour des utilisateurs pendant le pilote

---

## Juridique et commercial 🟡

- [ ] Faire valider par un juriste / DPO les durées de conservation du journal d'audit
- [ ] Faire valider le périmètre des statistiques anonymisées et agrégées
- [ ] Registre RGPD (données clients, allergies, réservations) + mentions légales / CGU
- [ ] Rapports d'activité mensuels pour la direction (à partir des comptes rendus)
- [ ] Grille de facturation définitive (utilisateurs permanents / pass intérimaires)
- [ ] Deck de présentation à partir de `docs/arguments-de-vente.md`
- [ ] Script de démo (parcours de 10 minutes qui montre stock validé + audit + plan)

---

## Pourquoi cet ordre

- **La persistance d'abord** : aujourd'hui, toutes les fonctionnalités (stock validé,
  clôture, audit « infalsifiable ») disparaissent au redémarrage de l'API. Chaque nouvelle
  fonctionnalité ajoutée en mémoire devra être réécrite au branchement Supabase : plus on
  attend, plus la facture grossit.
- **L'authentification avec** : tant que la connexion ne délivre pas de jeton, l'API ne
  fonctionne qu'en mode démo, où n'importe qui peut se déclarer directeur. Toute la
  sécurité déjà construite (matrice des droits, isolation, RLS) ne protège réellement
  rien tant que ce point n'est pas réglé.
- **Les tests avant de grossir** : le branchement Supabase touche toutes les routes. Une
  suite automatisée permet de vérifier en une commande que rien n'a régressé.
- **Le temps réel ensuite** : il s'appuie sur Supabase, il n'a de sens qu'une fois la
  base branchée.
