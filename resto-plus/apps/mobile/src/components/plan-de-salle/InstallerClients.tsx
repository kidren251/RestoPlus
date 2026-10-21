import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { reservationsAttendues, useReservationsStore } from "../../store/reservationsStore";
import { COLORS } from "./couleurs";
import { panelStyles } from "./panelStyles";

/**
 * Section « Installer des clients » d'une table libre (droit service.installer, dès N0).
 * Un geste : toucher la réservation du client (même prévue pour une autre table : il a
 * demandé à changer), ou « Sans réservation » avec le nombre de couverts.
 */
export function InstallerClients({ tableId, capacite }: { tableId: string; capacite: number }) {
  const reservations = useReservationsStore((s) => s.reservations);
  const charger = useReservationsStore((s) => s.charger);
  const installer = useReservationsStore((s) => s.installer);
  const [couverts, setCouverts] = useState(Math.min(Math.max(capacite, 1), 2));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    void charger();
  }, [charger]);

  // La réservation prévue pour cette table d'abord, puis les autres par heure.
  const attendues = reservationsAttendues(reservations).sort(
    (a, b) => Number(b.tableId === tableId) - Number(a.tableId === tableId) || a.heure.localeCompare(b.heure)
  );

  const lancer = async (choix: { reservationId: string } | { couverts: number }) => {
    if (enCours) return;
    setEnCours(true);
    setErreur("");
    const resultat = await installer(tableId, choix);
    if (!resultat.ok) setErreur(resultat.error);
    setEnCours(false);
  };

  return (
    <>
      <Text style={panelStyles.panelSectionTitle}>Installer des clients</Text>

      <View style={styles.walkIn}>
        <Pressable style={styles.stepper} onPress={() => setCouverts((n) => Math.max(1, n - 1))} hitSlop={6}>
          <Text style={styles.stepperLabel}>−</Text>
        </Pressable>
        <Text style={styles.couverts}>{couverts}</Text>
        <Pressable style={styles.stepper} onPress={() => setCouverts((n) => Math.min(99, n + 1))} hitSlop={6}>
          <Text style={styles.stepperLabel}>+</Text>
        </Pressable>
        <Pressable style={[styles.walkInButton, enCours && styles.disabled]} onPress={() => lancer({ couverts })}>
          <Text style={styles.walkInLabel}>Sans réservation</Text>
        </Pressable>
      </View>

      <Text style={panelStyles.panelLabel}>Réservations attendues</Text>
      {attendues.length === 0 ? (
        <Text style={styles.vide}>Aucune réservation en attente.</Text>
      ) : (
        <ScrollView style={styles.liste} nestedScrollEnabled>
          {attendues.map((r) => (
            <Pressable key={r.id} style={[styles.resa, r.tableId === tableId && styles.resaPrevue, enCours && styles.disabled]} onPress={() => lancer({ reservationId: r.id })}>
              <Text style={styles.resaHeure}>{r.heure}</Text>
              <View style={styles.resaCopy}>
                <Text style={styles.resaNom} numberOfLines={1}>{r.nomClient}</Text>
                <Text style={styles.resaDetail}>
                  {r.couverts} couv.{r.tableId === tableId ? " · prévue ici" : ""}{r.allergenes.length > 0 ? " · ⚠ allergies" : ""}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
      <View style={panelStyles.panelDivider} />
    </>
  );
}

const styles = StyleSheet.create({
  walkIn: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepper: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.bleuNuit, alignItems: "center", justifyContent: "center" },
  stepperLabel: { color: COLORS.bleuNuit, fontSize: 16 },
  couverts: { color: COLORS.bleuNuit, fontSize: 16, fontWeight: "700", minWidth: 22, textAlign: "center" },
  walkInButton: { flex: 1, backgroundColor: COLORS.bleuNuit, borderRadius: 6, paddingVertical: 9, alignItems: "center" },
  walkInLabel: { color: COLORS.or, fontWeight: "700", fontSize: 12 },
  liste: { maxHeight: 190 },
  resa: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#E2D9C6" },
  resaPrevue: { backgroundColor: "#FFF4D6", paddingHorizontal: 4, borderRadius: 4 },
  resaHeure: { color: COLORS.or, fontWeight: "700", fontSize: 12, width: 40 },
  resaCopy: { flex: 1 },
  resaNom: { color: COLORS.bleuNuit, fontSize: 13, fontWeight: "600" },
  resaDetail: { color: COLORS.bleuNuit, opacity: 0.7, fontSize: 10 },
  vide: { color: COLORS.bleuNuit, opacity: 0.6, fontSize: 11, fontStyle: "italic" },
  erreur: { color: COLORS.occupee, fontSize: 11, marginTop: 6 },
  disabled: { opacity: 0.5 },
});
