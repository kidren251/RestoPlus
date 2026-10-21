# Resto Plus — Guide de mise en place d'un restaurant

Pour le technicien qui installe Resto Plus chez un client. But : en un entretien de
30 minutes, savoir quels réglages proposer, sans tout réinventer à chaque fois.

Méthode : **1.** poser les questions de la partie 1 ; **2.** choisir le profil le plus
proche (partie 2) ; **3.** ajuster les quelques réglages qui diffèrent ; **4.** faire la
liste de contrôle avant livraison (partie 5).

Dernière mise à jour : 21 octobre 2026. Ce guide évolue avec le produit : ne promettez
au client que ce qui figure dans la partie 3 « Ce qui se règle aujourd'hui ».

---

## 1. Les questions à poser au client

| # | Question | Ce que la réponse décide |
|---|---|---|
| 1 | Qui accueille et installe les clients à leur arrivée ? (serveur, chef de rang, maître d'hôtel) | Droit « Installer des clients » |
| 2 | Qui prend les commandes et réclame les plats en cuisine ? | Droit « Commander » |
| 3 | Qui suit le déroulé du repas (entrée, plat, dessert servis) ? | Droit « Suivre le dîner » |
| 4 | Qui a le droit d'envoyer l'addition ? | Droit « Addition » |
| 5 | Qui prend les réservations au téléphone et peut les annuler ? | Droit « Réservations » |
| 6 | Qui peut modifier une fiche client (nom, téléphone, notes) ? | Droit « Fiche client » |
| 7 | Beaucoup de clients sans réservation ? | Insister sur le bouton « Sans réservation » à la formation |
| 8 | À quelle heure finit réellement le dernier service ? | Heure de bascule de la journée (5h par défaut) |
| 9 | Combien de personnes en salle / en cuisine, et qui les encadre ? | Comptes N0 à N2 à créer, délégations |
| 10 | Le directeur est-il en salle pendant le service ? | Formation au verrou de service du directeur |
| 11 | Quels contrôles HACCP faites-vous aujourd'hui (papier) ? À quelle fréquence ? | Plan HACCP à saisir (demande technique) |

Les niveaux : **N0** serveur / commis · **N1** chef de rang / chef de partie ·
**N2** manager de salle / chef de cuisine · **N3** directeur de l'établissement.

---

## 2. Les profils types

Valeur = niveau minimum pour faire l'action. En **gras** : ce qui change par rapport
aux réglages par défaut.

| Droit | Par défaut | A. Brasserie à fort débit | B. Restaurant traditionnel | C. Gastronomique | D. Petite équipe polyvalente |
|---|---|---|---|---|---|
| Installer des clients, changer de table | N0 | N0 | N0 | **N1** | N0 |
| Commander et réclamer un plat | N0 | N0 | N0 | N0 | N0 |
| Suivre le dîner (étapes, plats) | N1 | **N0** | N1 | N1 | **N0** |
| Envoyer l'addition | N1 | **N0** | N1 | **N2** | **N0** |
| Modifier la fiche client | N1 | N1 | N1 | N1 | **N0** |
| Créer et annuler des réservations | N1 | N1 | N1 | **N2** | **N0** |
| Cocher les tâches de salle | N0 | N0 | N0 | N0 | N0 |

### A. Brasserie à fort débit
Service rapide, beaucoup de clients sans réservation, chaque serveur gère son rang de A à Z.
- Le serveur installe, suit le repas et encaisse : tout à N0 sauf réservations et fiches.
- Formation : le geste « Sans réservation » (2 touchers) et « Changer de table ».
- Heure de bascule : 5h (défaut) ; 6h si l'établissement ferme après 3h.

### B. Restaurant traditionnel avec brigade
Serveurs et chefs de rang, un manager de salle. **Ce sont les réglages par défaut.**
- Le serveur accueille et prend les commandes ; le chef de rang suit le repas et encaisse.
- Aucun réglage à changer : vérifier seulement que l'organisation décrite correspond.

### C. Gastronomique / maître d'hôtel
Accueil et placement tenus par le maître d'hôtel (N1), addition contrôlée par le manager.
- Installer N1 : le serveur ne place pas les clients lui-même.
- Addition N2 et réservations N2 : contrôle par le manager de salle.
- Formation : le directeur garde le **verrou de service** (consultation seule par défaut).

### D. Petite équipe polyvalente
2 à 5 personnes, tout le monde fait tout, le patron est souvent en salle.
- Presque tout à N0 : chacun peut tout faire au service.
- Garder les sorties de stock et les comptes rendus au N2 (non réglable, c'est voulu :
  c'est ce qui rend le stock fiable).
- Créer un compte N2 pour le patron ou le second, même en petite équipe.

> Établissements avec hébergement (hôtel) : pas encore disponible. Ne pas le proposer.

---

## 3. Ce qui se règle aujourd'hui, et où

### Depuis la console N4 (appui long sur « PALACEOS » à l'accueil)
En démo : avec un compte N3 et l'app configurée en mode créateur. Plus tard : vrai
compte N4, propre au technicien.
- **Les 7 droits du service** du tableau ci-dessus, établissement par établissement.
  Chaque modification est inscrite au journal d'audit de l'établissement.

### Depuis l'application, par l'équipe du client
- **Plan de salle** (N2) : tables, noms, capacités, disposition, décor.
- **Carte et stock** (cuisine, N1 pour créer, N2 pour sortir) : articles, seuils, plats et ingrédients.
- **Comptes de l'équipe** (N3) : création des comptes N0-N2, codes d'activation `RP-XXXX-XXXX`.
- **Délégations** (N3) : confier les tâches d'un N2 absent à un N1 de son pôle.

### Sur demande technique (pas encore d'écran — à faire par un développeur)
- Heure de bascule de la journée de service et fuseau horaire (`restaurants.heure_bascule_service`).
- Durées de conservation RGPD (clients 36 mois, messages 12 mois, anciens membres 12 mois).
- Départements activés (salle, cuisine, direction pour un restaurant).
- **Plan HACCP** : checklists (ouverture, fermeture, contrôles réguliers) et leurs points
  de contrôle, à adapter au plan de maîtrise sanitaire du client. Demander au client son
  plan actuel (papier) lors de l'entretien.

### Ce qui n'est PAS réglable (et ne doit pas l'être)
- Les sorties de stock, pertes et ajustements : toujours N2 (chef de cuisine).
- Les comptes rendus de service : N2 du pôle ; journal d'audit, comptes, délégations : N3.
- La séparation salle / cuisine : un commis ne voit jamais le plan de salle, un
  serveur jamais le stock.
- Les allergies : toujours « signalées par le client » et effacées après le repas (RGPD).

---

## 4. Points d'ergonomie à présenter au client

- **Installer en un geste** : toucher la table, puis le nom du client attendu, ou « Sans
  réservation » + nombre de couverts.
- **Le client qui veut une autre table** : toucher la table qu'il veut, puis son nom ;
  sa réservation et ses allergies suivent. Déjà assis : « Changer de table ».
- **Réserver sans attribuer de table** : la table se choisit à l'arrivée.
- **Allergies** : à redemander à chaque visite (bonne pratique de sécurité alimentaire,
  une allergie peut changer) ; jamais conservées après le repas.
- **Verrou du directeur** : le plan s'ouvre en consultation pour le N3, pour éviter une
  fausse manipulation depuis le bureau en plein service.
- **Fin de journée** : chaque responsable valide son compte rendu ; la journée se clôture
  quand salle et cuisine ont validé.

---

## 5. Liste de contrôle avant livraison

- [ ] Profil choisi et droits réglés dans la console N4 ; le client a validé le tableau.
- [ ] Plan de salle saisi (nombre de tables et capacités vérifiés avec le client).
- [ ] Carte et articles de stock principaux saisis, plats reliés à leurs ingrédients.
- [ ] Un compte N2 en salle et un en cuisine au minimum ; codes d'activation remis.
- [ ] Test rapide avec un compte N0 : installer un client, commander un plat,
      vérifier qu'il ne voit que ce qu'il doit voir.
- [ ] Heure de bascule confirmée (demande technique si différente de 5h).
- [ ] Formation : installer / sans réservation / changer de table / addition / compte rendu.
- [ ] Le client sait qui contacter en cas de problème pendant les premiers services.

---

## Fiche de synthèse à remplir pour chaque client

| | |
|---|---|
| Établissement | |
| Date de mise en place | |
| Profil retenu (A / B / C / D) | |
| Écarts par rapport au profil | |
| Heure de fin du dernier service | |
| Nombre de comptes N0 / N1 / N2 | |
| Demandes techniques à transmettre | |
| Demandes du client hors périmètre (à remonter au produit) | |
