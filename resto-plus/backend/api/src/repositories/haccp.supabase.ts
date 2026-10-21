import type { SupabaseClient } from "@supabase/supabase-js";
import type { Checklist, ChecklistItem } from "@resto-plus/types";
import type { HaccpRepository, ModificationPoint, Releve } from "./haccp";
import { estUuid, sansErreur } from "./outils";

interface LignePoint {
  id: string;
  checklist_id: string;
  label: string;
  requiert_photo: boolean;
  requiert_valeur: boolean;
  seuil_min: number | null;
  seuil_max: number | null;
  unite: string | null;
  consigne: string | null;
  ordre: number;
  actif: boolean;
}

interface LigneChecklist {
  id: string;
  nom: string;
  frequence: Checklist["frequence"];
  checklist_items: LignePoint[];
}

interface LigneReleve {
  id: string;
  restaurant_id: string;
  checklist_id: string;
  item_id: string;
  user_id: string | null;
  valeur: string | null;
  photo_url: string | null;
  conforme: boolean | null;
  commentaire: string | null;
  releve_at: string;
  date_service: string;
  libelle: string | null;
  seuil_min: number | null;
  seuil_max: number | null;
  unite: string | null;
}

const COLONNES_POINT = "id, checklist_id, label, requiert_photo, requiert_valeur, seuil_min, seuil_max, unite, consigne, ordre, actif";

// Postgres renvoie les numeric en texte via l'API REST : on les relit en nombre.
const nombre = (v: number | string | null) => (v === null ? undefined : Number(v));

const versPoint = (l: LignePoint): ChecklistItem => ({
  id: l.id,
  label: l.label,
  requiertPhoto: l.requiert_photo,
  requiertValeur: l.requiert_valeur,
  seuilMin: nombre(l.seuil_min),
  seuilMax: nombre(l.seuil_max),
  unite: l.unite ?? undefined,
  consigne: l.consigne ?? undefined,
});

const versChecklist = (c: LigneChecklist): Checklist => ({
  id: c.id,
  type: c.nom,
  frequence: c.frequence,
  items: [...(c.checklist_items ?? [])].filter((i) => i.actif).sort((a, b) => a.ordre - b.ordre).map(versPoint),
});

const versReleve = (l: LigneReleve): Releve => ({
  id: l.id,
  restaurantId: l.restaurant_id,
  checklistId: l.checklist_id,
  itemId: l.item_id,
  userId: l.user_id ?? undefined,
  valeur: l.valeur ?? undefined,
  photoUrl: l.photo_url ?? undefined,
  conforme: l.conforme ?? undefined,
  commentaire: l.commentaire ?? undefined,
  releveAt: l.releve_at,
  dateService: l.date_service,
  libelle: l.libelle ?? undefined,
  seuilMin: nombre(l.seuil_min),
  seuilMax: nombre(l.seuil_max),
  unite: l.unite ?? undefined,
});

/** Colonnes à écrire pour une modification de point (seules les clés fournies). */
function colonnesPoint(m: ModificationPoint): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  if (m.label !== undefined) c.label = m.label;
  if (m.requiertValeur !== undefined) c.requiert_valeur = m.requiertValeur;
  if (m.requiertPhoto !== undefined) c.requiert_photo = m.requiertPhoto;
  if (m.seuilMin !== undefined) c.seuil_min = m.seuilMin;
  if (m.seuilMax !== undefined) c.seuil_max = m.seuilMax;
  if (m.unite !== undefined) c.unite = m.unite;
  if (m.consigne !== undefined) c.consigne = m.consigne;
  if (m.ordre !== undefined) c.ordre = m.ordre;
  if (m.actif !== undefined) c.actif = m.actif;
  // Un point sans valeur chiffrée n'a pas de seuil (contrainte de la migration 0019).
  if (m.requiertValeur === false) {
    c.seuil_min = null;
    c.seuil_max = null;
  }
  return c;
}

export function creerHaccpSupabase(db: SupabaseClient): HaccpRepository {
  /** La checklist appartient-elle à l'établissement ? */
  const checklistDe = async (restaurantId: string, checklistId: string) =>
    estUuid(restaurantId) && estUuid(checklistId)
      ? !!sansErreur(await db.from("checklists").select("id").eq("id", checklistId).eq("restaurant_id", restaurantId).maybeSingle())
      : false;

  return {
    async listerChecklists(restaurantId) {
      if (!estUuid(restaurantId)) return [];
      const lignes = sansErreur(
        await db
          .from("checklists")
          .select(`id, nom, frequence, checklist_items(${COLONNES_POINT})`)
          .eq("restaurant_id", restaurantId)
          .eq("actif", true)
          .order("ordre")
      ) as LigneChecklist[];
      return lignes.map(versChecklist);
    },

    async point(restaurantId, checklistId, itemId) {
      if (![restaurantId, checklistId, itemId].every(estUuid)) return null;
      const ligne = sansErreur(
        await db
          .from("checklist_items")
          .select(`${COLONNES_POINT}, checklists!inner(restaurant_id, actif)`)
          .eq("id", itemId)
          .eq("checklist_id", checklistId)
          .eq("actif", true)
          .eq("checklists.restaurant_id", restaurantId)
          .eq("checklists.actif", true)
          .maybeSingle()
      ) as LignePoint | null;
      return ligne ? versPoint(ligne) : null;
    },

    async enregistrer(restaurantId, r) {
      const id = r.id && estUuid(r.id) ? r.id : undefined;
      // Relevé renvoyé par la file hors ligne : déjà enregistré, on le renvoie tel quel.
      if (id) {
        const existant = sansErreur(
          await db.from("checklist_entries").select().eq("id", id).eq("restaurant_id", restaurantId).maybeSingle()
        ) as LigneReleve | null;
        if (existant) return versReleve(existant);
      }
      const ligne = sansErreur(
        await db
          .from("checklist_entries")
          .insert({
            ...(id ? { id } : {}),
            restaurant_id: restaurantId,
            checklist_id: r.checklistId,
            item_id: r.itemId,
            user_id: r.userId && estUuid(r.userId) ? r.userId : null,
            valeur: r.valeur ?? null,
            photo_url: r.photoUrl ?? null,
            conforme: r.conforme ?? null,
            commentaire: r.commentaire ?? null,
            releve_at: r.releveAt,
            libelle: r.libelle ?? null,
            seuil_min: r.seuilMin ?? null,
            seuil_max: r.seuilMax ?? null,
            unite: r.unite ?? null,
            statut: "valide",
          })
          .select()
          .single()
      ) as LigneReleve;
      return versReleve(ligne);
    },

    async releves(restaurantId, dateService) {
      if (!estUuid(restaurantId)) return [];
      const lignes = sansErreur(
        await db.from("checklist_entries").select().eq("restaurant_id", restaurantId).eq("date_service", dateService).order("releve_at")
      ) as LigneReleve[];
      return lignes.map(versReleve);
    },

    async creerChecklist(restaurantId, { nom, frequence }) {
      const dernier = sansErreur(
        await db.from("checklists").select("ordre").eq("restaurant_id", restaurantId).order("ordre", { ascending: false }).limit(1)
      ) as { ordre: number }[];
      const ligne = sansErreur(
        await db
          .from("checklists")
          .insert({ restaurant_id: restaurantId, nom, frequence, departement: "cuisine", ordre: (dernier[0]?.ordre ?? 0) + 1 })
          .select(`id, nom, frequence, checklist_items(${COLONNES_POINT})`)
          .single()
      ) as LigneChecklist;
      return versChecklist(ligne);
    },

    async modifierChecklist(restaurantId, checklistId, m) {
      if (!(await checklistDe(restaurantId, checklistId))) return null;
      const colonnes: Record<string, unknown> = {};
      if (m.nom !== undefined) colonnes.nom = m.nom;
      if (m.frequence !== undefined) colonnes.frequence = m.frequence;
      if (m.ordre !== undefined) colonnes.ordre = m.ordre;
      if (m.actif !== undefined) colonnes.actif = m.actif;
      const ligne = sansErreur(
        await db
          .from("checklists")
          .update(colonnes)
          .eq("id", checklistId)
          .eq("restaurant_id", restaurantId)
          .select(`id, nom, frequence, checklist_items(${COLONNES_POINT})`)
          .single()
      ) as LigneChecklist;
      return versChecklist(ligne);
    },

    async ajouterPoint(restaurantId, checklistId, point) {
      if (!(await checklistDe(restaurantId, checklistId))) return null;
      const dernier = sansErreur(
        await db.from("checklist_items").select("ordre").eq("checklist_id", checklistId).order("ordre", { ascending: false }).limit(1)
      ) as { ordre: number }[];
      const ligne = sansErreur(
        await db
          .from("checklist_items")
          .insert({
            checklist_id: checklistId,
            requiert_valeur: false,
            requiert_photo: false,
            ordre: (dernier[0]?.ordre ?? -1) + 1,
            ...colonnesPoint(point),
          })
          .select(COLONNES_POINT)
          .single()
      ) as LignePoint;
      return versPoint(ligne);
    },

    async modifierPoint(restaurantId, itemId, m) {
      if (!estUuid(restaurantId) || !estUuid(itemId)) return null;
      const existant = sansErreur(
        await db
          .from("checklist_items")
          .select("id, checklists!inner(restaurant_id)")
          .eq("id", itemId)
          .eq("checklists.restaurant_id", restaurantId)
          .maybeSingle()
      );
      if (!existant) return null;
      const ligne = sansErreur(
        await db.from("checklist_items").update(colonnesPoint(m)).eq("id", itemId).select(COLONNES_POINT).single()
      ) as LignePoint;
      return versPoint(ligne);
    },
  };
}
