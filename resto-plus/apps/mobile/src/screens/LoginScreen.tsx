import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { IdentiteConnexion } from "@resto-plus/types";
import { findDemoAccount } from "../data/demoAccounts";
import { api, ApiError, messageErreur } from "../api/client";

export function LoginScreen({ onLogin, onTemporaryAccess, onActivateAccount }: { onLogin: (identity: IdentiteConnexion) => void; onTemporaryAccess: () => void; onActivateAccount: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!identifier.trim() || !password) {
      setError("Saisis ton identifiant et ton mot de passe.");
      return;
    }
    // Comptes de démo : vérifiés localement (voir docs/comptes-demo.md).
    const account = findDemoAccount(identifier);
    if (account) {
      if (password !== account.password) {
        setError("Identifiant ou mot de passe invalide.");
        return;
      }
      setError("");
      onLogin({ id: account.id, nom: account.label, accessRole: account.accessRole, pole: account.pole });
      return;
    }
    // Comptes créés par la direction puis activés : vérifiés par l'API.
    setLoading(true);
    try {
      const identity = await api.post<IdentiteConnexion>("/auth/login", { login: identifier.trim(), password });
      setError("");
      onLogin(identity);
    } catch (err) {
      setError(err instanceof ApiError ? messageErreur(err, "Identifiant ou mot de passe invalide.") : messageErreur(err));
    } finally {
      setLoading(false);
    }
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
        <View style={styles.passwordRow}>
          <TextInput style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="mot de passe" />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((visible) => !visible)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
          </Pressable>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}><Text style={styles.primaryLabel}>{loading ? "Connexion…" : "Se connecter"}</Text></Pressable>
        <Pressable style={styles.activateLink} onPress={onActivateAccount}>
          <Text style={styles.activateLabel}>Première connexion ? Activer mon compte</Text>
        </Pressable>

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
  passwordRow: { justifyContent: "center" },
  passwordInput: { paddingRight: 48 },
  eyeButton: { position: "absolute", right: 0, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" },
  eyeIcon: { fontSize: 16, color: colors.navy },
  error: { color: colors.statusOccupied, fontSize: 11, marginTop: spacing.sm },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  activateLink: { alignItems: "center", paddingVertical: spacing.md },
  activateLabel: { color: colors.navy, fontSize: 12, textDecorationLine: "underline" },
  separator: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.creamBorder },
  or: { color: colors.textMuted, fontSize: 9 },
  temporaryButton: { borderWidth: 1, borderColor: colors.gold, borderRadius: radii.card, padding: spacing.md, alignItems: "center" },
  temporaryLabel: { color: colors.navy, fontSize: 13, fontWeight: "600" },
  temporaryHint: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  demoNote: { color: colors.textMuted, fontSize: 9, textAlign: "center", marginTop: spacing.xl },
});
