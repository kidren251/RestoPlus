import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { MenuItem, MenuItemIngredient } from "@resto-plus/types";
import { useMenuStore } from "../store/menuStore";
import { useStockStore } from "../store/stockStore";

function margeInfo(marge: number | undefined, prixVente: number): { label: string; color: string } {
  if (marge === undefined) return { label: "Marge inconnue", color: colors.textMuted };
  if (marge <= 0) return { label: `Marge ${marge.toFixed(2)} €`, color: colors.statusReserved };
  if (marge < prixVente * 0.5) return { label: `Marge ${marge.toFixed(2)} €`, color: colors.statusOccupied };
  return { label: `Marge ${marge.toFixed(2)} €`, color: colors.statusFree };
}

export function MenuScreen({ canManage }: { canManage: boolean }) {
  const items = useMenuStore((state) => state.items);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const ajouterPlat = useMenuStore((state) => state.ajouterPlat);
  const margeUnitaire = useMenuStore((state) => state.margeUnitaire);
  const stockItems = useStockStore((state) => state.items);
  const loadStock = useStockStore((state) => state.loadStock);

  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [ingredientRows, setIngredientRows] = useState<{ stockItemId: string; quantite: string }[]>([]);

  useEffect(() => {
    loadMenu();
    loadStock();
  }, [loadMenu, loadStock]);

  const categories = Array.from(new Set(items.map((item) => item.categorie ?? "Autres")));

  const ajouterIngredient = (stockItemId: string) => {
    if (ingredientRows.some((row) => row.stockItemId === stockItemId)) return;
    setIngredientRows((rows) => [...rows, { stockItemId, quantite: "" }]);
  };

  const retirerIngredient = (stockItemId: string) => {
    setIngredientRows((rows) => rows.filter((row) => row.stockItemId !== stockItemId));
  };

  const majQuantite = (stockItemId: string, quantite: string) => {
    setIngredientRows((rows) => rows.map((row) => (row.stockItemId === stockItemId ? { ...row, quantite } : row)));
  };

  const soumettre = () => {
    const prix = Number(prixVente.replace(",", "."));
    const ingredients: MenuItemIngredient[] = ingredientRows
      .map((row) => ({ stockItemId: row.stockItemId, quantite: Number(row.quantite.replace(",", ".")) }))
      .filter((ingredient) => Number.isFinite(ingredient.quantite) && ingredient.quantite > 0);
    if (!nom.trim() || !Number.isFinite(prix) || ingredients.length === 0) return;
    ajouterPlat(nom.trim(), categorie.trim() || undefined, prix, ingredients);
    setNom("");
    setCategorie("");
    setPrixVente("");
    setIngredientRows([]);
    setShowForm(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>CUISINE</Text>
      <Text style={styles.title}>Gestion de la carte</Text>
      <Text style={styles.subtitle}>Plats, ingrédients liés et marge estimée à partir du coût d'achat du stock.</Text>

      {categories.map((categorie) => (
        <View key={categorie} style={styles.categoryBlock}>
          <Text style={styles.sectionLabel}>{categorie.toUpperCase()}</Text>
          <View style={styles.list}>
            {items
              .filter((item) => (item.categorie ?? "Autres") === categorie)
              .map((item) => {
                const marge = margeUnitaire(item.id);
                const badge = margeInfo(marge, item.prixVente);
                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.nom}>{item.nom}</Text>
                      <Text style={styles.prix}>{item.prixVente.toFixed(2)} €</Text>
                    </View>
                    <Text style={[styles.marge, { color: badge.color }]}>{badge.label}</Text>
                    <View style={styles.ingredientList}>
                      {item.ingredients.map((ingredient) => {
                        const stockItem = stockItems.find((candidate) => candidate.id === ingredient.stockItemId);
                        return (
                          <Text key={ingredient.stockItemId} style={styles.ingredientLine}>
                            • {stockItem?.nom ?? ingredient.stockItemId} — {ingredient.quantite} {stockItem?.unite ?? ""}
                          </Text>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      ))}

      {canManage && (
        <>
          {showForm ? (
            <View style={styles.form}>
              <Text style={styles.label}>Nom du plat</Text>
              <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Ex : Bavette à l'échalote" />

              <Text style={styles.label}>Catégorie</Text>
              <TextInput style={styles.input} value={categorie} onChangeText={setCategorie} placeholder="Entrées, Plats, Desserts..." />

              <Text style={styles.label}>Prix de vente</Text>
              <TextInput style={styles.input} value={prixVente} onChangeText={setPrixVente} keyboardType="numeric" placeholder="0" />

              <Text style={styles.label}>Ingrédients</Text>
              {ingredientRows.map((row) => {
                const stockItem = stockItems.find((candidate) => candidate.id === row.stockItemId);
                return (
                  <View key={row.stockItemId} style={styles.ingredientRow}>
                    <Text style={styles.ingredientRowNom}>{stockItem?.nom ?? row.stockItemId}</Text>
                    <TextInput
                      style={styles.ingredientQuantiteInput}
                      value={row.quantite}
                      onChangeText={(value) => majQuantite(row.stockItemId, value)}
                      keyboardType="numeric"
                      placeholder={stockItem?.unite ?? "qté"}
                    />
                    <Pressable onPress={() => retirerIngredient(row.stockItemId)} hitSlop={8}>
                      <Text style={styles.removeIngredient}>✕</Text>
                    </Pressable>
                  </View>
                );
              })}

              <Text style={styles.pickerHint}>Toucher un ingrédient pour l'ajouter :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                {stockItems
                  .filter((stockItem) => !ingredientRows.some((row) => row.stockItemId === stockItem.id))
                  .map((stockItem) => (
                    <Pressable key={stockItem.id} onPress={() => ajouterIngredient(stockItem.id)} style={styles.pickerPill}>
                      <Text style={styles.pickerPillLabel}>{stockItem.nom}</Text>
                    </Pressable>
                  ))}
              </ScrollView>

              <Pressable style={styles.saveButton} onPress={soumettre}>
                <Text style={styles.saveLabel}>Ajouter le plat</Text>
              </Pressable>
              <Pressable style={styles.cancelButton} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelLabel}>Annuler</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.addLabel}>＋ Ajouter un plat</Text>
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
  categoryBlock: { marginBottom: spacing.lg },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  card: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nom: { color: colors.navy, fontFamily: typography.serif, fontSize: 15, flex: 1, marginRight: spacing.sm },
  prix: { color: colors.navy, fontSize: 14 },
  marge: { fontSize: 11, fontWeight: "700", marginTop: 4 },
  ingredientList: { marginTop: spacing.sm },
  ingredientLine: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  addButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card },
  addLabel: { color: colors.gold, fontWeight: "600" },
  form: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.creamBorder, paddingTop: spacing.lg },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  ingredientRowNom: { color: colors.navy, fontSize: 12, flex: 1 },
  ingredientQuantiteInput: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.sm, paddingVertical: 8, width: 80, fontSize: 12 },
  removeIngredient: { color: colors.statusReserved, fontSize: 14, paddingHorizontal: 4 },
  pickerHint: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: spacing.xs },
  pickerRow: { flexDirection: "row" },
  pickerPill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 6, marginRight: spacing.xs },
  pickerPillLabel: { color: colors.textMuted, fontSize: 11 },
  saveButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.lg },
  saveLabel: { color: colors.gold, fontWeight: "600" },
  cancelButton: { alignItems: "center", paddingVertical: spacing.md },
  cancelLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
});
