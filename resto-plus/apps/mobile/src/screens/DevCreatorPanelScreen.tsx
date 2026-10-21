import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import { api } from "../api/client";
import { DroitsDuService } from "../components/console-n4/DroitsDuService";

const ACCESS_LEVELS = [
  { level: "N0", name: "Serveur", detail: "Opérations de salle autorisées" },
  { level: "N1", name: "Chef de rang", detail: "Tables, clients et suivi du service" },
  { level: "N2", name: "Manager / admin", detail: "Supervision et configuration du restaurant" },
  { level: "N3", name: "Directeur d'établissement / admin+", detail: "Administration avancée du restaurant" },
  { level: "N4", name: "Configurateur / créateur / programmeur", detail: "Console plateforme et création d'univers" },
] as const;

const POLES = [
  { id: "salle", name: "Salle", detail: "Plan de salle, réservations, tâches de salle" },
  { id: "cuisine", name: "Cuisine", detail: "Checklists HACCP, suivi des plats, stocks" },
  { id: "direction", name: "Direction", detail: "N2/N3 : accès aux deux espaces" },
] as const;

type RestaurantUniverse = {
  id: string;
  nom: string;
  slug: string;
  actif: boolean;
  rlsEnabled: boolean;
  realtimeEnabled: boolean;
  createdAt: string;
};

export function DevCreatorPanelScreen({ onBack }: { onBack: () => void }) {
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rlsEnabled, setRlsEnabled] = useState(true);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [universes, setUniverses] = useState<RestaurantUniverse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ restaurants: RestaurantUniverse[] }>("/platform/restaurants")
      .then((response) => setUniverses(response.restaurants))
      .catch(() => setError("Impossible de charger les univers restaurant."));
  }, []);

  const createUniverse = async () => {
    if (!nom.trim() || !slug.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await api.post<{ restaurant: RestaurantUniverse }>("/platform/restaurants", {
        nom,
        slug,
        restaurantId,
        actif: isActive,
        rlsEnabled,
        realtimeEnabled,
      });
      setUniverses((current) => [response.restaurant, ...current]);
      setSaved(true);
    } catch {
      setError("La création a échoué. Vérifie le serveur API et le slug.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.consoleHeader}>
        <View>
          <Text style={styles.eyebrow}>N4 · CONSOLE PLATEFORME</Text>
          <Text style={styles.title}>Univers fermés</Text>
          <Text style={styles.subtitle}>Créer et contrôler les frontières de données des restaurants.</Text>
        </View>
        <View style={styles.secureBadge}><Text style={styles.secureBadgeText}>DEV</Text></View>
      </View>

      <View style={styles.warning}>
        <Text style={styles.warningTitle}>Accès créateur uniquement</Text>
        <Text style={styles.warningText}>Cette console agit au niveau plateforme. Elle ne doit jamais être accessible depuis un compte restaurant.</Text>
      </View>

      <Text style={styles.sectionLabel}>NOUVEL UNIVERS RESTAURANT</Text>
      <View style={styles.section}>
        <Text style={styles.label}>Nom de l'entité</Text>
        <TextInput style={styles.input} value={nom} onChangeText={setNom} placeholder="Le Grand Palais" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Slug technique</Text>
        <TextInput style={styles.input} value={slug} onChangeText={setSlug} autoCapitalize="none" placeholder="le-grand-palais" placeholderTextColor={colors.textMuted} />
        <Text style={styles.label}>Identifiant restaurant <Text style={styles.optional}>(optionnel)</Text></Text>
        <TextInput style={styles.input} value={restaurantId} onChangeText={setRestaurantId} autoCapitalize="none" placeholder="Généré automatiquement si vide" placeholderTextColor={colors.textMuted} />
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={styles.switchLabel}>Univers actif</Text>
            <Text style={styles.switchDetail}>Autoriser l'ouverture des sessions rattachées</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: colors.creamBorder, true: colors.gold }} thumbColor={colors.creamLight} />
        </View>
        <Pressable style={styles.primaryButton} onPress={createUniverse}>
          <Text style={styles.primaryLabel}>{isSubmitting ? "Création en cours..." : "Créer l'univers fermé"}</Text>
        </Pressable>
        {saved && <Text style={styles.success}>Configuration locale prête à être envoyée au backend.</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Text style={styles.sectionLabel}>GARDE-FOUS DE L'UNIVERS</Text>
      <View style={styles.section}>
        <ConfigToggle label="Isolation RLS" detail="Filtrer chaque donnée par restaurant_id" value={rlsEnabled} onChange={setRlsEnabled} />
        <ConfigToggle label="Synchronisation temps réel" detail="Partager les alertes entre appareils du restaurant" value={realtimeEnabled} onChange={setRealtimeEnabled} />
      </View>

      <Text style={styles.sectionLabel}>DROITS DU SERVICE PAR ÉTABLISSEMENT</Text>
      <DroitsDuService etablissements={universes} />

      <Text style={styles.sectionLabel}>NIVEAUX D'ACCÈS</Text>
      <View style={styles.levelList}>
        {ACCESS_LEVELS.map((access) => (
          <View key={access.level} style={[styles.levelRow, access.level === "N4" && styles.levelRowCreator]}>
            <Text style={styles.levelCode}>{access.level}</Text>
            <View style={styles.levelCopy}>
              <Text style={styles.levelName}>{access.name}</Text>
              <Text style={styles.levelDetail}>{access.detail}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>PÔLES DE L'ÉTABLISSEMENT</Text>
      <View style={styles.levelList}>
        {POLES.map((pole) => (
          <View key={pole.id} style={styles.levelRow}>
            <View style={styles.levelCopy}>
              <Text style={styles.levelName}>{pole.name}</Text>
              <Text style={styles.levelDetail}>{pole.detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Cadre défini au niveau plateforme (N4) : ce sont les seuls pôles disponibles pour cloisonner les
        espaces équipe. L'affectation concrète de chaque équipier à un pôle (salle ou cuisine) relève du
        N3 de l'établissement, depuis Gestion des accès.
      </Text>

      <Text style={styles.sectionLabel}>UNIVERS CRÉÉS</Text>
      <View style={styles.universeList}>
        {universes.length === 0 ? (
          <Text style={styles.emptyText}>Aucun univers enregistré dans cet environnement.</Text>
        ) : universes.map((universe) => (
          <View key={universe.id} style={styles.universeRow}>
            <View style={styles.levelCopy}>
              <Text style={styles.levelName}>{universe.nom}</Text>
              <Text style={styles.levelDetail}>{universe.slug} · {universe.id}</Text>
            </View>
            <Text style={[styles.universeStatus, universe.actif ? styles.active : styles.inactive]}>{universe.actif ? "ACTIF" : "INACTIF"}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>Prototype : la création effective, les policies RLS et les rôles devront être validés côté API avant toute mise en production.</Text>
      <Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backLabel}>Fermer la console</Text></Pressable>
    </ScrollView>
  );
}

function ConfigToggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchDetail}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.creamBorder, true: colors.gold }} thumbColor={colors.creamLight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  consoleHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.lg },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 27, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, maxWidth: 280 },
  secureBadge: { borderWidth: 1, borderColor: colors.gold, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6 },
  secureBadgeText: { color: colors.gold, fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  warning: { backgroundColor: colors.navy, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.xl },
  warningTitle: { color: colors.gold, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  warningText: { color: colors.creamLight, fontSize: 11, lineHeight: 16, opacity: 0.8 },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm, marginTop: spacing.md },
  section: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.sm, marginBottom: 5 },
  optional: { color: colors.textMuted, fontSize: 9 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: 5, backgroundColor: colors.cream, color: colors.navy, paddingHorizontal: spacing.sm, paddingVertical: 10 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  switchCopy: { flex: 1 },
  switchLabel: { color: colors.navy, fontSize: 12, fontWeight: "600" },
  switchDetail: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "700" },
  success: { color: colors.statusFree, fontSize: 10, marginTop: spacing.sm },
  error: { color: colors.statusOccupied, fontSize: 10, marginTop: spacing.sm },
  levelList: { borderTopWidth: 1, borderTopColor: colors.creamBorder },
  levelRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  levelRowCreator: { backgroundColor: "#FFF8E5", paddingHorizontal: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.gold },
  levelCode: { color: colors.gold, fontFamily: typography.serif, fontSize: 14, width: 26 },
  levelCopy: { flex: 1 },
  levelName: { color: colors.navy, fontSize: 12, fontWeight: "600" },
  levelDetail: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  universeList: { borderTopWidth: 1, borderTopColor: colors.creamBorder },
  universeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  universeStatus: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  active: { color: colors.statusFree },
  inactive: { color: colors.textMuted },
  emptyText: { color: colors.textMuted, fontSize: 11, fontStyle: "italic", paddingVertical: spacing.md },
  note: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.xl },
  backButton: { alignItems: "center", paddingVertical: spacing.lg },
  backLabel: { color: colors.textMuted, fontSize: 11, textDecorationLine: "underline" },
});
