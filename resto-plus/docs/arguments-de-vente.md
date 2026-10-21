# Resto Plus — Arguments de vente

Document vivant : chaque fois qu'un choix technique ou produit devient un avantage pour
le client, on l'ajoute ici. Ce document sert de base au deck de présentation, à la démo
et au démarchage (étapes 4 et 5 de la roadmap).

## Cible

Établissements de **40 à 50 employés environ**, qui visent le très haut de gamme par leur
taille et leur ambition. Pour eux, remplacer d'un coup tout l'équipement numérique
(terminaux dédiés, caisses, tablettes durcies, infrastructure) pèse trop lourd sur le
chiffre d'affaires pour être absorbé en une fois.

**Périmètre (décision du 11/10/2026)** : l'application doit pouvoir équiper tout
établissement, de la **restauration pure jusqu'à l'hôtel de moyen standing**. Les palaces
et l'ultra haut de gamme sont laissés de côté pour l'instant. **Priorité actuelle : la
restauration** ; les services hôteliers (maintenance, espaces verts, gouvernance)
viendront ensuite, activés à la carte pour chaque client.

---

## 1. Une transition en douceur plutôt qu'un investissement lourd

**Le problème du client**
Moderniser le service passe en général par un équipement technique lourd et coûteux.
Pour un établissement de cette taille, cette dépense arrive trop tôt et d'un seul bloc.

**Notre réponse**
Resto Plus est pensé pour coûter moins cher. L'application tourne sur des appareils
simples, et l'établissement peut acquérir le matériel spécialisé progressivement, à son
rythme, au lieu de tout financer d'un coup.

**La formule gagnante**

> **L'application Resto Plus + une excellente connexion Internet dans l'établissement**
> = un outil efficace et peu coûteux **+ la satisfaction client**.

L'investissement prioritaire du client, c'est une bonne connexion Internet : c'est elle
qui rend l'outil pleinement efficace. C'est bien moins cher qu'un parc de matériel
dédié.

**Ce qui le rend crédible techniquement**
- **Fonctionnement hors ligne (offline-first)** : chaque action (plat servi, checklist
  HACCP, mouvement de stock…) est d'abord enregistrée sur l'appareil, puis envoyée au
  serveur dès que le réseau revient. Une coupure de Wi-Fi en salle ou en cuisine ne
  bloque pas le service et ne fait perdre aucune donnée.
- En clair, la connexion rend l'outil *plus efficace*, mais son absence momentanée ne le
  rend pas *inutilisable*. L'établissement peut donc améliorer son réseau
  progressivement, lui aussi.

**Phrase d'accroche**
*« Plutôt que d'investir dans un équipement lourd et onéreux, investissez dans une
technologie pensée pour coûter moins cher et vous laisser le temps d'évoluer. »*

---

## 2. Un stock fiable, parce que chaque sortie est validée par un responsable

**Le problème du client**
Dans une cuisine, le stock « officiel » dérive vite de la réalité : pertes non
déclarées, sorties oubliées, ajustements faits par n'importe qui. En fin de mois, la
comptabilité découvre des écarts que personne ne sait expliquer, et personne n'en
porte la responsabilité.

**Notre réponse**
Resto Plus sépare clairement les rôles :
- le cuisinier **charge le stock seul** (réceptions, nouveaux articles) et travaille
  sans attendre le chef ;
- toute **baisse** du stock (plat commandé en salle, perte, casse, ajustement) reste
  **provisoire** ;
- en fin de journée, l'application **génère le compte rendu du service** ; le chef de
  cuisine vérifie les sorties, **conteste** celles qui sont fausses, puis valide ;
- c'est cette validation qui fait entrer les sorties en comptabilité. Le compte
  rendu, signé par son responsable, est **transmis automatiquement à la direction**.

Le même principe vaut en salle : le manager valide chaque soir le compte rendu de son
service (couverts, plats vendus, chiffre d'affaires estimé, observations).

**Ce qui le rend crédible techniquement**
- Chaque mouvement est horodaté, attribué à une personne et porte un statut
  (provisoire, confirmé, annulé) : l'historique d'un article montre qui a sorti quoi
  et quand.
- Le stock est affiché en trois lignes : stock validé, sorties en attente, **reste en
  frigo**. Personne n'a à faire le calcul de tête en plein service.
- Le « jour de service » suit la réalité du métier : un service qui finit à 2 h du
  matin reste celui de la veille, il n'est pas coupé en deux à minuit.
- En cas d'absence du chef, le directeur **délègue** temporairement ses
  responsabilités au sous-chef : le compte rendu est validé quand même et porte la
  mention « par délégation ». La chaîne de responsabilité n'est jamais rompue.

**Phrase d'accroche**
*« Chaque soir, votre chef signe ce qui est sorti de sa cuisine. Votre stock dit enfin
la vérité, et vous savez qui en répond. »*

---

## 3. Le RGPD géré par l'outil, pas par le restaurateur

**Le problème du client**
Un restaurant accumule des données sensibles sans s'en rendre compte : numéros de
téléphone, habitudes des clients, et surtout leurs **allergies, qui sont des données de
santé**. Les carnets papier et les tableurs ne s'effacent jamais. Le jour d'un contrôle
ou d'une demande d'effacement, le restaurateur ne sait ni ce qu'il détient, ni depuis
quand.

**Notre réponse**
- Les allergies servent **le temps du repas**, puis disparaissent : aucun dossier
  médical à garder ni à protéger. Elles ne s'enregistrent que si le client les a
  signalées lui-même.
- Chaque nuit, l'application **anonymise d'elle-même** les clients qui ne sont pas
  revenus depuis 3 ans, les anciens messages et les employés partis.
- Une demande d'effacement se traite **en un geste**, sans fausser le chiffre
  d'affaires ni l'historique HACCP : la personne disparaît, les chiffres restent.
- Données hébergées **à Paris**.

**Ce qui le rend crédible techniquement**
- Les règles sont dans la base de données elle-même (allergies refusées sans
  signalement du client et effacées à la fin du repas, purge automatique programmée),
  pas dans un réglage qu'on oublie d'activer.
- Durées de conservation réglables par établissement ; registre des traitements prêt
  à présenter (`docs/rgpd.md`).

**Phrase d'accroche**
*« Vos clients vous confient leurs allergies pour un repas. Resto Plus les donne à
votre équipe le temps du service, puis les oublie. »*

> À n'utiliser commercialement qu'après validation juridique des durées et des bases
> légales (voir `docs/rgpd.md`, « À faire valider »).

---

# Facturation (pistes de travail)

Idée de départ : **facturer au nombre d'utilisateurs** de l'écosystème d'un
restaurant, avec une **option particulière pour les intérimaires** et utilisateurs
ponctuels.

C'est la bonne logique pour notre cible : l'abonnement grandit avec l'établissement,
et un restaurant de 40 personnes n'a rien de gros à payer au départ. Cela prolonge
directement l'argument n° 1 (transition en douceur).

**Trois points de vigilance**

1. **Le risque du partage de comptes.** Si chaque compte coûte, un restaurant sera
   tenté de faire partager un compte à plusieurs serveurs. Or la valeur du produit
   (validation signée, « qui a sorti quoi », délégation) repose sur **un compte par
   personne**. D'où des **paliers** plutôt qu'un prix par tête, par exemple jusqu'à
   20, 35 puis 50 utilisateurs : ajouter un commis ne coûte rien de plus au
   quotidien.
2. **La rotation du personnel.** La restauration embauche beaucoup de saisonniers.
   Facturer les comptes créés ferait payer des gens partis : il vaut mieux facturer
   les **utilisateurs actifs du mois**. Le panneau du directeur sépare déjà actifs,
   en attente d'activation et intérimaires.
3. **Les intérimaires.** Une option à part, sous forme de **« pass journée »** (par
   exemple 30 inclus par mois, puis un petit prix à l'unité) plutôt qu'un
   abonnement : l'intérimaire est ponctuel, sa facturation doit l'être aussi.

**Piste simple à tester** : un forfait par établissement + un palier d'utilisateurs
actifs + des pass journée pour les intérimaires.

---

<!--
Modèle pour les prochains arguments :

## N. Titre de l'argument

**Le problème du client**
…

**Notre réponse**
…

**Ce qui le rend crédible techniquement**
- …

**Phrase d'accroche**
*« … »*
-->
