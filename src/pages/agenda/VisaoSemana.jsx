import React from "react";
import { Clock } from "lucide-react";
import Card from "./Card";
import { CONFIG_TIPOS } from "../../services/Agenda"; 

export default function VisaoSemana({ dataReferencia, dadosFiltrados, layoutSemana, setDataReferencia, setVistaAtiva, onCancelar }) {
  const diasSemana = [];
  const inicioSemana = new Date(dataReferencia);
  inicioSemana.setDate(dataReferencia.getDate() - dataReferencia.getDay());

  const abrirVisaoDiaria = (ano, mes, dia) => {
    setDataReferencia(new Date(ano, mes, dia));
    setVistaAtiva("dia");
  };

  if (layoutSemana === "colunas") {
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioSemana);
      d.setDate(inicioSemana.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const itens = dadosFiltrados.filter(c => c.data === dStr);
      const isHoje = d.toDateString() === new Date().toDateString();

      diasSemana.push(
        <div key={i} className={`flex-1 min-w-[200px] flex flex-col gap-2 p-3 rounded-[20px] border h-full min-h-0 transition-all duration-300 hover:shadow-lg ${isHoje ? 'bg-[var(--bg-body)] border-[#DC2626] shadow-sm' : 'bg-[var(--bg-card)] border-[var(--border-color)]'}`}>
          <div onClick={() => abrirVisaoDiaria(d.getFullYear(), d.getMonth(), d.getDate())} className="text-center border-b pb-2 mb-1 cursor-pointer hover:opacity-70 transition-opacity" style={{ borderColor: 'var(--border-color)' }}>
            <span className="block text-[9px] font-black opacity-40 uppercase tracking-widest mb-1 text-[var(--text-main)]">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d)}</span>
            <span className={`text-lg font-black flex items-center justify-center mx-auto w-8 h-8 rounded-lg transition-colors ${isHoje ? 'bg-[#DC2626] text-white' : 'text-[var(--text-main)] hover:bg-[#DC2626]/10'}`}>{d.getDate()}</span>
          </div>
          
          <div className="flex flex-col gap-2 overflow-y-auto hide-scroll pr-1 flex-1 pb-4">
            {itens.map(ev => {
              const cfg = CONFIG_TIPOS[ev.tipo] || CONFIG_TIPOS["AULA"];
              return (
                <div key={ev.id} className="group relative flex flex-col gap-1 p-2.5 rounded-[12px] shadow-sm bg-[var(--bg-body)] border border-[var(--border-color)] cursor-pointer hover:-translate-y-1 hover:border-gray-500 transition-all duration-200 border-l-[3px]" style={{ borderLeftColor: `var(--${cfg.borderLeft.split('-')[2]}-500)` }}>
                  <div className="flex items-center gap-1.5"><Clock size={10} className={cfg.cor} /><span className={`text-[9px] font-black ${cfg.cor} group-hover:text-gray-500 transition-colors`}>{ev.horaInicio}</span></div>
                  <span className="text-[10px] font-black text-[var(--text-main)] transition-colors leading-tight uppercase tracking-tighter">{ev.titulo}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 overflow-x-auto hide-scroll pb-2">
         <div className="flex gap-3 h-full min-h-[350px] px-1">{diasSemana}</div>
      </div>
    );
  } 
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicioSemana);
    d.setDate(inicioSemana.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    const itens = dadosFiltrados.filter(c => c.data === dStr);
    const isHoje = d.toDateString() === new Date().toDateString();

    if (itens.length > 0) {
      diasSemana.push(
        <div key={i} className="flex flex-col gap-3 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => abrirVisaoDiaria(d.getFullYear(), d.getMonth(), d.getDate())}
              className="px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest cursor-pointer border shadow-sm transition-transform hover:-translate-y-0.5"
              style={{
                backgroundColor: isHoje ? '#DC2626' : 'var(--bg-card)',
                color: isHoje ? '#fff' : 'var(--text-main)',
                borderColor: isHoje ? '#DC2626' : 'var(--border-color)'
              }}
            >
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(d)}
            </button>
            <div className="flex-1 h-px opacity-30" style={{ backgroundColor: 'var(--text-main)' }}></div>
          </div>
          {itens.map(ev => <Card key={ev.id} ev={ev} vistaAtiva="semana" onCancelar={onCancelar} />)}
        </div>
      );
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto hide-scroll px-2 md:px-3 pt-2 pb-10">
      {diasSemana.length > 0 ? diasSemana : (
        <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-[20px] opacity-50 bg-[var(--bg-card)] min-h-[300px]" style={{ borderColor: 'var(--border-color)' }}>
          <span className="font-black uppercase tracking-widest text-[10px] text-[var(--text-main)]">Nenhum registo nesta semana</span>
        </div>
      )}
    </div>
  );
}