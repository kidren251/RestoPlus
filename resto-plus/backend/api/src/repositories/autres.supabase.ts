import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client, Reservation, ReglagesDroits, ServiceEvent, TableServiceState } from "@resto-plus/types";
import { validerReglagesDroits } from "@resto-plus/types";
import type { ClientsRepository } from "./clients";
import type { EtablissementsRepository } from "./etablissements";
import { estUuid, sansErreur } from "./outils";
import type { ReservationsRepository } from "./reservations";
import { ErreurService, type CodeErreurService, type ServiceRepository } from "./service";

/** Implémentations Supabase des réservations, clients, gestes du service et réglages. */

interface LigneReservation {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  client_id: string | null;
  nom_client: string;
  couverts: number;
  heure_locale: string; // « 19:30:00 »
  date_service: string;
  allergenes: string[];
  allergenes_signales_at: string | null;
  notes: string | null;
  source: Reservation["source"] | null;
  status: Reservation["status"];
  created_at: string;
}

interface LigneEvenement {
  id: string;
  reservation_id: string;
  table_id: string;
  type: ServiceEvent["type"];
  label: string;
  occurred_at: string;
  actor_id: string | null;
  note: string | null;
}

export const versEvenement = (e: LigneEvenement): ServiceEvent => ({
  id: e.id,
  reservationId: e.reservation_id,
  tableId: e.table_id,
  type: e.type,
  label: e.label,
  occurredAt: e.occurred_at,
  actorId: e.actor_id ?? undefined,
  note: e.note ?? undefined,
});

const versReservation = (l: LigneReservation, evenements: ServiceEvent[] = []): Reservation => ({
  id: l.id,
  restaurantId: l.restaurant_id,
  tableId: l.table_id ?? undefined,
  clientId: l.client_id ?? undefined,
  nomClient: l.nom_client,
  couverts: l.couverts,
  date: l.date_service,
  heure: l.heure_locale.slice(0, 5),
  allergenes: l.allergenes,
  allergenesSignalesAt: l.allergenes_signales_at ?? undefined,
  notes: l.notes ?? undefined,
  source: l.source ?? undefined,
  status: l.status,
  createdAt: l.created_at,
  serviceEvents: evenements,
});

export function creerReservationsSupabase(db: SupabaseClient): ReservationsRepository {
  return {
    async lister(restaurantId, date) {
      if (!estUuid(restaurantId)) return [];
      const lignes = sansErreur(
        await db
          .from("reservations")
          .select()
          .eq("restaurant_id", restaurantId)
          .eq("date_service", date)
          .neq("status", "annulee")
          .order("heure")
      ) as LigneReservation[];
      if (lignes.length === 0) return [];
      const evenements = sansErreur(
        await db.from("service_events").select().in("reservation_id", lignes.map((l) => l.id)).order("occurred_at")
      ) as LigneEvenement[];
      return lignes.map((l) => versReservation(l, evenements.filter((e) => e.reservation_id === l.id).map(versEvenement)));
    },

    async creer(restaurantId, r) {
      const ligne = sansErreur(
        await db
          .from("reservations")
          .insert({
            ...(r.id ? { id: r.id } : {}),
            restaurant_id: restaurantId,
            table_id: r.tableId ?? null,
            client_id: r.clientId ?? null,
            nom_client: r.nomClient,
            couverts: r.couverts,
            date_service: r.date,
            heure_locale: r.heure,
            allergenes: r.allergenes,
            allergenes_signales_at: r.allergenesSignalesAt ?? null,
            notes: r.notes ?? null,
            source: r.source ?? "telephone",
            status: "a_venir",
          })
          .select()
          .single()
      ) as LigneReservation;
      return versReservation(ligne);
    },

    async annuler(restaurantId, id) {
      if (!estUuid(restaurantId) || !estUuid(id)) return false;
      const lignes = sansErreur(
        await db.from("reservations").update({ status: "annulee" }).eq("id", id).eq("restaurant_id", restaurantId).select("id")
      ) as { id: string }[];
      return lignes.length > 0;
    },
  };
}

interface LigneClient {
  id: string;
  restaurant_id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  preferences: string | null;
  notes: string | null;
  created_at: string;
  last_visit_at: string | null;
}

const versClient = (l: LigneClient): Client => ({
  id: l.id,
  restaurantId: l.restaurant_id,
  nom: l.nom,
  telephone: l.telephone ?? undefined,
  email: l.email ?? undefined,
  preferences: l.preferences ?? undefined,
  notes: l.notes ?? undefined,
  createdAt: l.created_at,
  lastVisitAt: l.last_visit_at ?? undefined,
});

export function creerClientsSupabase(db: SupabaseClient): ClientsRepository {
  return {
    async lister(restaurantId) {
      if (!estUuid(restaurantId)) return [];
      const lignes = sansErreur(
        await db.from("clients").select().eq("restaurant_id", restaurantId).is("anonymise_at", null).order("nom")
      ) as LigneClient[];
      return lignes.map(versClient);
    },

    async lire(restaurantId, id) {
      if (!estUuid(restaurantId) || !estUuid(id)) return null;
      const ligne = sansErreur(
        await db.from("clients").select().eq("id", id).eq("restaurant_id", restaurantId).maybeSingle()
      ) as LigneClient | null;
      return ligne ? versClient(ligne) : null;
    },

    async enregistrer(restaurantId, client) {
      if (!estUuid(restaurantId) || !estUuid(client.id)) return null;
      // Un identifiant déjà utilisé par un autre restaurant n'est jamais écrasé.
      const existant = sansErreur(
        await db.from("clients").select("restaurant_id").eq("id", client.id).maybeSingle()
      ) as { restaurant_id: string } | null;
      if (existant && existant.restaurant_id !== restaurantId) return null;

      const ligne = sansErreur(
        await db
          .from("clients")
          .upsert({
            id: client.id,
            restaurant_id: restaurantId,
            nom: client.nom,
            telephone: client.telephone ?? null,
            email: client.email ?? null,
            preferences: client.preferences ?? null,
            notes: client.notes ?? null,
            last_visit_at: client.lastVisitAt ?? null,
          })
          .select()
          .single()
      ) as LigneClient;
      return versClient(ligne);
    },
  };
}

/** Les fonctions SQL lèvent des codes métier (raise exception 'TABLE_OCCUPEE'…). */
function erreurMetier(message: string): ErreurService | null {
  const code = (["TABLE_INTROUVABLE", "TABLE_OCCUPEE", "RESERVATION_INTROUVABLE", "AUCUN_REPAS"] as CodeErreurService[]).find((c) =>
    message.includes(c)
  );
  return code ? new ErreurService(code) : null;
}

async function rpc<T>(db: SupabaseClient, fonction: string, parametres: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fonction, parametres);
  if (error) throw erreurMetier(error.message) ?? new Error(`Supabase : ${error.message}`);
  return data as T;
}

interface LigneEtat {
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

export const versEtat = (l: LigneEtat): TableServiceState => ({
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

export function creerServiceSupabase(db: SupabaseClient): ServiceRepository {
  return {
    async installer(restaurantId, tableId, installation, at) {
      if (!estUuid(restaurantId) || !estUuid(tableId)) throw new ErreurService("TABLE_INTROUVABLE");
      if (installation.reservationId && !estUuid(installation.reservationId)) throw new ErreurService("RESERVATION_INTROUVABLE");
      const resultat = await rpc<{ etat: LigneEtat; reservation: LigneReservation }>(db, "installer_clients", {
        p_restaurant_id: restaurantId,
        p_table_id: tableId,
        p_reservation_id: installation.reservationId ?? null,
        p_couverts: installation.couverts ?? null,
        p_at: at,
      });
      return { etat: versEtat(resultat.etat), reservation: versReservation(resultat.reservation) };
    },

    async deplacer(restaurantId, deTableId, versTableId, at) {
      if (![restaurantId, deTableId, versTableId].every(estUuid)) throw new ErreurService("TABLE_INTROUVABLE");
      const etat = await rpc<LigneEtat>(db, "deplacer_repas", {
        p_restaurant_id: restaurantId,
        p_de_table_id: deTableId,
        p_vers_table_id: versTableId,
        p_at: at,
      });
      return versEtat(etat);
    },

    async terminer(restaurantId, tableId, at) {
      if (!estUuid(restaurantId) || !estUuid(tableId)) throw new ErreurService("TABLE_INTROUVABLE");
      await rpc<null>(db, "terminer_repas", { p_restaurant_id: restaurantId, p_table_id: tableId, p_at: at });
    },
  };
}

export function creerEtablissementsSupabase(db: SupabaseClient): EtablissementsRepository {
  // Les droits sont vérifiés à chaque requête : cache court pour ne pas relire la base
  // à chaque fois. Une modification par le N4 vide l'entrée immédiatement.
  const cache = new Map<string, { reglages: ReglagesDroits; expire: number }>();
  const DUREE_CACHE_MS = 30_000;

  return {
    async lister() {
      return sansErreur(await db.from("restaurants").select("id, nom, slug").order("nom")) as { id: string; nom: string; slug: string }[];
    },

    async reglagesDroits(restaurantId) {
      if (!estUuid(restaurantId)) return {};
      const enCache = cache.get(restaurantId);
      if (enCache && enCache.expire > Date.now()) return enCache.reglages;
      const ligne = sansErreur(
        await db.from("restaurants").select("reglages_droits").eq("id", restaurantId).maybeSingle()
      ) as { reglages_droits: unknown } | null;
      // Une valeur invalide en base (modifiée à la main) ne s'applique pas : défauts.
      const reglages = validerReglagesDroits(ligne?.reglages_droits ?? {}) ?? {};
      cache.set(restaurantId, { reglages, expire: Date.now() + DUREE_CACHE_MS });
      return reglages;
    },

    async modifierReglagesDroits(restaurantId, reglages) {
      if (!estUuid(restaurantId)) return false;
      const lignes = sansErreur(
        await db.from("restaurants").update({ reglages_droits: reglages }).eq("id", restaurantId).select("id")
      ) as { id: string }[];
      cache.delete(restaurantId);
      return lignes.length > 0;
    },
  };
}
