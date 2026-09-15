# Compte rendu de session — 9 septembre 2026

## Objectif

Faire évoluer le prototype Resto Plus / PalaceOS vers un outil opérationnel pour la restauration, avec plan de salle, suivi client, coordination cuisine/salle et préparation d'un futur déploiement multi-restaurant.

## Avancées de la journée

- Finalisation du cycle de vie d'une table : libre, ouverte/occupée, puis addition envoyée et à nettoyer.
- Ajout d'un bouton dédié pour ouvrir la fiche client depuis le panneau d'une table.
- Ajout du suivi des horaires de réclamation et de service plat par plat.
- Création du mode créateur/programmeur pour adapter un plan de salle à chaque établissement.
- Ajout du verrou `EDIT/LOCK` pour empêcher les déplacements accidentels de tables.
- Séparation de l'application en espaces Cuisine et Équipe de salle.
- Mise en place du workflow cuisine/salle : réclamation, préparation, plat prêt et alerte côté salle.
- Première conception du cloisonnement strict entre restaurants indépendants.
- Début du parcours d'intégration QR directement dans l'application Restau Plus.
- Ajout d'une page d'accueil de connexion pour les utilisateurs réguliers.
- Ajout d'un chemin séparé « Accès temporaire / intérimaire » directement dans l'application.
- Ajout du rôle `access_admin` pour compartimenter la gestion des accès.
- Ajout d'un panneau de contrôle des membres, rôles, statuts, expirations et révocations.

## Fonctionnalités réalisées

### Plan de salle

- Tables affichées sur un plan spatial avec coordonnées, formes, rotations et capacités.
- Tables vertes au démarrage du service (`libre`).
- Ouverture d'une table par le chef de rang : passage en rouge (`occupee`) et création d'un événement d'installation.
- Envoi de l'addition : passage en gris (`a_nettoyer`) et ajout d'un événement horodaté.
- Marqueurs de progression du dîner : entrée, plat, dessert.
- Marqueurs de plat : à réclamer, servi et prêt au pass.
- Panneau table avec accès à la fiche client et commande en cours.
- Chaque plat est cliquable pour afficher l'heure de réclamation et l'heure de service.
- Bouton `EDIT/LOCK` dans le mode ADM pour autoriser ou bloquer le déplacement des tables.

### Fiches clients et réservations

- Fiche client avec nom, téléphone, allergies et notes.
- Réservation enrichie avec source, statut, client associé et événements de service.
- Création et annulation de réservations dans le prototype.
- Historique de visite et chronologie du dîner.

### Coordination cuisine / salle

- Espace cuisine séparé de l'espace équipe de salle.
- Suivi dynamique des plats par table.
- Cycle d'un plat : `en préparation` -> `à réclamer` -> `prêt` -> `servi`.
- La salle réclame un plat depuis la fiche table.
- La cuisine marque le plat prêt.
- Une alerte `Plat prêt` apparaît côté salle.
- La table passe au repère `plat` lorsque le plat est prêt au pass.
- Les transitions sont horodatées et passent par la file offline.
- La salle peut réclamer un plat directement depuis la commande de la table.
- La cuisine reçoit le statut `à réclamer` dans le suivi du passe.
- Le bouton `Marquer le plat prêt` crée une alerte locale `Plat prêt` pour la salle.
- La table est positionnée sur le repère `plat` lorsque le plat est prêt au pass.
- Les statuts et alertes sont partagés par le store local dans la version Expo Go.

### Tâches et espaces d'équipe

- Espace cuisine : checklists HACCP et suivi du passe.
- Espace salle : plan, réservations/clients et tâches matin/soir.
- Checklist salle matin et soir avec progression et sauvegarde locale.
- L'accueil propose des accès distincts pour l'Espace cuisine et l'Espace équipe de salle.
- Le suivi cuisine affiche les plats dynamiquement depuis le store partagé.

### Mode créateur / programmeur

- Accès ADM via le bouton `CFG`.
- Configuration du nom et des dimensions de la salle.
- Ajout de tables avec nom, capacité et forme.
- Suppression de tables.
- Bouton `CFG` disponible uniquement dans le mode manager/admin.
- Base prévue pour ajouter ensuite décor, zones, murs, bar, cuisine, entrée, export et duplication de modèles.

## Architecture métier ajoutée

- Types partagés pour clients, restaurants, membres, rôles, événements et états de service.
- Migration `0002_clients_reservations_service.sql` pour les clients, métadonnées de réservation et événements.
- Migration `0003_multi_restaurant_isolation.sql` pour les restaurants et leurs membres.
- Les données métier portent désormais un rattachement `restaurant_id` prévu pour le filtrage et les policies RLS.
- Ajout des contrats `Restaurant` et `RestaurantMember`.
- Ajout du type `ServiceAlert` pour les alertes plat prêt.
- Ajout du cycle de plat `en_attente`, `en_preparation`, `a_reclamer`, `pret`, `servi`.
- Ajout du modèle d'invitation restaurant temporaire à usage unique.
- Ajout des écrans de génération QR manager et de scan QR intérimaire.
- Installation de `expo-camera` et `react-native-qrcode-svg` pour le parcours QR Expo Go.

## Hiérarchie des accès

- `N0` / `serveur` : consultation et opérations de salle autorisées.
- `N1` / `chef_rang` : ouverture des tables, édition client, réclamation et suivi des plats.
- `N2` / `manager_admin` : configuration du plan, supervision et administration du restaurant.
- `N3` / `directeur_admin` : administration avancée et supervision d'établissement.
- `N4` / `dev_creator` : configurateur, créateur et programmeur de la plateforme ; ce niveau est séparé des membres d'un restaurant.

## Architecture d'univers fermé

La règle de conception retenue est : **un restaurant = un univers fermé**.

- L'application mobile ne choisit jamais elle-même son restaurant.
- Le restaurant actif devra être déterminé par le jeton d'authentification côté serveur.
- Les utilisateurs d'un restaurant ne pourront pas consulter les données d'un autre.
- Aucun compte administrateur global ne devra accéder automatiquement à tous les restaurants.
- Les clés, bases ou projets Supabase pourront être séparés par restaurant pour renforcer l'isolation.
- Les communications sortantes devront être explicitement autorisées et minimisées.
- Les logs et exports ne devront pas contenir de données clients non filtrées.

## Points encore en prototype

- Les données API sont encore en mémoire lorsqu'elles ne passent pas par Supabase.
- Les alertes sont locales au store dans la version Expo Go ; Supabase Realtime devra les distribuer entre appareils.
- Les cartes cuisine et les alertes sont encore alimentées par des données mock/locales dans Expo Go.
- Les colonnes `restaurant_id` sont ajoutées mais doivent être rendues obligatoires après rattachement des données existantes.
- Les policies RLS doivent filtrer toutes les tables par restaurant et par appartenance de l'utilisateur.
- L'authentification réelle doit fournir le restaurant actif et le rôle depuis le serveur, au lieu du sélecteur de rôle de démonstration.
- Le mode multi-restaurant n'est pas encore considéré comme sécurisé tant que l'authentification, les API cloisonnées et les policies RLS ne sont pas en place.
- Le parcours QR est encore en mode prototype : la redemption devra créer ou associer un compte Supabase Auth réel avant production.
- La page de connexion valide encore localement le parcours de démonstration ; elle devra appeler Supabase Auth avant tout usage réel.
- Le panneau de gestion des accès utilise encore des membres mockés ; sa source de vérité devra devenir `restaurant_members` côté serveur.

## Vérifications

- Typecheck mobile exécuté avec succès.
- Diagnostics éditeur sans erreur sur les fichiers modifiés.
- Contrôle `git diff --check` effectué.

## Prochaine étape recommandée

1. Brancher le workflow cuisine/salle sur Supabase Realtime.
2. Remplacer les rôles de démonstration par une authentification réelle.
3. Mettre en place les policies RLS et les tests d'isolation inter-restaurant.
4. Sauvegarder le configurateur de salle côté API/Supabase.
5. Ajouter les éléments décoratifs, les zones et l'export/import de modèles de plans.
6. Relier la page de connexion à Supabase Auth.
7. Relier le panneau des accès à `restaurant_members` avec révocation serveur et audit.
