import { api } from "./client";
import type { Alerta } from "./types";

export async function listarAlertasPorMonitorado(id_monitorado: number) {
  const { data } = await api.get<Alerta[]>(`/alertas/monitorado/${id_monitorado}`);
  return data;
}

export async function marcarAlertaVisualizado(id_alerta: number) {
  const { data } = await api.patch<Alerta>(`/alertas/${id_alerta}/visualizar`);
  return data;
}
