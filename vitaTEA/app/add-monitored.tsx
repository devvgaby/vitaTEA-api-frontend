import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { Screen, Subtitle, ErrorBanner } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors, radius } from "@/constants/vitatea-theme";
import { useAuth } from "@/context/AuthContext";
import { useMonitorado } from "@/context/MonitoradoContext";
import { criarMonitorado, vincularCuidadorMonitorado, criarContatoEmergencia } from "@/lib/api/monitorados";
import { extrairErro } from "@/lib/api/client";

export default function AddMonitoredScreen() {
  const router = useRouter();
  const { cuidador } = useAuth();
  const { recarregar, selecionarMonitorado } = useMonitorado();

  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [nivelTea, setNivelTea] = useState<"2" | "3">("2");

  const [contatoNome, setContatoNome] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");
  const [contatoParentesco, setContatoParentesco] = useState("");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    if (!nome || !idade) {
      setErro("Preencha nome e idade do monitorado.");
      return;
    }
    if (!cuidador) return;

    setErro(null);
    setCarregando(true);
    try {
      const monitorado = await criarMonitorado(nome.trim(), Number(idade), nivelTea);
      await vincularCuidadorMonitorado(cuidador.id_cuidador, monitorado.id_monitorado);

      if (contatoNome && contatoTelefone) {
        await criarContatoEmergencia(
          monitorado.id_monitorado,
          contatoNome.trim(),
          contatoTelefone.trim(),
          contatoParentesco.trim() || "Não informado",
        );
      }

      await recarregar();
      await selecionarMonitorado(monitorado);
      router.back();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível cadastrar o monitorado."));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Screen>
      <ModalHeader title="Cadastrar monitorado" />
      <Subtitle>Dados da criança ou adolescente que será monitorado.</Subtitle>

      <ErrorBanner message={erro ?? ""} />

      <View style={{ gap: 14 }}>
        <TextField label="Nome" placeholder="Nome do monitorado" value={nome} onChangeText={setNome} />
        <TextField
          label="Idade"
          placeholder="Ex: 10"
          keyboardType="number-pad"
          value={idade}
          onChangeText={setIdade}
        />

        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Nível de suporte TEA</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <NivelOption label="Nível 2" ativo={nivelTea === "2"} onPress={() => setNivelTea("2")} />
            <NivelOption label="Nível 3" ativo={nivelTea === "3"} onPress={() => setNivelTea("3")} />
          </View>
        </View>
      </View>

      <View style={{ gap: 4, marginTop: 8 }}>
        <Text style={styles.sectionTitle}>Contato de emergência (opcional)</Text>
        <Subtitle>Pode ser adicionado depois, se preferir.</Subtitle>
      </View>

      <View style={{ gap: 14 }}>
        <TextField label="Nome do contato" placeholder="Nome" value={contatoNome} onChangeText={setContatoNome} />
        <TextField
          label="Telefone"
          placeholder="(00) 00000-0000"
          keyboardType="phone-pad"
          value={contatoTelefone}
          onChangeText={setContatoTelefone}
        />
        <TextField
          label="Parentesco"
          placeholder="Ex: Mãe, Pai, Avó..."
          value={contatoParentesco}
          onChangeText={setContatoParentesco}
        />
      </View>

      <Button title="Salvar monitorado" onPress={handleSalvar} loading={carregando} />
    </Screen>
  );
}

function NivelOption({ label, ativo, onPress }: { label: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.nivelOption, ativo && { borderColor: colors.primary, backgroundColor: colors.primaryMuted }]}
    >
      <Text style={[styles.nivelOptionText, ativo && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  nivelOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    alignItems: "center",
  },
  nivelOptionText: { color: colors.textMuted, fontWeight: "600" },
});
