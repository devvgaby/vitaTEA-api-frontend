import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";

import { Screen, Title, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { esqueciSenha, redefinirSenha } from "@/lib/api/auth";
import { extrairErro } from "@/lib/api/client";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  // O e-mail traz um link /forgot-password?token=...; ao abri-lo, o código já vem preenchido.
  const { token: tokenDoLink } = useLocalSearchParams<{ token?: string }>();

  const [etapa, setEtapa] = useState<"solicitar" | "redefinir">(tokenDoLink ? "redefinir" : "solicitar");
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState(tokenDoLink ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function handleSolicitar() {
    if (!email) return setErro("Informe seu e-mail.");
    setErro(null);
    setCarregando(true);
    try {
      const resultado = await esqueciSenha(email.trim());
      setMensagem(resultado.message);
      // Só em desenvolvimento (sem SMTP configurado) a API devolve o código na resposta.
      if (resultado.resetToken) setResetToken(resultado.resetToken);
      setEtapa("redefinir");
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível solicitar a redefinição."));
    } finally {
      setCarregando(false);
    }
  }

  async function handleRedefinir() {
    if (!resetToken || !novaSenha) return setErro("Preencha o código e a nova senha.");
    setErro(null);
    setCarregando(true);
    try {
      await redefinirSenha(resetToken.trim(), novaSenha);
      router.replace("/login");
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível redefinir a senha."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 24, gap: 4 }}>
        <Title>Recuperar senha</Title>
        <Subtitle>
          {etapa === "solicitar"
            ? "Informe o e-mail cadastrado para receber o link de redefinição."
            : "Informe o código recebido por e-mail (ou abra o link) e a nova senha."}
        </Subtitle>
      </View>

      <ErrorBanner message={erro ?? ""} />
      {mensagem && etapa === "redefinir" ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{mensagem}</Text>
        </View>
      ) : null}

      {etapa === "solicitar" ? (
        <>
          <TextField
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Enviar link por e-mail" onPress={handleSolicitar} loading={carregando} />
        </>
      ) : (
        <>
          <TextField
            label="Código de redefinição"
            placeholder="Cole aqui o código recebido"
            value={resetToken}
            onChangeText={setResetToken}
          />
          <TextField
            label="Nova senha"
            placeholder="Mínimo 6 caracteres"
            isPassword
            value={novaSenha}
            onChangeText={setNovaSenha}
          />
          <Button title="Redefinir senha" onPress={handleRedefinir} loading={carregando} />
        </>
      )}

      <Link href="/login" asChild>
        <Text style={styles.link}>Voltar para o login</Text>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.primary, fontWeight: "600", fontSize: 14, textAlign: "center", marginTop: 8 },
  infoBanner: {
    backgroundColor: colors.successMuted,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  infoBannerText: { color: colors.success, fontSize: 13 },
});
