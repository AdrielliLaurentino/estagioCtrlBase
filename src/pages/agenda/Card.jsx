import React from "react";
import { Clock } from "lucide-react";
import { CONFIG_TIPOS } from "../../services/Agenda";

export default function Card({ ev, vistaAtiva, onCancelar }) {
  const cfg = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS["AULA"];

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-[16px] shadow-sm bg-[var(--bg-body)] border border-[var(--border-color)] border-l-[4px] transition-all duration-300 hover:shadow-md`} style={{ borderLeftColor: `var(--${cfg.borderLeft.split('-')[2]}-500)` }}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.cor} flex items-center gap-1.5`}>
            <Clock size={12} /> {ev.horaInicio} - {ev.horaFim}
          </span>
          <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight">{ev.titulo}</h3>
        </div>
        
        {onCancelar && (
          <button 
            onClick={() => onCancelar(ev)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors outline-none shrink-0"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}