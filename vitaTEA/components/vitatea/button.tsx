import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, PressableProps } from "react-native";
import { colors, radius } from "@/constants/vitatea-theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = PressableProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({ title, variant = "primary", loading, fullWidth = true, disabled, style, ...rest }: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        fullWidth && { alignSelf: "stretch" },
        isDisabled && { opacity: 0.6 },
        pressed && !isDisabled && { opacity: 0.85 },
        typeof style === "function" ? undefined : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.white : colors.text} />
      ) : (
        <Text style={[styles.text, variant === "ghost" && { color: colors.textMuted }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: "transparent" },
});
