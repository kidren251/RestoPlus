import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Checklist, ChecklistEntry, ChecklistItem } from "@resto-plus/types";
import { useChecklistStore } from "../store/checklistStore";
import { PointDeControle } from "../components/haccp/PointDeControle";
import { libelleFrequence } from "../components/haccp/frequences";

export function ChecklistScreen() {
  const { checklists, isLoading, validerItem, getEntreeItem, nbReleves } = useChecklistStore();
  const [expanded, setExpanded] = useState<string | null>(checklists[0]?.id ?? null);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const totalItems = checklists.reduce((s, c) => s + c.items.length, 0);
  const validatedCount = checklists.reduce((s, c) => s + c.items.filter((i) => getEntreeItem(i.id)).length, 0);
  const horsSeuil = checklists.reduce((s, c) => s + c.items.filter((i) => getEntreeItem(i.id)?.conforme === false).length, 0);
  const progress = totalItems > 0 ? validatedCount / totalItems : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Checklists HACCP</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{validatedCount}/{totalItems} validés</Text>
      </View>
      {horsSeuil > 0 && (
        <Text style={styles.alerte}>⚠ {horsSeuil} relevé{horsSeuil > 1 ? "s" : ""} hors seuil aujourd'hui : prévenir le responsable.</Text>
      )}

      {checklists.map((cl) => (
        <ChecklistSection
          key={cl.id}
          checklist={cl}
          expanded={expanded === cl.id}
          onToggle={() => setExpanded(expanded === cl.id ? null : cl.id)}
          getEntreeItem={getEntreeItem}
          onValider={(item, valeur) => validerItem(cl.id, item, valeur)}
          nbReleves={nbReleves}
        />
      ))}
    </ScrollView>
  );
}

function ChecklistSection({
  checklist,
  expanded,
  onToggle,
  getEntreeItem,
  onValider,
  nbReleves,
}: {
  checklist: Checklist;
  expanded: boolean;
  onToggle: () => void;
  getEntreeItem: (itemId: string) => ChecklistEntry | undefined;
  onValider: (item: ChecklistItem, valeur?: string) => void;
  nbReleves: Record<string, number>;
}) {
  const validatedInSection = checklist.items.filter((i) => getEntreeItem(i.id)).length;
  const allDone = validatedInSection === checklist.items.length;
  const alerte = checklist.items.some((i) => getEntreeItem(i.id)?.conforme === false);

  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionLeft}>
          <Text style={styles.frequenceLabel}>{libelleFrequence(checklist.frequence)}</Text>
          <Text style={styles.sectionTitle}>{checklist.type}</Text>
        </View>
        <View style={styles.sectionRight}>
          {alerte && <Text style={styles.sectionAlerte}>⚠</Text>}
          <Text style={[styles.sectionCount, allDone && styles.sectionCountDone]}>
            {validatedInSection}/{checklist.items.length}
          </Text>
          <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.itemsList}>
          {checklist.items.map((item) => (
            <PointDeControle
              key={item.id}
              item={item}
              entree={getEntreeItem(item.id)}
              nbReleves={nbReleves[item.id] ?? 0}
              onValider={(valeur) => onValider(item, valeur)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  header: { marginBottom: spacing.lg },
  title: { fontFamily: typography.serif, fontSize: 20, color: colors.navy, marginBottom: 4 },
  subtitle: { fontSize: 11, color: colors.textMuted, textTransform: "capitalize" },
  progressContainer: { marginBottom: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progressBg: { flex: 1, height: 3, backgroundColor: colors.creamBorder, borderRadius: radii.pill, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.gold, borderRadius: radii.pill },
  progressLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 0.5, minWidth: 60, textAlign: "right" },
  alerte: { fontSize: 11, color: colors.statusOccupied, fontWeight: "700", marginTop: -spacing.sm, marginBottom: spacing.md },
  section: { marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, backgroundColor: colors.creamLight },
  sectionLeft: { flex: 1 },
  frequenceLabel: { fontSize: 8, letterSpacing: typography.tracking.label, color: colors.gold, marginBottom: 3 },
  sectionTitle: { fontFamily: typography.serif, fontSize: 13, color: colors.navy },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionAlerte: { fontSize: 12, color: colors.statusOccupied, fontWeight: "700" },
  sectionCount: { fontSize: 11, color: colors.textMuted },
  sectionCountDone: { color: colors.statusFree },
  chevron: { fontSize: 9, color: colors.textMuted },
  itemsList: { backgroundColor: colors.cream },
});
