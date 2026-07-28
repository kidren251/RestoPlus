import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Checklist, ChecklistItem } from "@resto-plus/types";
import { useChecklistStore } from "../store/checklistStore";

const FREQUENCE_LABEL: Record<string, string> = {
  ouverture: "OUVERTURE",
  fermeture: "FERMETURE",
  "4h": "CONTRÔLE 4H",
  hebdomadaire: "HEBDOMADAIRE",
};

export function ChecklistScreen() {
  const { checklists, isLoading, validerItem, devaliderItem, getEntreeItem } =
    useChecklistStore();
  const [expanded, setExpanded] = useState<string | null>(
    checklists[0]?.id ?? null
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const totalItems = checklists.reduce((s, c) => s + c.items.length, 0);
  const validatedCount = checklists.reduce(
    (s, c) => s + c.items.filter((i) => getEntreeItem(i.id)).length,
    0
  );
  const progress = totalItems > 0 ? validatedCount / totalItems : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Checklists HACCP</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>
      </View>

      {/* Barre de progression globale */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {validatedCount}/{totalItems} validés
        </Text>
      </View>

      {/* Liste des checklists */}
      {checklists.map((cl) => (
        <ChecklistSection
          key={cl.id}
          checklist={cl}
          expanded={expanded === cl.id}
          onToggle={() => setExpanded(expanded === cl.id ? null : cl.id)}
          getEntreeItem={getEntreeItem}
          onValider={(item, valeur) => validerItem(cl.id, item, valeur)}
          onDevalider={(itemId) => devaliderItem(itemId)}
        />
      ))}
    </ScrollView>
  );
}

// ─── Sous-composant : section checklist ─────────────────────────────────────

function ChecklistSection({
  checklist,
  expanded,
  onToggle,
  getEntreeItem,
  onValider,
  onDevalider,
}: {
  checklist: Checklist;
  expanded: boolean;
  onToggle: () => void;
  getEntreeItem: (itemId: string) => ReturnType<typeof useChecklistStore.getState>["entries"][string] | undefined;
  onValider: (item: ChecklistItem, valeur?: string) => void;
  onDevalider: (itemId: string) => void;
}) {
  const validatedInSection = checklist.items.filter((i) =>
    getEntreeItem(i.id)
  ).length;
  const allDone = validatedInSection === checklist.items.length;

  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionLeft}>
          <Text style={styles.frequenceLabel}>
            {FREQUENCE_LABEL[checklist.frequence] ?? checklist.frequence.toUpperCase()}
          </Text>
          <Text style={styles.sectionTitle}>{checklist.type}</Text>
        </View>
        <View style={styles.sectionRight}>
          <Text
            style={[
              styles.sectionCount,
              allDone && styles.sectionCountDone,
            ]}
          >
            {validatedInSection}/{checklist.items.length}
          </Text>
          <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.itemsList}>
          {checklist.items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              entree={getEntreeItem(item.id)}
              onValider={(valeur) => onValider(item, valeur)}
              onDevalider={() => onDevalider(item.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Sous-composant : ligne d'un item ───────────────────────────────────────

function ChecklistItemRow({
  item,
  entree,
  onValider,
  onDevalider,
}: {
  item: ChecklistItem;
  entree: ReturnType<typeof useChecklistStore.getState>["entries"][string] | undefined;
  onValider: (valeur?: string) => void;
  onDevalider: () => void;
}) {
  const [valeur, setValeur] = useState(entree?.valeur ?? "");
  const isValidated = !!entree;

  const handleToggle = () => {
    if (isValidated) {
      onDevalider();
      setValeur("");
    } else {
      onValider(item.requiertValeur ? valeur : undefined);
    }
  };

  return (
    <View style={styles.itemRow}>
      <Pressable
        onPress={handleToggle}
        style={[styles.checkbox, isValidated && styles.checkboxDone]}
        hitSlop={8}
      >
        {isValidated && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>

      <View style={styles.itemContent}>
        <Text
          style={[styles.itemLabel, isValidated && styles.itemLabelDone]}
          numberOfLines={2}
        >
          {item.label}
        </Text>

        {item.requiertValeur && !isValidated && (
          <TextInput
            style={styles.valeurInput}
            placeholder="Valeur (ex: 4°C)"
            placeholderTextColor={colors.textMuted}
            value={valeur}
            onChangeText={setValeur}
            keyboardType="decimal-pad"
          />
        )}

        {item.requiertValeur && isValidated && entree?.valeur && (
          <Text style={styles.valeurAffichee}>{entree.valeur}</Text>
        )}

        {item.requiertPhoto && (
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>
              {isValidated ? "📷 Photo jointe" : "📷 Photo requise"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.serif,
    fontSize: 20,
    color: colors.navy,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  progressContainer: {
    marginBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressBg: {
    flex: 1,
    height: 3,
    backgroundColor: colors.creamBorder,
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
  },
  progressLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    minWidth: 60,
    textAlign: "right",
  },
  section: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.creamLight,
  },
  sectionLeft: {
    flex: 1,
  },
  frequenceLabel: {
    fontSize: 8,
    letterSpacing: typography.tracking.label,
    color: colors.gold,
    marginBottom: 3,
  },
  sectionTitle: {
    fontFamily: typography.serif,
    fontSize: 13,
    color: colors.navy,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionCount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionCountDone: {
    color: colors.statusFree,
  },
  chevron: {
    fontSize: 9,
    color: colors.textMuted,
  },
  itemsList: {
    backgroundColor: colors.cream,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.creamBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  checkmark: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: "700",
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13,
    color: colors.navy,
    lineHeight: 18,
  },
  itemLabelDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  valeurInput: {
    marginTop: spacing.xs,
    height: 32,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.sharp,
    paddingHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.navy,
    backgroundColor: colors.creamLight,
  },
  valeurAffichee: {
    marginTop: spacing.xs,
    fontSize: 11,
    color: colors.gold,
    fontFamily: typography.serif,
  },
  photoBadge: {
    marginTop: spacing.xs,
  },
  photoBadgeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
