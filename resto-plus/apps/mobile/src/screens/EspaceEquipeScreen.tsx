import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { usePermissions } from "../hooks/usePermissions";

type EspaceEquipe = "cuisine" | "salle" | "direction";

const ESPACES = {
  cuisine: {
    eyebrow: "ESPACE CUISINE",
    title: "Le passe et la production",
    subtitle: "Centraliser les contrôles, les températures et les plats à envoyer.",
    actions: [
      { id: "checklists", label: "Checklists HACCP", detail: "Ouverture, fermeture et contrôles 4h" },
      { id: "commandes_cuisine", label: "Suivi des plats", detail: "Plats en attente, en préparation et prêts" },
      { id: "gestion_stocks", label: "Gestion des stocks", detail: "Ingrédients, quantités et alertes de seuil" },
      { id: "gestion_carte", label: "Gestion de la carte", detail: "Plats, ingrédients liés et marge estimée" },
      { id: "compte_rendu", label: "Compte rendu du service", detail: "Vérifier les sorties de stock et valider en fin de journée" },
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
      { id: "compte_rendu", label: "Compte rendu du service", detail: "Vérifier et valider le service en fin de journée" },
    ],
  },
  direction: {
    eyebrow: "ESPACE DIRECTION",
    title: "Piloter l’établissement",
    subtitle: "Comptes rendus de service, équipe et accès.",
    actions: [
      { id: "comptes_rendus_recus", label: "Comptes rendus reçus", detail: "Salle et cuisine, validés par les responsables" },
      { id: "comptes_equipe", label: "Comptes de l’équipe", detail: "Créer des comptes N0 à N2, régler l’accès à la messagerie" },
      { id: "delegations", label: "Délégation des tâches", detail: "Confier les responsabilités d’un N2 absent à un N1" },
      { id: "journal_audit", label: "Journal d’audit", detail: "Qui a fait quoi, quand : traçabilité infalsifiable" },
      { id: "gestion_acces", label: "Gestion des accès", detail: "Membres, pôles et accès temporaires" },
    ],
  },
} as const;

const ADMIN_MARKS: Record<string, string> = {
  inviter_equipier: "＋",
  gestion_acces: "⌘",
  configurateur_salle: "▦",
  compte_rendu: "✎",
  comptes_rendus_recus: "✉",
  comptes_equipe: "◎",
  delegations: "⇄",
  journal_audit: "⌕",
};

export function EspaceEquipeScreen({ espace, onNavigate }: { espace: EspaceEquipe; onNavigate: (destination: string) => void }) {
  const allows = usePermissions();
  const content = ESPACES[espace];
  const actions = content.actions.filter((action) =>
    (action.id !== "gestion_acces" || allows("acces.gerer")) &&
    (action.id !== "configurateur_salle" || allows("salle.configurer")) &&
    (action.id !== "inviter_equipier" || allows("invitation.creer")) &&
    (action.id !== "compte_rendu" || allows(espace === "cuisine" ? "compte_rendu.cuisine" : "compte_rendu.salle"))
  );
  const adminActionIds = Object.keys(ADMIN_MARKS);
  const operationalActions = actions.filter((action) => !adminActionIds.includes(action.id));
  const adminActions = actions.filter((action) => adminActionIds.includes(action.id));
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{content.eyebrow}</Text>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>
      {operationalActions.length > 0 && <Text style={styles.sectionLabel}>OPÉRATIONS</Text>}
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
            {adminActions.map((action) => (
              <Pressable key={action.id} onPress={() => onNavigate(action.id)} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
                <Text style={styles.adminMark}>{ADMIN_MARKS[action.id]}</Text>
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
