import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { colors, typography, spacing } from "@resto-plus/ui-luxury";
import { usePermissions } from "../hooks/usePermissions";
import { useReservationsStore } from "../store/reservationsStore";
import { useSalleStore } from "../store/salleStore";
import { ReservationCard } from "../components/reservations/ReservationCard";
import { ReservationForm } from "../components/reservations/ReservationForm";

/**
 * Réservations du soir, walk-ins compris (badge « sans résa »). L'installation à table
 * se fait depuis le plan de salle (panneau de la table).
 */
export function ReservationsScreen() {
  const canEdit = usePermissions()("reservation.gerer");
  const reservations = useReservationsStore((s) => s.reservations);
  const isLoading = useReservationsStore((s) => s.isLoading);
  const charger = useReservationsStore((s) => s.charger);
  const creer = useReservationsStore((s) => s.creer);
  const annuler = useReservationsStore((s) => s.annuler);
  const tables = useSalleStore((s) => s.salle?.tables ?? []);
  const loadSalle = useSalleStore((s) => s.loadSalle);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    void charger();
    if (tables.length === 0) void loadSalle();
  }, [charger, loadSalle, tables.length]);

  if (isLoading && reservations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const sorted = [...reservations].sort((a, b) => a.heure.localeCompare(b.heure));
  const attentionCount = reservations.filter((r) => r.notes?.toLowerCase().includes("vip") || r.allergenes.length > 0).length;
  const nomTable = (tableId?: string) => tables.find((t) => t.id === tableId)?.nom;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Réservations du soir</Text>
          <Text style={styles.subtitle}>{reservations.length} réservations · {attentionCount} attention requise</Text>
        </View>
        {canEdit && (
          <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
            <Text style={styles.addButtonLabel}>+</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionLabel}>PLANNING</Text>

      {sorted.map((res) => (
        <ReservationCard
          key={res.id}
          reservation={res}
          nomTable={nomTable(res.tableId)}
          expanded={selectedId === res.id}
          onPress={() => setSelectedId(selectedId === res.id ? null : res.id)}
          onCancel={canEdit && (res.status === "a_venir" || !res.status) ? () => { annuler(res.id); setSelectedId(null); } : undefined}
        />
      ))}

      <ReservationForm
        visible={showForm}
        tables={tables}
        onClose={() => setShowForm(false)}
        onSubmit={(reservation) => {
          creer(reservation);
          setShowForm(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  title: { fontFamily: typography.serif, fontSize: 20, color: colors.navy, marginBottom: 4 },
  subtitle: { fontSize: 11, color: colors.textMuted },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  addButtonLabel: { color: colors.gold, fontSize: 24, lineHeight: 26, fontWeight: "300" },
  sectionLabel: { fontSize: 9, letterSpacing: typography.tracking.label, color: colors.gold, marginBottom: spacing.sm },
});
