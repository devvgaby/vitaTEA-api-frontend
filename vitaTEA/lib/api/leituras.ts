import { api } from "./client";
import type { Dispositivo, LeituraDispositivo } from "./types";

// A rota autentica pelo par id_dispositivo + codigo do dispositivo vinculado.
export async function enviarLeitura(dispositivo: Dispositivo, id_tipo_sinal: number, valor: number) {
  const { data } = await api.post<{ leitura: LeituraDispositivo }>("/leituras-dispositivos", {
    id_dispositivo: dispositivo.id_dispositivo,
    codigo: dispositivo.codigo,
    id_tipo_sinal,
    valor,
    data_hora: new Date().toISOString(),
  });
  return data.leitura;
}

export async function listarLeiturasPorDispositivo(id_dispositivo: number) {
  const { data } = await api.get<LeituraDispositivo[]>(
    `/leituras-dispositivos/dispositivo/${id_dispositivo}`,
  );
  return data;
}
