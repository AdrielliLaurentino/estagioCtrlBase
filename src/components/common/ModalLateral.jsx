import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function ModalLateral({ 
  isOpen, 
  onClose, 
  titulo, 
  subtitulo, 
  icone, 
  children, 
  footer 
}) {
  const [visivel, setVisivel] = useState(false);
  const [fechando, setFechando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisivel(true);
      setFechando(false);
    }
  }, [isOpen]);

  if (!isOpen && !visivel) return null;

  const handleClose = () => {
    setFechando(true);
    setTimeout(() => {
      setVisivel(false);
      onClose();
    }, 300);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 z-[2000] transition-opacity duration-500 ${!fechando && visivel ? "opacity-100" : "opacity-0"}`} 
        onClick={handleClose} 
      />

      <div 
        className={`fixed top-0 right-0 sm:top-4 sm:right-4 sm:bottom-4 w-full sm:max-w-[450px] h-full sm:h-auto flex flex-col z-[2001] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] 
        ${!fechando && visivel ? "translate-x-0" : "translate-x-[110%]"}
        sm:rounded-[45px] overflow-hidden border`}
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-color)' }}
      >
        <button onClick={handleClose} className="absolute top-8 right-8 opacity-60 hover:opacity-100 hover:scale-125 transition-all z-50" style={{ color: 'var(--text-main)' }}>
          <X size={26} />
        </button>

        <div className="flex-1 overflow-y-auto px-8 sm:px-12 pt-16 pb-10 no-scrollbar">
          <header className="flex flex-col items-center mb-10 text-center">
             <div className="w-24 h-24 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center mb-4 transition-transform hover:scale-105">
                 {icone}
             </div>
             <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none" style={{ color: 'var(--text-main)' }}>{titulo}</h2>
             <p className="text-[10px] font-bold uppercase tracking-widest mt-2 italic opacity-60" style={{ color: 'var(--text-main)' }}>{subtitulo}</p>
          </header>

          {children}
        </div>
        {footer && (
          <footer className="flex w-full border-t bg-transparent mt-auto" style={{ borderColor: 'var(--border-color)' }}>
            {footer(handleClose)}
          </footer>
        )}
      </div>
    </>
  );
}