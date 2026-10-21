import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { StockMovementType } from "@resto-plus/types";
import { useStockStore } from "../store/stockStore";
import { useMenuStore } from "../store/menuStore";
import { usePermissions } from "../hooks/usePermissions";

const TYPES: { id: StockMovementType; label: string; signe: string }[] = [
  { id: "reception", label: "Réception", signe: "+" },
  { id: "sortie", label: "Sortie", signe: "−" },
  { id: "perte", label: "Perte / casse", signe: "−" },
  { id: "ajustement", label: "Ajustement (inventaire)", signe: "=" },
];

const TYPE_LABEL: Record<StockMovementType, string> = {
  reception: "Réception",
  sortie: "Sortie",
  perte: "Perte / casse",
  ajustement: "Ajustement",
};

export function StockItemDetailScreen({ itemId, onDeleted }: { itemId: string; onDeleted: () => void }) {
  const allows = usePermissions();
  const canEntree = allows("stock.entree");
  const canSortie = allows("stock.sortie");
  const item = useStockStore((state) => state.items.find((candidate) => candidate.id === itemId));
  const historique = useStockStore((state) => state.movementsByItem[itemId] ?? []);
  const loadHistorique = useStockStore((state) => state.loadHistorique);
  const enregistrerMouvement = useStockStore((state) => state.enregistrerMouvement);
  const supprimerArticle = useStockStore((state) => state.supprimerArticle);
  const plats = useMenuStore((state) => state.items);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  // N1 : réception uniquement. Toute baisse engage le chef de cuisine (N2).
  const typesAutorises = TYPES.filter((candidate) => (candidate.id === "reception" ? canEntree : canSortie));
  const [erreur, setErreur] = useState("");

  const [type, setType] = useState<StockMovementType>("reception");
  const [quantite, setQuantite] = useState("");
  const [motif, setMotif] = useState("");

  useEffect(() => {
    loadHistorique(itemId);
    if (canSortie) loadMenu();
  }, [itemId, loadHistorique, loadMenu, canSortie]);

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Article introuvable.</Text>
      </View>
    );
  }

  const arrondi = (valeur: number) => Math.round(valeur * 1000) / 1000;
  const quantiteValidee = item.quantiteConfirmee ?? item.quantiteActuelle;
  const sortiesEnAttente = arrondi(quantiteValidee - item.quantiteActuelle);
  const platUtilisateur = plats.find((plat) => plat.ingredients.some((ingredient) => ingredient.stockItemId === itemId));
  // Mêmes règles que l'API (DELETE /stock-items/:id), expliquées avant même d'essayer.
  const raisonBlocage =
    sortiesEnAttente !== 0 || historique.some((mouvement) => mouvement.statut === "provisoire")
      ? "Impossible de retirer cet article : des sorties attendent la validation du compte rendu cuisine. Valide ou annule-les d'abord."
      : platUtilisateur
        ? `Impossible de retirer cet article : il est utilisé dans le plat « ${platUtilisateur.nom} ». Retire-le d'abord de la carte.`
        : null;

  const supprimer = async () => {
    const message = await supprimerArticle(itemId);
    if (message) setErreur(message);
    else onDeleted();
  };

  const soumettre = () => {
    const valeur = Number(quantite.replace(",", "."));
    if (!Number.isFinite(valeur) || valeur < 0) return;
    enregistrerMouvement(itemId, type, valeur, motif.trim() || undefined);
    setQuantite("");
    setMotif("");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{item.categorie ?? "STOCK"}</Text>
      <Text style={styles.title}>{item.nom}</Text>
      <Text style={styles.quantite}>
        {item.quantiteActuelle} {item.unite} <Text style={styles.seuil}>· seuil {item.seuilAlerte} {item.unite}</Text>
      </Text>
      {sortiesEnAttente !== 0 && (
        // Détail posé noir sur blanc : pas de calcul à faire de tête en plein service.
        <View style={styles.bilan}>
          <View style={styles.bilanRow}>
            <Text style={styles.bilanLabel}>Stock validé (comptable)</Text>
            <Text style={styles.bilanValue}>{quantiteValidee} {item.unite}</Text>
          </View>
          <View style={styles.bilanRow}>
            <Text style={styles.bilanLabel}>Sorties en attente du compte rendu</Text>
            <Text style={[styles.bilanValue, styles.bilanAttente]}>{sortiesEnAttente > 0 ? "−" : "+"} {Math.abs(sortiesEnAttente)} {item.unite}</Text>
          </View>
          <View style={[styles.bilanRow, styles.bilanTotal]}>
            <Text style={styles.bilanLabelTotal}>Reste en frigo / réserve</Text>
            <Text style={styles.bilanValueTotal}>{item.quantiteActuelle} {item.unite}</Text>
          </View>
        </View>
      )}

      {typesAutorises.length > 0 && (
        <View style={styles.form}>
          <Text style={styles.label}>Type de mouvement</Text>
          <View style={styles.typeRow}>
            {typesAutorises.map((candidate) => (
              <Pressable
                key={candidate.id}
                onPress={() => setType(candidate.id)}
                style={[styles.typePill, type === candidate.id && styles.typePillActive]}
              >
                <Text style={[styles.typeLabel, type === candidate.id && styles.typeLabelActive]}>
                  {candidate.signe} {candidate.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{type === "ajustement" ? "Nouvelle quantité" : "Quantité"}</Text>
          <TextInput style={styles.input} value={quantite} onChangeText={setQuantite} keyboardType="numeric" placeholder={`0 ${item.unite}`} />

          <Text style={styles.label}>Motif</Text>
          <TextInput style={styles.input} value={motif} onChangeText={setMotif} placeholder="Optionnel" />

          <Pressable style={styles.saveButton} onPress={soumettre}>
            <Text style={styles.saveLabel}>Enregistrer le mouvement</Text>
          </Pressable>
          {type !== "reception" && (
            <Text style={styles.note}>Cette baisse restera provisoire jusqu'à la validation du compte rendu cuisine.</Text>
          )}
        </View>
      )}

      <Text style={styles.sectionLabel}>HISTORIQUE</Text>
      {historique.length === 0 ? (
        <Text style={styles.emptyHistorique}>Aucun mouvement enregistré pour cet article.</Text>
      ) : (
        <View style={styles.list}>
          {historique.map((mouvement) => (
            <View key={mouvement.id} style={styles.historiqueRow}>
              <View style={styles.historiqueHeader}>
                <Text style={styles.historiqueType}>
                  {TYPE_LABEL[mouvement.type]}
                  {mouvement.statut === "provisoire" && <Text style={styles.badgeAttente}>  · en attente de validation</Text>}
                  {mouvement.statut === "annule" && <Text style={styles.badgeAnnule}>  · annulé par le chef</Text>}
                </Text>
                <Text style={styles.historiqueDate}>{new Date(mouvement.timestamp).toLocaleString("fr-FR")}</Text>
              </View>
              <Text style={styles.historiqueDetail}>
                {mouvement.type === "ajustement" ? "→" : mouvement.type === "reception" ? "+" : "−"} {mouvement.quantite} {item.unite}
                {"  "}
                <Text style={styles.historiqueApres}>(reste {mouvement.quantiteApres} {item.unite})</Text>
              </Text>
              {mouvement.motif && <Text style={styles.historiqueMotif}>{mouvement.motif}</Text>}
            </View>
          ))}
        </View>
      )}

      {canSortie && (
        <>
          <Pressable style={[styles.deleteButton, !!raisonBlocage && styles.deleteButtonDisabled]} onPress={supprimer} disabled={!!raisonBlocage}>
            <Text style={styles.deleteLabel}>Retirer cet article du stock</Text>
          </Pressable>
          {!!(raisonBlocage || erreur) && <Text style={styles.error}>{raisonBlocage ?? erreur}</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  emptyContainer: { flex: 1, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  quantite: { color: colors.navy, fontSize: 16, marginBottom: spacing.lg },
  seuil: { color: colors.textMuted, fontSize: 12 },
  bilan: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, marginTop: -spacing.sm, marginBottom: spacing.lg },
  bilanRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  bilanLabel: { color: colors.textMuted, fontSize: 12 },
  bilanValue: { color: colors.navy, fontSize: 12 },
  bilanAttente: { color: colors.statusOccupied },
  bilanTotal: { borderTopWidth: 1, borderTopColor: colors.creamBorder, marginTop: 4, paddingTop: 6 },
  bilanLabelTotal: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  bilanValueTotal: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  deleteButtonDisabled: { opacity: 0.4 },
  note: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm, fontStyle: "italic" },
  badgeAttente: { color: colors.statusOccupied, fontSize: 10, fontWeight: "400" },
  badgeAnnule: { color: colors.textMuted, fontSize: 10, fontWeight: "400" },
  deleteButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.statusReserved, borderRadius: radii.card },
  deleteLabel: { color: colors.statusReserved, fontSize: 12, fontWeight: "600" },
  error: { color: colors.statusReserved, fontSize: 11, marginTop: spacing.sm },
  form: { borderTopWidth: 1, borderTopColor: colors.creamBorder, paddingTop: spacing.lg, marginBottom: spacing.xl },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  typePill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 7 },
  typePillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  typeLabel: { color: colors.textMuted, fontSize: 11 },
  typeLabelActive: { color: colors.gold },
  saveButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.lg },
  saveLabel: { color: colors.gold, fontWeight: "600" },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm },
  emptyHistorique: { color: colors.textMuted, fontSize: 12 },
  list: { gap: spacing.sm },
  historiqueRow: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md },
  historiqueHeader: { flexDirection: "row", justifyContent: "space-between" },
  historiqueType: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  historiqueDate: { color: colors.textMuted, fontSize: 10 },
  historiqueDetail: { color: colors.navy, fontSize: 13, marginTop: 4 },
  historiqueApres: { color: colors.textMuted, fontSize: 11 },
  historiqueMotif: { color: colors.textMuted, fontSize: 11, marginTop: 3, fontStyle: "italic" },
});
