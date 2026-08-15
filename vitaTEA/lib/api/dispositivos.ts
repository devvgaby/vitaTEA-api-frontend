import { api } from "./client";
import type { Dispositivo, DispositivoStatus } from "./types";

export async function vincularDispositivo(codigo: string, id_monitorado: number) {
  const { data } = await api.post<Dispositivo>("/dispositivos", { codigo, id_monitorado });
  return data;
}

export async function buscarDispositivoPorMonitorado(id_dispositivo: number, id_monitorado: number) {
  const { data } = await api.get<Dispositivo>(`/dispositivos/${id_dispositivo}/${id_monitorado}`);
  return data;
}

export async function listarDispositivos() {
  const { data } = await api.get<Dispositivo[]>("/dispositivos");
  return data;
}

export async function statusDispositivo(id_dispositivo: number) {
  const { data } = await api.get<DispositivoStatus>(`/dispositivos/${id_dispositivo}/status`);
  return data;
}

export async function desvincularDispositivo(id_dispositivo: number) {
  await api.delete(`/dispositivos/${id_dispositivo}`);
}
