import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 3000;

// No emulador/celular, "localhost" aponta para o próprio aparelho, não para o PC.
// Em desenvolvimento usamos o mesmo IP do PC que está servindo o Metro (hostUri);
// no emulador Android sem hostUri, 10.0.2.2 é o alias do PC.
function resolverApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === "web") return `http://localhost:${API_PORT}`;

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") return `http://${host}:${API_PORT}`;

  return Platform.OS === "android" ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = resolverApiUrl();

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
