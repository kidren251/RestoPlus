import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { PeriodeTache, useTachesSalleStore } from "../store/tachesSalleStore";

export function TachesSalleScreen({ canReset }: { canReset: boolean }) {
  const { taches, cochees, isLoading, hydrate, toggle, reset } = useTachesSalleStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.gold} /></View>;
  }

  const total = taches.length;
  const terminees = taches.filter((tache) => cochees[tache.id]).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tâches de salle</Text>
        <Text style={styles.subtitle}>{terminees}/{total} tâches accomplies aujourd’hui</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${total ? (terminees / total) * 100 : 0}%` }]} />
      </View>

      <TachesSection periode="matin" label="MATIN" taches={taches} cochees={cochees} onToggle={toggle} />
      <TachesSection periode="soir" label="SOIR" taches={taches} cochees={cochees} onToggle={toggle} />

      {canReset && (
        <Pressable onPress={() => void reset()} style={styles.resetButton}>
          <Text style={styles.resetLabel}>Réinitialiser la journée</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function TachesSection({
  periode,
  label,
  taches,
  cochees,
  onToggle,
}: {
  periode: PeriodeTache;
  label: string;
  taches: { id: string; label: string; periode: PeriodeTache }[];
  cochees: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const sectionTaches = taches.filter((tache) => tache.periode === periode);
  const done = sectionTaches.filter((tache) => cochees[tache.id]).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{label}</Text>
        <Text style={styles.sectionCount}>{done}/{sectionTaches.length}</Text>
      </View>
      {sectionTaches.map((tache) => {
        const done = !!cochees[tache.id];
        return (
          <Pressable key={tache.id} onPress={() => onToggle(tache.id)} style={styles.taskRow}>
            <View style={[styles.checkbox, done && styles.checkboxDone]}>
              {done && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.taskLabel, done && styles.taskLabelDone]}>{tache.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  header: { marginBottom: spacing.md },
  title: { fontFamily: typography.serif, fontSize: 20, color: colors.navy, marginBottom: 4 },
  subtitle: { fontSize: 11, color: colors.textMuted },
  progressTrack: { height: 5, backgroundColor: colors.creamBorder, borderRadius: 3, overflow: "hidden", marginBottom: spacing.xl },
  progress: { height: "100%", backgroundColor: colors.gold },
  section: { marginBottom: spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionLabel: { fontSize: 9, letterSpacing: typography.tracking.label, color: colors.gold },
  sectionCount: { fontSize: 11, color: colors.textMuted },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder, gap: spacing.md },
  checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, alignItems: "center", justifyContent: "center", backgroundColor: colors.creamLight },
  checkboxDone: { backgroundColor: colors.statusFree, borderColor: colors.statusFree },
  checkmark: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  taskLabel: { flex: 1, color: colors.navy, fontSize: 13, lineHeight: 18 },
  taskLabelDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  resetButton: { alignSelf: "center", padding: spacing.sm },
  resetLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
});
