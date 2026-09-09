import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";

type EspaceEquipe = "cuisine" | "salle";

const ESPACES = {
  cuisine: {
    eyebrow: "ESPACE CUISINE",
    title: "Le passe et la production",
    subtitle: "Centraliser les contrôles, les températures et les plats à envoyer.",
    actions: [
      { id: "checklists", label: "Checklists HACCP", detail: "Ouverture, fermeture et contrôles 4h" },
      { id: "commandes_cuisine", label: "Suivi des plats", detail: "Plats en attente, en préparation et prêts" },
    ],
  },
  salle: {
    eyebrow: "ESPACE ÉQUIPE DE SALLE",
    title: "Le service en salle",
    subtitle: "Piloter les tables, les clients et le déroulement du service.",
    actions: [
      { id: "plan_salle", label: "Plan de salle", detail: "Tables, statuts et suivi du dîner" },
      { id: "fiches_vip", label: "Réservations et clients", detail: "Arrivées, allergies et historique client" },
      { id: "taches_salle", label: "Tâches matin et soir", detail: "Checklist quotidienne de l’équipe" },
      { id: "inviter_equipier", label: "Inviter un équipier", detail: "Créer un accès serveur temporaire" },
      { id: "gestion_acces", label: "Gestion des accès", detail: "Membres, rôles et accès temporaires" },
    ],
  },
} as const;

export function EspaceEquipeScreen({ espace, onNavigate, canManageAccess = false }: { espace: EspaceEquipe; onNavigate: (destination: string) => void; canManageAccess?: boolean }) {
  const content = ESPACES[espace];
  const actions = content.actions.filter((action) => action.id !== "gestion_acces" || canManageAccess);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{content.eyebrow}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>
      <View style={styles.rule} />
      {actions.map((action, index) => (
        <Pressable key={action.id} onPress={() => onNavigate(action.id)} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <Text style={styles.number}>{String(index + 1).padStart(2, "0")}</Text>
          <View style={styles.actionCopy}>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionDetail}>{action.detail}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  rule: { height: 1, backgroundColor: colors.creamBorder, marginBottom: spacing.sm },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  actionPressed: { opacity: 0.55 },
  number: { color: colors.gold, fontFamily: typography.serif, fontSize: 12 },
  actionCopy: { flex: 1 },
  actionLabel: { color: colors.navy, fontSize: 14, marginBottom: 3 },
  actionDetail: { color: colors.textMuted, fontSize: 11 },
  chevron: { color: colors.creamBorder, fontSize: 22 },
});
