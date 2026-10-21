# Resto Plus — Tests sur téléphone

Liste de ce qu'il reste à vérifier à la main, dans l'ordre conseillé. On coche (`- [x]`)
au fur et à mesure ; un test raté se note dans « Problèmes trouvés » en bas, avec le
compte utilisé et ce qui s'est passé.

Dernière mise à jour : 21 octobre 2026.

Comptes de démo (mot de passe `resto2026`) : `comptesalle-0` (N0 serveur),
`comptesalle-1` (N1 chef de rang), `comptesalle-2` (N2 manager), `comptesalle-3`
(N3 directeur), `comptecuisin-0/1/2` (cuisine N0 à N2). Détail : `docs/comptes-demo.md`.

## Avant de commencer

- [ ] `yarn dev:api` : la console affiche l'API démarrée. Ouvrir
      `http://<adresse-du-PC>:3000/health` dans le navigateur du téléphone : `"mode":"supabase"`.
- [ ] `yarn dev:mobile` puis scanner le QR code avec Expo Go.
- [ ] Remettre la démo à zéro avant une série de tests :
      `yarn workspace @resto-plus/api db:seed` (salle vide, 5 réservations ce soir).
- [ ] Idéal : deux téléphones (un « salle », un « direction » ou « cuisine »).

> Pas de temps réel entre téléphones pour l'instant : après un geste sur le téléphone A,
> **revenir en arrière puis rouvrir l'écran** sur le téléphone B pour voir le changement.

---

## 1. Plan de salle sur la vraie base (lot du 21/10) — priorité haute

Compte : `comptesalle-2` (N2).

- [ ] Le plan affiche « Salle Principale », 6 tables nommées « Table 1 » à « Table 6 »,
      le bar, l'entrée et la cuisine.
- [ ] Déplacer une table, fermer l'app, la relancer : **la table est restée à sa
      nouvelle place** (c'est la preuve que la base fonctionne).
- [ ] Glisser-déposer fluide, la table ne « saute » pas en fin de geste.
- [ ] Panneau d'une table : renommer la table et changer sa capacité, puis relancer
      l'app : les changements sont conservés.
- [ ] Avec `comptesalle-0` (N0) : impossible de déplacer une table.

## 2. Installer des clients et changer de table (lot du 21/10) — priorité haute

Compte : `comptesalle-0` (N0 serveur) — il doit pouvoir tout faire dans cette partie.

- [ ] Toucher une table libre **ne l'ouvre plus toute seule** : le panneau s'ouvre avec
      « Installer des clients ».
- [ ] Toucher la **Table 2** : « M. Fontaine » est en tête, surligné, avec « prévue ici ».
- [ ] Toucher « M. Fontaine » : la table passe en occupée (rouge), le panneau affiche
      son nom. Dans l'écran Réservations : M. Fontaine indique « À table ».
- [ ] **Walk-in** : toucher la **Table 5**, régler 3 couverts avec − / +, toucher
      « Sans réservation ». La table est occupée ; dans Réservations, une ligne
      « Sans réservation » avec le badge **SANS RÉSA** et 3 couverts.
- [ ] **Client qui demande une autre table** : toucher la **Table 1** (prévue pour
      Mme Leclerc) puis choisir « Mme Beaumont » (prévue à la table 3). Elle est
      installée table 1 ; son allergie (gluten, lactose) apparaît sur la fiche de la table.
- [ ] **Changer de table** : toucher la Table 1 occupée → « Changer de table » liste les
      tables libres → toucher « Table 3 ». La table 1 redevient libre, la table 3 est
      occupée par Mme Beaumont, avec ses allergies.
- [ ] Dans Réservations, déplier Mme Beaumont : « DÉROULÉ DU DÎNER » montre
      « Clients installés » puis « Changement de table : Table 1 → Table 3 ».
- [ ] Essayer d'installer sur une table occupée : impossible (la section n'apparaît pas).
- [ ] Avec `comptecuisin-0` : aucune de ces actions n'est possible (pas de plan de salle).

## 3. Suivi du dîner, fiche client, addition (lot du 21/10)

Compte : `comptesalle-1` (N1 chef de rang), sur une table installée en partie 2.

- [ ] Panneau → « Suivi du dîner » : passer l'étape à « Plat », l'état à « Servi ».
      Dans Réservations, le déroulé du dîner montre « Plat servi ».
- [ ] « Ouvrir la fiche client » : le titre affiche le **nom de la table** (pas « t1 »).
- [ ] Saisir une allergie **sans cocher** « Signalées par le client » → enregistrer :
      message d'erreur, rien n'est enregistré.
- [ ] Cocher la case → enregistrer : l'allergie est conservée.
- [ ] « Envoyer l'addition » : la table passe « à nettoyer » (gris) ; rouvrir la fiche :
      **l'allergie a disparu**, le nom du client est toujours là. Dans Réservations : « Terminée ».
- [ ] Remettre la table « libre » : le nom du client du repas précédent disparaît.
- [ ] Avec `comptesalle-0` (N0) : pas de suivi du dîner ni d'addition (réservés N1+).

## 4. Réservations (lot du 21/10)

Compte : `comptesalle-1` (N1).

- [ ] La liste du soir affiche les 5 réservations de démo, triées par heure, avec le
      **nom de la table** (« Table 2 », pas « t2 »).
- [ ] « + » → nouvelle réservation **sans table** (« À l'arrivée ») : elle apparaît avec
      « Table à l'arrivée ».
- [ ] Nouvelle réservation avec une table choisie dans les pastilles.
- [ ] Allergies saisies sans cocher la case : message d'erreur. Avec la case : la
      réservation montre le ⚠ et, dépliée, « ALLERGIES POUR CE REPAS ».
- [ ] Heure mal saisie (« 1930 ») : message d'erreur clair.
- [ ] Annuler une réservation : elle disparaît de la liste ; relancer l'app : elle ne
      revient pas.
- [ ] La réservation créée apparaît dans « Installer des clients » sur le plan de salle.
- [ ] Avec `comptesalle-0` (N0) : pas de bouton « + » ni d'annulation.

## 5. Console N4 : droits du service (lot du 21/10)

Compte : `comptesalle-3` (N3) → appui long sur « PALACEOS » (accueil) pour ouvrir la
console. Prérequis : `EXPO_PUBLIC_PLATFORM_ROLE=dev_creator` dans `apps/mobile/.env`.

- [ ] Section « DROITS DU SERVICE PAR ÉTABLISSEMENT » : « Restaurant de démo » est
      sélectionné, 7 lignes, chaque niveau par défaut marqué d'une `*`.
- [ ] Régler « Installer des clients, changer de table » sur **N1** → Enregistrer :
      message de confirmation.
- [ ] Se reconnecter en `comptesalle-0` (N0) : la section « Installer des clients »
      n'apparaît plus dans le panneau d'une table libre.
- [ ] Se reconnecter en `comptesalle-1` (N1) : elle est là et fonctionne.
- [ ] Journal d'audit (`comptesalle-3`) : une ligne « Droits du service réglés (N4) ».
- [ ] **Remettre le réglage sur N0** (valeur par défaut) en fin de test.

## 5 bis. Checklists HACCP sur la vraie base (lot du 21/10)

Compte : `comptecuisin-0` (N0 commis).

- [ ] Checklists HACCP : « Ouverture cuisine », « Fermeture cuisine », « Contrôle 4h ».
- [ ] Valider « Vérification température réfrigérateurs » avec une valeur (ex. 3.5).
- [ ] **Fermer l'app, la relancer** : le point est toujours coché (avant, il se perdait).
- [ ] Sur un **deuxième téléphone** (autre compte cuisine) : le même point apparaît coché.
- [ ] Hors ligne : valider un point, rallumer le réseau, relancer l'app : il est coché.
- [ ] Journal d'audit (`comptesalle-3`) : une ligne HACCP par relevé.
- [ ] Décocher un point puis relancer l'app : il revient coché (le relevé envoyé fait
      foi). Noter si ce comportement gêne à l'usage.

## 6. Écrans à droits après le découpage du 10/10

Vérifier que chaque niveau voit exactement ce qu'il doit voir (rien de plus, rien de moins).

- [ ] `comptesalle-0` : plan de salle (sans édition), réservations (sans « + »), tâches de salle.
- [ ] `comptesalle-1` : idem + suivi du dîner, fiche client, addition, création de réservation.
- [ ] `comptesalle-2` : idem + édition du plan, configurateur, gestion des accès, compte rendu salle.
- [ ] `comptesalle-3` : les deux pôles + Espace direction ; plan de salle **verrouillé**
      à l'ouverture (bandeau « Service verrouillé »), déverrouillable d'un toucher.
- [ ] `comptecuisin-0/1/2` : jamais de plan de salle, de réservations ni de tâches de salle.
- [ ] Un écran refusé affiche un message clair (pas d'écran blanc).
- [ ] Délégation active (partie 8) : le N1 délégué voit les écrans du N2 de son pôle.

## 7. Comptes rendus et clôture de journée (lot du 25/09, jamais testé sur téléphone)

- [ ] `comptesalle-2` → Espace équipe de salle → « Compte rendu du service » : plats,
      chiffre d'affaires, **couverts (walk-ins compris)**, additions.
- [ ] `comptecuisin-2` → compte rendu cuisine : annuler une sortie contestée, ajouter
      une observation, valider.
- [ ] Après les deux validations : « la journée est clôturée ».
- [ ] `comptesalle-3` → « Comptes rendus reçus » : les deux, groupés par journée.

## 8. Délégation, comptes, messagerie, audit (lot du 25/09, jamais testé sur téléphone)

- [ ] `comptesalle-3` → Délégations : déléguer à `comptecuisin-1` pour 1 service ;
      `comptecuisin-1` voit un bandeau et peut faire une sortie de stock.
- [ ] `comptesalle-3` → Comptes de l'équipe : créer un compte → code `RP-XXXX-XXXX` ;
      sur un autre téléphone, « Activer mon compte » avec ce code, puis se connecter.
- [ ] Désactiver ce compte : il ne peut plus se connecter.
- [ ] Messagerie : la zone de saisie **remonte au-dessus du clavier** ; un message
      arrive chez le destinataire (après quelques secondes).
- [ ] Journal d'audit : les actions de la session y figurent, filtres par catégorie,
      bandeau d'intégrité vert.

## 9. Hors ligne

- [ ] Couper le Wi-Fi, déplacer une table, renommer une table : l'app ne plante pas.
- [ ] Rallumer le Wi-Fi : au bout de quelques secondes, les changements arrivent en
      base (vérifier en relançant l'app).
- [ ] Hors ligne, « Installer des clients » ouvre la table sur le téléphone (sans
      réservation) — comportement attendu pour l'instant.

---

## Problèmes trouvés

| Date | Test (n°) | Compte | Ce qui s'est passé | Capture ? |
|---|---|---|---|---|
| | | | | |
