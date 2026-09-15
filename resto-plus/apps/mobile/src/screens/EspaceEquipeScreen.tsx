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
      { id: "gestion_stocks", label: "Gestion des stocks", detail: "Ingrédients, quantités et alertes de seuil" },
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
      { id: "inviter_equipier", label: "Invitations équipiers", detail: "Générer un QR code serveur temporaire" },
      { id: "gestion_acces", label: "Gestion des accès", detail: "Membres, rôles et accès temporaires" },
      { id: "configurateur_salle", label: "Configurer la salle", detail: "Plan, tables et dimensions de l’établissement" },
    ],
  },
} as const;

export function EspaceEquipeScreen({ espace, onNavigate, canManageAccess = false, canManageLayout = false, canManageInvitations = false }: { espace: EspaceEquipe; onNavigate: (destination: string) => void; canManageAccess?: boolean; canManageLayout?: boolean; canManageInvitations?: boolean }) {
  const content = ESPACES[espace];
  const actions = content.actions.filter((action) =>
    (action.id !== "gestion_acces" || canManageAccess) &&
    (action.id !== "configurateur_salle" || canManageLayout) &&
    (action.id !== "inviter_equipier" || canManageInvitations)
  );
  const adminActionIds = ["inviter_equipier", "gestion_acces", "configurateur_salle"];
  const operationalActions = actions.filter((action) => !adminActionIds.includes(action.id));
  const adminActions = actions.filter((action) => adminActionIds.includes(action.id));
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{content.eyebrow}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>
      <Text style={styles.sectionLabel}>OPÉRATIONS</Text>
      <View style={styles.actionGroup}>
        {operationalActions.map((action, index) => (
          <Pressable key={action.id} onPress={() => onNavigate(action.id)} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
            <Text style={styles.number}>{String(index + 1).padStart(2, "0")}</Text>
            <View style={styles.actionCopy}>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDetail}>{action.detail}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>

      {adminActions.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, styles.adminSectionLabel]}>ADMINISTRATION</Text>
          <View style={[styles.actionGroup, styles.adminGroup]}>
            {adminActions.map((action, index) => (
              <Pressable key={action.id} onPress={() => onNavigate(action.id)} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
                <Text style={styles.adminMark}>{index === 0 ? "＋" : index === 1 ? "⌘" : "▦"}</Text>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionDetail}>{action.detail}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm },
  adminSectionLabel: { marginTop: spacing.xl },
  actionGroup: { borderTopWidth: 1, borderTopColor: colors.creamBorder },
  adminGroup: { borderTopColor: colors.gold },
  action: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  actionPressed: { opacity: 0.55 },
  number: { color: colors.gold, fontFamily: typography.serif, fontSize: 12 },
  adminMark: { color: colors.navy, fontFamily: typography.serif, fontSize: 18, width: 16, textAlign: "center" },
  actionCopy: { flex: 1 },
  actionLabel: { color: colors.navy, fontSize: 14, marginBottom: 3 },
  actionDetail: { color: colors.textMuted, fontSize: 11 },
  chevron: { color: colors.creamBorder, fontSize: 22 },
});
