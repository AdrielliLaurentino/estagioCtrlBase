import React, { useEffect, useState } from "react";
import { CalendarX } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ModalConflitoHorario({
  isOpen,
  onClose,
  onAjustar,
  nomeProfissional = "selecionado"
}) {
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

  const handleAjustar = () => {
    setFechando(true);
    setTimeout(() => {
      setVisivel(false);
      if (onAjustar) onAjustar();
      else onClose();
    }, 300);
  };

  const bgModal = isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white";
  const textPrimary = isDarkMode ? "text-white" : "text-gray-900";
  const textSecondary = isDarkMode ? "text-gray-300" : "text-gray-600";

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 transition-opacity duration-300 ${visivel && !fechando ? "opacity-100" : "opacity-0"}`}
      onMouseDown={fecharModal}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[420px] ${bgModal} rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${visivel && !fechando ? "scale-100 translate-y-0" : "scale-98 translate-y-4"}`}
      >
        <div className="p-8 flex flex-col items-center text-center">
          
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
            <CalendarX className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          <h2 className={`text-xl font-semibold tracking-tight ${textPrimary} mb-3`}>
            Conflito de Horário
          </h2>
          <p className={`text-sm leading-relaxed ${textSecondary} mb-8`}>
            Não foi possível salvar. O profissional <strong>{nomeProfissional}</strong> já possui um agendamento ou tarefa pendente no período selecionado. Por favor, escolha outro horário.
          </p>

          {/* Botões */}
          <div className="flex w-full items-center justify-center gap-3 mt-2">
            
            <button
              type="button"
              onClick={fecharModal}
              className="flex-1 py-3 px-4 bg-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-semibold text-sm rounded-lg transition-all duration-200"
            >
              Entendido
            </button>

            <button
              type="button"
              onClick={handleAjustar}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-[0.98]"
            >
              Ajustar Horário
            </button>
            
          </div>
        </div>
      </div>
    </div>
  );
}