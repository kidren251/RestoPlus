import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { DemoAccount } from "../data/demoAccounts";
import { findDemoAccount } from "../data/demoAccounts";

export function LoginScreen({ onLogin, onTemporaryAccess }: { onLogin: (account: DemoAccount) => void; onTemporaryAccess: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!identifier.trim() || !password) {
      setError("Saisis ton identifiant et ton mot de passe.");
      return;
    }
    const account = findDemoAccount(identifier);
    if (!account || password !== account.password) {
      setError("Identifiant ou mot de passe invalide. Voir docs/comptes-demo.md pour les 7 comptes de test.");
      return;
    }
    setError("");
    onLogin(account);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.seal}><Text style={styles.sealIcon}>◆</Text></View>
        <Text style={styles.brand}>RESTO PLUS</Text>
        <Text style={styles.subtitle}>Accéder à votre univers restaurant</Text>

        <Text style={styles.label}>Identifiant</Text>
        <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} autoCapitalize="none" placeholder="nom ou identifiant" />
        <Text style={styles.label}>Mot de passe</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="mot de passe" />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.primaryButton} onPress={submit}><Text style={styles.primaryLabel}>Se connecter</Text></Pressable>

        <View style={styles.separator}><View style={styles.line} /><Text style={styles.or}>OU</Text><View style={styles.line} /></View>
        <Pressable style={styles.temporaryButton} onPress={onTemporaryAccess}>
          <Text style={styles.temporaryLabel}>Accès temporaire / intérimaire</Text>
          <Text style={styles.temporaryHint}>Rejoindre un restaurant avec un QR code</Text>
        </Pressable>
        <Text style={styles.demoNote}>Prototype : l’authentification réelle sera reliée à Supabase Auth.</Text>
        <Text style={styles.demoNote}>Comptes de test : comptesalle-0 à 3 · comptecuisin-0 à 2 · mot de passe resto2026 (voir docs/comptes-demo.md)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, justifyContent: "center" },
  content: { padding: spacing.xl, alignItems: "stretch" },
  seal: { alignSelf: "center", width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.gold, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  sealIcon: { color: colors.gold, fontSize: 15 },
  brand: { color: colors.navy, fontFamily: typography.serif, fontSize: 23, textAlign: "center", letterSpacing: 1 },
  subtitle: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 12 },
  error: { color: colors.statusOccupied, fontSize: 11, marginTop: spacing.sm },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  separator: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.creamBorder },
  or: { color: colors.textMuted, fontSize: 9 },
  temporaryButton: { borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, padding: spacing.md, alignItems: "center" },
  temporaryLabel: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  temporaryHint: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  demoNote: { color: colors.textMuted, fontSize: 9, textAlign: "center", marginTop: spacing.xl },
});
