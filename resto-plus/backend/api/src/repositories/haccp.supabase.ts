import type { SupabaseClient } from "@supabase/supabase-js";
import type { Checklist } from "@resto-plus/types";
import type { HaccpRepository, Releve } from "./haccp";
import { estUuid, sansErreur } from "./outils";

interface LigneChecklist {
  id: string;
  nom: string;
  frequence: Checklist["frequence"];
  checklist_items: { id: string; label: string; requiert_photo: boolean; requiert_valeur: boolean; ordre: number }[];
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
}

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
});

export function creerHaccpSupabase(db: SupabaseClient): HaccpRepository {
  return {
    async listerChecklists(restaurantId) {
      if (!estUuid(restaurantId)) return [];
      const lignes = sansErreur(
        await db
          .from("checklists")
          .select("id, nom, frequence, checklist_items(id, label, requiert_photo, requiert_valeur, ordre)")
          .eq("restaurant_id", restaurantId)
          .eq("actif", true)
          .order("ordre")
      ) as LigneChecklist[];
      return lignes.map((c) => ({
        id: c.id,
        type: c.nom,
        frequence: c.frequence,
        items: [...c.checklist_items]
          .sort((a, b) => a.ordre - b.ordre)
          .map((i) => ({ id: i.id, label: i.label, requiertPhoto: i.requiert_photo, requiertValeur: i.requiert_valeur })),
      }));
    },

    async pointExiste(restaurantId, checklistId, itemId) {
      if (![restaurantId, checklistId, itemId].every(estUuid)) return false;
      const ligne = sansErreur(
        await db
          .from("checklist_items")
          .select("id, checklists!inner(restaurant_id)")
          .eq("id", itemId)
          .eq("checklist_id", checklistId)
          .eq("checklists.restaurant_id", restaurantId)
          .maybeSingle()
      );
      return !!ligne;
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
  };
}
