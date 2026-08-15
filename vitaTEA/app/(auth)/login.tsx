import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Title, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      await login(email.trim(), senha);
      router.replace("/");
    } catch (error: any) {
      setErro(error.message ?? "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="pulse" size={30} color={colors.primary} />
          </View>
          <Title>VitaTEA</Title>
          <Subtitle>Cuidado remoto e monitoramento de sinais vitais</Subtitle>
        </View>

        <ErrorBanner message={erro ?? ""} />

        <View style={{ gap: 14 }}>
          <TextField
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Senha"
            placeholder="Sua senha"
            isPassword
            value={senha}
            onChangeText={setSenha}
          />
        </View>

        <Link href="/forgot-password" asChild>
          <Text style={styles.link}>Esqueceu a senha?</Text>
        </Link>

        <Button title="Entrar" onPress={handleLogin} loading={carregando} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ainda não tem conta?</Text>
          <Link href="/signup" asChild>
            <Text style={styles.link}> Cadastre-se</Text>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center", gap: 8, marginTop: 40, marginBottom: 8 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  link: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  footerText: { color: colors.textMuted, fontSize: 14 },
});
