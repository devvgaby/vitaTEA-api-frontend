import { api } from "./client";
import type { LeituraDispositivo } from "./types";

export async function listarLeiturasPorDispositivo(id_dispositivo: number) {
  const { data } = await api.get<LeituraDispositivo[]>(
    `/leituras-dispositivos/dispositivo/${id_dispositivo}`,
  );
  return data;
}
