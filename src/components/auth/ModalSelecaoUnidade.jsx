import React, { useState, useEffect } from "react";
import { Building2, ArrowRight, CheckCircle2, Loader2, LogOut } from "lucide-react";

export default function ModalSelecaoUnidade({ 
  isOpen, 
  unidades = [], 
  onSelect, 
  onLogout 
}) {
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUnidadeSelecionada(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmar = async () => {
    if (!unidadeSelecionada) return;
    
    setLoading(true);
    setTimeout(() => {
      onSelect(unidadeSelecionada);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 font-sans">
      
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        <div className="px-8 pt-8 pb-4 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
            <Building2 size={24} className="text-white opacity-80" />
          </div>
          <div>
            <h2 className="text-white font-black uppercase italic tracking-tight text-xl">
              Selecionar Unidade
            </h2>
            <p className="text-white/50 text-[11px] font-bold uppercase tracking-widest mt-1">
              Você possui acesso a múltiplas unidades
            </p>
          </div>
        </div>

        <div className="px-8 py-4 flex flex-col gap-3 max-h-[40vh] overflow-y-auto custom-scrollbar">
          {unidades.map((unidade) => {
            const isSelected = unidadeSelecionada?.id === unidade.id;
            
            return (
              <button
                key={unidade.id}
                onClick={() => setUnidadeSelecionada(unidade)}
                className={`
                  relative w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 outline-none text-left group
                  ${isSelected 
                    ? "bg-white/10 border-white/40 shadow-lg scale-[1.02]" 
                    : "bg-transparent border-white/10 hover:border-white/30 hover:bg-white/5"}
                `}
              >
                <div className="flex flex-col">
                  <span className={`font-bold transition-colors ${isSelected ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                    {unidade.nome || `Unidade ${unidade.id}`}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-0.5">
                    ID: {unidade.id}
                  </span>
                </div>

                <div className={`transition-all duration-300 ${isSelected ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
                  <CheckCircle2 size={18} className="text-white" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex border-t border-white/10 bg-black/20">
          <button
            onClick={onLogout}
            disabled={loading}
            className="flex-1 py-5 flex justify-center items-center gap-2 opacity-50 hover:opacity-100 transition-all group outline-none disabled:opacity-30"
          >
            <LogOut size={14} className="text-white group-hover:-translate-x-1 transition-transform" />
            <span className="font-black uppercase text-xs tracking-widest text-white">Sair</span>
          </button>
          
          <button
            onClick={handleConfirmar}
            disabled={!unidadeSelecionada || loading}
            className={`flex-[2] py-5 flex justify-center items-center gap-2 transition-all outline-none group
              ${!unidadeSelecionada ? "opacity-30 cursor-not-allowed" : "opacity-100 hover:bg-white/5"}
            `}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <>
                <span className="font-black uppercase text-xs tracking-widest text-white">Entrar na Unidade</span>
                <ArrowRight size={14} className="text-white group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}