import React from "react";
import { Clock } from "lucide-react";
import { CONFIG_TIPOS } from "../../services/Agenda";

export default function VisaoMes({ dataReferencia, dadosFiltrados, setDataReferencia, setVistaAtiva }) {
  const nomeMesAtual = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(dataReferencia);
  const primeiroDia = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), 1).getDay();
  const totalDias = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() + 1, 0).getDate();
  const celulas = [];
  const totalRows = Math.ceil((primeiroDia + totalDias) / 7);

  const abrirVisaoDiaria = (ano, mes, dia) => {
    setDataReferencia(new Date(ano, mes, dia));
    setVistaAtiva("dia");
  };

  for (let i = 0; i < primeiroDia; i++) {
    celulas.push(<div key={`v-${i}`} className="w-full h-full min-h-0 rounded-[16px] bg-[var(--bg-body)] opacity-30 border border-[var(--border-color)]" />);
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const isHoje = dia === new Date().getDate() && dataReferencia.getMonth() === new Date().getMonth() && dataReferencia.getFullYear() === new Date().getFullYear();
    const dStr = `${dataReferencia.getFullYear()}-${String(dataReferencia.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const itens = dadosFiltrados.filter(c => c.data === dStr);
    
    const colIndex = (primeiroDia + dia - 1) % 7;
    const rowIndex = Math.floor((primeiroDia + dia - 1) / 7);
    
    let posClasses = "";
    if (colIndex >= 4) {
        if (rowIndex >= totalRows - 2) posClasses = "bottom-0 right-0 origin-bottom-right";
        else posClasses = "top-0 right-0 origin-top-right";
    } else {
        if (rowIndex >= totalRows - 2) posClasses = "bottom-0 left-0 origin-bottom-left";
        else posClasses = "top-0 left-0 origin-top-left";
    }

    celulas.push(
      <div 
        key={dia} 
        onClick={() => abrirVisaoDiaria(dataReferencia.getFullYear(), dataReferencia.getMonth(), dia)}
        className={`relative group w-full h-full min-h-0 p-1.5 md:p-2 flex flex-col gap-1 rounded-[16px] bg-[var(--bg-card)] border transition-all duration-300 cursor-pointer hover:z-50 hover:-translate-y-1 hover:shadow-lg hover:border-gray-500 ${isHoje ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20' : 'border-[var(--border-color)]'}`}
      >
        <div className="flex justify-between items-start mb-0.5 shrink-0">
          <span className={`text-[10px] md:text-[12px] font-black transition-colors ${isHoje ? 'text-[#DC2626]' : 'text-[var(--text-main)] opacity-60 group-hover:text-gray-500'}`}>
            {dia}
          </span>
        </div>
        
        <div className="flex flex-col gap-1 overflow-hidden h-full">
          {itens.slice(0, 3).map(ev => {
            const cfg = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS["AULA"];
            return (
              <div key={ev.id} className="flex items-center gap-1 px-1 md:px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold text-[var(--text-main)]">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.bg} ${cfg.cor.replace('text', 'bg')}`}></div>
                <span className="truncate opacity-80">{ev.horaInicio} {ev.titulo}</span>
              </div>
            );
          })}
          {itens.length > 3 && <span className="text-[8px] font-bold opacity-40 ml-3 text-[var(--text-main)]">+{itens.length - 3} mais</span>}
        </div>

        <div className={`absolute z-[100] min-w-[calc(100%+28px)] min-h-[calc(100%+28px)] h-max bg-[var(--bg-card)] border-2 border-gray-600 shadow-2xl rounded-3xl p-4 opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible transition-all duration-300 scale-90 md:group-hover:scale-100 cursor-pointer flex flex-col pointer-events-none ${posClasses}`}>
           <div className="flex justify-between items-center mb-3 border-b border-[var(--border-color)] pb-2 shrink-0">
              <span className="font-black text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap">{dia} {nomeMesAtual}</span>
              <span className="text-[8px] uppercase opacity-50 font-black bg-[var(--bg-body)] text-[var(--text-main)] px-2 py-0.5 rounded-md ml-4">{itens.length} reg.</span>
           </div>
           
           <div className="flex flex-col gap-1.5 overflow-hidden">
              {itens.length > 0 ? itens.map(ev => {
                const cfg = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS["AULA"];
                return (
                  <div key={`hov-${ev.id}`} className="flex flex-col gap-0.5 p-2.5 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)] border-l-[3px]" style={{ borderLeftColor: `var(--${cfg.borderLeft.split('-')[2]}-500)` }}>
                     <span className={`text-[9px] font-black uppercase tracking-tight ${cfg.cor} flex items-center gap-1.5`}>
                         <Clock size={10} /> {ev.horaInicio}
                     </span>
                     <span className="text-[10px] font-black text-[var(--text-main)] leading-tight truncate">{ev.titulo}</span>
                  </div>
                );
              }) : <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest text-center my-3 text-[var(--text-main)]">Agenda Livre</span>}
           </div>
        </div>
      </div>
    );
  }
  
  const celulasRestantes = (7 - ((primeiroDia + totalDias) % 7)) % 7;
  for (let i = 0; i < celulasRestantes; i++) {
    celulas.push(<div key={`ve-${i}`} className="w-full h-full min-h-0 rounded-[16px] bg-[var(--bg-body)] opacity-30 border border-[var(--border-color)]" />);
  }

  return (
    <div className="absolute inset-0 flex flex-col gap-1.5 md:gap-2 pb-1">
      <div className="grid grid-cols-7 gap-1.5 md:gap-2 px-1 shrink-0">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="text-center text-[10px] font-black uppercase opacity-40 tracking-widest text-[var(--text-main)] pb-0.5">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 gap-1.5 md:gap-2 min-h-0 px-1 pb-1" style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))` }}>
        {celulas}
      </div>
    </div>
  );
}