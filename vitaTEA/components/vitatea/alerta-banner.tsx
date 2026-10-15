import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, criticidade } from "@/constants/vitatea-theme";
import { useNotificacao } from "@/context/NotificacaoContext";

// Faixa de emergência no topo do app (RN08/RF17). Toque para abrir os alertas.
export function AlertaBanner() {
  const { aviso, dispensar } = useNotificacao();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!aviso) return null;

  const cor = criticidade[aviso.nivel];

  return (
    <View pointerEvents="box-none" style={[styles.area, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => {
          dispensar();
          router.push("/alerts");
        }}
        style={[styles.faixa, { borderColor: cor.color }]}
      >
        <Ionicons name="warning" size={24} color={cor.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.titulo, { color: cor.color }]}>{aviso.titulo}</Text>
          <Text style={styles.mensagem} numberOfLines={3}>
            {aviso.mensagem}
          </Text>
        </View>
        <Pressable onPress={dispensar} hitSlop={12}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, zIndex: 1000 },
  faixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    padding: 14,
  },
  titulo: { fontSize: 14, fontWeight: "800" },
  mensagem: { color: colors.text, fontSize: 13, marginTop: 2 },
});
