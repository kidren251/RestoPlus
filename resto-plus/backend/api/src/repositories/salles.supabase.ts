import type { SupabaseClient } from "@supabase/supabase-js";
import type { ElementDecor, FormeTable, Salle, StatutTable, Table, TableServiceState } from "@resto-plus/types";
import type { InfosTable, SalleResume, SallesRepository } from "./salles";
import { estUuid, sansErreur } from "./outils";
import { versEvenement } from "./autres.supabase";

interface LigneSalle {
  id: string;
  restaurant_id: string;
  nom: string;
  largeur_canvas: number;
  hauteur_canvas: number;
}

interface LigneTable {
  id: string;
  nom: string | null;
  zone: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  rotation: number;
  forme: FormeTable;
  capacite: number;
  statut: StatutTable;
}

interface LigneService {
  table_id: string;
  reservation_id: string | null;
  client_id: string | null;
  client_nom: string | null;
  course: TableServiceState["course"];
  dish_status: TableServiceState["dishStatus"];
  seated_at: string | null;
  last_event_at: string;
  allergenes: string[];
  allergenes_signales_at: string | null;
}

const versResume = (s: LigneSalle): SalleResume => ({
  id: s.id,
  restaurantId: s.restaurant_id,
  nom: s.nom,
  largeurCanvas: s.largeur_canvas,
  hauteurCanvas: s.hauteur_canvas,
});

const versService = (l: LigneService): TableServiceState => ({
  tableId: l.table_id,
  reservationId: l.reservation_id ?? undefined,
  clientId: l.client_id ?? undefined,
  clientName: l.client_nom ?? undefined,
  course: l.course,
  dishStatus: l.dish_status,
  seatedAt: l.seated_at ?? undefined,
  lastEventAt: l.last_event_at,
  allergenes: l.allergenes.length > 0 ? l.allergenes : undefined,
  allergenesSignalesAt: l.allergenes_signales_at ?? undefined,
});

export function creerSallesSupabase(db: SupabaseClient): SallesRepository {
  /** Toute requête sur une table filtre aussi par restaurant (la clé service_role ignore la RLS). */
  const tables = (restaurantId: string) => db.from("tables_salle").select().eq("restaurant_id", restaurantId);

  return {
    async lister(restaurantId) {
      if (!estUuid(restaurantId)) return [];
      const lignes = sansErreur(await db.from("salles").select().eq("restaurant_id", restaurantId).order("nom"));
      return (lignes as LigneSalle[]).map(versResume);
    },

    async lire(restaurantId, salleId) {
      if (!estUuid(restaurantId) || !estUuid(salleId)) return null;
      const salle = sansErreur(
        await db.from("salles").select().eq("id", salleId).eq("restaurant_id", restaurantId).maybeSingle()
      ) as LigneSalle | null;
      if (!salle) return null;

      const [lignesTables, lignesDecor, lignesServices] = await Promise.all([
        tables(restaurantId).eq("salle_id", salleId).order("nom"),
        db.from("elements_decor").select().eq("salle_id", salleId).eq("restaurant_id", restaurantId),
        db.from("etat_service_tables").select().eq("restaurant_id", restaurantId),
      ]);
      const lignesEtat = sansErreur(lignesServices) as LigneService[];
      // Déroulé du dîner de chaque repas en cours.
      const reservationIds = lignesEtat.map((l) => l.reservation_id).filter((id): id is string => !!id);
      const evenements = reservationIds.length
        ? (sansErreur(await db.from("service_events").select().in("reservation_id", reservationIds).order("occurred_at")) as Parameters<typeof versEvenement>[0][])
        : [];
      const services = new Map(
        lignesEtat.map((l) => [
          l.table_id,
          { ...versService(l), events: evenements.filter((e) => e.reservation_id === l.reservation_id).map(versEvenement) },
        ])
      );

      return {
        ...versResume(salle),
        tables: (sansErreur(lignesTables) as LigneTable[]).map((t): Table => ({
          id: t.id,
          restaurantId,
          nom: t.nom ?? undefined,
          x: t.x,
          y: t.y,
          largeur: t.largeur,
          hauteur: t.hauteur,
          rotation: t.rotation,
          forme: t.forme,
          capacite: t.capacite,
          zoneId: t.zone,
          statut: t.statut,
          serviceState: services.get(t.id),
        })),
        decor: sansErreur(lignesDecor) as ElementDecor[],
      };
    },

    async tableExiste(restaurantId, tableId) {
      if (!estUuid(restaurantId) || !estUuid(tableId)) return false;
      const ligne = sansErreur(
        await db.from("tables_salle").select("id").eq("id", tableId).eq("restaurant_id", restaurantId).maybeSingle()
      );
      return !!ligne;
    },

    async changerStatut(restaurantId, tableId, statut) {
      sansErreur(await db.from("tables_salle").update({ statut }).eq("id", tableId).eq("restaurant_id", restaurantId));
      if (statut === "libre") {
        // Table nettoyée : le repas précédent n'a plus à y être affiché.
        sansErreur(await db.from("etat_service_tables").delete().eq("table_id", tableId).eq("restaurant_id", restaurantId));
      }
    },

    async deplacer(restaurantId, tableId, x, y) {
      sansErreur(await db.from("tables_salle").update({ x, y }).eq("id", tableId).eq("restaurant_id", restaurantId));
    },

    async modifierInfos(restaurantId, tableId, infos: InfosTable) {
      const ligne = sansErreur(
        await db
          .from("tables_salle")
          .update(infos)
          .eq("id", tableId)
          .eq("restaurant_id", restaurantId)
          .select("nom, capacite")
          .single()
      ) as { nom: string | null; capacite: number };
      return { nom: ligne.nom ?? undefined, capacite: ligne.capacite };
    },

    async ecrireService(restaurantId, etat) {
      // Le lien avec la réservation n'est posé que par les gestes du service (installer,
      // changer de table) : une mise à jour du repas ne peut ni le retirer ni le changer.
      const existant = sansErreur(
        await db.from("etat_service_tables").select("reservation_id, client_id").eq("table_id", etat.tableId).eq("restaurant_id", restaurantId).maybeSingle()
      ) as { reservation_id: string | null; client_id: string | null } | null;
      const ligne = sansErreur(
        await db
          .from("etat_service_tables")
          .upsert({
            table_id: etat.tableId,
            restaurant_id: restaurantId,
            reservation_id: existant?.reservation_id ?? null,
            // Fiche client : celle envoyée par l'app (uuid), sinon celle déjà liée.
            client_id: etat.clientId && estUuid(etat.clientId) ? etat.clientId : existant?.client_id ?? null,
            client_nom: etat.clientName ?? etat.client?.nom ?? null,
            course: etat.course,
            dish_status: etat.dishStatus,
            seated_at: etat.seatedAt ?? null,
            last_event_at: etat.lastEventAt ?? new Date().toISOString(),
            allergenes: etat.allergenes ?? [],
            allergenes_signales_at: etat.allergenesSignalesAt ?? null,
          })
          .select()
          .single()
      ) as LigneService;
      // Déroulé du dîner : les nouveaux événements (identifiants uuid générés par l'app)
      // sont ajoutés ; ceux déjà connus sont ignorés.
      if (ligne.reservation_id && etat.events?.length) {
        const nouveaux = etat.events.filter((e) => estUuid(e.id)).map((e) => ({
          id: e.id,
          reservation_id: ligne.reservation_id,
          table_id: etat.tableId,
          restaurant_id: restaurantId,
          type: e.type,
          label: e.label,
          occurred_at: e.occurredAt,
          note: e.note ?? null,
        }));
        if (nouveaux.length) {
          sansErreur(await db.from("service_events").upsert(nouveaux, { onConflict: "id", ignoreDuplicates: true }));
        }
      }
      return versService(ligne);
    },
  };
}
