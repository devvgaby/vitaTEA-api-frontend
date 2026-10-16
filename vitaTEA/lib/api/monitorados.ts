import { api } from "./client";
import type { Monitorado, ContatoEmergencia } from "./types";

export async function criarMonitorado(nome: string, idade: number, nivel_tea: "2" | "3") {
  const { data } = await api.post<Monitorado>("/monitorados", { nome, idade, nivel_tea });
  return data;
}

export async function buscarMonitorado(id_monitorado: number) {
  const { data } = await api.get<Monitorado>(`/monitorados/${id_monitorado}`);
  return data;
}

export async function atualizarMonitorado(
  id_monitorado: number,
  dados: Partial<{ nome: string; idade: number; nivel_tea: "2" | "3" }>,
) {
  const { data } = await api.put<Monitorado>(`/monitorados/${id_monitorado}`, dados);
  return data;
}

export async function excluirMonitorado(id_monitorado: number) {
  await api.delete(`/monitorados/${id_monitorado}`);
}

// Vínculo N:N entre cuidador e monitorado (RN02/RF05).
export async function vincularCuidadorMonitorado(id_cuidador: number, id_monitorado: number) {
  const { data } = await api.post("/cuidadores-monitorados", { id_cuidador, id_monitorado });
  return data;
}

export async function listarVinculos() {
  const { data } = await api.get<{ id_cuidador: number; id_monitorado: number }[]>(
    "/cuidadores-monitorados",
  );
  return data;
}

// Contatos de emergência (RN02/RF05).
export async function criarContatoEmergencia(
  id_monitorado: number,
  nome: string,
  telefone: string,
  parentesco: string,
) {
  const { data } = await api.post<ContatoEmergencia>("/contatos-emergencia", {
    id_monitorado,
    nome,
    telefone,
    parentesco,
  });
  return data;
}

export async function listarContatosEmergencia(id_monitorado?: number) {
  const { data } = await api.get<ContatoEmergencia[]>("/contatos-emergencia", {
    params: id_monitorado ? { id_monitorado } : undefined,
  });
  return data;
}

export async function atualizarContatoEmergencia(
  id_contato_emergencia: number,
  dados: Partial<{ nome: string; telefone: string; parentesco: string }>,
) {
  const { data } = await api.put<ContatoEmergencia>(`/contatos-emergencia/${id_contato_emergencia}`, dados);
  return data;
}

export async function excluirContatoEmergencia(id_contato_emergencia: number) {
  await api.delete(`/contatos-emergencia/${id_contato_emergencia}`);
}
