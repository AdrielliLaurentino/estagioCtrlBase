import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const extrairPrimeiroNome = (nomeCompleto) => {
    if (!nomeCompleto) return "";
    return nomeCompleto.trim().split(" ")[0];
  };

  const logout = useCallback(() => {
    localStorage.removeItem("usuario");
    localStorage.removeItem("@CtrlBase:token");
    setUser(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("usuario");
    const storedToken = localStorage.getItem("@CtrlBase:token");

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.primeiroNome = extrairPrimeiroNome(parsedUser.nome || parsedUser.nomeCompleto);
        setUser(parsedUser);
      } catch (error) {
        logout();
      }
    }
    
    setLoading(false);

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const signIn = useCallback(async (login, senha) => {
    try {
      const response = await api.post('/auth/login', { login, senha });
      const dadosUsuario = response.data;
  
      if (!dadosUsuario.token) {
        throw new Error("Falha na autenticação: Token de acesso ausente.");
      }
  
      return dadosUsuario; 
    } catch (err) {
      let mensagemErro = err.message || "Erro desconhecido ao tentar fazer login.";
      
      if (err.response?.data) {
        const { data } = err.response;
        if (data.backendErrors?.length > 0) {
          mensagemErro = data.backendErrors.map(e => e.mensagem || e.defaultMessage).join(" | ");
        } else if (data.message || data.erro) {
          mensagemErro = data.message || data.erro;
        } else if (typeof data === 'string') {
          mensagemErro = data;
        }
      }
      
      throw new Error(mensagemErro);
    }
  }, []);

  const handleLoginSuccess = useCallback((dadosFinais) => {
    const usuarioEnriquecido = {
      ...dadosFinais,
      primeiroNome: extrairPrimeiroNome(dadosFinais.nome || dadosFinais.nomeCompleto)
    };

    localStorage.setItem("usuario", JSON.stringify(usuarioEnriquecido));
    localStorage.setItem("@CtrlBase:token", dadosFinais.token);
    setUser(usuarioEnriquecido);
    
    window.location.href = "/home"; 
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, signIn, handleLoginSuccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);