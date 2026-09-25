import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { CONSERVATION_AUDIT, type AuditAction, type AuditCategorie, type AuditEvenement, type AuditValeur, type AuditVerification } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";

/**
 * Journal d'audit — consultation par la direction (N3), en lecture seule.
 * Chaque événement est chaîné au précédent par une empreinte : l'API revérifie toute
 * la chaîne à chaque consultation et signale la moindre modification.
 */

const LIBELLE_ACTION: Record<AuditAction, string> = {
  "stock.article_cree": "Article de stock créé",
  "stock.article_supprime": "Article retiré du stock",
  "stock.mouvement": "Mouvement de stock",
  "stock.mouvement_annule": "Sortie de stock annulée",
  "commande.plat": "Plat commandé",
  "service.addition": "Addition envoyée",
  "compte_rendu.valide": "Compte rendu validé",
  "journee.cloturee": "Journée de service clôturée",
  "haccp.checklist": "Relevé HACCP",
  "compte.cree": "Compte créé",
  "compte.nouveau_code": "Nouveau code d’activation",
  "compte.active": "Compte activé",
  "compte.desactive": "Compte désactivé",
  "compte.messagerie": "Accès messagerie modifié",
  "delegation.creee": "Délégation accordée",
  "delegation.revoquee": "Délégation terminée",
  "invitation.creee": "Invitation intérimaire créée",
  "invitation.utilisee": "Invitation intérimaire utilisée",
  "connexion.reussie": "Connexion",
  "connexion.echouee": "Connexion refusée",
  "activation.echouee": "Activation refusée",
  "acces.refuse": "Action refusée (droits insuffisants)",
};

const FILTRES: (AuditCategorie | null)[] = [null, "comptabilite", "haccp", "administration", "securite"];

function texte(valeur: AuditValeur | undefined): string {
  if (valeur === undefined || valeur === null) return "—";
  if (typeof valeur === "boolean") return valeur ? "oui" : "non";
  if (typeof valeur === "object") return Object.entries(valeur).map(([cle, v]) => `${cle} : ${texte(v)}`).join(", ");
  return String(valeur);
}

/** Une ligne lisible : avant → après, puis les détails utiles (les identifiants techniques restent dans l'API). */
function resume(evenement: AuditEvenement): string {
  const morceaux: string[] = [];
  if (evenement.avant !== undefined || evenement.apres !== undefined) morceaux.push(`${texte(evenement.avant)} → ${texte(evenement.apres)}`);
  for (const [cle, valeur] of Object.entries(evenement.details ?? {})) {
    if (valeur === null || /Id$|^sorties|^mouvementId$/.test(cle)) continue;
    morceaux.push(`${cle} : ${texte(valeur)}`);
  }
  return morceaux.join(" · ");
}

type Reponse = { evenements: AuditEvenement[]; verification: AuditVerification[] };

export function JournalAuditScreen() {
  const [categorie, setCategorie] = useState<AuditCategorie | null>(null);
  const [data, setData] = useState<Reponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<Reponse>(`/audit?limite=200${categorie ? `&categorie=${categorie}` : ""}`));
      setError("");
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setLoading(false);
    }
  }, [categorie]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const rompues = (data?.verification ?? []).filter((v) => !v.integre);
  const total = (data?.verification ?? []).reduce((somme, v) => somme + v.evenements, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>DIRECTION · N3</Text>
      <Text style={styles.title}>Journal d’audit</Text>
      <Text style={styles.subtitle}>
        Toutes les actions importantes de l’établissement : qui, quoi, quand. Lecture seule : personne, pas même Resto Plus, ne peut modifier un événement sans que cela se voie.
      </Text>

      {data && (
        <View style={[styles.integrite, rompues.length > 0 && styles.integriteRompue]}>
          <Text style={[styles.integriteTitre, rompues.length > 0 && styles.integriteTitreRompue]}>
            {rompues.length === 0 ? `✓ Journal intègre · ${total} événements vérifiés` : "⚠ Journal altéré"}
          </Text>
          {rompues.map((v) => (
            <Text key={v.categorie} style={styles.integriteDetail}>
              {CONSERVATION_AUDIT[v.categorie].libelle} : chaîne rompue à l’événement n° {v.rompueA}
            </Text>
          ))}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtres}>
        {FILTRES.map((option) => (
          <Pressable key={option ?? "tout"} style={[styles.choice, categorie === option && styles.choiceActive]} onPress={() => setCategorie(option)}>
            <Text style={[styles.choiceLabel, categorie === option && styles.choiceLabelActive]}>{option ? CONSERVATION_AUDIT[option].libelle : "Tout"}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {categorie && (
        <Text style={styles.conservation}>
          Conservé {CONSERVATION_AUDIT[categorie].annees} an{CONSERVATION_AUDIT[categorie].annees > 1 ? "s" : ""} · {CONSERVATION_AUDIT[categorie].motif}
        </Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading && !data && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />}
      {data && data.evenements.length === 0 && <Text style={styles.empty}>Aucun événement pour le moment.</Text>}

      {data?.evenements.map((evenement) => (
        <View key={evenement.id} style={styles.ligne}>
          <View style={styles.ligneHeader}>
            <Text style={styles.action}>{LIBELLE_ACTION[evenement.action] ?? evenement.action}</Text>
            <Text style={styles.date}>
              {new Date(evenement.at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
          </View>
          <Text style={styles.acteur}>
            {evenement.acteur?.nom ?? evenement.acteur?.id ?? "Anonyme"}
            {evenement.acteur?.parDelegation ? " · par délégation" : ""}
            {evenement.cible?.libelle ? `  →  ${evenement.cible.libelle}` : ""}
          </Text>
          {!!resume(evenement) && <Text style={styles.resume}>{resume(evenement)}</Text>}
          <Text style={styles.sequence}>
            {CONSERVATION_AUDIT[evenement.categorie].libelle} · n° {evenement.sequence} · empreinte {evenement.empreinte.slice(0, 12)}…
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  integrite: { borderWidth: 1, borderColor: colors.statusFree, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.creamLight },
  integriteRompue: { borderColor: colors.statusReserved },
  integriteTitre: { color: colors.statusFree, fontSize: 13, fontWeight: "600" },
  integriteTitreRompue: { color: colors.statusReserved },
  integriteDetail: { color: colors.statusReserved, fontSize: 11, marginTop: 4 },
  filtres: { gap: spacing.xs, paddingBottom: spacing.sm },
  choice: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  choiceActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceLabel: { color: colors.textMuted, fontSize: 12 },
  choiceLabelActive: { color: colors.gold },
  conservation: { color: colors.textMuted, fontSize: 10, fontStyle: "italic", marginBottom: spacing.sm },
  error: { color: colors.statusReserved, fontSize: 11, marginVertical: spacing.sm },
  empty: { color: colors.textMuted, fontSize: 12, marginTop: spacing.md },
  ligne: { borderBottomWidth: 1, borderBottomColor: colors.creamBorder, paddingVertical: spacing.sm + 2 },
  ligneHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  action: { color: colors.navy, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  date: { color: colors.textMuted, fontSize: 10 },
  acteur: { color: colors.navy, fontSize: 11, marginTop: 2 },
  resume: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sequence: { color: colors.creamBorder, fontSize: 9, marginTop: 3 },
});
