/**
 * PlanDeSalle — Resto Plus
 * Vue 2D interactive du plan de salle.
 * - Mode normal : tap sur une table => cycle du statut (libre/occupee/reservee/a_nettoyer)
 * - Mode admin (isAdmin=true) : drag & drop libre des tables + tap (sans drag) =>
 *   ouvre un panneau latéral pour renommer la table, changer sa capacité,
 *   et consulter sa commande en cours (données fictives en attendant le vrai système).
 *
 * Dépendances : uniquement React Native core (View, PanResponder, Animated).
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Pressable,
  TextInput,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import type { AccessRole, Table, TableServiceState, StatutTable } from "@resto-plus/types";
import { useSalleStore, StatutPlat } from "../store/salleStore";

// ---- Charte "Digital Luxury" ----
const COLORS = {
  bleuNuit: "#0B1E33",
  or: "#C9A227",
  blancCreme: "#F6F1E7",
  libre: "#3A7D5C",
  occupee: "#B0413E",
  reservee: "#C9A227",
  a_nettoyer: "#8A8A8A",
  decor: "#D9D2C2",
};

const STATUT_CYCLE: StatutTable[] = ["libre", "occupee", "reservee", "a_nettoyer"];
const PANEL_WIDTH = Math.min(300, Dimensions.get("window").width * 0.8);

function couleurStatut(statut: StatutTable): string {
  return COLORS[statut] ?? COLORS.a_nettoyer;
}

function couleurStatutPlat(statut: StatutPlat): string {
  switch (statut) {
    case "en_attente":
      return "#8A8A8A";
    case "en_preparation":
      return "#C9A227";
    case "pret":
      return "#3A7D5C";
    case "servi":
      return "#4A6FA5";
    default:
      return "#8A8A8A";
  }
}

function labelStatutPlat(statut: StatutPlat): string {
  switch (statut) {
    case "en_attente":
      return "En attente";
    case "en_preparation":
      return "En préparation";
    case "pret":
      return "Prêt — à servir";
    case "servi":
      return "Servi";
    default:
      return statut;
  }
}

function labelCourse(course: TableServiceState["course"]): string {
  return { aucun: "", entree: "Entrée", plat: "Plat", dessert: "Dessert" }[course];
}

function labelDishStatus(status: TableServiceState["dishStatus"]): string {
  return { aucun: "", a_reclamer: "À réclamer", servi: "Servi" }[status];
}

interface PlanDeSalleProps {
  isAdmin?: boolean;
  layoutLocked?: boolean;
  role?: AccessRole;
  onTablePress?: (tableId: string) => void;
  onClientPress?: (tableId: string) => void;
}

export default function PlanDeSalle({ isAdmin = false, layoutLocked = false, role = "serveur", onTablePress, onClientPress }: PlanDeSalleProps) {
  const salle = useSalleStore((s) => s.salle);
  const moveTable = useSalleStore((s) => s.moveTable);
  const setStatutTable = useSalleStore((s) => s.setStatutTable);
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
    if (isAdmin || role === "manager_admin" || role === "chef_rang" || role === "serveur") {
      setPanelTableId(table.id);
    } else {
      const idx = STATUT_CYCLE.indexOf(table.statut);
      const next = STATUT_CYCLE[(idx + 1) % STATUT_CYCLE.length];
      setStatutTable(table.id, next);
    }
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

      <TableEditPanel
        table={panelTable}
        serviceState={panelTable ? serviceStates[panelTable.id] : undefined}
        canEditService={isAdmin || role === "manager_admin" || role === "chef_rang"}
        canEditLayout={isAdmin || role === "manager_admin"}
        onClientPress={onClientPress}
        visible={!!panelTable}
        onClose={() => setPanelTableId(null)}
      />
    </View>
  );
}

interface TableItemProps {
  table: Table;
  scale: number;
  isAdmin: boolean;
  isSelected: boolean;
  onPress: () => void;
  onDragEnd: (x: number, y: number) => void;
  canvasSize: { w: number; h: number };
  serviceState?: TableServiceState;
}

function TableItem({
  table,
  scale,
  isAdmin,
  isSelected,
  onPress,
  onDragEnd,
  canvasSize,
  serviceState,
}: TableItemProps) {
  const pan = useRef(new Animated.ValueXY({ x: table.x * scale, y: table.y * scale })).current;
  const lastOffset = useRef({ x: table.x * scale, y: table.y * scale });
  const didDrag = useRef(false);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => isAdmin,
      onMoveShouldSetPanResponder: (_, gesture) =>
        isAdmin && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
      onPanResponderGrant: () => {
        didDrag.current = false;
        pan.setOffset(lastOffset.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) {
          didDrag.current = true;
        }
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const rawX = (pan.x as any)._value;
        const rawY = (pan.y as any)._value;
        const maxX = (canvasSize.w - table.largeur) * scale;
        const maxY = (canvasSize.h - table.hauteur) * scale;
        const clampedX = Math.max(0, Math.min(rawX, Math.max(maxX, 0)));
        const clampedY = Math.max(0, Math.min(rawY, Math.max(maxY, 0)));
        pan.setValue({ x: clampedX, y: clampedY });
        lastOffset.current = { x: clampedX, y: clampedY };

        if (didDrag.current) {
          onDragEnd(Math.round(clampedX / scale), Math.round(clampedY / scale));
        } else {
          onPress();
        }
      },
    }),
    [canvasSize.h, canvasSize.w, isAdmin, onDragEnd, onPress, scale, table.hauteur, table.largeur]
  );

  useEffect(() => {
    const x = table.x * scale;
    const y = table.y * scale;
    pan.setValue({ x, y });
    lastOffset.current = { x, y };
  }, [pan, scale, table.x, table.y]);

  const forme = table.forme;
  const borderRadius =
    forme === "ronde" ? Math.max(table.largeur, table.hauteur) * scale : forme === "carree" ? 6 : 4;

  const label = table.nom ?? table.id;

  const content = (
    <Animated.View
      style={[
        styles.table,
        {
          width: table.largeur * scale,
          height: table.hauteur * scale,
          borderRadius,
          backgroundColor: couleurStatut(table.statut),
          borderColor: isSelected ? COLORS.blancCreme : COLORS.bleuNuit,
          borderWidth: isSelected ? 2 : 1,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: `${table.rotation}deg` },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableCapacite}>{table.capacite} pers.</Text>
      {serviceState && serviceState.course !== "aucun" && (
        <View style={styles.serviceMarker}>
          <Text style={styles.serviceMarkerText}>{labelCourse(serviceState.course)}</Text>
          {serviceState.dishStatus !== "aucun" && (
            <Text style={styles.serviceStatusText}>{labelDishStatus(serviceState.dishStatus)}</Text>
          )}
        </View>
      )}
    </Animated.View>
  );

  if (isAdmin) {
    return content;
  }

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [{ translateX: pan.x }, { translateY: pan.y }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.table,
          {
            width: table.largeur * scale,
            height: table.hauteur * scale,
            borderRadius,
            backgroundColor: couleurStatut(table.statut),
            borderColor: isSelected ? COLORS.blancCreme : COLORS.bleuNuit,
            borderWidth: isSelected ? 2 : 1,
            transform: [{ rotate: `${table.rotation}deg` }],
            position: "relative",
          },
        ]}
      >
        <Text style={styles.tableLabel}>{label}</Text>
        <Text style={styles.tableCapacite}>{table.capacite} pers.</Text>
        {serviceState && serviceState.course !== "aucun" && (
          <View style={styles.serviceMarker}>
            <Text style={styles.serviceMarkerText}>{labelCourse(serviceState.course)}</Text>
            {serviceState.dishStatus !== "aucun" && (
              <Text style={styles.serviceStatusText}>{labelDishStatus(serviceState.dishStatus)}</Text>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function Legende() {
  const items: { statut: StatutTable; label: string }[] = [
    { statut: "libre", label: "Libre" },
    { statut: "occupee", label: "Occupée" },
    { statut: "reservee", label: "Réservée" },
    { statut: "a_nettoyer", label: "À nettoyer" },
  ];
  return (
    <View style={styles.legende}>
      {items.map((it) => (
        <View key={it.statut} style={styles.legendeItem}>
          <View style={[styles.legendePastille, { backgroundColor: couleurStatut(it.statut) }]} />
          <Text style={styles.legendeLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ---- Panneau latéral d'édition + commande ----

interface TableEditPanelProps {
  table: Table | undefined;
  serviceState?: TableServiceState;
  canEditService: boolean;
  canEditLayout: boolean;
  onClientPress?: (tableId: string) => void;
  visible: boolean;
  onClose: () => void;
}

function TableEditPanel({ table, serviceState, canEditService, canEditLayout, onClientPress, visible, onClose }: TableEditPanelProps) {
  const updateTableInfo = useSalleStore((s) => s.updateTableInfo);
  const updateTableService = useSalleStore((s) => s.updateTableService);
  const getCommande = useSalleStore((s) => s.getCommande);
  const requestDish = useSalleStore((s) => s.requestDish);

  const translateX = useRef(new Animated.Value(PANEL_WIDTH)).current;

  const [nomDraft, setNomDraft] = useState("");
  const [capaciteDraft, setCapaciteDraft] = useState("");
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: visible ? 0 : PANEL_WIDTH,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateX]);

  useEffect(() => {
    if (table) {
      setNomDraft(table.nom ?? table.id);
      setCapaciteDraft(String(table.capacite));
      setSelectedDishId(null);
    }
  }, [table?.id]);

  if (!table) {
    // On garde le panneau monté (juste hors-écran) pour l'animation, mais rien à afficher
    return (
      <Animated.View
        pointerEvents="none"
        style={[styles.panel, { transform: [{ translateX }] }]}
      />
    );
  }

  const commande = getCommande(table.id);
  const currentService = serviceState ?? { tableId: table.id, course: "aucun" as const, dishStatus: "aucun" as const };

  const enregistrerNom = () => {
    const trimmed = nomDraft.trim();
    if (trimmed && trimmed !== (table.nom ?? table.id)) {
      updateTableInfo(table.id, { nom: trimmed });
    }
  };

  const enregistrerCapacite = () => {
    const n = parseInt(capaciteDraft, 10);
    if (!isNaN(n) && n > 0 && n !== table.capacite) {
      updateTableInfo(table.id, { capacite: n });
    } else {
      setCapaciteDraft(String(table.capacite));
    }
  };

  const ajusterCapacite = (delta: number) => {
    const n = Math.max(1, table.capacite + delta);
    setCapaciteDraft(String(n));
    updateTableInfo(table.id, { capacite: n });
  };

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.panel, { transform: [{ translateX }] }]}
    >
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Édition table</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.panelClose}>✕</Text>
        </Pressable>
      </View>

      {onClientPress && (
        <Pressable style={styles.clientButton} onPress={() => onClientPress(table.id)}>
          <Text style={styles.clientButtonLabel}>Ouvrir la fiche client</Text>
        </Pressable>
      )}

      {canEditService && (
        <>
          <Text style={styles.panelSectionTitle}>Suivi du dîner</Text>
          {currentService.clientName && (
            <Text style={styles.serviceClient}>{currentService.clientName}</Text>
          )}
          <Text style={styles.panelLabel}>Étape du repas</Text>
          <View style={styles.choiceRow}>
            {(["aucun", "entree", "plat", "dessert"] as const).map((course) => (
              <Pressable
                key={course}
                style={[styles.choiceButton, currentService.course === course && styles.choiceButtonActive]}
                onPress={() => updateTableService(table.id, { course })}
              >
                <Text style={[styles.choiceLabel, currentService.course === course && styles.choiceLabelActive]}>
                  {course === "aucun" ? "—" : labelCourse(course)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.panelLabel}>État du plat</Text>
          <View style={styles.choiceRow}>
            {(["aucun", "a_reclamer", "servi"] as const).map((dishStatus) => (
              <Pressable
                key={dishStatus}
                style={[styles.choiceButton, currentService.dishStatus === dishStatus && styles.choiceButtonActive]}
                onPress={() => updateTableService(table.id, { dishStatus })}
              >
                <Text style={[styles.choiceLabel, currentService.dishStatus === dishStatus && styles.choiceLabelActive]}>
                  {dishStatus === "aucun" ? "—" : labelDishStatus(dishStatus)}
                </Text>
              </Pressable>
            ))}
          </View>
          {currentService.lastEventAt && (
            <Text style={styles.serviceTimestamp}>
              Dernière mise à jour : {new Date(currentService.lastEventAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
          <View style={styles.panelDivider} />
        </>
      )}

      {canEditLayout && (
        <>
          <Text style={styles.panelLabel}>Nom de la table</Text>
          <TextInput
            style={styles.panelInput}
            value={nomDraft}
            onChangeText={setNomDraft}
            onBlur={enregistrerNom}
            onSubmitEditing={enregistrerNom}
            placeholder="Nom de la table"
            placeholderTextColor="#8A8A8A"
          />

          <Text style={styles.panelLabel}>Capacité (nombre de personnes)</Text>
          <View style={styles.capaciteRow}>
            <Pressable style={styles.capaciteBtn} onPress={() => ajusterCapacite(-1)}>
              <Text style={styles.capaciteBtnLabel}>−</Text>
            </Pressable>
            <TextInput
              style={styles.capaciteInput}
              value={capaciteDraft}
              onChangeText={setCapaciteDraft}
              onBlur={enregistrerCapacite}
              onSubmitEditing={enregistrerCapacite}
              keyboardType="number-pad"
            />
            <Pressable style={styles.capaciteBtn} onPress={() => ajusterCapacite(1)}>
              <Text style={styles.capaciteBtnLabel}>+</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.panelDivider} />

      <Text style={styles.panelSectionTitle}>Commande en cours</Text>
      {!commande || commande.lignes.length === 0 ? (
        <Text style={styles.panelEmptyText}>Aucune commande en cours pour cette table.</Text>
      ) : (
        commande.lignes.map((ligne) => (
          <Pressable
            key={ligne.id}
            style={styles.ligneCommande}
            onPress={() => setSelectedDishId(selectedDishId === ligne.id ? null : ligne.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ligneNom}>
                {ligne.quantite}× {ligne.nom}
              </Text>
              {selectedDishId === ligne.id && (
                <View style={styles.ligneHoraires}>
                  <Text style={styles.ligneHoraire}>
                    Réclamé : {formatHeure(ligne.reclameAt)}
                  </Text>
                  <Text style={styles.ligneHoraire}>
                    Servi : {formatHeure(ligne.serviAt)}
                  </Text>
                  {(ligne.statut === "en_preparation" || ligne.statut === "en_attente") && (
                    <Pressable style={styles.requestButton} onPress={() => requestDish(table.id, ligne.id)}>
                      <Text style={styles.requestButtonLabel}>Réclamer ce plat</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
            <View style={[styles.badgeStatut, { backgroundColor: couleurStatutPlat(ligne.statut) }]}>
              <Text style={styles.badgeStatutLabel}>{labelStatutPlat(ligne.statut)}</Text>
            </View>
          </Pressable>
        ))
      )}
      <Text style={styles.panelNote}>
        Données de démonstration — sera branché sur le système de commande et la cuisine dans une
        prochaine phase.
      </Text>
    </Animated.View>
  );
}

function formatHeure(timestamp?: string): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  table: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  tableLabel: {
    color: COLORS.blancCreme,
    fontWeight: "700",
    fontSize: 11,
  },
  tableCapacite: {
    color: COLORS.blancCreme,
    fontSize: 9,
    opacity: 0.85,
  },
  serviceMarker: {
    marginTop: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: COLORS.blancCreme,
    alignItems: "center",
  },
  serviceMarkerText: { color: COLORS.bleuNuit, fontSize: 7, fontWeight: "700" },
  serviceStatusText: { color: COLORS.bleuNuit, fontSize: 6 },
  legende: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 14,
    gap: 12,
  },
  legendeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  legendePastille: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendeLabel: {
    color: COLORS.blancCreme,
    fontSize: 11,
  },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: COLORS.blancCreme,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.or,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: -2, height: 0 },
    elevation: 6,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.bleuNuit,
  },
  panelClose: {
    fontSize: 16,
    color: COLORS.bleuNuit,
    padding: 4,
  },
  panelLabel: {
    fontSize: 11,
    color: COLORS.bleuNuit,
    opacity: 0.7,
    marginTop: 12,
    marginBottom: 4,
  },
  clientButton: {
    backgroundColor: COLORS.bleuNuit,
    borderRadius: 6,
    alignItems: "center",
    paddingVertical: 11,
    marginBottom: 6,
  },
  clientButtonLabel: { color: COLORS.or, fontSize: 12, fontWeight: "600" },
  panelInput: {
    borderWidth: 1,
    borderColor: "#C9BFA8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.bleuNuit,
    backgroundColor: "#FFFDF8",
  },
  capaciteRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  capaciteBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C9BFA8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF8",
  },
  capaciteBtnLabel: {
    fontSize: 18,
    color: COLORS.bleuNuit,
  },
  capaciteInput: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: "#C9BFA8",
    borderRadius: 6,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.bleuNuit,
    backgroundColor: "#FFFDF8",
  },
  panelDivider: {
    height: 1,
    backgroundColor: "#C9BFA8",
    marginVertical: 16,
  },
  panelSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.bleuNuit,
    marginBottom: 8,
  },
  serviceClient: { color: COLORS.bleuNuit, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  choiceButton: { borderWidth: 1, borderColor: "#C9BFA8", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 6, backgroundColor: "#FFFDF8" },
  choiceButtonActive: { backgroundColor: COLORS.bleuNuit, borderColor: COLORS.bleuNuit },
  choiceLabel: { color: COLORS.bleuNuit, fontSize: 10 },
  choiceLabelActive: { color: COLORS.or },
  serviceTimestamp: { color: "#8A8A8A", fontSize: 9, marginTop: 8 },
  panelEmptyText: {
    fontSize: 12,
    color: COLORS.bleuNuit,
    opacity: 0.6,
    fontStyle: "italic",
  },
  ligneCommande: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ligneNom: {
    fontSize: 13,
    color: COLORS.bleuNuit,
  },
  ligneHoraires: {
    marginTop: 4,
    gap: 2,
  },
  ligneHoraire: {
    color: "#8A8A8A",
    fontSize: 9,
  },
  requestButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.or,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginTop: 5,
  },
  requestButtonLabel: { color: COLORS.bleuNuit, fontSize: 9, fontWeight: "700" },
  badgeStatut: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeStatutLabel: {
    fontSize: 10,
    color: COLORS.blancCreme,
    fontWeight: "600",
  },
  panelNote: {
    fontSize: 10,
    color: COLORS.bleuNuit,
    opacity: 0.5,
    marginTop: 16,
    fontStyle: "italic",
  },
});