import { api } from "./client";
import type { TipoSinal, LimiteSinal } from "./types";

export async function listarTiposSinais() {
  const { data } = await api.get<TipoSinal[]>("/tipos-sinais");
  return data;
}

export async function criarLimiteSinal(
  id_monitorado: number,
  id_tipo_sinal: number,
  valor_min: number,
  valor_max: number,
) {
  const { data } = await api.post<LimiteSinal>("/limites-sinais", {
    id_monitorado,
    id_tipo_sinal,
    valor_min,
    valor_max,
  });
  return data;
}

export async function atualizarLimiteSinal(
  id_limite_sinal: number,
  dados: Partial<{ valor_min: number; valor_max: number }>,
) {
  const { data } = await api.put<LimiteSinal>(`/limites-sinais/${id_limite_sinal}`, dados);
  return data;
}

export async function listarLimitesSinais() {
  const { data } = await api.get<LimiteSinal[]>("/limites-sinais");
  return data;
}
