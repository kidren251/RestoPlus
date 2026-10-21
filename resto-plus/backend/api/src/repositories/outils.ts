/** Outils communs aux implémentations Supabase des repositories. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Les identifiants en base sont des uuid. Un autre format (ancien identifiant de démo
 * « t1 », en-tête de démo « resto-b »…) ne peut désigner aucune ligne : on répond
 * « introuvable » au lieu de laisser Postgres lever une erreur.
 */
export function estUuid(valeur: string | undefined): valeur is string {
  return !!valeur && UUID.test(valeur);
}

/** Renvoie les données d'une réponse Supabase, ou lève son erreur. */
export function sansErreur<T>(reponse: { data: T; error: { message: string } | null }): T {
  if (reponse.error) throw new Error(`Supabase : ${reponse.error.message}`);
  return reponse.data;
}
