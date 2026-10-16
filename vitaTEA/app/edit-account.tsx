import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";
import { atualizarConta, removerConta } from "@/lib/api/auth";
import { extrairErro } from "@/lib/api/client";
import { confirmar } from "@/lib/confirmar";

export default function EditAccountScreen() {
  const router = useRouter();
  const { cuidador, atualizarCuidadorLocal, logout } = useAuth();

  const [nome, setNome] = useState(cuidador?.nome ?? "");
  const [email, setEmail] = useState(cuidador?.email ?? "");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    if (!cuidador) return;
    if (!nome || !email) {
      setErro("Nome e e-mail são obrigatórios.");
      return;
    }
    setErro(null);
    setCarregando(true);
    try {
      const atualizado = await atualizarConta(cuidador.id_cuidador, { nome: nome.trim(), email: email.trim() });
      await atualizarCuidadorLocal(atualizado);
      router.back();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível salvar as alterações."));
    } finally {
      setCarregando(false);
    }
  }

  async function handleExcluir() {
    if (!cuidador) return;
    const ok = await confirmar(
      "Excluir conta",
      "Essa ação é permanente e não pode ser desfeita. Deseja continuar?",
      { confirmarTexto: "Excluir", destrutivo: true },
    );
    if (!ok) return;
    try {
      await removerConta(cuidador.id_cuidador);
      await logout();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível excluir a conta."));
    }
  }

  return (
    <Screen>
      <ModalHeader title="Editar conta" />
      <Subtitle>Atualize seus dados de cuidador (RF03).</Subtitle>

      <ErrorBanner message={erro ?? ""} />

      <View style={{ gap: 14 }}>
        <TextField label="Nome" value={nome} onChangeText={setNome} />
        <TextField label="E-mail" keyboardType="email-address" value={email} onChangeText={setEmail} />
      </View>

      <Button title="Salvar alterações" onPress={handleSalvar} loading={carregando} />

      <Pressable onPress={handleExcluir} style={styles.deleteLink}>
        <Text style={styles.deleteLinkText}>Excluir minha conta</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deleteLink: { alignItems: "center", marginTop: 12 },
  deleteLinkText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
});
