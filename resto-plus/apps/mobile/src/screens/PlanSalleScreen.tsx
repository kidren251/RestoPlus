import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import type { Table, ElementDecor, StatutTable } from "@resto-plus/types";

interface PlanSalleScreenProps {
  nomSalle: string;
  tables: Table[];
  decor: ElementDecor[];
  editable: boolean;
  onTablePress: (tableId: string) => void;
  onTableMove: (tableId: string, x: number, y: number) => void;
}

const STATUT_COLOR: Record<StatutTable, string> = {
  libre: colors.statusFree,
  occupee: colors.statusOccupied,
  reservee: colors.statusReserved,
  a_nettoyer: colors.textMuted,
};

function TableToken({
  table,
  editable,
  onPress,
  onMove,
}: {
  table: Table;
  editable: boolean;
  onPress: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const translateX = useSharedValue(table.x);
  const translateY = useSharedValue(table.y);

  const commitPosition = useCallback(
    (x: number, y: number) => onMove(x, y),
    [onMove]
  );

  const pan = Gesture.Pan()
    .enabled(editable)
    .onUpdate((e: { translationX: number; translationY: number }) => {
      translateX.value = table.x + e.translationX;
      translateY.value = table.y + e.translationY;
    })
    .onEnd(() => {
      runOnJS(commitPosition)(translateX.value, translateY.value);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onPress)();
  });

  const gesture = editable ? pan : tap;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${table.rotation}deg` },
    ],
  }));

  const isRonde = table.forme === "ronde";

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.table,
          animatedStyle,
          {
            width: table.largeur,
            height: table.hauteur,
            borderRadius: isRonde ? table.largeur / 2 : radii.card,
            borderColor: STATUT_COLOR[table.statut],
            position: "absolute",
          },
        ]}
      >
        <Text style={styles.tableLabel}>{table.capacite}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function PlanSalleScreen({
  nomSalle,
  tables,
  decor,
  editable,
  onTablePress,
  onTableMove,
}: PlanSalleScreenProps) {
  const [canvasSize] = useState({ width: 280, height: 280 });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Plan de salle</Text>
          <Text style={styles.subtitle}>{nomSalle} · Service du soir</Text>
        </View>
        <Pressable hitSlop={8}>
          <Text style={styles.addIcon}>+</Text>
        </Pressable>
      </View>

      <View style={[styles.canvas, canvasSize]}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {decor.map((el) => (
            <Rect
              key={el.id}
              x={el.x}
              y={el.y}
              width={el.largeur}
              height={el.hauteur}
              fill={colors.creamBorder}
            />
          ))}
        </Svg>

        {tables.map((table) => (
          <TableToken
            key={table.id}
            table={table}
            editable={editable}
            onPress={() => onTablePress(table.id)}
            onMove={(x, y) => onTableMove(table.id, x, y)}
          />
        ))}
      </View>

      <View style={styles.legend}>
        <LegendItem couleur={colors.statusFree} label="Libre" />
        <LegendItem couleur={colors.statusOccupied} label="Occupée" />
        <LegendItem couleur={colors.statusReserved} label="Réservée" />
      </View>
    </View>
  );
}

function LegendItem({ couleur, label }: { couleur: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: couleur }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md + 2,
  },
  title: {
    fontFamily: typography.serif,
    fontSize: 16,
    color: colors.navy,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  addIcon: {
    fontSize: 18,
    color: colors.gold,
  },
  canvas: {
    backgroundColor: colors.creamLight,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.sharp,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  table: {
    backgroundColor: colors.cream,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  tableLabel: {
    fontFamily: typography.serif,
    fontSize: 12,
    color: colors.navy,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
