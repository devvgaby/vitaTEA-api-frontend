import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

import { Screen, Title, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { esqueciSenha } from "@/lib/api/auth";
import { extrairErro } from "@/lib/api/client";

// Recuperação de senha por e-mail:
// 1. o usuário informa o e-mail e o backend envia um link;
// 2. o link abre uma página web do backend, onde a nova senha é cadastrada;
// 3. de volta ao app, o usuário entra com a nova senha.
// O aplicativo nunca recebe nem exibe o token de redefinição.
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function handleSolicitar() {
    if (!email.trim()) return setErro("Informe seu e-mail.");
    setErro(null);
    setCarregando(true);
    try {
      const resultado = await esqueciSenha(email.trim());
      setMensagem(resultado.message);
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível solicitar a redefinição."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Screen>
      <View style={{ marginTop: 24, gap: 4 }}>
        <Title>Recuperar senha</Title>
        <Subtitle>
          {mensagem
            ? "Abra o e-mail que enviamos e toque no link para criar uma nova senha. Depois, volte aqui e entre normalmente."
            : "Informe o e-mail cadastrado para receber o link de redefinição."}
        </Subtitle>
      </View>

      <ErrorBanner message={erro ?? ""} />

      {mensagem ? (
        <>
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>{mensagem}</Text>
          </View>
          <Button title="Enviar novamente" onPress={handleSolicitar} loading={carregando} />
        </>
      ) : (
        <>
          <TextField
            label="E-mail"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Enviar link por e-mail" onPress={handleSolicitar} loading={carregando} />
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