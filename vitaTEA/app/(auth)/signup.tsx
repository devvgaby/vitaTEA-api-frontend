import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Link, useRouter } from "expo-router";

import { Screen, Title, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";

export default function SignupScreen() {
  const { cadastrar } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleCadastrar() {
    if (!nome || !email || !senha) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setErro(null);
    setCarregando(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);
      router.replace("/");
    } catch (error: any) {
      setErro(error.message ?? "Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <View style={{ marginTop: 24, gap: 4 }}>
          <Title>Criar conta</Title>
          <Subtitle>Cadastre-se como cuidador para começar a monitorar</Subtitle>
        </View>

        <ErrorBanner message={erro ?? ""} />

        <View style={{ gap: 14 }}>
          <TextField label="Nome completo" placeholder="Seu nome" value={nome} onChangeText={setNome} />
          <TextField
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField label="Senha" placeholder="Mínimo 6 caracteres" isPassword value={senha} onChangeText={setSenha} />
          <TextField
            label="Confirmar senha"
            placeholder="Repita a senha"
            isPassword
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
          />
        </View>

        <Button title="Criar conta" onPress={handleCadastrar} loading={carregando} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta?</Text>
          <Link href="/login" asChild>
            <Text style={styles.link}> Entrar</Text>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  footerText: { color: colors.textMuted, fontSize: 14 },
});
