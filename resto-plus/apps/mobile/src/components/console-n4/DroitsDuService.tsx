import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import {
  LIBELLES_PERMISSIONS_REGLABLES,
  PERMISSIONS,
  PERMISSIONS_REGLABLES,
  type NiveauAcces,
  type PermissionReglable,
  type ReglagesDroits,
} from "@resto-plus/types";
import { api, messageErreur } from "../../api/client";
import { useSessionStore } from "../../store/sessionStore";

const NIVEAUX: NiveauAcces[] = [0, 1, 2, 3];

/**
 * Console N4 : niveau minimum des droits du service, réglé établissement par
 * établissement (liste fermée PERMISSIONS_REGLABLES ; les pôles et les droits
 * sensibles ne se règlent pas). Chaque modification est inscrite au journal d'audit.
 */
export function DroitsDuService({ etablissements }: { etablissements: { id: string; nom: string }[] }) {
  const [restaurantId, setRestaurantId] = useState<string | undefined>(etablissements[0]?.id);
  const [reglages, setReglages] = useState<ReglagesDroits>({});
  const [modifie, setModifie] = useState(false);
  const [message, setMessage] = useState("");
  const chargerReglagesSession = useSessionStore((s) => s.chargerReglagesDroits);

  useEffect(() => {
    if (!restaurantId && etablissements[0]) setRestaurantId(etablissements[0].id);
  }, [etablissements, restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    setMessage("");
    setModifie(false);
    void api
      .get<{ reglages: ReglagesDroits }>(`/platform/restaurants/${restaurantId}/reglages-droits`)
      .then((r) => setReglages(r.reglages))
      .catch((e) => setMessage(messageErreur(e, "Impossible de charger les réglages.")));
  }, [restaurantId]);

  const choisir = (permission: PermissionReglable, niveau: NiveauAcces) => {
    setReglages((actuels) => {
      const suivants = { ...actuels };
      // Revenir à la valeur par défaut = retirer le réglage.
      if (niveau === PERMISSIONS[permission].minLevel) delete suivants[permission];
      else suivants[permission] = niveau;
      return suivants;
    });
    setModifie(true);
    setMessage("");
  };

  const enregistrer = async () => {
    if (!restaurantId) return;
    try {
      await api.put(`/platform/restaurants/${restaurantId}/reglages-droits`, { reglages });
      setModifie(false);
      setMessage("Réglages enregistrés. Ils s'appliquent tout de suite côté serveur.");
      void chargerReglagesSession();
    } catch (e) {
      setMessage(messageErreur(e, "Enregistrement impossible."));
    }
  };

  if (etablissements.length === 0) {
    return <Text style={styles.vide}>Aucun établissement dans cet environnement.</Text>;
  }

  return (
    <View style={styles.section}>
      <View style={styles.pills}>
        {etablissements.map((e) => (
          <Pressable key={e.id} style={[styles.pill, restaurantId === e.id && styles.pillOn]} onPress={() => setRestaurantId(e.id)}>
            <Text style={[styles.pillLabel, restaurantId === e.id && styles.pillLabelOn]}>{e.nom}</Text>
          </Pressable>
        ))}
      </View>

      {PERMISSIONS_REGLABLES.map((permission) => {
        const parDefaut = PERMISSIONS[permission].minLevel;
        const actuel = reglages[permission] ?? parDefaut;
        return (
          <View key={permission} style={styles.ligne}>
            <Text style={styles.libelle}>{LIBELLES_PERMISSIONS_REGLABLES[permission]}</Text>
            <View style={styles.niveaux}>
              {NIVEAUX.map((niveau) => (
                <Pressable key={niveau} style={[styles.niveau, actuel === niveau && styles.niveauOn]} onPress={() => choisir(permission, niveau)}>
                  <Text style={[styles.niveauLabel, actuel === niveau && styles.niveauLabelOn]}>
                    N{niveau}{niveau === parDefaut ? "*" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
      <Text style={styles.note}>Niveau minimum requis. * = valeur par défaut. Les pôles (salle, cuisine) ne changent pas.</Text>

      <Pressable style={[styles.bouton, !modifie && styles.boutonInactif]} onPress={enregistrer} disabled={!modifie}>
        <Text style={styles.boutonLabel}>Enregistrer les droits</Text>
      </Pressable>
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.sm },
  pill: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pillOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillLabel: { color: colors.navy, fontSize: 11 },
  pillLabelOn: { color: colors.gold, fontWeight: "600" },
  ligne: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  libelle: { color: colors.navy, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  niveaux: { flexDirection: "row", gap: 6 },
  niveau: { flex: 1, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: 5, paddingVertical: 6, alignItems: "center", backgroundColor: colors.cream },
  niveauOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  niveauLabel: { color: colors.navy, fontSize: 11, fontFamily: typography.serif },
  niveauLabelOn: { color: colors.gold, fontWeight: "700" },
  note: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: spacing.sm },
  bouton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 12, marginTop: spacing.md },
  boutonInactif: { opacity: 0.4 },
  boutonLabel: { color: colors.gold, fontWeight: "700" },
  message: { color: colors.navy, fontSize: 10, marginTop: spacing.sm },
  vide: { color: colors.textMuted, fontSize: 11, fontStyle: "italic" },
});
