/**
 * PlanDeSalle — Resto Plus
 * Vue 2D interactive du plan de salle.
 * - Mode normal : tap sur une table => ouvre le panneau latéral (fiche client, suivi du
 *   dîner, commande en cours)
 * - Mode admin (isAdmin=true) : drag & drop libre des tables + tap (sans drag) =>
 *   le panneau permet aussi de renommer la table et de changer sa capacité.
 *
 * Ce fichier ne fait qu'assembler : voir TableItem / useTableDrag (tables),
 * TableEditPanel (panneau), Legende, AdminToolbar.
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from "react-native";
import type { Table } from "@resto-plus/types";
import { useSalleStore } from "../../store/salleStore";
import { COLORS } from "./couleurs";
import { TableItem } from "./TableItem";
import { Legende } from "./Legende";
import { AdminToolbar } from "./AdminToolbar";
import { TableEditPanel } from "./TableEditPanel";

interface PlanDeSalleProps {
  isAdmin?: boolean;
  layoutLocked?: boolean;
  /** Étape du repas / état du plat (droit "service.suivre", hors verrou de service). */
  canEditService?: boolean;
  /** Réclamer un plat (droit "service.commander", hors verrou de service). */
  canRequestDish?: boolean;
  /** Installer des clients / changer de table (droit "service.installer", hors verrou de service). */
  canInstall?: boolean;
  onToggleLayoutLock?: () => void;
  onOpenConfigurator?: () => void;
  onTablePress?: (tableId: string) => void;
  onClientPress?: (tableId: string) => void;
}

export default function PlanDeSalle({ isAdmin = false, layoutLocked = false, canEditService = false, canRequestDish = false, canInstall = false, onToggleLayoutLock, onOpenConfigurator, onTablePress, onClientPress }: PlanDeSalleProps) {
  const salle = useSalleStore((s) => s.salle);
  const moveTable = useSalleStore((s) => s.moveTable);
  const selectTable = useSalleStore((s) => s.selectTable);
  const selectedTableId = useSalleStore((s) => s.selectedTableId);
  const serviceStates = useSalleStore((s) => s.serviceStates);
  const alerts = useSalleStore((s) => s.alerts);
  const markAlertRead = useSalleStore((s) => s.markAlertRead);

  const [panelTableId, setPanelTableId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerSize({
      width: e.nativeEvent.layout.width,
      height: e.nativeEvent.layout.height,
    });
  };

  // Échelle pour adapter le canvas logique à l'écran réel
  // (calculé avant tout return conditionnel pour respecter les Rules of Hooks)
  const scale = useMemo(() => {
    if (!salle) return 1;
    const w = containerSize.width || salle.largeurCanvas;
    const h = containerSize.height || salle.hauteurCanvas;
    return Math.min(w / salle.largeurCanvas, h / salle.hauteurCanvas);
  }, [salle?.largeurCanvas, salle?.hauteurCanvas, containerSize.width, containerSize.height]);

  if (!salle) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.blancCreme }}>Chargement du plan…</Text>
      </View>
    );
  }

  const handleTablePress = (table: Table) => {
    selectTable(table.id);
    onTablePress?.(table.id);
    setPanelTableId(table.id);
  };

  const panelTable = panelTableId ? salle.tables.find((t) => t.id === panelTableId) : undefined;

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {alerts.filter((alert) => !alert.read).map((alert) => (
        <Pressable key={alert.id} style={styles.alertBanner} onPress={() => markAlertRead(alert.id)}>
          <Text style={styles.alertTitle}>Plat prêt</Text>
          <Text style={styles.alertMessage}>{alert.message} · {alert.clientName ?? alert.tableId}</Text>
        </Pressable>
      ))}
      <View
        style={[
          styles.canvas,
          {
            width: salle.largeurCanvas * scale,
            height: salle.hauteurCanvas * scale,
          },
        ]}
      >
        {salle.decor.map((d) => (
          <View
            key={d.id}
            pointerEvents="none"
            style={[
              styles.decor,
              {
                left: d.x * scale,
                top: d.y * scale,
                width: d.largeur * scale,
                height: d.hauteur * scale,
                transform: [{ rotate: `${d.rotation}deg` }],
              },
            ]}
          >
            <Text style={styles.decorLabel}>{d.type}</Text>
          </View>
        ))}

        {salle.tables.map((table) => (
          <TableItem
            key={table.id}
            table={table}
            scale={scale}
            isAdmin={isAdmin && !layoutLocked}
            serviceState={serviceStates[table.id]}
            isSelected={selectedTableId === table.id}
            onPress={() => handleTablePress(table)}
            onDragEnd={(x, y) => moveTable(table.id, x, y)}
            canvasSize={{ w: salle.largeurCanvas, h: salle.hauteurCanvas }}
          />
        ))}
      </View>

      <Legende />

      {isAdmin && (
        <AdminToolbar layoutLocked={layoutLocked} onToggleLayoutLock={onToggleLayoutLock} onOpenConfigurator={onOpenConfigurator} />
      )}

      <TableEditPanel
        table={panelTable}
        serviceState={panelTable ? serviceStates[panelTable.id] : undefined}
        canEditService={canEditService}
        canInstall={canInstall}
        canEditLayout={isAdmin}
        canRequestDish={canRequestDish}
        onClientPress={onClientPress}
        visible={!!panelTable}
        onClose={() => setPanelTableId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.bleuNuit,
    padding: 12,
  },
  alertBanner: {
    backgroundColor: COLORS.blancCreme,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.libre,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  alertTitle: { color: COLORS.bleuNuit, fontWeight: "700", fontSize: 11 },
  alertMessage: { color: COLORS.bleuNuit, fontSize: 10, marginTop: 2 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bleuNuit,
  },
  canvas: {
    backgroundColor: "#12263E",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.or,
    position: "relative",
    alignSelf: "center",
  },
  decor: {
    position: "absolute",
    backgroundColor: COLORS.decor,
    borderRadius: 4,
    opacity: 0.35,
    alignItems: "center",
    justifyContent: "center",
  },
  decorLabel: {
    fontSize: 9,
    color: COLORS.bleuNuit,
    fontWeight: "600",
  },
});
