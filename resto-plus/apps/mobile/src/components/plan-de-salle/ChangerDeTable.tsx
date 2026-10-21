import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSalleStore } from "../../store/salleStore";
import { useReservationsStore } from "../../store/reservationsStore";
import { COLORS } from "./couleurs";
import { panelStyles } from "./panelStyles";

/**
 * Section « Changer de table » d'une table occupée (droit service.installer) : un
 * toucher sur une table libre, et le repas en cours (client, étape, allergies,
 * réservation) y déménage.
 */
export function ChangerDeTable({ tableId, onDeplace }: { tableId: string; onDeplace: (versTableId: string) => void }) {
  const tables = useSalleStore((s) => s.salle?.tables ?? []);
  const changerDeTable = useReservationsStore((s) => s.changerDeTable);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const libres = tables.filter((t) => t.id !== tableId && t.statut === "libre");

  const deplacer = async (versTableId: string) => {
    if (enCours) return;
    setEnCours(true);
    setErreur("");
    const resultat = await changerDeTable(tableId, versTableId);
    setEnCours(false);
    if (resultat.ok) onDeplace(versTableId);
    else setErreur(resultat.error);
  };

  return (
    <>
      <Text style={panelStyles.panelSectionTitle}>Changer de table</Text>
      {libres.length === 0 ? (
        <Text style={styles.vide}>Aucune table libre.</Text>
      ) : (
        <View style={styles.grille}>
          {libres.map((t) => (
            <Pressable key={t.id} style={[styles.table, enCours && styles.disabled]} onPress={() => deplacer(t.id)}>
              <Text style={styles.tableNom}>{t.nom ?? "Table"}</Text>
              <Text style={styles.tableCapacite}>{t.capacite} pl.</Text>
            </Pressable>
          ))}
        </View>
      )}
      {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
      <View style={panelStyles.panelDivider} />
    </>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  table: { borderWidth: 1, borderColor: COLORS.libre, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, alignItems: "center" },
  tableNom: { color: COLORS.bleuNuit, fontSize: 12, fontWeight: "600" },
  tableCapacite: { color: COLORS.bleuNuit, opacity: 0.6, fontSize: 9 },
  vide: { color: COLORS.bleuNuit, opacity: 0.6, fontSize: 11, fontStyle: "italic" },
  erreur: { color: COLORS.occupee, fontSize: 11, marginTop: 6 },
  disabled: { opacity: 0.5 },
});
