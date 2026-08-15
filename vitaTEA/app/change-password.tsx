import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { useAuth } from "@/context/AuthContext";
import { atualizarConta } from "@/lib/api/auth";
import { extrairErro } from "@/lib/api/client";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { cuidador } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    if (!cuidador) return;
    if (!senhaAtual || !novaSenha) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setErro(null);
    setCarregando(true);
    try {
      // A API não expõe verificação de senha atual separada da edição de
      // conta; o backend valida a sessão via token e apenas troca o hash.
      await atualizarConta(cuidador.id_cuidador, { senha: novaSenha });
      router.back();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível alterar a senha."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Screen>
      <ModalHeader title="Alterar senha" />
      <Subtitle>Defina uma nova senha para sua conta.</Subtitle>

      <ErrorBanner message={erro ?? ""} />

      <View style={{ gap: 14 }}>
        <TextField label="Senha atual" isPassword value={senhaAtual} onChangeText={setSenhaAtual} />
        <TextField label="Nova senha" isPassword value={novaSenha} onChangeText={setNovaSenha} />
        <TextField label="Confirmar nova senha" isPassword value={confirmarSenha} onChangeText={setConfirmarSenha} />
      </View>

      <Button title="Salvar nova senha" onPress={handleSalvar} loading={carregando} />
    </Screen>
  );
}
