import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Reservation } from "@resto-plus/types";
import { api } from "../api/client";

// Données mockées — sera remplacé par l'API Supabase Phase 2
const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: "r1",
    tableId: "t2",
    nomClient: "M. Fontaine",
    couverts: 2,
    heure: "19:30",
    allergenes: [],
    notes: "Anniversaire — prévoir bougie",
  },
  {
    id: "r2",
    tableId: "t3",
    nomClient: "Mme Beaumont",
    couverts: 4,
    heure: "20:00",
    allergenes: ["gluten", "lactose"],
    notes: "",
  },
  {
    id: "r3",
    tableId: "t4",
    nomClient: "M. Renard",
    couverts: 6,
    heure: "20:30",
    allergenes: ["arachides"],
    notes: "Client régulier — table habituelle",
  },
  {
    id: "r4",
    tableId: "t6",
    nomClient: "Famille Moreau",
    couverts: 4,
    heure: "19:00",
    allergenes: [],
    notes: "",
  },
  {
    id: "r5",
    tableId: "t1",
    nomClient: "Mme Leclerc",
    couverts: 2,
    heure: "21:00",
    allergenes: ["fruits de mer"],
    notes: "VIP — compte fidélité",
  },
];

const ALLERGENE_COLORS: Record<string, string> = {
  gluten: "#E8A87C",
  lactose: "#A8C5DA",
  arachides: "#E88C8C",
  "fruits de mer": "#A8DAD0",
};

export function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Reservation[]>("/reservations");
        setReservations(data);
      } catch {
        setReservations(MOCK_RESERVATIONS);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const sorted = [...reservations].sort((a, b) =>
    a.heure.localeCompare(b.heure)
  );
  const vipCount = reservations.filter(
    (r) => r.notes?.toLowerCase().includes("vip") || r.allergenes.length > 0
  ).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Réservations du soir</Text>
        <Text style={styles.subtitle}>
          {reservations.length} réservations · {vipCount} attention requise
        </Text>
      </View>

      <Text style={styles.sectionLabel}>PLANNING</Text>

      {sorted.map((res) => (
        <ReservationCard
          key={res.id}
          reservation={res}
          expanded={selectedId === res.id}
          onPress={() =>
            setSelectedId(selectedId === res.id ? null : res.id)
          }
        />
      ))}
    </ScrollView>
  );
}

function ReservationCard({
  reservation,
  expanded,
  onPress,
}: {
  reservation: Reservation;
  expanded: boolean;
  onPress: () => void;
}) {
  const hasAllergenes = reservation.allergenes.length > 0;
  const isVip = reservation.notes?.toLowerCase().includes("vip");

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardMain}>
        {/* Heure */}
        <View style={styles.heureBlock}>
          <Text style={styles.heure}>{reservation.heure}</Text>
        </View>

        {/* Infos client */}
        <View style={styles.clientBlock}>
          <View style={styles.clientRow}>
            <Text style={styles.clientNom}>{reservation.nomClient}</Text>
            {isVip && <Text style={styles.vipBadge}>VIP</Text>}
          </View>
          <Text style={styles.couverts}>
            {reservation.couverts} couvert{reservation.couverts > 1 ? "s" : ""}
            {" · "}
            Table {reservation.tableId.replace("t", "")}
          </Text>
        </View>

        {/* Indicateurs */}
        <View style={styles.indicateurs}>
          {hasAllergenes && (
            <View style={styles.alertDot}>
              <Text style={styles.alertDotText}>⚠</Text>
            </View>
          )}
        </View>
      </View>

      {/* Détail déroulant */}
      {expanded && (
        <View style={styles.cardDetail}>
          {hasAllergenes && (
            <View style={styles.allergenesSection}>
              <Text style={styles.detailLabel}>ALLERGÈNES</Text>
              <View style={styles.allergenesList}>
                {reservation.allergenes.map((a) => (
                  <View
                    key={a}
                    style={[
                      styles.allergeneBadge,
                      { backgroundColor: ALLERGENE_COLORS[a] ?? colors.creamBorder },
                    ]}
                  >
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
        </View>
      )}
    </Pressable>
  );
}

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
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: typography.tracking.label,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.card,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.creamLight,
  },
  heureBlock: {
    width: 48,
    marginRight: spacing.md,
  },
  heure: {
    fontFamily: typography.serif,
    fontSize: 14,
    color: colors.gold,
    letterSpacing: 0.5,
  },
  clientBlock: {
    flex: 1,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  clientNom: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: "500",
  },
  vipBadge: {
    fontSize: 8,
    letterSpacing: 1,
    color: colors.gold,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  couverts: {
    fontSize: 11,
    color: colors.textMuted,
  },
  indicateurs: {
    alignItems: "flex-end",
  },
  alertDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.statusReserved + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  alertDotText: {
    fontSize: 10,
    color: colors.statusReserved,
  },
  cardDetail: {
    padding: spacing.md,
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
    gap: spacing.sm,
  },
  allergenesSection: {},
  detailLabel: {
    fontSize: 8,
    letterSpacing: typography.tracking.label,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  allergenesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  allergeneBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  allergeneText: {
    fontSize: 10,
    color: colors.navy,
    fontWeight: "500",
  },
  notes: {
    fontSize: 12,
    color: colors.navy,
    lineHeight: 17,
    fontStyle: "italic",
  },
});
