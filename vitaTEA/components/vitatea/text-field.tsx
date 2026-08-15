import React, { useState } from "react";
import { View, Text, TextInput, TextInputProps, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/constants/vitatea-theme";

type Props = TextInputProps & {
  label: string;
  error?: string;
  isPassword?: boolean;
};

export function TextField({ label, error, isPassword, style, ...rest }: Props) {
  const [oculto, setOculto] = useState(isPassword);

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && { borderColor: colors.danger }]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={oculto}
          autoCapitalize="none"
          {...rest}
        />
        {isPassword && (
          <Pressable onPress={() => setOculto((v) => !v)} hitSlop={10}>
            <Ionicons name={oculto ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 13,
    fontSize: 15,
  },
  error: { color: colors.danger, fontSize: 12 },
});
