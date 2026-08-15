import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const TOKEN_KEY = "vitatea:token";
export const CUIDADOR_KEY = "vitatea:cuidador";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Extrai uma mensagem de erro legível de uma resposta de erro do axios,
// já que o backend padroniza erros como { error: "mensagem" }.
export function extrairErro(error: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.error;
    if (typeof msg === "string") return msg;
    if (error.code === "ECONNABORTED") return "A requisição demorou demais. Verifique sua conexão.";
    if (!error.response) return "Não foi possível conectar ao servidor. Verifique o endereço da API e sua rede.";
  }
  return fallback;
}
