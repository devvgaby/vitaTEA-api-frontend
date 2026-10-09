import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/vitatea-theme";

export function ModalHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {/* Se a página foi recarregada no modal, não há histórico para voltar. */}
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)"))} hitSlop={12}>
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: "700" },
});
