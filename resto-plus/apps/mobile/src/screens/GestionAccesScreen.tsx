import React, { useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { AccessRole, Pole } from "@resto-plus/types";
import { api } from "../api/client";

type Member = { id: string; name: string; role: AccessRole; pole: Pole; status: "actif" | "temporaire" | "expire"; expiresAt?: string };

const INITIAL_MEMBERS: Member[] = [
  { id: "m1", name: "Marie Dupont", role: "manager_admin", pole: "direction", status: "actif" },
  { id: "m2", name: "Thomas Martin", role: "directeur_admin", pole: "direction", status: "actif" },
  { id: "m3", name: "Sophie Bernard", role: "chef_rang", pole: "salle", status: "actif" },
  { id: "m4", name: "Intérimaire récent", role: "serveur", pole: "salle", status: "temporaire", expiresAt: "11 sept. 2026" },
];

const ROLE_LABEL: Record<AccessRole, string> = {
  manager_admin: "Manager / admin",
  directeur_admin: "Directeur d’établissement / admin+",
  chef_rang: "Chef de rang",
  serveur: "Serveur / niveau-0",
};

const POLE_LABEL: Record<Pole, string> = {
  salle: "Pôle salle",
  cuisine: "Pôle cuisine",
  direction: "Direction (accès aux deux)",
};

export function GestionAccesScreen({ onBack, onInvite, canChangePole }: { onBack: () => void; onInvite?: () => void; canChangePole: boolean }) {
  const [members, setMembers] = useState(INITIAL_MEMBERS);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void api.get<{ members: Array<{ id: string; name: string; role: "serveur"; pole: Pole; status: "temporaire" | "expire"; expiresAt: string }> }>("/restaurant/members")
        .then((response) => {
          if (!active || response.members.length === 0) return;
          setMembers((current) => [
            ...current.filter((member) => !response.members.some((remote) => remote.id === member.id)),
            ...response.members,
          ]);
        })
        .catch(() => undefined);
      return () => { active = false; };
    }, [])
  );

  const revoke = (id: string) => {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, status: "expire" } : member));
  };

  // Définition du rôle/pôle de l'équipier dans l'environnement virtuel de l'établissement : prérogative N3.
  const changePole = (id: string) => {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, pole: member.pole === "salle" ? "cuisine" : "salle" } : member));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>UNIVERS RESTAURANT</Text>
      <Text style={styles.title}>Gestion des accès</Text>
      <Text style={styles.subtitle}>Contrôler les membres et les accès temporaires de cet établissement.</Text>
      {onInvite && <Pressable style={styles.inviteButton} onPress={onInvite}><Text style={styles.inviteLabel}>+ Inviter un équipier</Text></Pressable>}
      <Text style={styles.sectionLabel}>MEMBRES · {members.length}</Text>
      {members.map((member) => (
        <View key={member.id} style={styles.memberCard}>
          <View style={styles.memberMain}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberRole}>{ROLE_LABEL[member.role]}</Text>
            <Text style={styles.memberPole}>{POLE_LABEL[member.pole]}</Text>
            {member.expiresAt && <Text style={styles.expiry}>Expire le {member.expiresAt}</Text>}
          </View>
          <View style={styles.memberActions}>
            <Text style={[styles.status, member.status === "actif" ? styles.active : member.status === "temporaire" ? styles.temporary : styles.expired]}>{member.status}</Text>
            {canChangePole && member.status !== "expire" && member.pole !== "direction" && (
              <Pressable onPress={() => changePole(member.id)}><Text style={styles.revoke}>Changer de pôle</Text></Pressable>
            )}
            {member.status !== "expire" && member.role !== "manager_admin" && <Pressable onPress={() => revoke(member.id)}><Text style={styles.revoke}>Révoquer</Text></Pressable>}
          </View>
        </View>
      ))}
      <Text style={styles.note}>Les accès temporaires doivent être expirés ou révoqués côté serveur. Cette vue utilise encore des données de démonstration.</Text>
      <Pressable style={styles.backButton} onPress={onBack}><Text style={styles.backLabel}>Retour</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  inviteButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 12, marginBottom: spacing.xl },
  inviteLabel: { color: colors.gold, fontWeight: "600" },
  sectionLabel: { color: colors.gold, fontSize: 9, letterSpacing: typography.tracking.label, marginBottom: spacing.sm },
  memberCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  memberMain: { flex: 1 },
  memberName: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  memberRole: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  memberPole: { color: colors.gold, fontSize: 9, marginTop: 3, letterSpacing: 0.3 },
  expiry: { color: colors.gold, fontSize: 9, marginTop: 4 },
  memberActions: { alignItems: "flex-end", gap: 7 },
  status: { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 },
  active: { color: colors.statusFree },
  temporary: { color: colors.gold },
  expired: { color: colors.statusOccupied },
  revoke: { color: colors.statusOccupied, fontSize: 10, textDecorationLine: "underline" },
  note: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: spacing.lg },
  backButton: { alignItems: "center", paddingVertical: spacing.lg },
  backLabel: { color: colors.textMuted, fontSize: 11 },
});
