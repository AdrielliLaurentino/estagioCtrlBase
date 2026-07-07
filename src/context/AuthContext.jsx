import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setUser(parsedUser);
      } catch (error) {
        console.error("Sessão local corrompida. Limpando os dados.");
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
      
      if (err.response && err.response.data) {
        if (err.response.data.backendErrors && err.response.data.backendErrors.length > 0) {
          mensagemErro = err.response.data.backendErrors
            .map(e => e.mensagem || e.defaultMessage)
            .join(" | ");
        } 
        else if (err.response.data.message || err.response.data.erro) {
          mensagemErro = err.response.data.message || err.response.data.erro;
        } 
        else if (typeof err.response.data === 'string') {
          mensagemErro = err.response.data;
        }
      }
      
      throw new Error(mensagemErro);
    }
  }, []);

  const handleLoginSuccess = useCallback((dadosFinais) => {
    localStorage.setItem("usuario", JSON.stringify(dadosFinais));
    localStorage.setItem("@CtrlBase:token", dadosFinais.token);
    setUser(dadosFinais);
    
    window.location.href = "/home"; 
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, signIn, handleLoginSuccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);