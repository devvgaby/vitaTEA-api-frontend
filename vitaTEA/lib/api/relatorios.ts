import { api } from "./client";
import type { PeriodoRelatorio, Relatorio } from "./types";

export async function buscarRelatorio(id_monitorado: number, periodo: PeriodoRelatorio) {
  const { data } = await api.get<Relatorio>(`/relatorios/monitorado/${id_monitorado}`, {
    params: { periodo },
  });
  return data;
}

export async function buscarCsv(id_monitorado: number, periodo: PeriodoRelatorio) {
  const { data } = await api.get<string>(`/relatorios/monitorado/${id_monitorado}/csv`, {
    params: { periodo },
    responseType: "text",
    transformResponse: (corpo) => corpo,
  });
  return data;
}
