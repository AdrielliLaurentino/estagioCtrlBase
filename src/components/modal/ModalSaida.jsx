import React, { useState, useEffect } from "react";
import { AlertTriangle, X, LogOut } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ModalSairCaixaAberto({ isOpen, onClose, onConfirm }) {
  const { isDarkMode } = useTheme();
  const [visivel, setVisivel] = useState(false);
  const [fechando, setFechando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisivel(true);
      setFechando(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fecharModal = () => {
    setFechando(true);
    setTimeout(() => {
      setVisivel(false);
      onClose();
    }, 300);
  };

  const handleConfirmar = () => {
    if (onConfirm) onConfirm();
    fecharModal();
  };

  const corFundo = isDarkMode ? "bg-[#B22222]" : "bg-[#FF4500]";

  return (
    <div 
      className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 transition-opacity duration-300 ${visivel && !fechando ? "opacity-100" : "opacity-0"}`}
      onMouseDown={fecharModal}
    >
      
      <div 
        onMouseDown={(e) => e.stopPropagation()} 
        className={`relative w-full max-w-[420px] ${corFundo} text-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${visivel && !fechando ? "scale-100 translate-y-0" : "scale-98 translate-y-4"}`}
      >
        <button 
          onClick={fecharModal}
          className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors duration-200"
        >
          <X size={20} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          
          <div className="w-16 h-16 bg-white/20 text-white rounded-full flex items-center justify-center mb-5 shadow-inner relative">
            <AlertTriangle size={32} strokeWidth={2.5} className="animate-pulse" />
          </div>

          <div className="flex flex-col mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Atenção: Caixa Aberto!
            </h2>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
              Você ainda possui um caixa aberto no sistema. Tem certeza que deseja sair do aplicativo sem realizar o fechamento?
            </p> 
          </div>

          {/* Ações */}
          <div className="flex items-center justify-center gap-6 mt-2 w-full">
            
            <button 
              type="button"
              onClick={fecharModal}
              className="px-6 py-3 bg-transparent text-white/80 hover:text-white font-semibold text-base rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-98"
            >
              Permanecer
            </button>

            <button 
              type="button"
              onClick={handleConfirmar}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-base rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-98 flex items-center gap-2"
            >
              <LogOut size={16} />
              Sair Assim Mesmo
            </button>
            
          </div>

        </div>
      </div>
    </div>
  );
}