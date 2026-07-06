import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import Card from "./Card";

export default function VisaoDia({ dataReferencia, dadosFiltrados, onCancelar }) {
  const dataStr = dataReferencia.toISOString().split('T')[0];
  const itens = dadosFiltrados.filter(c => c.data === dataStr);

  return (
    <div className="absolute inset-0 overflow-y-auto hide-scroll px-2 md:px-3 pt-2 flex flex-col gap-3 md:gap-4 pb-10">
      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-[20px] opacity-50 bg-[var(--bg-card)] min-h-[300px]" style={{ borderColor: 'var(--border-color)' }}>
          <CalendarIcon size={40} className="mb-3 text-[var(--text-main)]" />
          <span className="font-black uppercase tracking-widest text-[10px] text-[var(--text-main)]">Agenda Livre para Este Dia</span>
        </div>
      ) : (
        itens.map(ev => <Card key={ev.id} ev={ev} vistaAtiva="dia" onCancelar={onCancelar} />)
      )}
    </div>
  );
}