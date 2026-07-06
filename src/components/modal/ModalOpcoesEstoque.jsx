import React from "react";
import { PackagePlus, Box, AlertTriangle } from "lucide-react";
import ModalLateral from "../common/ModalLateral";

export default function ModalOpcoesEstoque({ isOpen, onClose, onSelect }) {
  return (
    <ModalLateral
      isOpen={isOpen}
      onClose={onClose}
      titulo="Fluxo de Estoque"
      subtitulo="Selecione a operação desejada"
      icone={<PackagePlus size={36} style={{ color: 'var(--text-main)' }} />}
      footer={(fechar) => (
        <button 
          onClick={fechar} 
          className="w-full py-8 opacity-50 hover:opacity-100 font-black uppercase tracking-widest text-sm transition-all outline-none"
          style={{ color: 'var(--text-main)' }}
        >
          Cancelar
        </button>
      )}
    >
      <div className="flex flex-col gap-6">
        <button 
          onClick={() => { onSelect('entrada'); onClose(); }} 
          className="flex items-center gap-6 p-6 rounded-[24px] border border-white/20 bg-black/10 transition-all hover:bg-black/20 hover:-translate-y-1 hover:border-white/40 group outline-none"
        >
          <div className="p-4 rounded-full border border-white/20 group-hover:scale-110 transition-transform bg-white/5">
            <Box size={24} style={{ color: 'var(--text-main)' }} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Entrada de Produto</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1" style={{ color: 'var(--text-main)' }}>Registrar reposição ou lote</span>
          </div>
        </button>
        
        <button 
          onClick={() => { onSelect('perda'); onClose(); }} 
          className="flex items-center gap-6 p-6 rounded-[24px] border border-white/20 bg-black/10 transition-all hover:bg-black/20 hover:-translate-y-1 hover:border-white/40 group outline-none"
        >
          <div className="p-4 rounded-full border border-white/20 group-hover:scale-110 transition-transform bg-white/5">
            <AlertTriangle size={24} style={{ color: 'var(--text-main)' }} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Produto com Defeito</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50 mt-1" style={{ color: 'var(--text-main)' }}>Registrar perda ou avaria</span>
          </div>
        </button>
      </div>
    </ModalLateral>
  );
}