import React, { useEffect } from 'react';
import { X, Construction } from 'lucide-react';

export default function ModalEmBreve({ isOpen, onClose }) {
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      
      <div 
        className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center transform transition-all animate-in zoom-in-95 duration-200 z-10">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
           <Construction className="text-[#FF6A00] w-10 h-10" />
        </div>

        <h3 className="text-2xl font-bold text-gray-600 mb-2">
          Em desenvolvimento
        </h3>
        
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Esta funcionalidade estará disponível nas próximas atualizações.
        </p>

        <button 
          onClick={onClose}
          className="w-full bg-[#FF6A00] hover:bg-[#e65c00] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}