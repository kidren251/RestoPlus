import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import { estConforme, libelleSeuil, type ChecklistEntry, type ChecklistItem } from "@resto-plus/types";

/**
 * Un point de contrôle HACCP. Un relevé envoyé fait foi : il ne se décoche pas ; on peut
 * le refaire (le nouveau s'ajoute, l'ancien reste dans l'historique). Une valeur hors
 * seuil s'affiche en rouge dès la saisie ; la conformité enregistrée est décidée par l'API.
 */
export function PointDeControle({
  item,
  entree,
  nbReleves,
  onValider,
}: {
  item: ChecklistItem;
  entree: ChecklistEntry | undefined;
  nbReleves: number;
  onValider: (valeur?: string) => void;
}) {
  const [valeur, setValeur] = useState("");
  /** Relevé refait : le point redevient saisissable, l'ancien relevé reste enregistré. */
  const [refaire, setRefaire] = useState(false);
  const isValidated = !!entree && !refaire;
  const seuil = libelleSeuil(item);
  const horsSeuilSaisie = item.requiertValeur && estConforme(item, valeur) === false;
  const horsSeuilReleve = isValidated && entree?.conforme === false;

  const valider = () => {
    if (isValidated) return; // un relevé envoyé fait foi : il ne se décoche pas
    if (item.requiertValeur && !valeur.trim()) return;
    onValider(item.requiertValeur ? valeur : undefined);
    setValeur("");
    setRefaire(false);
  };

  return (
    <View style={styles.itemRow}>
      <Pressable onPress={valider} disabled={isValidated} style={[styles.checkbox, isValidated && (horsSeuilReleve ? styles.checkboxAlerte : styles.checkboxDone)]} hitSlop={8}>
        {isValidated && <Text style={styles.checkmark}>{horsSeuilReleve ? "!" : "✓"}</Text>}
      </Pressable>

      <View style={styles.itemContent}>
        <Text style={[styles.itemLabel, isValidated && !horsSeuilReleve && styles.itemLabelDone]} numberOfLines={2}>
          {item.label}
        </Text>
        {!!seuil && <Text style={styles.seuil}>Attendu : {seuil}</Text>}
        {!!item.consigne && !isValidated && <Text style={styles.consigne}>{item.consigne}</Text>}

        {item.requiertValeur && !isValidated && (
          <>
            <TextInput
              style={[styles.valeurInput, horsSeuilSaisie && styles.valeurInputAlerte]}
              placeholder={item.unite ? `Valeur (${item.unite})` : "Valeur"}
              placeholderTextColor={colors.textMuted}
              value={valeur}
              onChangeText={setValeur}
              keyboardType="numbers-and-punctuation"
              onSubmitEditing={valider}
            />
            {horsSeuilSaisie && <Text style={styles.alerte}>Hors seuil : le relevé sera marqué non conforme. Prévenez le responsable.</Text>}
          </>
        )}

        {isValidated && entree?.valeur && (
          <Text style={[styles.valeurAffichee, horsSeuilReleve && styles.valeurAlerte]}>
            {entree.valeur}
            {item.unite ? ` ${item.unite}` : ""}
            {horsSeuilReleve ? " · NON CONFORME" : ""}
          </Text>
        )}

        {item.requiertPhoto && (
          <Text style={styles.photo}>{isValidated ? "📷 Photo jointe" : "📷 Photo requise"}</Text>
        )}

        {isValidated && entree && (
          <View style={styles.releveRow}>
            <Text style={styles.releveHeure}>
              Relevé à {new Date(entree.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              {nbReleves > 1 ? ` · ${nbReleves} relevés aujourd'hui` : ""}
            </Text>
            <Pressable onPress={() => setRefaire(true)} hitSlop={8}>
              <Text style={styles.refaire}>Refaire le relevé</Text>
            </Pressable>
          </View>
        )}

        {refaire && (
          <View style={styles.releveRow}>
            <Text style={styles.releveHeure}>Nouveau relevé : l'ancien reste dans l'historique.</Text>
            <Pressable onPress={() => setRefaire(false)} hitSlop={8}>
              <Text style={styles.refaire}>Annuler</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, borderTopWidth: 1, borderTopColor: colors.creamBorder },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: colors.creamBorder, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkboxDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkboxAlerte: { backgroundColor: colors.statusOccupied, borderColor: colors.statusOccupied },
  checkmark: { color: colors.cream, fontSize: 12, fontWeight: "700" },
  itemContent: { flex: 1 },
  itemLabel: { fontSize: 13, color: colors.navy, lineHeight: 18 },
  itemLabelDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  seuil: { fontSize: 10, color: colors.navy, marginTop: 2, fontWeight: "600" },
  consigne: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontStyle: "italic" },
  valeurInput: { marginTop: spacing.xs, height: 32, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.sharp, paddingHorizontal: spacing.sm, fontSize: 12, color: colors.navy, backgroundColor: colors.creamLight },
  valeurInputAlerte: { borderColor: colors.statusOccupied, color: colors.statusOccupied, borderWidth: 1.5 },
  alerte: { fontSize: 10, color: colors.statusOccupied, marginTop: 3, fontWeight: "600" },
  valeurAffichee: { marginTop: spacing.xs, fontSize: 11, color: colors.gold, fontFamily: typography.serif },
  valeurAlerte: { color: colors.statusOccupied, fontWeight: "700" },
  photo: { marginTop: spacing.xs, fontSize: 10, color: colors.textMuted },
  releveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: 4 },
  releveHeure: { flex: 1, fontSize: 10, color: colors.textMuted },
  refaire: { fontSize: 10, color: colors.gold, fontWeight: "600", textDecorationLine: "underline" },
});
