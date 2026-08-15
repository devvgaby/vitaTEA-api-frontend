import { api } from "./client";
import type { Cuidador } from "./types";

export async function login(email: string, senha: string) {
  const { data } = await api.post<{ token: string; cuidador: Cuidador }>("/auth/login", {
    email,
    senha,
  });
  return data;
}

export async function cadastrar(nome: string, email: string, senha: string) {
  const { data } = await api.post<Cuidador>("/cuidadores", { nome, email, senha });
  return data;
}

export async function esqueciSenha(email: string) {
  const { data } = await api.post<{ message: string }>("/auth/esqueci-senha", { email });
  return data;
}

export async function redefinirSenha(resetToken: string, novaSenha: string) {
  const { data } = await api.post<{ message: string }>("/auth/redefinir-senha", {
    resetToken,
    novaSenha,
  });
  return data;
}

export async function atualizarConta(
  id_cuidador: number,
  dados: Partial<{ nome: string; email: string; senha: string }>,
) {
  const { data } = await api.put<Cuidador>(`/cuidadores/${id_cuidador}`, dados);
  return data;
}

export async function removerConta(id_cuidador: number) {
  await api.delete(`/cuidadores/${id_cuidador}`);
}
