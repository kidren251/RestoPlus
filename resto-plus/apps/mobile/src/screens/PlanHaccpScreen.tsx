import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { colors, typography, radii, spacing } from "@resto-plus/ui-luxury";
import { libelleSeuil, type Checklist, type ChecklistItem, type FrequenceChecklist } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";
import { useChecklistStore } from "../store/checklistStore";
import { EditeurPoint, type SaisiePoint } from "../components/haccp/EditeurPoint";
import { FREQUENCES, libelleFrequence } from "../components/haccp/frequences";

/**
 * Plan HACCP de l'établissement (chef de cuisine N2, directeur N3) : checklists, points
 * de contrôle, seuils. Chaque modification est inscrite au journal d'audit ; rien n'est
 * supprimé (un élément retiré est désactivé, ses relevés passés restent lisibles).
 */
export function PlanHaccpScreen() {
  const [plan, setPlan] = useState<Checklist[]>([]);
  const [chargement, setChargement] = useState(true);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [edition, setEdition] = useState<{ checklistId: string; point?: ChecklistItem } | null>(null);
  const [nouvelleNom, setNouvelleNom] = useState("");
  const [nouvelleFrequence, setNouvelleFrequence] = useState<FrequenceChecklist>("ouverture");

  const charger = useCallback(async () => {
    try {
      setPlan(await api.get<Checklist[]>("/checklists"));
      setMessage("");
    } catch (e) {
      setMessage(messageErreur(e, "Plan HACCP indisponible hors ligne."));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  /** Envoie une modification, recharge le plan (ici et dans l'écran des relevés). */
  const modifier = async (action: () => Promise<unknown>): Promise<string | undefined> => {
    try {
      await action();
      await charger();
      void useChecklistStore.getState().loadChecklists();
      return undefined;
    } catch (e) {
      return messageErreur(e, "Modification impossible hors ligne.");
    }
  };

  const creerChecklist = async () => {
    if (!nouvelleNom.trim()) return;
    const erreur = await modifier(() => api.post("/checklists", { nom: nouvelleNom.trim(), frequence: nouvelleFrequence }));
    if (erreur) setMessage(erreur);
    else setNouvelleNom("");
  };

  const retirerChecklist = (checklist: Checklist) =>
    Alert.alert("Retirer cette checklist ?", `« ${checklist.type} » ne sera plus proposée. Ses relevés passés restent dans l'historique.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", style: "destructive", onPress: () => void modifier(() => api.put(`/checklists/${checklist.id}`, { actif: false })) },
    ]);

  const enregistrerPoint = async (saisie: SaisiePoint) => {
    if (!edition) return undefined;
    const erreur = await modifier(() =>
      edition.point ? api.put(`/checklist-items/${edition.point.id}`, saisie) : api.post(`/checklists/${edition.checklistId}/items`, saisie)
    );
    if (!erreur) setEdition(null);
    return erreur;
  };

  const retirerPoint = () => {
    const point = edition?.point;
    if (!point) return;
    Alert.alert("Retirer ce point ?", `« ${point.label} » ne sera plus à relever. Ses relevés passés restent dans l'historique.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          const erreur = await modifier(() => api.put(`/checklist-items/${point.id}`, { actif: false }));
          if (erreur) setMessage(erreur);
          setEdition(null);
        },
      },
    ]);
  };

  if (chargement) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Plan HACCP</Text>
      <Text style={styles.avertissement}>
        Ce plan doit correspondre au plan de maîtrise sanitaire (PMS) de l'établissement. Le plan fourni à
        l'installation s'inspire du GBPH du restaurateur : faites-le valider par un professionnel de l'hygiène.
        Chaque modification est inscrite au journal d'audit.
      </Text>
      {!!message && <Text style={styles.erreur}>{message}</Text>}

      {plan.map((checklist) => (
        <View key={checklist.id} style={styles.section}>
          <Pressable style={styles.sectionHeader} onPress={() => setOuverte(ouverte === checklist.id ? null : checklist.id)}>
            <View style={styles.flex}>
              <Text style={styles.frequence}>{libelleFrequence(checklist.frequence)}</Text>
              <Text style={styles.sectionTitre}>{checklist.type}</Text>
            </View>
            <Text style={styles.compte}>{checklist.items.length} points {ouverte === checklist.id ? "▲" : "▼"}</Text>
          </Pressable>

          {ouverte === checklist.id && (
            <View style={styles.corps}>
              <View style={styles.pills}>
                {FREQUENCES.map((f) => (
                  <Pressable
                    key={f.id}
                    style={[styles.pill, checklist.frequence === f.id && styles.pillOn]}
                    onPress={() => void modifier(() => api.put(`/checklists/${checklist.id}`, { frequence: f.id }))}
                  >
                    <Text style={[styles.pillLabel, checklist.frequence === f.id && styles.pillLabelOn]}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>

              {checklist.items.map((item) => (
                <Pressable key={item.id} style={styles.point} onPress={() => setEdition({ checklistId: checklist.id, point: item })}>
                  <View style={styles.flex}>
                    <Text style={styles.pointLabel}>{item.label}</Text>
                    <Text style={styles.pointDetail}>
                      {item.requiertValeur ? `Valeur · ${libelleSeuil(item) ?? "sans seuil"}` : "Case à cocher"}
                      {item.requiertPhoto ? " · photo" : ""}
                    </Text>
                  </View>
                  <Text style={styles.modifier}>Modifier</Text>
                </Pressable>
              ))}

              <Pressable style={styles.ajouter} onPress={() => setEdition({ checklistId: checklist.id })}>
                <Text style={styles.ajouterLabel}>＋ Ajouter un point de contrôle</Text>
              </Pressable>
              <Pressable style={styles.retirer} onPress={() => retirerChecklist(checklist)}>
                <Text style={styles.retirerLabel}>Retirer cette checklist</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}

      <Text style={styles.sectionLabel}>NOUVELLE CHECKLIST</Text>
      <View style={styles.nouvelle}>
        <TextInput style={styles.input} value={nouvelleNom} onChangeText={setNouvelleNom} placeholder="Ex. Bar, Pâtisserie, Plats témoins…" />
        <View style={styles.pills}>
          {FREQUENCES.map((f) => (
            <Pressable key={f.id} style={[styles.pill, nouvelleFrequence === f.id && styles.pillOn]} onPress={() => setNouvelleFrequence(f.id)}>
              <Text style={[styles.pillLabel, nouvelleFrequence === f.id && styles.pillLabelOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={[styles.bouton, !nouvelleNom.trim() && styles.inactif]} onPress={creerChecklist}>
          <Text style={styles.boutonLabel}>Créer la checklist</Text>
        </Pressable>
      </View>

      <EditeurPoint
        visible={!!edition}
        point={edition?.point}
        onFermer={() => setEdition(null)}
        onEnregistrer={enregistrerPoint}
        onRetirer={edition?.point ? retirerPoint : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  flex: { flex: 1 },
  title: { fontFamily: typography.serif, fontSize: 20, color: colors.navy, marginBottom: spacing.sm },
  avertissement: { fontSize: 11, lineHeight: 16, color: colors.navy, backgroundColor: colors.creamLight, borderLeftWidth: 3, borderLeftColor: colors.gold, padding: spacing.sm, marginBottom: spacing.lg },
  erreur: { color: colors.statusOccupied, fontSize: 11, marginBottom: spacing.sm },
  section: { marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", padding: spacing.md, backgroundColor: colors.creamLight },
  frequence: { fontSize: 8, letterSpacing: typography.tracking.label, color: colors.gold, marginBottom: 3 },
  sectionTitre: { fontFamily: typography.serif, fontSize: 13, color: colors.navy },
  compte: { fontSize: 10, color: colors.textMuted },
  corps: { padding: spacing.md, gap: spacing.sm },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.creamLight },
  pillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillLabel: { color: colors.navy, fontSize: 10 },
  pillLabelOn: { color: colors.gold, fontWeight: "600" },
  point: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.creamBorder },
  pointLabel: { fontSize: 12, color: colors.navy },
  pointDetail: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  modifier: { fontSize: 10, color: colors.gold, fontWeight: "600" },
  ajouter: { paddingVertical: spacing.sm },
  ajouterLabel: { color: colors.navy, fontSize: 12, fontWeight: "600" },
  retirer: { alignSelf: "flex-start" },
  retirerLabel: { color: colors.statusOccupied, fontSize: 11 },
  sectionLabel: { fontSize: 9, letterSpacing: typography.tracking.label, color: colors.gold, marginTop: spacing.lg, marginBottom: spacing.sm },
  nouvelle: { gap: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.creamBorder, backgroundColor: colors.creamLight, borderRadius: radii.card, paddingHorizontal: spacing.sm, paddingVertical: 9, color: colors.navy },
  bouton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 12 },
  inactif: { opacity: 0.4 },
  boutonLabel: { color: colors.gold, fontWeight: "600" },
});
