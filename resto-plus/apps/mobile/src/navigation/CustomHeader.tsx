import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing } from "@resto-plus/ui-luxury";

export function CustomHeader({
  title,
  onBack,
  rightAction,
}: {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.cream }}>
      <View style={headerStyles.container}>
        {onBack ? (
          <Pressable onPress={onBack} style={headerStyles.backBtn} hitSlop={12}>
            <Text style={headerStyles.backIcon}>←</Text>
          </Pressable>
        ) : (
          <View style={headerStyles.backBtn} />
        )}
        <Text style={headerStyles.title}>{title}</Text>
        <View style={headerStyles.rightBtn}>{rightAction}</View>
      </View>
    </SafeAreaView>
  );
}

/** Écran standard : en-tête avec retour + contenu. */
export function ScreenWithHeader({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <CustomHeader title={title} onBack={onBack} />
      {children}
    </View>
  );
}

export const headerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rightBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 18,
    color: colors.gold,
  },
  title: {
    fontFamily: typography.serif,
    fontSize: 14,
    color: colors.navy,
    letterSpacing: 0.3,
  },
  adminToggle: {
    fontSize: 20,
  },
});
