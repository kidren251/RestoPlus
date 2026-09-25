import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { StockItem, UniteStock } from "@resto-plus/types";
import { useStockStore } from "../store/stockStore";

const UNITES: UniteStock[] = ["kg", "g", "l", "ml", "unite"];

function statutArticle(item: StockItem): { label: string; color: string } {
  if (item.quantiteActuelle <= 0) return { label: "Rupture", color: colors.statusReserved };
  if (item.quantiteActuelle <= item.seuilAlerte) return { label: "Stock bas", color: colors.statusOccupied };
  return { label: "OK", color: colors.statusFree };
}

export function StockScreen({
  canCreate,
  onOpenItem,
}: {
  canCreate: boolean;
  onOpenItem: (itemId: string) => void;
}) {
  const items = useStockStore((state) => state.items);
  const alertesNonLues = useStockStore((state) => state.getAlertesNonLues());
  const loadStock = useStockStore((state) => state.loadStock);
  const loadAlertes = useStockStore((state) => state.loadAlertes);
  const marquerAlerteLue = useStockStore((state) => state.marquerAlerteLue);
  const ajouterArticle = useStockStore((state) => state.ajouterArticle);

  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [unite, setUnite] = useState<UniteStock>("kg");
  const [seuilAlerte, setSeuilAlerte] = useState("");
  const [prixAchat, setPrixAchat] = useState("");

  useEffect(() => {
    loadStock();
    loadAlertes();
  }, [loadStock, loadAlertes]);

  const articlesEnAlerte = items.filter((item) => item.quantiteActuelle <= item.seuilAlerte).length;

  const soumettre = () => {
    if (!nom.trim()) return;
    const seuil = Number(seuilAlerte.replace(",", "."));
    const cout = Number(prixAchat.replace(",", "."));
    ajouterArticle(nom.trim(), unite, Number.isFinite(seuil) ? seuil : 0, categorie.trim() || undefined, Number.isFinite(cout) && prixAchat.trim() ? cout : undefined);
    setNom("");
    setCategorie("");
    setSeuilAlerte("");
    setPrixAchat("");
    setShowForm(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CUISINE</Text>
      <Text style={styles.title}>Gestion des stocks</Text>
      <Text style={styles.subtitle}>
        {articlesEnAlerte > 0
          ? `${articlesEnAlerte} article${articlesEnAlerte > 1 ? "s" : ""} sous le seuil d'alerte`
          : "Tous les articles sont au-dessus de leur seuil d'alerte."}
      </Text>

      {alertesNonLues.length > 0 && (
        <View style={styles.alertBlock}>
          <Text style={styles.sectionLabel}>ALERTES</Text>
          {alertesNonLues.map((alert) => (
            <Pressable key={alert.id} onPress={() => marquerAlerteLue(alert.id)} style={styles.alertRow}>
              <Text style={[styles.alertMessage, alert.niveau === "rupture" && styles.alertRupture]}>{alert.message}</Text>
              <Text style={styles.alertDismiss}>Marquer lue</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.list}>
        {items.map((item) => {
          const statut = statutArticle(item);
          return (
            <Pressable key={item.id} onPress={() => onOpenItem(item.id)} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={styles.cardHeader}>
                <Text style={styles.nom}>{item.nom}</Text>
                <View style={[styles.badge, { borderColor: statut.color }]}>
                  <Text style={[styles.badgeLabel, { color: statut.color }]}>{statut.label}</Text>
                </View>
              </View>
              {item.categorie && <Text style={styles.categorie}>{item.categorie}</Text>}
              <Text style={styles.quantite}>
                {item.quantiteActuelle} {item.unite} <Text style={styles.seuil}>· seuil {item.seuilAlerte} {item.unite}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>

      {canCreate && (
        <>
          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.label}>Nom de l'article</Text>
              <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Ex : Crème liquide" />

              <Text style={styles.label}>Catégorie</Text>
              <TextInput style={styles.input} value={categorie} onChangeText={setCategorie} placeholder="Optionnel" />

              <Text style={styles.label}>Unité</Text>
              <View style={styles.uniteRow}>
                {UNITES.map((candidate) => (
                  <Pressable
                    key={candidate}
                    onPress={() => setUnite(candidate)}
                    style={[styles.unitePill, unite === candidate && styles.unitePillActive]}
                  >
                    <Text style={[styles.uniteLabel, unite === candidate && styles.uniteLabelActive]}>{candidate}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Seuil d'alerte</Text>
              <TextInput style={styles.input} value={seuilAlerte} onChangeText={setSeuilAlerte} keyboardType="numeric" placeholder="0" />

              <Text style={styles.label}>Prix d'achat (par {unite})</Text>
              <TextInput style={styles.input} value={prixAchat} onChangeText={setPrixAchat} keyboardType="numeric" placeholder="Optionnel — base du calcul de marge" />

              <Pressable style={styles.saveButton} onPress={soumettre}>
                <Text style={styles.saveLabel}>Ajouter l'article</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelLabel}>Annuler</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.addLabel}>＋ Ajouter un article</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm },
  alertBlock: { backgroundColor: "#FFF8E5", borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.lg },
  alertRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, gap: spacing.sm },
  alertMessage: { color: colors.navy, fontSize: 12, flex: 1 },
  alertRupture: { color: colors.statusReserved, fontWeight: "600" },
  alertDismiss: { color: colors.textMuted, fontSize: 10, textDecorationLine: "underline" },
  list: { gap: spacing.sm },
  card: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md },
  cardPressed: { opacity: 0.6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nom: { color: colors.navy, fontFamily: typography.serif, fontSize: 15, flex: 1, marginRight: spacing.sm },
  badge: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4 },
  categorie: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  quantite: { color: colors.navy, fontSize: 14, marginTop: spacing.xs },
  seuil: { color: colors.textMuted, fontSize: 11 },
  addButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card },
  addLabel: { color: colors.gold, fontWeight: "600" },
  form: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.creamBorder, paddingTop: spacing.lg },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  uniteRow: { flexDirection: "row", gap: spacing.xs },
  unitePill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  unitePillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  uniteLabel: { color: colors.textMuted, fontSize: 12 },
  uniteLabelActive: { color: colors.gold },
  saveButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.lg },
  saveLabel: { color: colors.gold, fontWeight: "600" },
  cancelButton: { alignItems: "center", paddingVertical: spacing.md },
  cancelLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
});
