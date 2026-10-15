import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen, Card, Subtitle, ErrorBanner, EmptyState } from "@/components/vitatea/ui";
import { ModalHeader } from "@/components/vitatea/modal-header";
import { TextField } from "@/components/vitatea/text-field";
import { Button } from "@/components/vitatea/button";
import { colors, radius } from "@/constants/vitatea-theme";
import { useMonitorado } from "@/context/MonitoradoContext";
import {
  atualizarMonitorado,
  excluirMonitorado,
  listarContatosEmergencia,
  criarContatoEmergencia,
  atualizarContatoEmergencia,
  excluirContatoEmergencia,
} from "@/lib/api/monitorados";
import { desvincularDispositivo } from "@/lib/api/dispositivos";
import { extrairErro } from "@/lib/api/client";
import { confirmar } from "@/lib/confirmar";
import type { ContatoEmergencia } from "@/lib/api/types";

// RF06 (editar monitorado), RF07 (excluir monitorado) e gestão dos contatos de emergência (RN02).
export default function EditMonitoredScreen() {
  const router = useRouter();
  const { monitoradoAtivo, dispositivo, recarregar } = useMonitorado();

  const [nome, setNome] = useState(monitoradoAtivo?.nome ?? "");
  const [idade, setIdade] = useState(monitoradoAtivo ? String(monitoradoAtivo.idade) : "");
  const [nivelTea, setNivelTea] = useState<"2" | "3">(monitoradoAtivo?.nivel_tea ?? "2");

  const [contatos, setContatos] = useState<ContatoEmergencia[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null); // null = formulário de novo contato
  const [contatoNome, setContatoNome] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");
  const [contatoParentesco, setContatoParentesco] = useState("");
  const [mostrarFormContato, setMostrarFormContato] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregarContatos = useCallback(async () => {
    if (!monitoradoAtivo) return;
    try {
      setContatos(await listarContatosEmergencia(monitoradoAtivo.id_monitorado));
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível carregar os contatos de emergência."));
    }
  }, [monitoradoAtivo]);

  useEffect(() => {
    carregarContatos();
  }, [carregarContatos]);

  if (!monitoradoAtivo) {
    return (
      <Screen>
        <ModalHeader title="Editar monitorado" />
        <EmptyState title="Nenhum monitorado cadastrado" subtitle="Cadastre um monitorado primeiro." />
      </Screen>
    );
  }

  async function handleSalvarDados() {
    if (!monitoradoAtivo) return;
    if (!nome.trim() || !idade) {
      setErro("Preencha nome e idade do monitorado.");
      return;
    }
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      await atualizarMonitorado(monitoradoAtivo.id_monitorado, {
        nome: nome.trim(),
        idade: Number(idade),
        nivel_tea: nivelTea,
      });
      await recarregar();
      setSucesso("Dados do monitorado atualizados.");
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível salvar as alterações."));
    } finally {
      setSalvando(false);
    }
  }

  function abrirNovoContato() {
    setEditandoId(null);
    setContatoNome("");
    setContatoTelefone("");
    setContatoParentesco("");
    setMostrarFormContato(true);
  }

  function abrirEdicaoContato(contato: ContatoEmergencia) {
    setEditandoId(contato.id_contato_emergencia);
    setContatoNome(contato.nome);
    setContatoTelefone(contato.telefone);
    setContatoParentesco(contato.parentesco);
    setMostrarFormContato(true);
  }

  async function handleSalvarContato() {
    if (!monitoradoAtivo) return;
    if (!contatoNome.trim() || !contatoTelefone.trim()) {
      setErro("Informe o nome e o telefone do contato.");
      return;
    }
    setErro(null);
    setSucesso(null);
    setSalvando(true);
    try {
      const parentesco = contatoParentesco.trim() || "Não informado";
      if (editandoId) {
        await atualizarContatoEmergencia(editandoId, {
          nome: contatoNome.trim(),
          telefone: contatoTelefone.trim(),
          parentesco,
        });
      } else {
        await criarContatoEmergencia(
          monitoradoAtivo.id_monitorado,
          contatoNome.trim(),
          contatoTelefone.trim(),
          parentesco,
        );
      }
      setMostrarFormContato(false);
      await carregarContatos();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível salvar o contato."));
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluirContato(contato: ContatoEmergencia) {
    const ok = await confirmar("Excluir contato", `Remover ${contato.nome} dos contatos de emergência?`, {
      confirmarTexto: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    try {
      await excluirContatoEmergencia(contato.id_contato_emergencia);
      await carregarContatos();
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível excluir o contato."));
    }
  }

  async function handleDesvincular() {
    if (!dispositivo) return;
    const ok = await confirmar(
      "Desvincular dispositivo",
      `O dispositivo ${dispositivo.codigo} deixará de enviar dados para ${monitoradoAtivo?.nome}. O histórico é mantido. Deseja continuar?`,
      { confirmarTexto: "Desvincular", destrutivo: true },
    );
    if (!ok) return;
    try {
      await desvincularDispositivo(dispositivo.id_dispositivo);
      await recarregar();
      setSucesso("Dispositivo desvinculado.");
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível desvincular o dispositivo."));
    }
  }

  async function handleExcluirMonitorado() {
    if (!monitoradoAtivo) return;
    const ok = await confirmar(
      "Excluir monitorado",
      `Isso remove ${monitoradoAtivo.nome}, os contatos de emergência, os limites e o vínculo com o dispositivo. Essa ação não pode ser desfeita. Deseja continuar?`,
      { confirmarTexto: "Excluir", destrutivo: true },
    );
    if (!ok) return;
    try {
      await excluirMonitorado(monitoradoAtivo.id_monitorado);
      await recarregar();
      router.replace("/(app)");
    } catch (error) {
      setErro(extrairErro(error, "Não foi possível excluir o monitorado."));
    }
  }

  return (
    <Screen>
      <ModalHeader title="Editar monitorado" />
      <Subtitle>Altere os dados, os contatos de emergência ou remova o monitorado.</Subtitle>

      <ErrorBanner message={erro ?? ""} />
      {sucesso ? (
        <View style={styles.sucesso}>
          <Text style={styles.sucessoTexto}>{sucesso}</Text>
        </View>
      ) : null}

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
        <Button title="Salvar alterações" onPress={handleSalvarDados} loading={salvando && !mostrarFormContato} />
      </View>

      <View style={{ gap: 10, marginTop: 8 }}>
        <Text style={styles.sectionTitle}>Contatos de emergência</Text>

        {contatos.length === 0 && !mostrarFormContato ? (
          <Subtitle>Nenhum contato cadastrado.</Subtitle>
        ) : null}

        {contatos.map((contato) => (
          <Card key={contato.id_contato_emergencia} style={styles.contato}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contatoNome}>{contato.nome}</Text>
              <Text style={styles.contatoInfo}>
                {contato.parentesco} - {contato.telefone}
              </Text>
            </View>
            <Pressable onPress={() => abrirEdicaoContato(contato)} hitSlop={10}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => handleExcluirContato(contato)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </Card>
        ))}

        {mostrarFormContato ? (
          <Card style={{ gap: 12 }}>
            <Text style={styles.contatoNome}>{editandoId ? "Editar contato" : "Novo contato"}</Text>
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
            <Button title="Salvar contato" onPress={handleSalvarContato} loading={salvando} />
            <Button title="Cancelar" variant="ghost" onPress={() => setMostrarFormContato(false)} />
          </Card>
        ) : (
          <Button title="Adicionar contato" variant="secondary" onPress={abrirNovoContato} />
        )}
      </View>

      {dispositivo ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={styles.sectionTitle}>Dispositivo</Text>
          <Subtitle>Vinculado: {dispositivo.codigo}</Subtitle>
          <Button title="Desvincular dispositivo" variant="secondary" onPress={handleDesvincular} />
        </View>
      ) : null}

      <View style={{ gap: 10, marginTop: 8 }}>
        <Text style={[styles.sectionTitle, { color: colors.danger }]}>Zona de perigo</Text>
        <Button title="Excluir monitorado" variant="danger" onPress={handleExcluirMonitorado} />
      </View>
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
  contato: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  contatoNome: { color: colors.text, fontSize: 14, fontWeight: "600" },
  contatoInfo: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  sucesso: {
    backgroundColor: colors.successMuted,
    borderRadius: radius.input,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.success,
  },
  sucessoTexto: { color: colors.success, fontSize: 13 },
});
