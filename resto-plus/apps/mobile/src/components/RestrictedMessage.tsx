import React from "react";
import { View, Text } from "react-native";
import { colors, typography, spacing } from "@resto-plus/ui-luxury";

export function RestrictedMessage({ text }: { text: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.cream }}>
      <Text style={{ color: colors.navy, fontFamily: typography.serif, fontSize: 18, textAlign: "center" }}>{text}</Text>
    </View>
  );
}
