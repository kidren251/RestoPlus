import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ScrollView, Switch } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import { libelleSeuil, valeurNumerique, type ChecklistItem } from "@resto-plus/types";

export interface SaisiePoint {
  label: string;
  requiertValeur: boolean;
  requiertPhoto: boolean;
  seuilMin: number | null;
  seuilMax: number | null;
  unite: string | null;
  consigne: string | null;
}

/**
 * Création / modification d'un point de contrôle du plan HACCP : libellé, valeur
 * chiffrée et ses seuils, unité, consigne, photo. « Retirer du plan » le désactive
 * (ses relevés passés restent lisibles).
 */
export function EditeurPoint({
  visible,
  point,
  onFermer,
  onEnregistrer,
  onRetirer,
}: {
  visible: boolean;
  /** Absent = nouveau point. */
  point?: ChecklistItem;
  onFermer: () => void;
  onEnregistrer: (saisie: SaisiePoint) => Promise<string | undefined>;
  onRetirer?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [requiertValeur, setRequiertValeur] = useState(false);
  const [requiertPhoto, setRequiertPhoto] = useState(false);
  const [seuilMin, setSeuilMin] = useState("");
  const [seuilMax, setSeuilMax] = useState("");
  const [unite, setUnite] = useState("");
  const [consigne, setConsigne] = useState("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!visible) return;
    setLabel(point?.label ?? "");
    setRequiertValeur(point?.requiertValeur ?? false);
    setRequiertPhoto(point?.requiertPhoto ?? false);
    setSeuilMin(point?.seuilMin?.toString() ?? "");
    setSeuilMax(point?.seuilMax?.toString() ?? "");
    setUnite(point?.unite ?? (point ? "" : "°C"));
    setConsigne(point?.consigne ?? "");
    setErreur("");
  }, [visible, point]);

  const min = seuilMin.trim() ? valeurNumerique(seuilMin) : null;
  const max = seuilMax.trim() ? valeurNumerique(seuilMax) : null;
  const apercu = requiertValeur ? libelleSeuil({ seuilMin: min ?? undefined, seuilMax: max ?? undefined, unite: unite.trim() || undefined }) : undefined;

  const enregistrer = async () => {
    if (!label.trim()) return setErreur("Indiquez le libellé du point de contrôle.");
    if (min === undefined || max === undefined) return setErreur("Seuil illisible : saisir un nombre (ex. 4 ou -18).");
    if (min !== null && max !== null && min > max) return setErreur("Le minimum dépasse le maximum.");
    const message = await onEnregistrer({
      label: label.trim(),
      requiertValeur,
      requiertPhoto,
      seuilMin: requiertValeur ? min : null,
      seuilMax: requiertValeur ? max : null,
      unite: requiertValeur && unite.trim() ? unite.trim() : null,
      consigne: consigne.trim() || null,
    });
    if (message) setErreur(message);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer}>
      <View style={styles.backdrop}>
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{point ? "Modifier le point" : "Nouveau point de contrôle"}</Text>
            <Pressable onPress={onFermer}><Text style={styles.close}>✕</Text></Pressable>
          </View>

          <Text style={styles.label}>Libellé</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Ex. Température chambre froide positive" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Valeur chiffrée à relever (température, %…)</Text>
            <Switch value={requiertValeur} onValueChange={setRequiertValeur} trackColor={{ false: colors.creamBorder, true: colors.gold }} />
          </View>

          {requiertValeur && (
            <>
              <View style={styles.row}>
                <View style={styles.tiers}>
                  <Text style={styles.label}>Minimum</Text>
                  <TextInput style={styles.input} value={seuilMin} onChangeText={setSeuilMin} keyboardType="numbers-and-punctuation" placeholder="—" />
                </View>
                <View style={styles.tiers}>
                  <Text style={styles.label}>Maximum</Text>
                  <TextInput style={styles.input} value={seuilMax} onChangeText={setSeuilMax} keyboardType="numbers-and-punctuation" placeholder="—" />
                </View>
                <View style={styles.tiers}>
                  <Text style={styles.label}>Unité</Text>
                  <TextInput style={styles.input} value={unite} onChangeText={setUnite} placeholder="°C" />
                </View>
              </View>
              <Text style={styles.apercu}>
                {apercu ? `Attendu : ${apercu} — un relevé hors de cet intervalle sera non conforme.` : "Sans seuil : aucune alerte automatique."}
              </Text>
            </>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Photo requise</Text>
            <Switch value={requiertPhoto} onValueChange={setRequiertPhoto} trackColor={{ false: colors.creamBorder, true: colors.gold }} />
          </View>

          <Text style={styles.label}>Consigne (facultatif)</Text>
          <TextInput style={[styles.input, styles.multiligne]} value={consigne} onChangeText={setConsigne} multiline placeholder="Rappel de la règle, ce qu'il faut faire si hors seuil…" />

          {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}
          <Pressable style={styles.bouton} onPress={enregistrer}><Text style={styles.boutonLabel}>Enregistrer</Text></Pressable>
          {point && onRetirer && (
            <Pressable style={styles.retirer} onPress={onRetirer}>
              <Text style={styles.retirerLabel}>Retirer ce point du plan</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(11,30,51,0.35)" },
  form: { backgroundColor: colors.cream, padding: spacing.lg, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, maxHeight: "90%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  title: { fontFamily: typography.serif, fontSize: 18, color: colors.navy },
  close: { color: colors.navy, fontSize: 16, padding: spacing.xs },
  label: { color: colors.textMuted, fontSize: 10, marginBottom: 4, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.creamBorder, backgroundColor: colors.creamLight, borderRadius: radii.card, paddingHorizontal: spacing.sm, paddingVertical: 9, color: colors.navy },
  multiligne: { minHeight: 60, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: spacing.sm },
  tiers: { flex: 1 },
  apercu: { fontSize: 10, color: colors.navy, marginTop: 6 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginTop: spacing.md },
  switchLabel: { flex: 1, color: colors.navy, fontSize: 12 },
  erreur: { color: colors.statusOccupied, fontSize: 11, marginTop: spacing.sm },
  bouton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 12, marginTop: spacing.lg },
  boutonLabel: { color: colors.gold, fontWeight: "600" },
  retirer: { alignItems: "center", paddingVertical: spacing.md, marginBottom: spacing.lg },
  retirerLabel: { color: colors.statusOccupied, fontSize: 12 },
});
