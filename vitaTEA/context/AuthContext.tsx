import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TOKEN_KEY, CUIDADOR_KEY, extrairErro } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";
import type { Cuidador } from "@/lib/api/types";

type AuthContextValue = {
  cuidador: Cuidador | null;
  token: string | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  atualizarCuidadorLocal: (cuidador: Cuidador) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [cuidador, setCuidador] = useState<Cuidador | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedCuidador] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(CUIDADOR_KEY),
        ]);
        if (savedToken && savedCuidador) {
          setToken(savedToken);
          setCuidador(JSON.parse(savedCuidador));
        }
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const persistirSessao = useCallback(async (novoToken: string, novoCuidador: Cuidador) => {
    await AsyncStorage.setItem(TOKEN_KEY, novoToken);
    await AsyncStorage.setItem(CUIDADOR_KEY, JSON.stringify(novoCuidador));
    setToken(novoToken);
    setCuidador(novoCuidador);
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      try {
        const resultado = await authApi.login(email, senha);
        await persistirSessao(resultado.token, resultado.cuidador);
      } catch (error) {
        throw new Error(extrairErro(error, "Não foi possível entrar."));
      }
    },
    [persistirSessao],
  );

  const cadastrar = useCallback(
    async (nome: string, email: string, senha: string) => {
      try {
        await authApi.cadastrar(nome, email, senha);
        // Após cadastrar, já efetua login automaticamente.
        await login(email, senha);
      } catch (error) {
        throw new Error(extrairErro(error, "Não foi possível criar a conta."));
      }
    },
    [login],
  );

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, CUIDADOR_KEY]);
    setToken(null);
    setCuidador(null);
  }, []);

  const atualizarCuidadorLocal = useCallback(async (novoCuidador: Cuidador) => {
    await AsyncStorage.setItem(CUIDADOR_KEY, JSON.stringify(novoCuidador));
    setCuidador(novoCuidador);
  }, []);

  return (
    <AuthContext.Provider
      value={{ cuidador, token, carregando, login, cadastrar, logout, atualizarCuidadorLocal }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
