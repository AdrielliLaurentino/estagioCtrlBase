import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertTriangle, LogOut, MousePointerClick } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TEMPO_INATIVIDADE_MS = 5 * 60 * 1000;
const TEMPO_CONTAGEM_SEGUNDOS = 15;

export default function SessionGuard({ children }) {
  const { user, logout } = useAuth(); 
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(TEMPO_CONTAGEM_SEGUNDOS);
  
  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const resetarInatividade = useCallback(() => {
    if (!user || isIdle) return;
    
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      setCountdown(TEMPO_CONTAGEM_SEGUNDOS);
    }, TEMPO_INATIVIDADE_MS);
  }, [user, isIdle]);

  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setIsIdle(false);
      return;
    }

    const eventos = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    eventos.forEach((evento) => window.addEventListener(evento, resetarInatividade));
    
    resetarInatividade();
    
    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, resetarInatividade));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetarInatividade]);

  useEffect(() => {
    if (isIdle) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            logout();
            setIsIdle(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isIdle, logout]);

  const continuarSessao = () => {
    setIsIdle(false);
    resetarInatividade();
  };

  const handleLogoutForce = () => {
    logout();
    setIsIdle(false);
  };

  return (
    <>
      {children}
      {isIdle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50/90 backdrop-blur-sm font-sans transition-opacity">
          <div className="bg-white p-10 rounded-sm shadow-2xl max-w-sm w-full mx-4 border border-gray-100 flex flex-col items-center text-center">
            
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-6">
              <AlertTriangle size={24} className="text-red-500 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-light text-gray-900 mb-2 tracking-tight">
              Sessão Expirando
            </h2>
            <p className="text-sm text-gray-500 font-light mb-6 leading-relaxed">
              Detectamos inatividade. Por segurança, sua sessão será encerrada em breve.
            </p>
            
            <div className="text-5xl font-light text-gray-900 mb-8 tracking-tighter">
              {countdown}<span className="text-lg font-medium text-gray-400 ml-1">s</span>
            </div>
            
            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={continuarSessao} 
                className="w-full py-3 rounded-sm text-sm font-light bg-black text-white hover:bg-gray-900 transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-black outline-none flex justify-center items-center gap-2"
              >
                <MousePointerClick size={16} strokeWidth={1.5} /> Continuar Logado
              </button>
              <button 
                onClick={handleLogoutForce} 
                className="w-full py-3 rounded-sm text-sm font-light text-red-600 bg-red-50 hover:bg-red-100 transition-colors outline-none flex justify-center items-center gap-2"
              >
                <LogOut size={16} strokeWidth={1.5} /> Sair Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}