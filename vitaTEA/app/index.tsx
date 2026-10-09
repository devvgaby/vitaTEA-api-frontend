import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";

export default function WelcomeScreen() {
  const router = useRouter();
  const { cuidador } = useAuth();

  // Quem já está logado e recarrega a página cai aqui ("/"): vai direto para o painel.
  if (cuidador) return <Redirect href="/(app)" />;

  return (
    <View style={styles.container}>
      {/* Conteúdo principal */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logo}>
          <Ionicons
            name="pulse"
            size={54}
            color="#FFFFFF"
          />
        </View>

        {/* Nome */}
        <View style={styles.brandContainer}>
          <Text style={styles.brand}>
            Vita<Text style={styles.brandHighlight}>TEA</Text>
          </Text>

          <Text style={styles.description}>
            Monitoramento de sinais vitais para crianças e adolescentes com TEA.
          </Text>
        </View>

        {/* Características */}
        <View style={styles.chipsContainer}>
          <View style={[styles.chip, styles.iotChip]}>
            <Ionicons
              name="radio-outline"
              size={15}
              color={colors.primary}
            />

            <Text style={[styles.chipText, { color: colors.primary }]}>
              IoT em tempo real
            </Text>
          </View>

          <View style={[styles.chip, styles.alertChip]}>
            <Ionicons
              name="notifications-outline"
              size={15}
              color="#7C3AED"
            />

            <Text style={[styles.chipText, { color: "#7C3AED" }]}>
              Alertas imediatos
            </Text>
          </View>
        </View>
      </View>

      {/* Botões */}
      <View style={styles.actions}>
        <Pressable
          style={styles.startButton}
          onPress={() => router.push("/signup")}
        >
          <Text style={styles.startButtonText}>
            Começar agora
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/login")}
          style={styles.loginButton}
        >
          <Text style={styles.loginText}>
            Já tem conta?{" "}
            <Text style={styles.loginHighlight}>
              Entrar
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#4F46E5",

    marginBottom: 24,
  },

  brandContainer: {
    alignItems: "center",
    gap: 12,
  },

  brand: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
  },

  brandHighlight: {
    color: "#7C3AED",
  },

  description: {
    color: "#B8B8C8",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 280,
  },

  chipsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 24,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,

    paddingHorizontal: 12,
    paddingVertical: 9,

    borderRadius: 999,
  },

  iotChip: {
    backgroundColor: "rgba(6, 182, 212, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.25)",
  },

  alertChip: {
    backgroundColor: "rgba(124, 58, 237, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.25)",
  },

  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },

  actions: {
    gap: 20,
  },

  startButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: colors.primary,
  },

  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  loginButton: {
    alignItems: "center",
  },

  loginText: {
    color: "#8A8AA0",
    fontSize: 14,
  },

  loginHighlight: {
    color: "#7C3AED",
    fontWeight: "500",
  },
});