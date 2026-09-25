import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@resto-plus/ui-luxury";
import type { IdentiteConnexion } from "@resto-plus/types";
import { api, messageErreur } from "../api/client";

/**
 * Première connexion d'un employé : il saisit le code d'activation transmis par sa
 * direction (créé dans « Comptes de l'équipe », N3), puis choisit son identifiant et
 * son mot de passe. Son compte est ensuite rattaché durablement au restaurant.
 */
export function ActivationCompteScreen({ onActivated }: { onActivated: (identity: IdentiteConnexion) => void }) {
  const [code, setCode] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activer = async () => {
    if (!code.trim() || !login.trim() || !password) {
      setError("Remplis le code, l'identifiant et le mot de passe.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const identity = await api.post<IdentiteConnexion>("/comptes/activer", { code: code.trim(), login: login.trim(), password });
      setError("");
      onActivated(identity);
    } catch (err) {
      setError(messageErreur(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>BIENVENUE</Text>
      <Text style={styles.title}>Activer mon compte</Text>
      <Text style={styles.subtitle}>Saisis le code d’activation remis par ta direction, puis choisis tes identifiants de connexion.</Text>

      <Text style={styles.label}>Code d’activation</Text>
      <TextInput style={[styles.input, styles.codeInput]} value={code} onChangeText={setCode} autoCapitalize="characters" autoCorrect={false} placeholder="RP-XXXX-XXXX" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Identifiant choisi</Text>
      <TextInput style={styles.input} value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} placeholder="ex : julie.m" placeholderTextColor={colors.textMuted} />

      <Text style={styles.label}>Mot de passe (8 caractères minimum)</Text>
      <View style={styles.passwordRow}>
        <TextInput style={[styles.input, styles.passwordInput]} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="mot de passe" placeholderTextColor={colors.textMuted} />
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
      <Text style={styles.label}>Confirmer le mot de passe</Text>
      <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="mot de passe" placeholderTextColor={colors.textMuted} />

      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={styles.primaryButton} onPress={activer} disabled={loading}>
        <Text style={styles.primaryLabel}>{loading ? "Activation…" : "Activer et me connecter"}</Text>
      </Pressable>
      <Text style={styles.note}>Un code ne sert qu’une fois et expire au bout de 7 jours. S’il ne fonctionne pas, demande-en un nouveau à ta direction.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.xl, paddingBottom: spacing.xl * 2 },
  eyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 1.5, marginTop: spacing.md, marginBottom: spacing.sm },
  title: { color: colors.navy, fontFamily: typography.serif, fontSize: 25, marginBottom: spacing.xs },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: spacing.md },
  label: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.creamBorder, borderRadius: radii.card, backgroundColor: colors.creamLight, color: colors.navy, paddingHorizontal: spacing.md, paddingVertical: 12 },
  codeInput: { fontSize: 16, letterSpacing: 2, textAlign: "center" },
  passwordRow: { justifyContent: "center" },
  passwordInput: { paddingRight: 48 },
  eyeButton: { position: "absolute", right: 0, top: 0, bottom: 0, width: 44, alignItems: "center", justifyContent: "center" },
  eyeIcon: { fontSize: 16, color: colors.navy },
  error: { color: colors.statusOccupied, fontSize: 11, marginTop: spacing.sm },
  primaryButton: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radii.card, paddingVertical: 13, marginTop: spacing.lg },
  primaryLabel: { color: colors.gold, fontWeight: "600" },
  note: { color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: spacing.lg, lineHeight: 15 },
});
