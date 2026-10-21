import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Reservation } from "@resto-plus/types";

const ALLERGENE_COLORS: Record<string, string> = {
  gluten: "#E8A87C",
  lactose: "#A8C5DA",
  arachides: "#E88C8C",
  "fruits de mer": "#A8DAD0",
};

const LIBELLE_STATUT: Partial<Record<NonNullable<Reservation["status"]>, string>> = {
  installee: "À table",
  terminee: "Terminée",
};

/** Une réservation du soir : résumé, puis détail (allergies, notes, déroulé) au toucher. */
export function ReservationCard({
  reservation,
  nomTable,
  expanded,
  onPress,
  onCancel,
}: {
  reservation: Reservation;
  /** Nom de la table prévue, si elle est attribuée. */
  nomTable?: string;
  expanded: boolean;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const hasAllergenes = reservation.allergenes.length > 0;
  const isVip = reservation.notes?.toLowerCase().includes("vip");
  const sansResa = reservation.source === "walk_in";
  const statut = reservation.status ? LIBELLE_STATUT[reservation.status] : undefined;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardMain}>
        <View style={styles.heureBlock}>
          <Text style={styles.heure}>{reservation.heure}</Text>
        </View>

        <View style={styles.clientBlock}>
          <View style={styles.clientRow}>
            <Text style={styles.clientNom}>{reservation.nomClient}</Text>
            {sansResa && <Text style={styles.sansResaBadge}>SANS RÉSA</Text>}
            {isVip && <Text style={styles.vipBadge}>VIP</Text>}
          </View>
          <Text style={styles.couverts}>
            {reservation.couverts} couvert{reservation.couverts > 1 ? "s" : ""}
            {" · "}
            {nomTable ?? "Table à l'arrivée"}
            {statut ? ` · ${statut}` : ""}
          </Text>
        </View>

        <View style={styles.indicateurs}>
          {hasAllergenes && (
            <View style={styles.alertDot}>
              <Text style={styles.alertDotText}>⚠</Text>
            </View>
          )}
        </View>
      </View>

      {expanded && (
        <View style={styles.cardDetail}>
          {hasAllergenes && (
            <View>
              <Text style={styles.detailLabel}>ALLERGIES POUR CE REPAS</Text>
              <View style={styles.allergenesList}>
                {reservation.allergenes.map((a) => (
                  <View key={a} style={[styles.allergeneBadge, { backgroundColor: ALLERGENE_COLORS[a] ?? colors.creamBorder }]}>
                    <Text style={styles.allergeneText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {reservation.notes ? (
            <View>
              <Text style={styles.detailLabel}>NOTES</Text>
              <Text style={styles.notes}>{reservation.notes}</Text>
            </View>
          ) : null}
          {reservation.source && !sansResa && (
            <Text style={styles.metadata}>Réservation par {reservation.source.replace("_", " ")}</Text>
          )}
          {reservation.serviceEvents && reservation.serviceEvents.length > 0 && (
            <View>
              <Text style={styles.detailLabel}>DÉROULÉ DU DÎNER</Text>
              {reservation.serviceEvents.map((event) => (
                <View key={event.id} style={styles.timelineRow}>
                  <Text style={styles.timelineTime}>{new Date(event.occurredAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text>
                  <Text style={styles.timelineLabel}>{event.label}</Text>
                </View>
              ))}
            </View>
          )}
          {onCancel && (
            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelLabel}>Annuler cette réservation</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, marginBottom: spacing.sm, overflow: "hidden" },
  cardMain: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.creamLight },
  heureBlock: { width: 48, marginRight: spacing.md },
  heure: { fontFamily: typography.serif, fontSize: 14, color: colors.gold, letterSpacing: 0.5 },
  clientBlock: { flex: 1 },
  clientRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: 2 },
  clientNom: { fontSize: 13, color: colors.navy, fontWeight: "500" },
  vipBadge: { fontSize: 8, letterSpacing: 1, color: colors.gold, borderWidth: 1, borderColor: colors.gold, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  sansResaBadge: { fontSize: 8, letterSpacing: 1, color: colors.creamLight, backgroundColor: colors.navy, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1, overflow: "hidden" },
  couverts: { fontSize: 11, color: colors.textMuted },
  indicateurs: { alignItems: "flex-end" },
  alertDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.statusReserved + "30", alignItems: "center", justifyContent: "center" },
  alertDotText: { fontSize: 10, color: colors.statusReserved },
  cardDetail: { padding: spacing.md, backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: colors.creamBorder, gap: spacing.sm },
  detailLabel: { fontSize: 8, letterSpacing: typography.tracking.label, color: colors.gold, marginBottom: spacing.xs },
  allergenesList: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  allergeneBadge: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  allergeneText: { fontSize: 10, color: colors.navy, fontWeight: "500" },
  notes: { fontSize: 12, color: colors.navy, lineHeight: 17, fontStyle: "italic" },
  metadata: { fontSize: 11, color: colors.textMuted },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 5 },
  timelineTime: { width: 42, color: colors.gold, fontFamily: typography.serif, fontSize: 12 },
  timelineLabel: { color: colors.navy, fontSize: 11 },
  cancelButton: { alignSelf: "flex-start", marginTop: spacing.sm },
  cancelLabel: { color: colors.statusOccupied, fontSize: 11 },
});
