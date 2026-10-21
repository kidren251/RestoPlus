import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { useSalleStore } from "../store/salleStore";
import { useMenuStore } from "../store/menuStore";
import { usePermissions, useServiceLocked } from "../hooks/usePermissions";

export function ClientEditionScreen({ tableId, onBack }: { tableId: string; onBack: () => void }) {
  const allows = usePermissions();
  /** Verrou de service du directeur : explique pourquoi les actions sont masquées. */
  const serviceLocked = useServiceLocked();
  const canEditClient = !serviceLocked && allows("client.editer");
  const canOrder = !serviceLocked && allows("service.commander");
  const service = useSalleStore((state) => state.serviceStates[tableId]);
  const saveClient = useSalleStore((state) => state.saveClient);
  const sendAddition = useSalleStore((state) => state.sendAddition);
  const commande = useSalleStore((state) => state.commandes[tableId]);
  const [nom, setNom] = useState(service?.client?.nom ?? service?.clientName ?? "");
  const [telephone, setTelephone] = useState(service?.client?.telephone ?? "");
  const [allergies, setAllergies] = useState(service?.client?.allergies?.join(", ") ?? "");
  const [notes, setNotes] = useState(service?.client?.notes ?? "");

  const menuItems = useMenuStore((state) => state.items);
  const loadMenu = useMenuStore((state) => state.loadMenu);
  const commanderPlat = useMenuStore((state) => state.commanderPlat);
  const [commandeError, setCommandeError] = useState("");

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const commander = (menuItemId: string) => {
    const result = commanderPlat(tableId, menuItemId, 1);
    setCommandeError(result.ok ? "" : result.error);
  };

  const enregistrer = () => {
    if (!nom.trim()) return;
    saveClient(tableId, {
      nom: nom.trim(),
      telephone: telephone.trim(),
      allergies: allergies.split(",").map((value) => value.trim()).filter(Boolean),
      notes: notes.trim(),
    });
  };

  const envoyerAddition = () => {
    enregistrer();
    sendAddition(tableId);
    onBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>TABLE {tableId.replace("t", "")}</Text>
      <Text style={styles.title}>Édition client</Text>
      <Text style={styles.subtitle}>{canEditClient ? "Créer ou compléter la fiche du client installé à cette table." : "Fiche du client installé à cette table (consultation)."}</Text>

      <Text style={styles.label}>Nom du client</Text>
      <TextInput style={styles.input} value={nom} onChangeText={setNom} editable={canEditClient} placeholder="M. ou Mme Nom" />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput style={styles.input} value={telephone} onChangeText={setTelephone} editable={canEditClient} keyboardType="phone-pad" placeholder="Optionnel" />

      <Text style={styles.label}>Allergies</Text>
      <TextInput style={styles.input} value={allergies} onChangeText={setAllergies} editable={canEditClient} placeholder="Séparer par des virgules" />

      <Text style={styles.label}>Notes client</Text>
      <TextInput style={[styles.input, styles.notesInput]} value={notes} onChangeText={setNotes} editable={canEditClient} multiline placeholder="Préférences, occasion, attention particulière..." />

      {serviceLocked && (
        <Text style={styles.lockNote}>🔒 Service verrouillé : déverrouille-le depuis le plan de salle pour commander ou modifier la fiche.</Text>
      )}

      {canOrder && (
      <>
      <Text style={styles.sectionLabel}>COMMANDER UN PLAT</Text>
      <View style={styles.menuList}>
        {menuItems.map((item) => (
          <Pressable key={item.id} onPress={() => commander(item.id)} style={styles.menuRow}>
            <View style={styles.menuCopy}>
              <Text style={styles.menuNom}>{item.nom}</Text>
              <Text style={styles.menuPrix}>{item.prixVente.toFixed(2)} €</Text>
            </View>
            <Text style={styles.menuAdd}>＋ Commander</Text>
          </Pressable>
        ))}
      </View>
      </>
      )}
      {!!commandeError && <Text style={styles.error}>{commandeError}</Text>}
      {commande && commande.lignes.length > 0 && (
        <View style={styles.commandeList}>
          {commande.lignes.map((ligne) => (
            <Text key={ligne.id} style={styles.commandeLigne}>{ligne.quantite}× {ligne.nom}</Text>
          ))}
        </View>
      )}

      {canEditClient && (
        <>
          <Pressable style={styles.saveButton} onPress={enregistrer}>
            <Text style={styles.saveLabel}>Enregistrer la fiche</Text>
          </Pressable>
          <Pressable style={styles.billButton} onPress={envoyerAddition}>
            <Text style={styles.billLabel}>Envoyer l’addition</Text>
          </Pressable>
        </>
      )}
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backLabel}>Retour au plan de salle</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 11 },
  notesInput: { minHeight: 86, textAlignVertical: "top" },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginTop: spacing.xl, marginBottom: spacing.sm },
  menuList: { borderTopWidth: 1, borderTopColor: colors.creamBorder },
  menuRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  menuCopy: { flex: 1 },
  menuNom: { color: colors.navy, fontSize: 13 },
  menuPrix: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  menuAdd: { color: colors.gold, fontSize: 11, fontWeight: "600" },
  commandeList: { marginTop: spacing.sm },
  commandeLigne: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  lockNote: { color: colors.navy, fontSize: 11, lineHeight: 16, backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, padding: spacing.md, marginTop: spacing.xl },
  error: { color: colors.statusReserved, fontSize: 11, marginTop: spacing.sm },
  saveButton: { backgroundColor: colors.navy, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.xl },
  saveLabel: { color: colors.gold, fontWeight: "600" },
  billButton: { backgroundColor: colors.statusOccupied, borderRadius: radii.card, alignItems: "center", paddingVertical: 13, marginTop: spacing.sm },
  billLabel: { color: "#FFFFFF", fontWeight: "600" },
  backButton: { alignItems: "center", paddingVertical: spacing.md, marginTop: spacing.sm },
  backLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
});
