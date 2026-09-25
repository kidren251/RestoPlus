import type { FastifyInstance, FastifyRequest } from "fastify";
import type { CompteRenduLigneStock, CompteRenduPlat, CompteRenduService, PoleService } from "@resto-plus/types";
import { PARAMETRES_SERVICE_DEFAUT } from "@resto-plus/types";
import { checkPermission, requirePermission, resolveSubject } from "../permissions";
import { resolveIdentity } from "../demoIdentity";
import { delegationActive } from "../delegationStore";
import { confirmerMouvement, items as stockItems, movements } from "./stock";
import { journalAdditions, journalCommandes } from "./tableState";
import { reservations } from "./reservations";
import { comptesRendus, etatJournee, historiqueJournees, jourEffectif } from "../journeeStore";
import { journaliser } from "../audit";
import "../auth";
import { restaurantDe } from "../tenant";

/**
 * Comptes rendus de service — Resto Plus
 *
 * L'app génère le compte rendu à partir des données du service (commandes, additions,
 * réservations, mouvements de stock). Le N2 du pôle le vérifie en fin de journée,
 * ajoute ses observations et le valide : il est alors transmis à la direction (N3).
 * Côté cuisine, la validation confirme toutes les sorties de stock provisoires : c'est
 * l'acte qui engage la responsabilité comptable du chef de cuisine.
 */

function parsePole(value: string): PoleService | null {
  return value === "salle" || value === "cuisine" ? value : null;
}

function derniereValidation(restaurantId: string, pole: PoleService, jour: string): string | undefined {
  return comptesRendus
    .filter((cr) => cr.restaurantId === restaurantId && cr.pole === pole && cr.date === jour)
    .map((cr) => cr.valideAt ?? cr.genereAt)
    .sort()
    .at(-1);
}

/**
 * Un événement entre dans le compte rendu s'il appartient à la journée de service en
 * cours (un service fini à 2h du matin reste celui de la veille, une journée clôturée
 * par les deux comptes rendus laisse la place au service suivant) et s'il n'a pas déjà
 * été couvert par un compte rendu validé plus tôt dans cette même journée.
 */
function dansLaPeriode(restaurantId: string, at: string, jour: string, depuis: string | undefined) {
  return jourEffectif(restaurantId, at) === jour && (!depuis || at > depuis);
}

function agregerPlats(restaurantId: string, jour: string, depuis: string | undefined): CompteRenduPlat[] {
  const parPlat = new Map<string, CompteRenduPlat>();
  for (const commande of journalCommandes.filter((c) => c.restaurantId === restaurantId)) {
    if (!dansLaPeriode(restaurantId, commande.at, jour, depuis)) continue;
    const ligne = parPlat.get(commande.menuItemId) ?? { nom: commande.nom, quantite: 0, chiffreAffaires: 0 };
    ligne.quantite += commande.quantite;
    ligne.chiffreAffaires += commande.prixVente * commande.quantite;
    parPlat.set(commande.menuItemId, ligne);
  }
  return [...parPlat.values()].sort((a, b) => b.quantite - a.quantite);
}

function arrondi(valeur: number) {
  return Math.round(valeur * 100) / 100;
}

/** Brouillon calculé à la volée : reflète toujours l'état courant du service. */
function genererBrouillon(restaurantId: string, pole: PoleService): CompteRenduService {
  const jour = jourEffectif(restaurantId);
  const periodeDebut = derniereValidation(restaurantId, pole, jour);
  const plats = agregerPlats(restaurantId, jour, periodeDebut);
  const base: CompteRenduService = {
    id: `brouillon-${pole}`,
    restaurantId,
    pole,
    date: jour,
    heureBascule: PARAMETRES_SERVICE_DEFAUT.heureBascule,
    statut: "brouillon",
    periodeDebut,
    genereAt: new Date().toISOString(),
    plats,
    chiffreAffairesEstime: arrondi(plats.reduce((total, plat) => total + plat.chiffreAffaires, 0)),
  };

  if (pole === "salle") {
    const duJour = reservations.filter((reservation) => reservation.restaurantId === restaurantId && reservation.date === jour);
    return {
      ...base,
      nbReservations: duJour.length,
      totalCouverts: duJour.reduce((total, reservation) => total + (reservation.couverts ?? 0), 0),
      nbAdditions: journalAdditions.filter((addition) => addition.restaurantId === restaurantId && dansLaPeriode(restaurantId, addition.at, jour, periodeDebut)).length,
    };
  }

  // Cuisine : toutes les baisses de stock en attente. Celles d'un service précédent
  // resté sans compte rendu sont incluses (sinon elles ne seraient jamais confirmées)
  // et repérées par leur journée de service.
  const lignes: CompteRenduLigneStock[] = movements
    .filter((movement) => movement.restaurantId === restaurantId && movement.statut === "provisoire")
    .map((movement) => {
      const item = stockItems.find((candidate) => candidate.id === movement.stockItemId);
      const quantiteSortie = Math.max(0, -(movement.delta ?? 0));
      return {
        movementId: movement.id,
        stockItemId: movement.stockItemId,
        stockItemNom: item?.nom ?? movement.stockItemId,
        unite: item?.unite ?? "unite",
        type: movement.type,
        quantite: movement.quantite,
        delta: movement.delta ?? 0,
        coutEstime: item?.prixAchat !== undefined ? arrondi(item.prixAchat * quantiteSortie) : undefined,
        motif: movement.motif,
        timestamp: movement.timestamp,
        jourService: jourEffectif(restaurantId, movement.timestamp),
        statut: "provisoire" as const,
      };
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const somme = (filtre: (ligne: CompteRenduLigneStock) => boolean) =>
    arrondi(lignes.filter(filtre).reduce((total, ligne) => total + (ligne.coutEstime ?? 0), 0));

  return {
    ...base,
    mouvementsStock: lignes,
    coutMatiereEstime: somme((ligne) => ligne.type !== "perte"),
    valeurPertes: somme((ligne) => ligne.type === "perte"),
  };
}

export async function comptesRendusRoutes(app: FastifyInstance) {
  // GET /comptes-rendus/brouillon/:pole — compte rendu généré, à vérifier par le N2 du pôle
  app.get<{ Params: { pole: string } }>("/comptes-rendus/brouillon/:pole", async (req, reply) => {
    const pole = parsePole(req.params.pole);
    if (!pole) return reply.status(400).send({ error: "Pôle invalide" });
    if (!checkPermission(req, reply, `compte_rendu.${pole}`)) return;
    return genererBrouillon(restaurantDe(req), pole);
  });

  // POST /comptes-rendus/:pole/valider — fige le compte rendu et le transmet à la direction
  app.post<{ Params: { pole: string }; Body: { observations?: string } }>("/comptes-rendus/:pole/valider", async (req, reply) => {
    const pole = parsePole(req.params.pole);
    if (!pole) return reply.status(400).send({ error: "Pôle invalide" });
    if (!checkPermission(req, reply, `compte_rendu.${pole}`)) return;

    const restaurantId = restaurantDe(req);
    const brouillon = genererBrouillon(restaurantId, pole);
    const identity = resolveIdentity(req);
    const valideAt = new Date().toISOString();

    if (pole === "cuisine") {
      for (const ligne of brouillon.mouvementsStock ?? []) {
        const movement = movements.find((candidate) => candidate.id === ligne.movementId);
        if (movement) confirmerMouvement(movement);
        ligne.statut = "confirme";
      }
    }

    const compteRendu: CompteRenduService = {
      ...brouillon,
      id: `cr-${pole}-${Date.now()}`,
      statut: "valide",
      valideAt,
      valideParId: identity?.id ?? req.auth?.userId,
      valideParNom: identity?.nom,
      valideParDelegation: identity?.accessRole === "chef_rang" && !!delegationActive(restaurantId, identity.id),
      observations: req.body?.observations?.trim() || undefined,
    };
    comptesRendus.push(compteRendu);
    journaliser(req, "compte_rendu.valide", {
      cible: { type: "compte_rendu", id: compteRendu.id, libelle: `${pole} · service du ${compteRendu.date}` },
      details: {
        chiffreAffairesEstime: compteRendu.chiffreAffairesEstime,
        coutMatiereEstime: compteRendu.coutMatiereEstime ?? null,
        valeurPertes: compteRendu.valeurPertes ?? null,
        sortiesConfirmees: (compteRendu.mouvementsStock ?? []).map((ligne) => ligne.movementId).join(","),
        observations: compteRendu.observations ?? null,
      },
    });
    // La réponse dit si cette validation a clôturé la journée (les deux pôles validés).
    const journee = etatJournee(restaurantId, compteRendu.date);
    if (journee.cloturee && journee.clotureAt === compteRendu.valideAt) {
      journaliser(req, "journee.cloturee", {
        cible: { type: "journee", id: journee.date },
        details: { salleValideAt: journee.salle?.valideAt ?? null, cuisineValideAt: journee.cuisine?.valideAt ?? null },
      });
    }
    return reply.status(201).send({ ...compteRendu, journee });
  });

  // GET /journees — journée en cours et historique des clôtures (salle + cuisine)
  app.get("/journees", { preHandler: requirePermission("compte_rendu.consulter") }, async (req) => {
    const restaurantId = restaurantDe(req);
    return {
      courante: etatJournee(restaurantId, jourEffectif(restaurantId)),
      historique: historiqueJournees(restaurantId),
    };
  });

  // GET /comptes-rendus — comptes rendus validés : le N3 reçoit tout, un N2 voit son pôle
  app.get<{ Querystring: { pole?: string } }>("/comptes-rendus", { preHandler: requirePermission("compte_rendu.consulter") }, async (req) => {
    const subject = resolveSubject(req);
    const restaurantId = restaurantDe(req);
    const poleDemande = req.query.pole ? parsePole(req.query.pole) : null;
    return comptesRendus
      .filter((cr) => cr.restaurantId === restaurantId)
      .filter((cr) => !subject || subject.pole === "direction" || cr.pole === subject.pole)
      .filter((cr) => !poleDemande || cr.pole === poleDemande)
      .sort((a, b) => (b.valideAt ?? "").localeCompare(a.valideAt ?? ""));
  });
}
