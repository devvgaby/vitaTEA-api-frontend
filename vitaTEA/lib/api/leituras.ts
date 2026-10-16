import { api } from "./client";
import type { Alerta, Dispositivo, LeituraDispositivo } from "./types";

export async function enviarLeitura(dispositivo: Dispositivo, id_tipo_sinal: number, valor: number) {
  const { data } = await api.post<{ leitura: LeituraDispositivo; alerta: Alerta | null }>(
    "/leituras-dispositivos",
    {
      id_dispositivo: dispositivo.id_dispositivo,
      codigo: dispositivo.codigo,
      id_tipo_sinal,
      valor,
      data_hora: new Date().toISOString(),
    },
  );
  return data;
}

export async function listarLeiturasPorDispositivo(
  id_dispositivo: number,
  opcoes: { limite?: number; desde?: string } = {},
) {
  const { data } = await api.get<LeituraDispositivo[]>(
    `/leituras-dispositivos/dispositivo/${id_dispositivo}`,
    { params: opcoes },
  );
  return data;
}
