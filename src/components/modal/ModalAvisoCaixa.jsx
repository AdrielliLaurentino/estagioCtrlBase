import React from 'react';
import { X, AlertTriangle, LogOut } from 'lucide-react';

export default function ModalAvisoCaixa({ isOpen, onClose, onConfirmExit, onGoToCloseCashRegister }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      
      <div 
        className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
      ></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center transform transition-all animate-in zoom-in-95 duration-200 z-10">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6 animate-shake-soft"> 
           <AlertTriangle className="text-yellow-500 w-10 h-10" />
        </div>

        <h3 className="text-2xl font-bold text-gray-700 mb-2">
          Atenção antes de Sair!
        </h3>
        
        <p className="text-gray-500 text-base leading-relaxed mb-6">
          Lembre-se de **fechar o caixa** para garantir o registro correto das suas transações.
        </p>

        <button 
          onClick={onGoToCloseCashRegister} 
          className="w-full bg-[#FF6A00] hover:bg-[#e65c00] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 mb-3"
        >
          Ir para Fechar Caixa
        </button>

        <button
            onClick={onConfirmExit} 
            className="flex items-center justify-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
            <LogOut size={16} className="mr-1" />
            Sair mesmo assim
        </button>
      </div>

      <style>{`
        /* Definindo a animação */
        @keyframes shake-soft {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-3px); }
          40%, 80% { transform: translateX(3px); }
        }

        /* Aplicando a animação */
        .animate-shake-soft {
          animation: shake-soft 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}