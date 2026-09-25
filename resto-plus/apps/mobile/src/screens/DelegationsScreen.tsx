import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { CompteEquipe, Delegation, PoleService } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";

/**
 * Délégation des tâches — panneau du directeur (N3)
 *
 * Pendant l'absence d'un responsable (arrêt, congés), le N3 confie à un N1 du même
 * pôle — ex. le sous-chef de cuisine — les tâches et responsabilités du N2 : compte
 * rendu du service, sorties de stock, gestion de l'équipe du pôle. La délégation
 * s'arrête seule à la fin du service du dernier jour, ou quand le N3 la révoque.
 */

const DUREES = [
  { jours: 1, label: "Ce service" },
  { jours: 3, label: "3 jours" },
  { jours: 7, label: "1 semaine" },
  { jours: 14, label: "2 semaines" },
];

const RESPONSABLE: Record<PoleService, string> = {
  cuisine: "chef de cuisine",
  salle: "manager de salle",
};

function finLisible(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export function DelegationsScreen() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [comptes, setComptes] = useState<CompteEquipe[]>([]);
  const [pole, setPole] = useState<PoleService>("cuisine");
  const [delegueId, setDelegueId] = useState<string | null>(null);
  const [jours, setJours] = useState(3);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    try {
      const [enCours, annuaire] = await Promise.all([
        api.get<Delegation[]>("/delegations"),
        api.get<{ comptes: CompteEquipe[] }>("/comptes"),
      ]);
      setDelegations(enCours);
      setComptes(annuaire.comptes);
      setError("");
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Seul un N1 actif du pôle peut assumer les tâches de son N2.
  const candidats = comptes.filter((compte) => compte.statut === "actif" && compte.accessRole === "chef_rang" && compte.pole === pole);

  const deleguer = async () => {
    if (!delegueId) {
      setError("Choisis la personne qui assurera l’intérim.");
      return;
    }
    try {
      const creee = await api.post<Delegation>("/delegations", { delegueId, pole, jours });
      setConfirmation(
        `Délégation enregistrée pour ${creee.delegueNom}. Elle prendra effet dès que cette personne reviendra sur l'écran d'accueil de son application (ou à sa prochaine connexion).`
      );
      setError("");
      setDelegueId(null);
      await charger();
    } catch (err) {
      setError(messageErreur(err));
    }
  };

  const revoquer = async (id: string) => {
    try {
      await api.post(`/delegations/${id}/revoquer`, {});
      setConfirmation("Délégation terminée. Les droits seront retirés dès le prochain retour de la personne sur son écran d'accueil.");
      await charger();
    } catch (err) {
      setError(messageErreur(err));
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.gold} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>DIRECTION · N3</Text>
      <Text style={styles.title}>Délégation des tâches</Text>
      <Text style={styles.subtitle}>
        En l’absence d’un responsable, confie temporairement ses tâches et responsabilités à un N1 de son pôle : compte rendu du service, sorties de stock, gestion de l’équipe.
      </Text>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!confirmation && (
        <View style={styles.confirmation}>
          <Text style={styles.confirmationText}>{confirmation}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>EN COURS</Text>
      {delegations.length === 0 && <Text style={styles.empty}>Aucune délégation en cours.</Text>}
      {delegations.map((delegation) => (
        <View key={delegation.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{delegation.delegueNom}</Text>
            <Text style={styles.cardMeta}>Assure les tâches du {RESPONSABLE[delegation.pole]}</Text>
            <Text style={styles.cardMeta}>Jusqu’au {finLisible(delegation.fin)}</Text>
          </View>
          <Pressable onPress={() => void revoquer(delegation.id)} hitSlop={6}>
            <Text style={styles.revoke}>Mettre fin</Text>
          </Pressable>
        </View>
      ))}

      <Text style={styles.sectionLabel}>NOUVELLE DÉLÉGATION</Text>
      <Text style={styles.label}>Responsabilités de</Text>
      <View style={styles.choiceRow}>
        {(["cuisine", "salle"] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.choice, pole === option && styles.choiceActive]}
            onPress={() => {
              setPole(option);
              setDelegueId(null);
            }}
          >
            <Text style={[styles.choiceLabel, pole === option && styles.choiceLabelActive]}>{option === "cuisine" ? "Chef de cuisine" : "Manager de salle"}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Confiées à (N1 du pôle {pole})</Text>
      {candidats.length === 0 ? (
        <Text style={styles.empty}>Aucun N1 actif dans ce pôle. Crée d’abord son compte dans « Comptes de l’équipe ».</Text>
      ) : (
        <View style={styles.choiceWrap}>
          {candidats.map((compte) => (
            <Pressable key={compte.id} style={[styles.choice, delegueId === compte.id && styles.choiceActive]} onPress={() => setDelegueId(compte.id)}>
              <Text style={[styles.choiceLabel, delegueId === compte.id && styles.choiceLabelActive]}>{compte.nom}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.label}>Durée</Text>
      <View style={styles.choiceWrap}>
        {DUREES.map((option) => (
          <Pressable key={option.jours} style={[styles.choice, jours === option.jours && styles.choiceActive]} onPress={() => setJours(option.jours)}>
            <Text style={[styles.choiceLabel, jours === option.jours && styles.choiceLabelActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>La délégation prend fin à l’heure de fin de service du dernier jour (même après minuit). Une nouvelle délégation sur le même pôle remplace la précédente. Elle s’applique quand la personne revient sur l’écran d’accueil de son application, pas instantanément.</Text>

      <Pressable style={styles.primaryButton} onPress={deleguer}>
        <Text style={styles.primaryLabel}>Déléguer les tâches</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  error: { color: colors.statusReserved, fontSize: 11, marginBottom: spacing.sm },
  confirmation: { backgroundColor: colors.navy, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  confirmationText: { color: colors.gold, fontSize: 11, lineHeight: 16 },
  empty: { color: colors.textMuted, fontSize: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  cardMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  revoke: { color: colors.statusReserved, fontSize: 11 },
  choiceRow: { flexDirection: "row", gap: spacing.xs },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  choice: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: 7 },
  choiceActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  choiceLabel: { color: colors.textMuted, fontSize: 12 },
  choiceLabelActive: { color: colors.gold },
  note: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.md },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
});
